// Real organisation facts used as the seed copy for print modules.
//
// Print section factories used to ship invented placeholders ("Acme Global",
// "Client 1", fictional contacts). Every default now reads from this one file so
// a freshly inserted module already carries our real organisation name, stats,
// credentials and expertise — and every field stays editable in the editor.

export const ORG_NAME = "TransPerfect";
export const ORG_LEGAL_NAME = "TransPerfect Global, Inc.";
export const ORG_URL = "transperfect.com";
export const ORG_EMAIL = "hello@transperfect.com";
export const ORG_FOUNDED = "1992";

/** Regional switchboards used by the global contact panel. */
export const ORG_REGIONS: { label: string; value: string }[] = [
  { label: "Americas", value: "+1 212 689 5555" },
  { label: "EMEA", value: "+44 20 7583 8690" },
  { label: "APAC", value: "+852 2159 9799" },
];

export type OrgStat = {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
};

/** Headline organisation numbers — safe, published figures. */
export const ORG_STATS: OrgStat[] = [
  { label: "Languages supported", value: "200", unit: "+", caption: "Every major market" },
  { label: "Cities with local teams", value: "140", unit: "+", caption: "Six continents" },
  { label: "Years of global delivery", value: "30", unit: "+", caption: `Founded ${ORG_FOUNDED}` },
  { label: "Employees worldwide", value: "10,000", unit: "+", caption: "In-house, not brokered" },
  { label: "Annual revenue", value: "$1.3", unit: "B", caption: "Privately held" },
  { label: "ISO-certified quality systems", value: "6", caption: "Independently audited" },
];

/** Certifications and compliance credentials we can state on collateral. */
export const ORG_CREDENTIALS: string[] = [
  "ISO 9001:2015",
  "ISO 17100:2015",
  "ISO 18587:2017",
  "ISO 13485:2016",
  "ISO 27001:2022",
  "SOC 2 Type II",
];

/** Capability spine — the five things we do on every programme. */
export const ORG_EXPERTISE: { label: string; icon: string }[] = [
  { label: "Strategy", icon: "sparkles" },
  { label: "Translate", icon: "globe-alt" },
  { label: "Automate", icon: "bolt" },
  { label: "Measure", icon: "trending" },
  { label: "Scale", icon: "target" },
];

/** What a managed TransPerfect programme includes. */
export const ORG_INCLUDED: string[] = [
  "24/7 global program management",
  "In-house linguists across 200+ languages",
  "GlobalLink automation and connectors",
  "ISO-certified quality and security controls",
];

/** Default contact block — a role, not an invented individual. */
export const ORG_CONTACT = {
  name: `${ORG_NAME} client services`,
  role: "Global program management",
  email: ORG_EMAIL,
  phone: ORG_REGIONS[0]!.value,
};
