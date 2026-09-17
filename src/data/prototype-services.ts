export type PrototypeService = {
  slug: string;
  name: string;
  summary: string;
  concepts: string[];
  searchableText: string;
  matchReason: string;
  publisher: string;
  sourceUrl: string;
  checkedOn: string;
  cost?: string;
  serviceArea: string;
  accessSummary: string;
};

/**
 * Reviewed prototype fixtures derived from the provisional source manifest.
 * They are intentionally incomplete and must not be presented as live availability.
 */
export const prototypeServices: PrototypeService[] = [
  {
    slug: "welfare-rights",
    name: "Welfare Rights",
    summary:
      "Free advice about benefits, debt and related support for Tameside residents.",
    concepts: ["debt-support", "financial-support"],
    searchableText:
      "benefits welfare debt money financial appeals forms advice free",
    matchReason: "The service description mentions debt advice.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights",
    checkedOn: "15 September 2026",
    cost: "Free",
    serviceArea: "Tameside residents",
    accessSummary: "Use the council source page for current contact and request options.",
  },
  {
    slug: "debt-advice",
    name: "Debt Advice",
    summary:
      "Council debt advice, including help with mortgage or rent arrears.",
    concepts: ["debt-support"],
    searchableText: "debt money mortgage rent arrears court advice free",
    matchReason:
      "Your words ‘money advice’ match the reviewed category Debt support.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights/debt-advice",
    checkedOn: "15 September 2026",
    cost: "Free",
    serviceArea: "Tameside council service",
    accessSummary: "Use the council source page for current referral and telephone options.",
  },
  {
    slug: "crisis-payments",
    name: "Crisis Payments",
    summary:
      "Short-term help for Tameside residents facing an immediate financial crisis.",
    concepts: ["financial-support"],
    searchableText: "money financial crisis emergency payment short term",
    matchReason: "The source describes financial crisis support.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/crisis-payments",
    checkedOn: "15 September 2026",
    serviceArea: "Tameside residents or people about to become residents",
    accessSummary: "Use the council source page for the current application route.",
  },
  {
    slug: "tameside-homelessness-service",
    name: "Tameside Homelessness Service",
    summary:
      "Council information for people who are homeless or at risk of losing their home.",
    concepts: ["housing-support"],
    searchableText: "housing homeless homelessness home eviction prevention",
    matchReason: "The service description mentions homelessness support.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/housing/housing-and-homelessness/tameside-homeless-service",
    checkedOn: "15 September 2026",
    serviceArea: "People seeking homelessness help from Tameside Council",
    accessSummary: "Use the council source page for current contact, referral and emergency routes.",
  },
  {
    slug: "adult-mental-health-services",
    name: "Adult Mental Health Services",
    summary:
      "Council adult social-care information about mental-health support in Tameside.",
    concepts: ["mental-health-support"],
    searchableText: "adult mental health social care wellbeing support",
    matchReason: "The service description mentions adult mental-health support.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/adults/care-and-support/types-of-support/adult-mental-health-services",
    checkedOn: "15 September 2026",
    serviceArea: "Adult social-care support in Tameside",
    accessSummary: "Use the council source page for current referral and urgent-help information.",
  },
  {
    slug: "housing-payments",
    name: "Housing Payments",
    summary:
      "Discretionary council payments towards housing costs, such as rent shortfalls, deposits or rent in advance.",
    concepts: ["housing-support", "financial-support"],
    searchableText: "housing costs rent shortfall deposit rent in advance benefit cap discretionary payment",
    matchReason: "The service description mentions help with housing costs.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments",
    checkedOn: "17 September 2026",
    serviceArea: "People entitled to Housing Benefit or Universal Credit housing costs",
    accessSummary: "Use the council source page for the current online application route.",
  },
  {
    slug: "tameside-carers-centre",
    name: "Tameside Carers Centre",
    summary:
      "Information, advice and wellbeing support for people who look after someone, including drop-in sessions.",
    concepts: ["carer-support"],
    searchableText: "carer carers unpaid care looking after someone drop in wellbeing advice carers allowance",
    matchReason: "The service description mentions support for carers.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/adults/what-support-is-available/carers",
    checkedOn: "17 September 2026",
    serviceArea: "People in Tameside who look after someone",
    accessSummary: "Use the council source page for current drop-in times and contact details.",
  },
  {
    slug: "family-hubs",
    name: "Family Hubs",
    summary:
      "Early help for children, young people, parents and carers, including infant feeding and perinatal mental health support.",
    concepts: ["family-support"],
    searchableText: "family families children parents baby infant feeding early help send young people",
    matchReason: "The service description mentions family support.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/children-and-families/family-hubs",
    checkedOn: "17 September 2026",
    serviceArea: "Families with children aged 0 to 19, or up to 25 with SEND",
    accessSummary: "Use the council source page for your neighbourhood Family Hub and opening times.",
  },
  {
    slug: "equipment-and-adaptations",
    name: "Equipment and Adaptations",
    summary:
      "Equipment and home adaptations such as grab rails, stair rails or level access showers to help adults live independently at home.",
    concepts: ["independent-living-support", "adult-social-care"],
    searchableText: "equipment adaptations disability grab rails stair lift level access shower occupational therapist",
    matchReason: "The service description mentions equipment and home adaptations.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/adults/equipment-and-adaptations",
    checkedOn: "17 September 2026",
    serviceArea: "Adults in Tameside, following an assessment for care and support",
    accessSummary: "Use the council source page to request an assessment through adult social care.",
  },
  {
    slug: "adult-social-care-early-support",
    name: "Early Support and Advice Hub",
    summary:
      "The first point of contact for information and advice about adult social care, including help with everyday tasks at home.",
    concepts: ["adult-social-care", "carer-support"],
    searchableText: "adult social care everyday tasks washing cooking hospital stay look after someone advice",
    matchReason: "The service description mentions adult social care advice.",
    publisher: "Tameside Metropolitan Borough Council",
    sourceUrl: "https://www.tameside.gov.uk/adultservices/contact-us",
    checkedOn: "17 September 2026",
    serviceArea: "Adults in Tameside, carers and professionals",
    accessSummary: "Use the council source page for current telephone hours and out-of-hours help.",
  },
];
