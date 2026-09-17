using System.Net;
using System.Text.Json;

namespace OrukFeedCheck.Core;

/// <summary>
/// Reads an ORUK feed over HTTP. Requests are anonymous, bounded and read-only, which is all
/// the published compliance guidance invites a consumer to do.
/// </summary>
public sealed class OrukFeedClient : IOrukFeedClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    private readonly HttpClient _httpClient;
    private readonly Uri _baseUri;

    public OrukFeedClient(HttpClient httpClient, Uri baseUri)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _baseUri = baseUri ?? throw new ArgumentNullException(nameof(baseUri));

        if (!_baseUri.IsAbsoluteUri)
        {
            throw new ArgumentException("The feed base URL must be absolute.", nameof(baseUri));
        }
    }

    public Task<FeedMetadata?> GetMetadataAsync(CancellationToken cancellationToken = default) =>
        ReadAsync<FeedMetadata>(string.Empty, cancellationToken);

    public Task<ServicePage?> GetServicePageAsync(int page, int perPage, CancellationToken cancellationToken = default) =>
        ReadAsync<ServicePage>($"services?page={page}&per_page={perPage}", cancellationToken);

    public Task<OrukService?> GetServiceAsync(string id, CancellationToken cancellationToken = default) =>
        ReadAsync<OrukService>($"services/{Uri.EscapeDataString(id)}", cancellationToken);

    private async Task<T?> ReadAsync<T>(string relativePath, CancellationToken cancellationToken)
    {
        var requestUri = new Uri(NormalisedBase(), relativePath);
        using var response = await _httpClient.GetAsync(requestUri, cancellationToken).ConfigureAwait(false);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }

        response.EnsureSuccessStatusCode();
        await using var body = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);

        try
        {
            return await JsonSerializer.DeserializeAsync<T>(body, JsonOptions, cancellationToken).ConfigureAwait(false);
        }
        catch (JsonException exception)
        {
            throw new OrukFeedException($"{requestUri} did not return readable ORUK JSON.", exception);
        }
    }

    private Uri NormalisedBase() =>
        _baseUri.AbsoluteUri.EndsWith('/') ? _baseUri : new Uri(_baseUri.AbsoluteUri + "/");
}

/// <summary>Raised when a feed responds, but not with data this tool can interpret.</summary>
public sealed class OrukFeedException : Exception
{
    public OrukFeedException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
