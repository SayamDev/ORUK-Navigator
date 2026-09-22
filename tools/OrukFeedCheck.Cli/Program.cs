using System.Text.Json;
using OrukFeedCheck.Core;

// Reports on the quality of any Open Referral UK feed: reachability, self-description,
// paging behaviour and how completely its records are populated.
//
//   oruk-feed-check <feed-url> [--sample 50 | --all [--max-records 10000]] [--json] [--min-score 60]

var parsed = CommandLineOptions.Parse(args);
if (parsed is not { } options)
{
    Console.Error.WriteLine("Usage: oruk-feed-check <feed-url> [--sample <1-200> | --all [--max-records <positive integer>]] [--json] [--min-score <0-100>]");
    return 2;
}

using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("oruk-feed-check/1.0 (+https://github.com/SayamDev/ORUK-Navigator)");

var analyser = new FeedQualityAnalyser(new OrukFeedClient(httpClient, options.FeedUrl));

try
{
    var report = await analyser.AnalyseAsync(options.FeedUrl.ToString(), options.SampleSize,
        options.AllPages, options.MaxRecords);

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
    Console.WriteLine($"Services:      {report.TotalItems} declared, {report.SampledServices} inspected ({(report.CompleteScan ? "full feed" : "sample or incomplete scan")})");
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
internal sealed record CommandLineOptions(Uri FeedUrl, int SampleSize, bool AllPages, int MaxRecords,
    bool AsJson, double MinimumScore)
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
        var sampleSet = false;
        var allPages = false;
        var maxRecords = 10_000;
        var maxRecordsSet = false;
        var asJson = false;
        var minimumScore = 0d;

        for (var index = 1; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--json":
                    asJson = true;
                    break;
                case "--all":
                    allPages = true;
                    break;
                case "--sample" when index + 1 < args.Length && int.TryParse(args[index + 1], out var sample):
                    if (sample is < 1 or > 200) return null;
                    sampleSize = sample;
                    sampleSet = true;
                    index++;
                    break;
                case "--max-records" when index + 1 < args.Length && int.TryParse(args[index + 1], out var limit):
                    if (limit < 1) return null;
                    maxRecords = limit;
                    maxRecordsSet = true;
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

        if ((allPages && sampleSet) || (!allPages && maxRecordsSet)) return null;
        return new CommandLineOptions(feedUrl, allPages ? 200 : sampleSize, allPages, maxRecords,
            asJson, minimumScore);
    }
}
