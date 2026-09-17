import type { CatalogueService } from "@/domain/catalogue";

const conceptPhrases: Record<string, string[]> = {
  "debt-support": ["debt", "debt advice", "money advice", "arrears"],
  "financial-support": ["money", "financial help", "financial support", "financial crisis", "financial shock", "benefits"],
  "housing-support": ["housing", "homeless", "homelessness", "losing my home", "rent shortfall", "deposit"],
  "mental-health-support": ["mental health", "wellbeing"],
  "carer-support": ["carer", "caring for", "look after someone", "looking after someone"],
  "family-support": ["family", "families", "parent", "child", "baby", "pregnan"],
  "independent-living-support": ["equipment", "adaptation", "grab rail", "stair", "disability", "disabled", "live independently"],
  "adult-social-care": ["social care", "social-care", "everyday tasks", "hospital stay", "care and support"],
};

const ignoredWords = new Set([
  "a", "about", "advice", "after", "am", "an", "and", "at", "be", "for", "help", "i", "im", "in", "is", "it",
  "me", "my", "need", "of", "on", "or", "support", "the", "to", "with",
]);

// Words match at the start of a source word, so "carer" finds "carers" but "rent" never finds "current".
function containsWordPrefix(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${word}`, "u").test(text);
}

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
      const lexicalMatches = words.filter((word) => containsWordPrefix(haystack, word));
      const nameMatches = words.filter((word) => containsWordPrefix(fields.name, word));
      const matchedField = Object.entries(fields).find(([, text]) =>
        words.some((word) => containsWordPrefix(text, word)),
      )?.[0];

      return {
        service,
        score: conceptMatches.length * 10 + lexicalMatches.length + nameMatches.length * 2,
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
    "carer-support": "support for carers",
    "family-support": "family support",
    "independent-living-support": "equipment and adaptations for independent living",
    "adult-social-care": "adult social care",
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
