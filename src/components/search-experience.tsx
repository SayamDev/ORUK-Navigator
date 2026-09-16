"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { CatalogueService } from "@/domain/catalogue";
import { classifyPilotLocation } from "@/lib/location";
import { searchCatalogueServices, type CatalogueSearchResult } from "@/lib/search";
import { sourceHealthMessage } from "@/lib/source-health";

const searchSuggestions = [
  { label: "Benefits and money advice", query: "I need help with money and debt advice", keywords: ["benefit", "money", "welfare", "income", "financial"] },
  { label: "Debt and arrears", query: "I need help with debt, rent or mortgage arrears", keywords: ["debt", "arrears", "money", "rent", "mortgage", "bills"] },
  { label: "Emergency financial help", query: "I need emergency help with money", keywords: ["emergency", "crisis", "money", "payment", "food", "fuel"] },
  { label: "Housing and homelessness", query: "I need help with housing or homelessness", keywords: ["housing", "homeless", "home", "eviction", "landlord"] },
  { label: "Adult mental health", query: "I need help with my mental health", keywords: ["mental", "health", "anxiety", "depression", "wellbeing"] },
] as const;

export function SearchExperience({ services }: { services: CatalogueService[] }) {
  const [results, setResults] = useState<CatalogueSearchResult[] | null>(null);
  const [need, setNeed] = useState("");
  const [place, setPlace] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"need" | "place">("need");
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const needRef = useRef<HTMLTextAreaElement>(null);
  const firstSuggestionRef = useRef<HTMLButtonElement>(null);
  const normalisedNeed = need.trim().toLowerCase();
  const needTerms = normalisedNeed.split(/[^a-z0-9]+/).filter((term) => term.length >= 3);
  const isFiltering = normalisedNeed.length >= 2;
  const suggestionsVisible = showAllTopics || isFiltering;
  const visibleSuggestions = showAllTopics && !isFiltering
    ? searchSuggestions
    : searchSuggestions.filter((suggestion) => suggestion.keywords.some((keyword) =>
        needTerms.some((term) => keyword.includes(term) || term.includes(keyword)),
      ));

  useEffect(() => {
    if (showAllTopics && !isFiltering) firstSuggestionRef.current?.focus();
  }, [isFiltering, showAllTopics]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!need.trim()) {
        setErrorField("need");
        throw new Error("Tell us what support you are looking for.");
      }
      if (place.trim()) {
        try {
          classifyPilotLocation(place);
        } catch (locationError) {
          setErrorField("place");
          throw locationError;
        }
      }
      const next = searchCatalogueServices(need, services);
      setError("");
      setResults(next);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    } catch (caught) {
      setResults(null);
      setError(caught instanceof Error ? caught.message : "Check your search and try again.");
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <main id="main-content" className="shell home-page">
      <section className="home-intro" aria-labelledby="home-heading">
        <div className="home-heading-row">
          <div className="home-copy">
            <h1 id="home-heading">Find support in Tameside</h1>
            <p className="home-lede">Search a small, reviewed selection of Tameside Council information.<br /> Check important details with the original source.</p>
          </div>
          <div className="route-signature" aria-hidden="true"><span className="route-caption">A clearer<br />route to<br />support</span></div>
        </div>

        <form id="find-support" className="home-search-form" method="post" onSubmit={submit} noValidate>
          {error && <div ref={errorRef} className="error-summary" role="alert" tabIndex={-1}><strong>There is a problem</strong><a href={`#${errorField}`}>{error}</a></div>}
          <div className="search-form-grid">
            <div className="field need-field">
              <label htmlFor="need">What support are you looking for?</label>
              <p id="need-hint">Use your own words. Do not include names or private details.</p>
              <textarea ref={needRef} id="need" name="need" rows={4} maxLength={240} autoComplete="off" placeholder="Debt advice, housing, mental health..." aria-describedby={suggestionsVisible ? "need-hint suggestion-guidance" : "need-hint"} value={need} onChange={(event) => setNeed(event.target.value)} />
              {suggestionsVisible && (
                <div id="support-types" className="search-suggestions" aria-labelledby="suggestions-heading">
                  <p id="suggestions-heading" className="suggestions-heading" aria-live="polite">{isFiltering ? `Suggestions for "${need.trim()}"` : "Support types in this pilot"}</p>
                  {visibleSuggestions.length > 0 ? (
                    <div className="suggestion-list">
                      {visibleSuggestions.map((suggestion, index) => (
                        <button ref={index === 0 ? firstSuggestionRef : undefined} key={suggestion.label} className="suggestion-button" type="button" onClick={() => { setNeed(suggestion.query); setError(""); setResults(null); needRef.current?.focus(); }}>{suggestion.label}</button>
                      ))}
                    </div>
                  ) : <p className="suggestions-empty">No matching topic is listed. You can still search in your own words.</p>}
                  <p id="suggestion-guidance" className="suggestion-guidance">These topics reflect the services currently reviewed in this pilot.</p>
                </div>
              )}
            </div>

            <div className="search-form-side">
              <div className="field location-field">
                <label htmlFor="place">Town or postcode <span>(optional)</span></label>
                <p id="place-hint">Used once to identify your area. We do not save it.</p>
                <input id="place" name="place" autoComplete="postal-code" aria-describedby="place-hint" placeholder="OL6 6BH" value={place} onChange={(event) => setPlace(event.target.value)} />
              </div>
              <button className="button button-primary search-submit" type="submit">Find support</button>
            </div>
          </div>

          <div className="pilot-strip">
            <div><strong>This pilot does not include every Tameside service.</strong><Link href="/about#what-is-included">See what is included</Link></div>
            <button className="pilot-link" type="button" aria-expanded={showAllTopics} aria-controls="support-types" onClick={() => setShowAllTopics(true)}>Browse support types</button>
          </div>
        </form>
      </section>

      {results !== null ? (
        <section className="results" aria-labelledby="results-heading">
          <div ref={summaryRef} tabIndex={-1} className="results-heading-row"><div><p className="eyebrow">Reviewed pilot results</p><h2 id="results-heading">Support that may help</h2></div><p aria-live="polite">{results.length} {results.length === 1 ? "service" : "services"}</p></div>
          <p className="results-caveat">These are relevance matches, not eligibility or availability decisions. Check the publisher’s source before acting.</p>
          {results.length ? <div className="result-list">{results.map((service) => (
            <article className="result-card" key={service.slug}>
              <p className="result-publisher">{service.providerName}</p><h3><Link href={`/services/${service.slug}`}>{service.name}</Link></h3><p>{service.description}</p>
              {sourceHealthMessage(service.sourceStatus) && <p className="health-notice"><strong>Source check:</strong> {sourceHealthMessage(service.sourceStatus)}</p>}
              <dl><div><dt>Area</dt><dd>{service.serviceArea}</dd></div><div><dt>Cost</dt><dd>{service.costSummary ?? "Information not provided"}</dd></div></dl>
              <details><summary>Why this matched</summary><p>{service.matchReasons[0]}</p></details>
              <div className="card-actions"><Link className="text-link" href={`/services/${service.slug}`}>View service details <span aria-hidden="true">→</span></Link><span>Source checked {formatCheckedDate(service.sourceCheckedAt)}</span></div>
            </article>
          ))}</div> : <div className="empty-state"><h3>No reviewed matches found</h3><p>Try a more general description such as debt, housing or mental health. The pilot only contains five services.</p></div>}
        </section>
      ) : (
        <section id="how-it-works" className="how-it-works" aria-labelledby="how-heading">
          <h2 id="how-heading">How it works</h2><p className="section-lede">A simple way to find and explore support in Tameside.</p>
          <div className="steps">
            <article><span>1</span><div><h3>Describe your need</h3><p>Use your own words to tell us what kind of support you’re looking for.</p></div></article>
            <article><span>2</span><div><h3>Review source-backed matches</h3><p>We’ll show a small, reviewed selection of information from Tameside Council.</p></div></article>
            <article><span>3</span><div><h3>Check with the publisher</h3><p>Follow the links to the original source to confirm details and take the next step.</p></div></article>
          </div>
        </section>
      )}
    </main>
  );
}

function formatCheckedDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(value));
}
