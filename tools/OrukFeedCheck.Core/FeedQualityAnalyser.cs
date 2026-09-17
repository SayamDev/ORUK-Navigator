using System.Globalization;

namespace OrukFeedCheck.Core;

/// <summary>
/// Inspects an ORUK feed the way a consuming application has to: can it be read, does it
/// describe itself, does paging behave, and how much of each record is actually populated.
///
/// It reports what the feed does and does not contain. It never repairs or guesses values,
/// because a consumer inventing data is exactly the failure this project avoids.
/// </summary>
public sealed class FeedQualityAnalyser
{
    private readonly IOrukFeedClient _client;
    private readonly TimeProvider _timeProvider;

    public FeedQualityAnalyser(IOrukFeedClient client, TimeProvider? timeProvider = null)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>Reads feed metadata and a bounded sample of services, then reports on them.</summary>
    public async Task<FeedQualityReport> AnalyseAsync(
        string feedUrl,
        int sampleSize = 50,
        CancellationToken cancellationToken = default)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(sampleSize, 1);

        var findings = new List<Finding>();
        var metadata = await _client.GetMetadataAsync(cancellationToken).ConfigureAwait(false);
        InspectMetadata(metadata, findings);

        var page = await _client.GetServicePageAsync(1, sampleSize, cancellationToken).ConfigureAwait(false);
        if (page is null)
        {
            findings.Add(new Finding(FindingSeverity.Error, "SERVICES_UNAVAILABLE",
                "The services list endpoint did not return a paginated result."));
            return new FeedQualityReport(feedUrl, metadata?.Version, 0, 0, [], findings);
        }

        InspectEnvelope(page, findings);

        var services = page.Contents ?? [];
        await InspectDetailEndpointAsync(services, findings, cancellationToken).ConfigureAwait(false);
        var coverage = MeasureCoverage(services);
        InspectCoverage(coverage, services.Count, findings);
        InspectFreshness(services, findings);

