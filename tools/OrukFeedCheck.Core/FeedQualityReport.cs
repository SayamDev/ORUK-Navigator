namespace OrukFeedCheck.Core;

/// <summary>How serious a finding is for a consumer of the feed.</summary>
public enum FindingSeverity
{
    Info,
    Warning,
    Error,
}

/// <summary>One observation about a feed, with the evidence behind it.</summary>
public sealed record Finding(FindingSeverity Severity, string Code, string Message)
{
    public override string ToString() => $"[{Severity.ToString().ToUpperInvariant()}] {Code}: {Message}";
}

/// <summary>How completely a single ORUK field is populated across the sampled records.</summary>
public sealed record FieldCoverage(string Field, int Populated, int Sampled)
{
    public double Percentage => Sampled == 0 ? 0 : Math.Round(Populated * 100d / Sampled, 1);
}

/// <summary>The result of inspecting one feed.</summary>
public sealed record FeedQualityReport(
    string FeedUrl,
    string? DeclaredVersion,
    int TotalItems,
    int SampledServices,
    IReadOnlyList<FieldCoverage> Coverage,
    IReadOnlyList<Finding> Findings)
{
    /// <summary>Zero to 100, averaging how completely the sampled records populate useful fields.</summary>
    public double CompletenessScore => Coverage.Count == 0
        ? 0
        : Math.Round(Coverage.Average(item => item.Percentage), 1);

    public bool HasErrors => Findings.Any(finding => finding.Severity == FindingSeverity.Error);
}
