# ORUK Navigator and the official Validator

ORUK Navigator is an independent demonstration of what a service discovery product can build with Open Referral UK data. It is not a fork, frontend, or deployment of the [official ORUK Validator](https://github.com/OpenReferralUK/oruk-validator), and iStandUK has not endorsed it.

The Validator checks whether a published dataset conforms to an Open Referral specification. The [iStandUK roadmap article](https://openreferral.org/strengthening-the-open-referral-validator-istanduks-next-steps/) explicitly separates that job from data quality and use-case fitness. It names multi-schema support, granular conformance results, and a command-line path for full datasets as possible next steps. The [stewardship article](https://openreferral.org/open-referral-uk-a-new-home-a-new-team-oruks-next-phase-under-istanduk/) frames the larger goal as practical adoption and interoperability.

| Question | Existing project evidence |
| --- | --- |
| Can Navigator publish reusable ORUK data? | The reviewed Tameside catalogue is exposed at [`/api/oruk/v3`](https://oruk-navigator.vercel.app/api/oruk/v3); see [mapping and scope](oruk-feed.md). |
| Has the published feed been checked against the official tool? | Yes. The required validator checks passed in a local run on 17 September 2026; reproduction instructions and optional-endpoint warnings are in [the feed record](oruk-feed.md#validation). This is a dated test result, not continuous certification. |
| Can another feed be consumed safely? | The [interoperability page](https://oruk-navigator.vercel.app/interoperability) makes bounded anonymous probes and shows summary facts without republishing another publisher's records. |
| Can a publisher inspect every paginated record before relying on a feed? | [`OrukFeedCheck`](../tools/README.md) now offers `--all`. It detects record coverage gaps and paging failures across a bounded full scan, emits JSON for CI, and exits non-zero on an incomplete scan. |

In a live check on 22 September 2026, this mode inspected all 5,132 records in Shropshire's published feed. That full run exposed sparse descriptions and old assurance dates that a first-page sample could understate. The result is a dated observation, not a permanent claim about the publisher.

The command-line checker complements the official Validator. Its completeness percentage is an observation about populated fields in the inspected records, not an ORUK compliance tier or a measure of service quality. It does not replace schema validation, judge whether a service is open, or grant permission to reuse another publisher's data.
