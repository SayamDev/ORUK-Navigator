"use client";

import { FormEvent, useState } from "react";

import { validateReport } from "@/lib/report";

const choices = [
  ["incorrect", "Contact details are wrong"],
  ["outdated", "Service information is out of date"],
  ["closed", "This service may have closed"],
  ["wrong-service", "This information is for a different service"],
  ["other", "Something else"],
] as const;

export function ReportForm({ serviceName, entryPublicId }: { serviceName: string; entryPublicId: string }) {
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = validateReport({ problem: String(data.get("problem") ?? ""), details: String(data.get("detail") ?? "") });
    const firstError = result.problem ?? result.details;
    if (firstError) { setError(firstError); return; }
    setError(""); setSending(true);
    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryPublicId, category: data.get("problem"), detail: data.get("detail"), website: data.get("website") }),
      });
      const payload = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !payload.reference) throw new Error(payload.error ?? "The report could not be saved.");
      setReference(payload.reference);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report could not be saved. Try again later.");
    } finally {
      setSending(false);
    }
  }

  if (reference) return <div className="confirmation" role="status"><p className="eyebrow">Report received</p><h2>Thank you for flagging this</h2><p>A maintainer will review the catalogue information. Your reference is <strong>{reference}</strong>.</p><p>We cannot provide an outcome because this form does not collect contact details.</p></div>;

  return <form className="report-form" onSubmit={submit} noValidate>
    {error && <div className="error-summary" role="alert"><strong>There is a problem</strong><a href="#problem-incorrect">{error}</a></div>}
    <fieldset><legend>What is wrong?</legend><p>Select the option that best describes the problem with {serviceName}.</p>
      {choices.map(([value, label]) => <div className="radio" key={value}><input id={`problem-${value}`} name="problem" value={value} type="radio" /><label htmlFor={`problem-${value}`}>{label}</label></div>)}
    </fieldset>
    <div className="field"><label htmlFor="detail">Tell us more <span>(optional)</span></label><p id="detail-hint">Do not include personal or sensitive information. Maximum 1,000 characters.</p><textarea id="detail" name="detail" rows={6} maxLength={1000} aria-describedby="detail-hint" /></div>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Leave this blank</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    <button className="button button-primary" type="submit" disabled={sending}>{sending ? "Sending…" : "Send report"}</button>
  </form>;
}
