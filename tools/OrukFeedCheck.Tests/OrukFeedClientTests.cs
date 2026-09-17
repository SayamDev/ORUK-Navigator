using System.Net;
using System.Text;
using OrukFeedCheck.Core;

namespace OrukFeedCheck.Tests;

public sealed class OrukFeedClientTests
{
    [Fact]
    public async Task Requests_the_documented_ORUK_paths()
    {
        var handler = new RecordingHandler("""{"version":"HSDS-UK-3.0"}""");
        var client = new OrukFeedClient(new HttpClient(handler), new Uri("https://example.org/api/oruk/v3"));

        await client.GetMetadataAsync();
        await client.GetServicePageAsync(2, 25);
        await client.GetServiceAsync("a b/c");

        Assert.Equal(
        [
            "https://example.org/api/oruk/v3/",
            "https://example.org/api/oruk/v3/services?page=2&per_page=25",
            "https://example.org/api/oruk/v3/services/a%20b%2Fc",
        ], handler.Requested);
    }

    [Fact]
    public async Task Treats_a_missing_record_as_absent_rather_than_an_error()
    {
        var handler = new RecordingHandler("not found", HttpStatusCode.NotFound);
        var client = new OrukFeedClient(new HttpClient(handler), new Uri("https://example.org/feed/"));

        Assert.Null(await client.GetServiceAsync("missing"));
    }

    [Fact]
    public async Task Surfaces_unreadable_JSON_as_a_feed_problem()
    {
        var handler = new RecordingHandler("<html>maintenance</html>");
        var client = new OrukFeedClient(new HttpClient(handler), new Uri("https://example.org/feed/"));

        var exception = await Assert.ThrowsAsync<OrukFeedException>(() => client.GetMetadataAsync());
        Assert.Contains("readable ORUK JSON", exception.Message);
    }

    [Fact]
    public async Task Raises_server_failures_to_the_caller()
    {
        var handler = new RecordingHandler("upstream error", HttpStatusCode.ServiceUnavailable);
        var client = new OrukFeedClient(new HttpClient(handler), new Uri("https://example.org/feed/"));

        await Assert.ThrowsAsync<HttpRequestException>(() => client.GetMetadataAsync());
    }

    [Fact]
    public void Requires_an_absolute_feed_url()
    {
        Assert.Throws<ArgumentException>(() =>
            new OrukFeedClient(new HttpClient(), new Uri("/relative", UriKind.Relative)));
    }

    private sealed class RecordingHandler(string body, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
    {
        public List<string> Requested { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requested.Add(request.RequestUri!.AbsoluteUri);

            return Task.FromResult(new HttpResponseMessage(status)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            });
        }
    }
}
