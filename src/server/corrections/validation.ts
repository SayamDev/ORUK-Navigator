import {
  correctionCategories,
  type CorrectionCategory,
} from "@/domain/operations-repository";

export type CorrectionRequest = {
  entryPublicId: string;
  category: CorrectionCategory;
  detail: string | null;
  honeypotTriggered: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCorrectionRequest(value: unknown): CorrectionRequest | null {
  if (!isRecord(value)) return null;

  const entryPublicId = typeof value.entryPublicId === "string" ? value.entryPublicId : "";
  const rawCategory = typeof value.category === "string" ? value.category : "";
  const category = rawCategory === "wrong-service" ? "wrong_service" : rawCategory;
  const rawDetail = typeof value.detail === "string" ? value.detail : "";
  const detail = rawDetail.normalize("NFKC").trim();

  if (!uuidPattern.test(entryPublicId)) return null;
  if (!correctionCategories.includes(category as CorrectionCategory)) return null;
  if ([...detail].length > 1000) return null;
  if (value.website !== undefined && typeof value.website !== "string") return null;

  return {
    entryPublicId,
    category: category as CorrectionCategory,
    detail: detail || null,
    honeypotTriggered: Boolean(value.website),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
