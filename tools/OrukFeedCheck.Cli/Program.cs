using System.Text.Json;
using OrukFeedCheck.Core;

// Reports on the quality of any Open Referral UK feed: reachability, self-description,
// paging behaviour and how completely its records are populated.
//
//   oruk-feed-check <feed-url> [--sample 50] [--json] [--min-score 60]

var parsed = CommandLineOptions.Parse(args);
if (parsed is not { } options)
{
    Console.Error.WriteLine("Usage: oruk-feed-check <feed-url> [--sample <1-200>] [--json] [--min-score <0-100>]");
    return 2;
}

using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("oruk-feed-check/1.0 (+https://github.com/SayamDev/ORUK-Navigator)");

var analyser = new FeedQualityAnalyser(new OrukFeedClient(httpClient, options.FeedUrl));

try
{
    var report = await analyser.AnalyseAsync(options.FeedUrl.ToString(), options.SampleSize);

    if (options.AsJson)
    {
        Console.WriteLine(JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
    }
    else
    {
        WriteReport(report);
    }

    if (report.HasErrors)
    {
        return 1;
    }

    return report.CompletenessScore < options.MinimumScore ? 1 : 0;
}
catch (Exception exception) when (exception is HttpRequestException or OrukFeedException or TaskCanceledException)
{
    Console.Error.WriteLine($"Could not read {options.FeedUrl}: {exception.Message}");
    return 2;
}

static void WriteReport(FeedQualityReport report)
{
    Console.WriteLine($"Feed:          {report.FeedUrl}");
    Console.WriteLine($"Version:       {report.DeclaredVersion ?? "(not declared)"}");
    Console.WriteLine($"Services:      {report.TotalItems} total, {report.SampledServices} sampled");
    Console.WriteLine($"Completeness:  {report.CompletenessScore}%");
    Console.WriteLine();
    Console.WriteLine("Field coverage");

    foreach (var field in report.Coverage)
    {
        var filled = (int)Math.Round(field.Percentage / 5);
        Console.WriteLine($"  {field.Field,-18} {new string('#', filled).PadRight(20, '.')} {field.Percentage,5}%");
    }

    Console.WriteLine();
    Console.WriteLine(report.Findings.Count == 0 ? "No findings." : "Findings");

    foreach (var finding in report.Findings.OrderByDescending(item => item.Severity))
    {
        Console.WriteLine($"  {finding}");
    }
}

/// <summary>Command-line arguments, parsed once so the rest of the tool works with typed values.</summary>
internal sealed record CommandLineOptions(Uri FeedUrl, int SampleSize, bool AsJson, double MinimumScore)
{
    public static CommandLineOptions? Parse(string[] args)
    {
        if (args.Length == 0 || !Uri.TryCreate(args[0], UriKind.Absolute, out var feedUrl))
        {
            return null;
        }

        if (feedUrl.Scheme is not ("http" or "https"))
        {
            return null;
        }

        var sampleSize = 50;
        var asJson = false;
        var minimumScore = 0d;

        for (var index = 1; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--json":
                    asJson = true;
                    break;
                case "--sample" when index + 1 < args.Length && int.TryParse(args[index + 1], out var sample):
                    sampleSize = Math.Clamp(sample, 1, 200);
                    index++;
                    break;
                case "--min-score" when index + 1 < args.Length && double.TryParse(args[index + 1], out var score):
                    minimumScore = Math.Clamp(score, 0, 100);
                    index++;
                    break;
                default:
                    return null;
            }
        }

        return new CommandLineOptions(feedUrl, sampleSize, asJson, minimumScore);
    }
}
