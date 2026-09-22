import type { Metadata } from "next";
import Link from "next/link";

import { sourceHealthMessage } from "@/lib/source-health";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Technical status" };

export default async function StatusPage() {
  const services = await getCatalogueRepository().listActive();
  const degraded = services.filter((service) => sourceHealthMessage(service.sourceStatus));
  const oldestCheck = services
    .map((service) => new Date(service.sourceCheckedAt))
    .sort((left, right) => left.getTime() - right.getTime())[0];

  return <main id="main-content" className="shell prose-page status-page">
    <p className="eyebrow">Technical status</p>
    <h1>How source checking is working</h1>
    <p className="lede">This page describes Navigator’s ability to check its small set of publisher sources. It does not say whether a service is open, available or suitable for you.</p>
    <section aria-labelledby="coverage-heading">
      <h2 id="coverage-heading">Current pilot coverage</h2>
      <dl className="status-summary">
        <div><dt>Published services</dt><dd>{services.length}</dd></div>
        <div><dt>Sources with a checking warning</dt><dd>{degraded.length}</dd></div>
        <div><dt>Oldest published review</dt><dd>{oldestCheck ? formatDate(oldestCheck) : "No published reviews"}</dd></div>
      </dl>
    </section>
    <section aria-labelledby="warnings-heading">
      <h2 id="warnings-heading">Checking warnings</h2>
      {degraded.length > 0 ? <ul>{degraded.map((service) => <li key={service.publicId}><Link href={`/services/${service.slug}`}>{service.name}</Link>: {sourceHealthMessage(service.sourceStatus)}</li>)}</ul> : <p>No source-checking warnings are shown for the currently published pilot entries.</p>}
    </section>
    <section aria-labelledby="meaning-heading">
      <h2 id="meaning-heading">What this means</h2>
      <p>A technical source check is separate from a human review of the information shown here. Navigator preserves the last reviewed publication when a source changes or cannot be checked. Always follow the publisher link on a service page before acting.</p>
      <p>Operational incidents and changes are recorded in the <a href="https://github.com/SayamDev/ORUK-Navigator/issues">public GitHub issue history</a>.</p>
    </section>
  </main>;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(value);
}
