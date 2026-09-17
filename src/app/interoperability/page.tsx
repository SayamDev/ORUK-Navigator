import type { Metadata } from "next";

import { knownFeeds } from "@/oruk/feed-directory";
import { probeFeed, type FeedProbeResult } from "@/oruk/feed-probe";

export const revalidate = 3600;
export const metadata: Metadata = { title: "ORUK interoperability" };

export default async function InteroperabilityPage() {
  const results = await Promise.all(knownFeeds.map((feed) => probeFeed(feed)));

  return <main id="main-content" className="shell prose-page status-page">
    <p className="eyebrow">Open Referral UK</p>
    <h1>Feed interoperability</h1>
    <p className="lede">Navigator publishes its reviewed Tameside catalogue as an Open Referral UK v3 feed, and reads other published feeds to report how usable their data is.</p>

    <section aria-labelledby="publishing-heading">
      <h2 id="publishing-heading">What Navigator publishes</h2>
      <p>The reviewed catalogue is available as an ORUK v3 (HSDS-UK-3.0) feed at <code>/api/oruk/v3</code>, so partners can reuse it rather than re-keying council pages. It passes the required checks of the official Open Referral UK validator.</p>
      {/* These are API endpoints rather than pages, so they are plain links: client-side
          navigation and prefetching would be wrong for a JSON feed. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <p><a href="/api/oruk/v3">Feed metadata</a> · <a href="/api/oruk/v3/services">Services</a> · <a href="https://github.com/SayamDev/ORUK-Navigator/blob/main/docs/oruk-feed.md">How the mapping works</a></p>
    </section>

    <section aria-labelledby="probe-heading">
      <h2 id="probe-heading">What other feeds publish</h2>
      <p>These observations come from anonymous read-only requests to each feed’s own endpoints, sampling up to 25 records. Navigator stores no service records from other publishers, and reports only what the feed itself states.</p>
      {results.map((result) => <FeedCard key={result.key} result={result} />)}
    </section>

    <section aria-labelledby="meaning-heading">
      <h2 id="meaning-heading">What this does not mean</h2>
      <p>Completeness describes how fully a feed populates ORUK fields. It is not a judgement of service quality, publisher diligence, or whether any listed service is currently available. A record last checked some time ago has not been confirmed recently; it has not necessarily closed.</p>
    </section>
  </main>;
}

function FeedCard({ result }: { result: FeedProbeResult }) {
  return <article className="feed-card">
    <h3>{result.publisher}</h3>
    <p className="result-publisher">{result.note}</p>
    {result.reachable ? <>
      <dl className="status-summary">
        <div><dt>Declared version</dt><dd>{result.declaredVersion ?? "Not declared"}</dd></div>
        <div><dt>Services published</dt><dd>{result.totalServices?.toLocaleString("en-GB") ?? "Unknown"}</dd></div>
        <div><dt>Field completeness</dt><dd>{result.completenessScore === null ? "No sample" : `${result.completenessScore}%`}</dd></div>
      </dl>
      {result.coverage.length > 0 && <table className="coverage-table">
        <caption>Populated fields in a sample of {result.sampled} records</caption>
        <thead><tr><th scope="col">Field</th><th scope="col">Populated</th></tr></thead>
        <tbody>{result.coverage.map((field) => <tr key={field.field}>
          <th scope="row"><code>{field.field}</code></th>
          <td>{field.populated} of {field.sampled}</td>
        </tr>)}</tbody>
      </table>}
    </> : <p className="health-notice"><strong>Not reachable:</strong> this feed did not answer the probe when this page was last built.</p>}
    {result.warnings.length > 0 && <ul className="feed-warnings">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
  </article>;
}
