"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

import type { CatalogueService } from "@/domain/catalogue";
import { searchCatalogueServices, type CatalogueSearchResult } from "@/lib/search";

export function SearchExperience({ services }: { services: CatalogueService[] }) {
  const [results, setResults] = useState<CatalogueSearchResult[] | null>(null);
  const [need, setNeed] = useState("");
  const [place, setPlace] = useState("Ashton-under-Lyne");
  const [error, setError] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!need.trim()) throw new Error("Tell us what support you are looking for.");
      const next = searchCatalogueServices(need, services);
      setError("");
      setResults(next);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    } catch (caught) {
      setResults(null);
      setError(caught instanceof Error ? caught.message : "Check your search and try again.");
    }
  }

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Independent public-service discovery</p>
            <h1>Find support in Tameside</h1>
            <p className="lede">Describe what is happening in your own words. We will look across a small set of reviewed council sources.</p>
            <div className="pilot-note"><strong>Limited pilot</strong><span>This prototype currently covers five reviewed Tameside services. It is not an emergency service.</span></div>
          </div>
          <div className="route-motif" aria-hidden="true"><span /><span /><span /><span /></div>
        </div>
      </section>

      <main id="main-content" className="shell search-main">
        <form className="search-panel" onSubmit={submit} noValidate>
          {error && <div className="error-summary" role="alert" tabIndex={-1}><strong>There is a problem</strong><a href="#need">{error}</a></div>}
          <div className="field">
            <label htmlFor="need">What support are you looking for?</label>
            <p id="need-hint">For example, “I need help with money and debt advice.”</p>
            <textarea id="need" name="need" rows={3} maxLength={240} aria-describedby="need-hint" value={need} onChange={(event) => setNeed(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="place">Where do you need support?</label>
            <p id="place-hint">Enter a town or postcode. This pilot is limited to Tameside.</p>
            <input id="place" name="place" autoComplete="postal-code" aria-describedby="place-hint" value={place} onChange={(event) => setPlace(event.target.value)} />
          </div>
          <button className="button button-primary" type="submit">Find support <span aria-hidden="true">→</span></button>
          <p className="privacy-note">Your search stays in this browser prototype and is not added to the page address.</p>
        </form>

        {results !== null ? (
          <section className="results" aria-labelledby="results-heading">
            <div ref={summaryRef} tabIndex={-1} className="results-heading-row">
              <div><p className="eyebrow">Reviewed pilot results</p><h2 id="results-heading">Support that may help</h2></div>
              <p aria-live="polite">{results.length} {results.length === 1 ? "service" : "services"}</p>
            </div>
            <p className="results-caveat">These are relevance matches, not eligibility or availability decisions. Check the publisher’s source before acting.</p>
            {results.length ? <div className="result-list">{results.map((service) => (
              <article className="result-card" key={service.slug}>
                <p className="result-publisher">{service.providerName}</p>
                <h3><Link href={`/services/${service.slug}`}>{service.name}</Link></h3>
                <p>{service.description}</p>
                <dl><div><dt>Area</dt><dd>{service.serviceArea}</dd></div><div><dt>Cost</dt><dd>{service.costSummary ?? "Information not provided"}</dd></div></dl>
                <details><summary>Why this matched</summary><p>{service.matchReasons[0]}</p></details>
                <div className="card-actions"><Link className="text-link" href={`/services/${service.slug}`}>View service details <span aria-hidden="true">→</span></Link><span>Source checked {formatCheckedDate(service.sourceCheckedAt)}</span></div>
              </article>
            ))}</div> : <div className="empty-state"><h3>No reviewed matches found</h3><p>Try a more general description such as debt, housing or mental health. The pilot only contains five services.</p></div>}
          </section>
        ) : (
          <section className="how-it-works" aria-labelledby="how-heading"><p className="eyebrow">A transparent route</p><h2 id="how-heading">How it works</h2><div className="steps"><article><span>1</span><h3>Describe your need</h3><p>Use everyday language. No account is required.</p></article><article><span>2</span><h3>Review the reasons</h3><p>See which source fields contributed to a match.</p></article><article><span>3</span><h3>Check the source</h3><p>Confirm current details with the publisher.</p></article></div></section>
        )}
      </main>
    </>
  );
}

function formatCheckedDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}
