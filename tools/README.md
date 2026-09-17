# ORUK feed tools

`oruk-feed-check` reports on the quality of any Open Referral UK v3 feed, including this project's own feed at `/api/oruk/v3`.

It answers the questions a consuming application has to answer before it can depend on a feed: can it be read, does it describe itself, does paging behave, how completely are records populated, and how recently was the information checked. It reports what it finds and never repairs or guesses values.

## Why C#

The official [ORUK validator](https://github.com/OpenReferralUK/oruk-validator) is an ASP.NET Core service, so a consumer-side quality tool in the same language can sit alongside it. The validator answers "does this feed conform to the schema?"; this tool answers "is the data in it usable?".

## Layout

| Project | Contains |
| --- | --- |
| `OrukFeedCheck.Core` | `OrukFeedClient` (bounded, read-only HTTP), the ORUK record types, and `FeedQualityAnalyser` |
| `OrukFeedCheck.Cli` | Command-line front end with text and JSON output |
| `OrukFeedCheck.Tests` | xUnit tests; the analyser is tested against an in-memory feed and the client against a stub HTTP handler, so no test needs the network |

`FeedQualityAnalyser` depends on `IOrukFeedClient` and `TimeProvider` rather than concrete types, which is what keeps freshness rules testable at a fixed date.

## Run it

```bash
cd tools
dotnet test
dotnet run --project OrukFeedCheck.Cli -- https://oruk-navigator.vercel.app/api/oruk/v3
dotnet run --project OrukFeedCheck.Cli -- https://shropshire.openplace.directory/o/OpenReferralService/v3 --sample 25
```

Options: `--sample <1-200>` (records to inspect, default 50), `--json` (machine-readable report), `--min-score <0-100>` (exit non-zero below this completeness).

Exit codes: `0` pass, `1` findings at error level or below the minimum score, `2` the feed could not be read.

## Observed results

Run on 17 September 2026, sampling gently over anonymous reads:

| Feed | Version | Completeness | Findings |
| --- | --- | --- | --- |
| ORUK Navigator (`/api/oruk/v3`) | HSDS-UK-3.0 | 87.5% | No errors. `email` is absent, because the reviewed council pages state no service email |
| Shropshire Council | HSDS-UK-3.0 | 100% | Declared profile is the placeholder `https://path/to/profile`; 22 of 25 sampled services were last checked more than a year ago |

Both observations are about published data, not service quality. A stale assurance date means nobody has confirmed the record recently, not that the service has closed.
