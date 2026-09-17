using System.Text.Json.Serialization;

namespace OrukFeedCheck.Core;

/// <summary>Metadata returned by the root endpoint of an Open Referral UK feed.</summary>
public sealed record FeedMetadata(
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("profile")] string? Profile,
    [property: JsonPropertyName("openapi_url")] string? OpenApiUrl);

/// <summary>An organisation as published inside a service record.</summary>
public sealed record OrukOrganization(
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("description")] string? Description);

/// <summary>A service record as published by a feed's list or detail endpoint.</summary>
public sealed record OrukService(
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("assured_date")] string? AssuredDate,
    [property: JsonPropertyName("last_modified")] string? LastModified,
    [property: JsonPropertyName("organization")] OrukOrganization? Organization);

/// <summary>The paginated envelope ORUK list endpoints return.</summary>
public sealed record ServicePage(
    [property: JsonPropertyName("total_items")] int? TotalItems,
    [property: JsonPropertyName("total_pages")] int? TotalPages,
    [property: JsonPropertyName("page_number")] int? PageNumber,
    [property: JsonPropertyName("size")] int? Size,
    [property: JsonPropertyName("first_page")] bool? FirstPage,
    [property: JsonPropertyName("last_page")] bool? LastPage,
    [property: JsonPropertyName("empty")] bool? Empty,
    [property: JsonPropertyName("contents")] IReadOnlyList<OrukService>? Contents);
