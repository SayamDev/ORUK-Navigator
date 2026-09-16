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

export function ReportForm({ serviceName }: { serviceName: string }) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = validateReport({ problem: String(data.get("problem") ?? ""), details: String(data.get("detail") ?? "") });
    const firstError = result.problem ?? result.details;
    if (firstError) { setError(firstError); return; }
    setError(""); setSent(true);
  }

  if (sent) return <div className="confirmation" role="status"><p className="eyebrow">Prototype confirmation</p><h2>Thank you for flagging this</h2><p>This prototype does not send or store reports yet. Your feedback has not left this browser.</p></div>;

  return <form className="report-form" onSubmit={submit} noValidate>
    {error && <div className="error-summary" role="alert"><strong>There is a problem</strong><a href="#problem-incorrect">{error}</a></div>}
    <fieldset><legend>What is wrong?</legend><p>Select the option that best describes the problem with {serviceName}.</p>
      {choices.map(([value, label]) => <div className="radio" key={value}><input id={`problem-${value}`} name="problem" value={value} type="radio" /><label htmlFor={`problem-${value}`}>{label}</label></div>)}
    </fieldset>
    <div className="field"><label htmlFor="detail">Tell us more <span>(optional)</span></label><p id="detail-hint">Do not include personal or sensitive information. Maximum 1,000 characters.</p><textarea id="detail" name="detail" rows={6} maxLength={1000} aria-describedby="detail-hint" /></div>
    <button className="button button-primary" type="submit">Send report</button>
  </form>;
}
