import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/report-form";
import { publicCorrectionsAreEnabled } from "@/server/operations/corrections-availability";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!publicCorrectionsAreEnabled()) notFound();
  const { slug } = await params; const service = await getCatalogueRepository().findActiveBySlug(slug); if (!service) notFound();
  return <main id="main-content" className="shell report-page"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Find support</Link><span aria-hidden="true">/</span><Link href={`/services/${slug}`}>{service.name}</Link><span aria-hidden="true">/</span><span>Report a problem</span></nav><p className="eyebrow">Help improve the data</p><h1>Report a problem</h1><p className="lede">Tell us what appears wrong with the information for {service.name}.</p><div className="prototype-banner"><strong>Catalogue corrections only</strong><p>Do not use this form to ask for support or include personal information. Reports are stored for human review.</p></div><ReportForm serviceName={service.name} entryPublicId={service.publicId} /></main>;
}
