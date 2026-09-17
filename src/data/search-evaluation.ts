export type SearchEvaluationCase = {
  id: string;
  query: string;
  expectedSlugs: string[];
  note: string;
};

/**
 * Source-backed v1 retrieval checks. Cases describe admitted catalogue facts;
 * they do not introduce eligibility, distance, availability, or invented needs.
 */
export const searchEvaluationCases: SearchEvaluationCase[] = [
  { id: "benefit-appeal", query: "I need help with a benefits appeal", expectedSlugs: ["welfare-rights"], note: "Benefit and appeal terms are present in the reviewed source." },
  { id: "debt-general", query: "I need debt advice", expectedSlugs: ["debt-advice", "welfare-rights"], note: "Both reviewed services explicitly cover debt." },
  { id: "rent-arrears", query: "Help with rent arrears", expectedSlugs: ["debt-advice"], note: "The reviewed debt source explicitly mentions rent arrears." },
  { id: "mortgage-arrears", query: "Mortgage arrears support", expectedSlugs: ["debt-advice"], note: "The reviewed debt source explicitly mentions mortgage arrears." },
  { id: "financial-crisis", query: "I am in a financial crisis", expectedSlugs: ["crisis-payments"], note: "The crisis source is explicitly about immediate financial crisis." },
  { id: "homeless", query: "I am homeless and need housing help", expectedSlugs: ["tameside-homelessness-service"], note: "The reviewed source is the council homelessness service." },
  { id: "losing-home", query: "I am at risk of losing my home", expectedSlugs: ["tameside-homelessness-service"], note: "The reviewed source covers people at risk of losing their home." },
  { id: "adult-mental-health", query: "Adult mental health support", expectedSlugs: ["adult-mental-health-services"], note: "The source explicitly covers adult mental-health support." },
  { id: "social-care-mental-health", query: "Mental health social care", expectedSlugs: ["adult-mental-health-services"], note: "The source is council adult social-care information." },
  { id: "rent-shortfall", query: "I need help paying a rent shortfall", expectedSlugs: ["housing-payments"], note: "The reviewed Housing Payments source covers rent shortfalls." },
  { id: "rent-deposit", query: "Help with a rent deposit", expectedSlugs: ["housing-payments"], note: "The reviewed Housing Payments source covers rent deposits." },
  { id: "carer", query: "I am a carer looking after my mum", expectedSlugs: ["tameside-carers-centre"], note: "The reviewed Carers Centre source supports people who look after someone." },
  { id: "family-hub", query: "Support for my family and baby", expectedSlugs: ["family-hubs"], note: "The reviewed Family Hubs source covers early help for families and infants." },
  { id: "grab-rails", query: "I need grab rails fitted at home", expectedSlugs: ["equipment-and-adaptations"], note: "The reviewed source lists grab rails as equipment." },
  { id: "stairs", query: "I am struggling with the stairs because of my disability", expectedSlugs: ["equipment-and-adaptations"], note: "The reviewed source covers stair rails and adaptations after assessment." },
  { id: "social-care-advice", query: "Adult social care advice after a hospital stay", expectedSlugs: ["adult-social-care-early-support"], note: "The reviewed hub is the first contact for adult social care, including after a hospital stay." },
  { id: "carer-suggestion", query: "I need support as a carer looking after someone", expectedSlugs: ["tameside-carers-centre"], note: "The common-search choice for carers must lead with the reviewed Carers Centre." },
  { id: "irrelevant", query: "Pet grooming", expectedSlugs: [], note: "An unrelated request must not produce a plausible-looking result." },
];
