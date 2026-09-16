import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/report-form";
import { prototypeServices } from "@/data/prototype-services";

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const service = prototypeServices.find((item) => item.slug === slug); if (!service) notFound();
  return <main id="main-content" className="shell report-page"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Find support</Link><span aria-hidden="true">/</span><Link href={`/services/${slug}`}>{service.name}</Link><span aria-hidden="true">/</span><span>Report a problem</span></nav><p className="eyebrow">Help improve the data</p><h1>Report a problem</h1><p className="lede">Tell us what appears wrong with the information for {service.name}.</p><div className="prototype-banner"><strong>This is a prototype</strong><p>Reports are validated in your browser but are not sent or stored yet.</p></div><ReportForm serviceName={service.name} /></main>;
}
