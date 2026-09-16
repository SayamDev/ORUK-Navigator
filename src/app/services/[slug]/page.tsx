import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prototypeServices } from "@/data/prototype-services";

export function generateStaticParams() { return prototypeServices.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const service = prototypeServices.find((item) => item.slug === slug);
  return { title: service?.name ?? "Service not found" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const service = prototypeServices.find((item) => item.slug === slug); if (!service) notFound();
  return <main id="main-content" className="shell detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Find support</Link><span aria-hidden="true">/</span><span>{service.name}</span></nav>
    <div className="detail-grid"><article>
      <p className="eyebrow">{service.publisher}</p><h1>{service.name}</h1><p className="lede">{service.summary}</p>
      <a className="button button-primary" href={service.sourceUrl}>Check current details on the council website <span aria-hidden="true">↗</span></a>
      <div className="source-warning"><strong>Before you act</strong><p>This pilot copy was checked on {service.checkedOn}. The publisher’s page is the source of truth for current access, eligibility and contact details.</p></div>
      <section><h2>Overview</h2><p>{service.summary}</p></section>
      <section><h2>Who it helps</h2><p>{service.serviceArea}</p></section>
      <section><h2>How to access</h2><p>{service.accessSummary}</p></section>
      <section><h2>Cost</h2><p>{service.cost ?? "Information not provided by the reviewed source."}</p></section>
      <section><h2>Contact, opening times and accessibility</h2><p>Check the publisher’s source page. This prototype does not reproduce details that may change quickly.</p></section>
    </article><aside aria-label="Match and source information">
      <section className="aside-card"><p className="eyebrow">Why this matched</p><p>{service.matchReason}</p><p className="small">This reason comes from reviewed source text. It is not an eligibility decision.</p></section>
      <section className="aside-card"><h2>Source and provenance</h2><dl><div><dt>Publisher</dt><dd>{service.publisher}</dd></div><div><dt>Source checked</dt><dd>{service.checkedOn}</dd></div><div><dt>Licence</dt><dd>Open Government Licence v3.0, subject to publisher exclusions</dd></div></dl><a href={service.sourceUrl}>View original source <span aria-hidden="true">↗</span></a></section>
      <Link className="report-link" href={`/services/${service.slug}/report`}>Report a problem with this information</Link>
    </aside></div>
  </main>;
}
