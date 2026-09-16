import { prototypeServices, type PrototypeService } from "@/data/prototype-services";

const conceptPhrases: Record<string, string[]> = {
  "debt-support": ["debt", "debt advice", "money advice", "arrears"],
  "financial-support": ["money", "financial", "financial crisis", "benefits"],
  "housing-support": ["housing", "homeless", "homelessness", "losing my home"],
  "mental-health-support": ["mental health", "wellbeing", "social care"],
};

const ignoredWords = new Set(["a", "about", "advice", "and", "for", "help", "i", "need", "support", "the", "with"]);

export type PrototypeSearchResult = PrototypeService & {
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

export function searchPrototypeServices(value: string): PrototypeSearchResult[] {
  const query = normaliseNeed(value).toLocaleLowerCase("en-GB");
  if (!query) return [];

  const concepts = matchingConcepts(query);
  const words = query
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !ignoredWords.has(word));

  return prototypeServices
    .map((service) => {
      const conceptMatches = service.concepts.filter((concept) => concepts.has(concept));
      const haystack = `${service.name} ${service.searchableText}`.toLocaleLowerCase("en-GB");
      const lexicalMatches = words.filter((word) => haystack.includes(word));

      return {
        service,
        score: conceptMatches.length * 10 + lexicalMatches.length,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.service.name.localeCompare(right.service.name, "en-GB"))
    .map(({ service }) => ({
      ...service,
      matchReasons: [service.matchReason],
    }));
}
