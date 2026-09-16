export type PilotLocation = {
  kind: "tameside";
  label: "Tameside pilot area";
};

const tamesidePlaces = new Set([
  "ashton under lyne",
  "ashton-under-lyne",
  "audenshaw",
  "denton",
  "droylsden",
  "dukinfield",
  "hyde",
  "mossley",
  "stalybridge",
  "tameside",
]);

export function classifyPilotLocation(value: string): PilotLocation {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-GB");
  if (!normalized) throw new Error("Enter a Tameside town or postcode.");
  const compactPostcode = normalized.replace(/\s+/g, "").toUpperCase();
  if (tamesidePlaces.has(normalized) || /^(?:OL[5-7]|SK1[4-6])\d[A-Z]{2}$/.test(compactPostcode)) {
    return { kind: "tameside", label: "Tameside pilot area" };
  }
  throw new Error(
    "This pilot currently covers Tameside. Try Ashton-under-Lyne or a Tameside postcode.",
  );
}
