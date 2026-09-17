namespace OrukFeedCheck.Core;

/// <summary>Reads the parts of an ORUK feed this tool inspects.</summary>
public interface IOrukFeedClient
{
    Task<FeedMetadata?> GetMetadataAsync(CancellationToken cancellationToken = default);

    Task<ServicePage?> GetServicePageAsync(int page, int perPage, CancellationToken cancellationToken = default);

    Task<OrukService?> GetServiceAsync(string id, CancellationToken cancellationToken = default);
}
