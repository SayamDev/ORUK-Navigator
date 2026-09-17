using OrukFeedCheck.Core;

namespace OrukFeedCheck.Tests;

public sealed class FeedQualityAnalyserTests
{
    private static readonly DateTimeOffset Today = new(2026, 9, 17, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Reports_a_complete_feed_without_errors()
    {
        var report = await Analyse(StubFeedClient.Healthy());

        Assert.False(report.HasErrors);
        Assert.Equal("HSDS-UK-3.0", report.DeclaredVersion);
        Assert.Equal(2, report.SampledServices);
        Assert.Equal(100, Coverage(report, "name").Percentage);
        Assert.Contains(report.Findings, finding => finding.Code == "ASSURANCE_RANGE");
    }

    [Fact]
    public async Task Flags_records_missing_fields_ORUK_requires()
    {
        var feed = StubFeedClient.Healthy();
        feed.Services[1] = feed.Services[1] with { Status = null };

        var report = await Analyse(feed);

        Assert.True(report.HasErrors);
        Assert.Contains(report.Findings, finding =>
            finding.Code == "REQUIRED_FIELD_MISSING" && finding.Message.Contains("status"));
    }

    [Fact]
    public async Task Warns_when_useful_fields_are_sparse_and_lowers_the_score()
    {
        var feed = StubFeedClient.Healthy();
        feed.Services[0] = feed.Services[0] with { Url = null, Description = null };

        var report = await Analyse(feed);

        Assert.Equal(50, Coverage(report, "url").Percentage);
        Assert.True(report.CompletenessScore < 100);
        Assert.Contains(report.Findings, finding => finding.Code == "USEFUL_FIELD_SPARSE");
    }

    [Fact]
    public async Task Warns_about_placeholder_profiles_and_missing_openapi_urls()
    {
        var feed = StubFeedClient.Healthy();
        feed.Metadata = new FeedMetadata("HSDS-UK-3.0", "https://path/to/profile", null);

        var report = await Analyse(feed);

        Assert.Contains(report.Findings, finding => finding.Code == "PROFILE_PLACEHOLDER");
        Assert.Contains(report.Findings, finding => finding.Code == "OPENAPI_URL_MISSING");
    }

    [Fact]
    public async Task Flags_assurance_dates_older_than_a_year()
    {
        var feed = StubFeedClient.Healthy();
        feed.Services[0] = feed.Services[0] with { AssuredDate = "2024-01-01" };

        var report = await Analyse(feed);

        Assert.Contains(report.Findings, finding =>
            finding.Code == "ASSURANCE_STALE" && finding.Message.Contains("1 of 2"));
    }

    [Fact]
    public async Task Flags_a_list_record_whose_detail_endpoint_is_missing()
    {
        var feed = StubFeedClient.Healthy();
        feed.DetailAvailable = false;

        var report = await Analyse(feed);

        Assert.True(report.HasErrors);
        Assert.Contains(report.Findings, finding => finding.Code == "DETAIL_UNAVAILABLE");
    }

    [Fact]
    public async Task Flags_an_envelope_whose_size_disagrees_with_its_contents()
    {
        var feed = StubFeedClient.Healthy();
        feed.ReportedSize = 7;

        var report = await Analyse(feed);

        Assert.Contains(report.Findings, finding => finding.Code == "SIZE_MISMATCH");
    }

    [Fact]
    public async Task Reports_an_unreadable_services_endpoint_as_an_error()
    {
        var feed = StubFeedClient.Healthy();
        feed.PageAvailable = false;

        var report = await Analyse(feed);

        Assert.True(report.HasErrors);
        Assert.Equal(0, report.SampledServices);
        Assert.Contains(report.Findings, finding => finding.Code == "SERVICES_UNAVAILABLE");
    }

    [Fact]
    public async Task Rejects_a_sample_size_below_one()
    {
        var analyser = new FeedQualityAnalyser(StubFeedClient.Healthy(), new FixedTimeProvider(Today));

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => analyser.AnalyseAsync("https://example.org/feed", 0));
    }

    private static Task<FeedQualityReport> Analyse(IOrukFeedClient feed) =>
        new FeedQualityAnalyser(feed, new FixedTimeProvider(Today)).AnalyseAsync("https://example.org/feed", 50);

    private static FieldCoverage Coverage(FeedQualityReport report, string field) =>
        report.Coverage.Single(item => item.Field == field);
}

/// <summary>An in-memory feed so the analyser's behaviour is tested without network access.</summary>
internal sealed class StubFeedClient : IOrukFeedClient
{
    public FeedMetadata? Metadata { get; set; }

    public List<OrukService> Services { get; } = [];

    public bool PageAvailable { get; set; } = true;

    public bool DetailAvailable { get; set; } = true;

    public int? ReportedSize { get; set; }

    public static StubFeedClient Healthy()
    {
        var client = new StubFeedClient
        {
            Metadata = new FeedMetadata("HSDS-UK-3.0", "https://openreferraluk.org", "https://example.org/openapi.json"),
        };

        client.Services.AddRange(
        [
            Service("11111111-1111-4111-8111-111111111111", "Housing Payments", "2026-09-17"),
            Service("22222222-2222-4222-8222-222222222222", "Carers Centre", "2026-09-15"),
        ]);

        return client;
    }

    public Task<FeedMetadata?> GetMetadataAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Metadata);

    public Task<ServicePage?> GetServicePageAsync(int page, int perPage, CancellationToken cancellationToken = default)
    {
        if (!PageAvailable)
        {
            return Task.FromResult<ServicePage?>(null);
        }

        return Task.FromResult<ServicePage?>(new ServicePage(
            Services.Count,
            1,
            page,
            ReportedSize ?? Services.Count,
            true,
            true,
            Services.Count == 0,
            Services));
    }

    public Task<OrukService?> GetServiceAsync(string id, CancellationToken cancellationToken = default) =>
        Task.FromResult(DetailAvailable ? Services.FirstOrDefault(service => service.Id == id) : null);

    private static OrukService Service(string id, string name, string assuredDate) =>
        new(id, name, $"{name} description", "active", $"https://example.org/{name}", null, assuredDate, null,
            new OrukOrganization("33333333-3333-4333-8333-333333333333", "Tameside Metropolitan Borough Council", "Publisher"));
}

internal sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}