        return new FeedQualityReport(
            feedUrl,
            metadata?.Version,
            page.TotalItems ?? services.Count,
            services.Count,
            coverage,
            findings);
    }

    private static void InspectMetadata(FeedMetadata? metadata, List<Finding> findings)
    {
        if (metadata is null)
        {
            findings.Add(new Finding(FindingSeverity.Error, "ROOT_UNAVAILABLE",
                "The root endpoint returned no metadata, so consumers cannot discover the profile."));
            return;
        }

        if (string.IsNullOrWhiteSpace(metadata.Version))
        {
            findings.Add(new Finding(FindingSeverity.Error, "VERSION_MISSING",
                "The root endpoint does not declare a version, so the ORUK profile cannot be negotiated."));
        }

        if (string.IsNullOrWhiteSpace(metadata.OpenApiUrl))
        {
            findings.Add(new Finding(FindingSeverity.Warning, "OPENAPI_URL_MISSING",
                "No openapi_url is published, so consumers cannot inspect the feed's capabilities."));
        }

        if (metadata.Profile is not null && metadata.Profile.Contains("path/to", StringComparison.OrdinalIgnoreCase))
        {
            findings.Add(new Finding(FindingSeverity.Warning, "PROFILE_PLACEHOLDER",
                $"The declared profile '{metadata.Profile}' is a placeholder rather than a retrievable URL."));
        }
    }

    private static void InspectEnvelope(ServicePage page, List<Finding> findings)
    {
        if (page.TotalItems is null || page.PageNumber is null || page.Size is null)
        {
            findings.Add(new Finding(FindingSeverity.Warning, "ENVELOPE_INCOMPLETE",
                "The list envelope omits paging fields, so consumers cannot page reliably."));
        }

        var contents = page.Contents?.Count ?? 0;
        if (page.Size is { } size && size != contents)
        {
            findings.Add(new Finding(FindingSeverity.Warning, "SIZE_MISMATCH",
                $"The envelope reports size {size} but returned {contents} records."));
        }

        if (contents == 0)
        {
            findings.Add(new Finding(FindingSeverity.Error, "NO_SERVICES",
                "The feed returned no service records to inspect."));
        }
    }

    private async Task InspectDetailEndpointAsync(
        IReadOnlyList<OrukService> services,
        List<Finding> findings,
        CancellationToken cancellationToken)
    {
        var id = services.FirstOrDefault(service => !string.IsNullOrWhiteSpace(service.Id))?.Id;
        if (id is null)
        {
            return;
        }

        var detail = await _client.GetServiceAsync(id, cancellationToken).ConfigureAwait(false);
        if (detail is null)
        {
            findings.Add(new Finding(FindingSeverity.Error, "DETAIL_UNAVAILABLE",
                $"Service {id} appears in the list but its detail endpoint returned nothing."));
        }
        else if (!string.Equals(detail.Id, id, StringComparison.OrdinalIgnoreCase))
        {
            findings.Add(new Finding(FindingSeverity.Error, "DETAIL_ID_MISMATCH",
                $"Requesting service {id} returned a record with id {detail.Id ?? "(none)"}."));
        }
    }

    private static List<FieldCoverage> MeasureCoverage(IReadOnlyList<OrukService> services)
    {
        var sampled = services.Count;

        return
        [
            Count("id", services, service => service.Id, sampled),
            Count("name", services, service => service.Name, sampled),
            Count("description", services, service => service.Description, sampled),
            Count("status", services, service => service.Status, sampled),
            Count("url", services, service => service.Url, sampled),
            Count("email", services, service => service.Email, sampled),
            Count("assured_date", services, service => service.AssuredDate, sampled),
            Count("organization.name", services, service => service.Organization?.Name, sampled),
        ];

        static FieldCoverage Count(
            string field,
            IReadOnlyList<OrukService> records,
            Func<OrukService, string?> selector,
            int sampled) =>
            new(field, records.Count(record => !string.IsNullOrWhiteSpace(selector(record))), sampled);
    }

    private static void InspectCoverage(
        IReadOnlyList<FieldCoverage> coverage,
        int sampled,
        List<Finding> findings)
    {
        if (sampled == 0)
        {
            return;
        }

        foreach (var field in coverage.Where(item => item.Field is "id" or "name" or "status"))
        {
            if (field.Populated < sampled)
            {
                findings.Add(new Finding(FindingSeverity.Error, "REQUIRED_FIELD_MISSING",
                    $"{sampled - field.Populated} of {sampled} sampled services have no {field.Field}, which ORUK requires."));
            }
        }

        foreach (var field in coverage.Where(item => item.Field is "description" or "url"))
        {
            if (field.Percentage < 100)
            {
                findings.Add(new Finding(FindingSeverity.Warning, "USEFUL_FIELD_SPARSE",
                    $"{field.Field} is populated in {field.Percentage}% of sampled services; consumers cannot rely on it."));
            }
        }
    }

    private void InspectFreshness(IReadOnlyList<OrukService> services, List<Finding> findings)
    {
        var today = _timeProvider.GetUtcNow().UtcDateTime.Date;
        var dated = services
            .Select(service => ParseDate(service.AssuredDate))
            .Where(date => date is not null)
            .Select(date => date!.Value)
            .ToList();

        if (dated.Count == 0)
        {
            findings.Add(new Finding(FindingSeverity.Warning, "NO_ASSURANCE_DATES",
                "No sampled service states when its information was last checked."));
            return;
        }

        var stale = dated.Count(date => (today - date).TotalDays > 365);
        if (stale > 0)
        {
            findings.Add(new Finding(FindingSeverity.Warning, "ASSURANCE_STALE",
                $"{stale} of {dated.Count} dated services were last checked more than a year ago."));
        }

        findings.Add(new Finding(FindingSeverity.Info, "ASSURANCE_RANGE",
            $"Assurance dates run from {dated.Min():yyyy-MM-dd} to {dated.Max():yyyy-MM-dd}."));
    }

    private static DateTime? ParseDate(string? value) =>
        DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed.Date
            : null;
}
