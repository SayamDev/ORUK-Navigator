import { NextRequest, NextResponse } from "next/server";

import { tamesideSourceManifest } from "@/ingestion/source-manifest";
import { isAuthorizedReviewRequest } from "@/server/operations/review-authorization";
import { getIngestionRepository } from "@/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "cache-control": "no-store" };
const candidateIdPattern = /^[1-9][0-9]{0,18}$/;
const hashPattern = /^[0-9a-f]{64}$/;
const reviewerPattern = /^[A-Za-z0-9_-]{1,39}$/;

export async function POST(request: NextRequest) {
  if (!isAuthorizedReviewRequest(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401, headers });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "A review decision is required." }, { status: 400, headers });
  }

  const { candidateId, decision, reason, reviewer, expectedHash } = body;
  if (typeof candidateId !== "string" || !candidateIdPattern.test(candidateId)
    || BigInt(candidateId) > 9223372036854775807n
    || !["approved", "rejected", "changes_requested"].includes(String(decision))
    || typeof reason !== "string" || reason.trim().length < 20 || reason.length > 500
    || typeof reviewer !== "string" || !reviewerPattern.test(reviewer)) {
    return NextResponse.json({ error: "Candidate, decision, reason or reviewer is invalid." }, { status: 400, headers });
  }

  const repository = getIngestionRepository();
  const candidate = await repository.findPendingReviewCandidate(candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Pending candidate not found." }, { status: 404, headers });
  }

  if (decision === "approved") {
    const source = tamesideSourceManifest[candidate.sourceKey as keyof typeof tamesideSourceManifest];
    const payload = candidate.normalizedPayload;
    if (typeof expectedHash !== "string" || !hashPattern.test(expectedHash)
      || expectedHash !== candidate.candidateHash || !source
      || candidate.canonicalUrl !== source.canonicalUrl
      || candidate.adapterVersion !== source.adapterVersion
      || candidate.rulesVersion !== source.rulesVersion
      || !candidate.sourceApproved || !candidate.isLatestCheck
      || !candidate.isContractValid || !candidate.hasRequiredEvidence
      || !["changed", "healthy"].includes(candidate.sourceHealth)
      || !isReviewedServicePayload(payload, source.publisherName, candidate.sourceKey)) {
      return NextResponse.json({ error: "Candidate is not safe to approve. Recheck the source and review evidence." }, { status: 409, headers });
    }

    const result = await repository.approveCandidate({
      candidateId,
      entrySlug: candidate.sourceKey,
      reviewer: `GitHub:${reviewer}`,
      reason: reason.trim(),
      publication: {
        name: payload.name as string,
        description: payload.description as string,
        providerName: source.publisherName,
        sourceStatus: "healthy",
        sourceCheckedAt: new Date(candidate.retrievedAt),
        accessSummary: payload.access as string,
        ...(typeof payload.cost === "string" ? { costSummary: payload.cost } : {}),
        completenessBand: "partial",
        completenessInputs: { name: true, description: true, area: true, access: true },
        document: { area: payload.area },
        authoritativeSourceUrl: source.canonicalUrl,
      },
    });
    await repository.projectPublication(result.publicationId);
    return NextResponse.json({ status: "approved", versionNumber: result.versionNumber }, { headers });
  }

  await repository.recordDisposition({
    candidateId,
    decision: decision as "rejected" | "changes_requested",
    reviewer: `GitHub:${reviewer}`,
    reason: reason.trim(),
  });
  return NextResponse.json({ status: decision }, { headers });
}

function isReviewedServicePayload(
  payload: Record<string, unknown>,
  publisherName: string,
  sourceKey: string,
): boolean {
  const validText = (value: unknown, max: number) =>
    typeof value === "string" && value.trim().length >= 3 && value.length <= max;
  return payload.slug === sourceKey
    && payload.providerName === publisherName
    && validText(payload.name, 200)
    && validText(payload.description, 2000)
    && validText(payload.area, 500)
    && validText(payload.access, 1000)
    && (payload.cost === undefined || validText(payload.cost, 500));
}
