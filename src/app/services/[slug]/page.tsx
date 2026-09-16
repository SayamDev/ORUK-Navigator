import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCatalogueRepository } from "@/server/repositories";
import { sourceHealthMessage } from "@/lib/source-health";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const service = await getCatalogueRepository().findActiveBySlug(slug);
  return { title: service?.name ?? "Service not found" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const service = await getCatalogueRepository().findActiveBySlug(slug); if (!service) notFound();
  const sourceUrl = service.actions.find((action) => action.kind === "authoritative_details")?.url;
  const checkedOn = formatCheckedDate(service.sourceCheckedAt);
  const healthMessage = sourceHealthMessage(service.sourceStatus);
  return <main id="main-content" className="shell detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Find support</Link><span aria-hidden="true">/</span><span>{service.name}</span></nav>
    <div className="detail-grid"><article>
      <p className="eyebrow">{service.providerName}</p><h1>{service.name}</h1><p className="lede">{service.description}</p>
      {sourceUrl && <a className="button button-primary" href={sourceUrl}>Check current details on the council website <span aria-hidden="true">↗</span></a>}
      <div className="source-warning"><strong>Before you act</strong><p>This pilot copy was checked on {checkedOn}. The publisher’s page is the source of truth for current access, eligibility and contact details.</p></div>
      {healthMessage && <div className="health-notice" role="status"><strong>Source check</strong><p>{healthMessage}</p></div>}
      <section><h2>Overview</h2><p>{service.description}</p></section>
      <section><h2>Who it helps</h2><p>{service.serviceArea}</p></section>
      <section><h2>How to access</h2><p>{service.accessSummary ?? "Information not provided by the reviewed source."}</p></section>
      <section><h2>Cost</h2><p>{service.costSummary ?? "Information not provided by the reviewed source."}</p></section>
      <section><h2>Contact, opening times and accessibility</h2><p>Check the publisher’s source page. This prototype does not reproduce details that may change quickly.</p></section>
    </article><aside aria-label="Match and source information">
      <section className="aside-card"><h2>Source and provenance</h2><dl><div><dt>Publisher</dt><dd>{service.providerName}</dd></div><div><dt>Source checked</dt><dd>{checkedOn}</dd></div><div><dt>Licence</dt><dd>Open Government Licence v3.0, subject to publisher exclusions</dd></div></dl>{sourceUrl && <a href={sourceUrl}>View original source <span aria-hidden="true">↗</span></a>}</section>
      <Link className="report-link" href={`/services/${service.slug}/report`}>Report a problem with this information</Link>
    </aside></div>
  </main>;
}

function formatCheckedDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(value));
}
