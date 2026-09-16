import type { CatalogueService } from "@/domain/catalogue";

const conceptPhrases: Record<string, string[]> = {
  "debt-support": ["debt", "debt advice", "money advice", "arrears"],
  "financial-support": ["money", "financial", "financial crisis", "benefits"],
  "housing-support": ["housing", "homeless", "homelessness", "losing my home"],
  "mental-health-support": ["mental health", "wellbeing", "social care"],
};

const ignoredWords = new Set(["a", "about", "advice", "and", "for", "help", "i", "need", "support", "the", "with"]);

export type CatalogueSearchResult = CatalogueService & {
  matchReasons: string[];
};

export function normaliseNeed(value: string): string {
  const normalised = value.normalize("NFKC").trim().replace(/\s+/gu, " ");

  if ([...normalised].length > 240) {
    throw new Error("Describe what you need in 240 characters or fewer.");
  }

  return normalised;
}

function matchingConcepts(query: string): Set<string> {
  const concepts = new Set<string>();

  for (const [concept, phrases] of Object.entries(conceptPhrases)) {
    if (phrases.some((phrase) => query.includes(phrase))) {
      concepts.add(concept);
    }
  }

  return concepts;
}

export function searchCatalogueServices(
  value: string,
  services: CatalogueService[],
): CatalogueSearchResult[] {
  const query = normaliseNeed(value).toLocaleLowerCase("en-GB");
  if (!query) return [];

  const concepts = matchingConcepts(query);
  const words = query
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !ignoredWords.has(word));

  return services
    .map((service) => {
      const fields = {
        name: service.name.toLocaleLowerCase("en-GB"),
        description: service.description.toLocaleLowerCase("en-GB"),
        area: service.serviceArea.toLocaleLowerCase("en-GB"),
        access: (service.accessSummary ?? "").toLocaleLowerCase("en-GB"),
        cost: (service.costSummary ?? "").toLocaleLowerCase("en-GB"),
      };
      const haystack = Object.values(fields).join(" ");
      const serviceConcepts = matchingConcepts(haystack);
      const conceptMatches = [...concepts].filter((concept) => serviceConcepts.has(concept));
      const lexicalMatches = words.filter((word) => haystack.includes(word));
      const matchedField = Object.entries(fields).find(([, text]) =>
        words.some((word) => text.includes(word)),
      )?.[0];

      return {
        service,
        score: conceptMatches.length * 10 + lexicalMatches.length,
        matchReason: explainMatch(conceptMatches, matchedField),
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.service.name.localeCompare(right.service.name, "en-GB"))
    .map(({ service, matchReason }) => ({
      ...service,
      matchReasons: [matchReason],
    }));
}

function explainMatch(concepts: string[], matchedField?: string): string {
  const conceptLabels: Record<string, string> = {
    "debt-support": "debt support",
    "financial-support": "financial support",
    "housing-support": "housing support",
    "mental-health-support": "mental-health support",
  };
  if (concepts[0]) {
    return `The reviewed service information mentions ${conceptLabels[concepts[0]]}.`;
  }
  const fieldLabels: Record<string, string> = {
    name: "service name",
    description: "description",
    area: "service area",
    access: "access information",
    cost: "cost information",
  };
  return `Your words match the reviewed ${fieldLabels[matchedField ?? "description"]}.`;
}
