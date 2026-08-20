// Global office list extracted verbatim from the source Solutions Proposal
// template (slide 5). `prod: true` marks a "client service & production" city,
// which the template sets in the teal accent; the rest are client-service only.

export type ProposalCity = { name: string; prod: boolean };

export type ProposalRegion = {
  region: string;
  columns: ProposalCity[][];
};

export const PROPOSAL_TEAL = "#3BBEB6";

export const PROPOSAL_REGIONS: ProposalRegion[] = [
  {
    region: "AMERICAS",
    columns: [
      [{ name: "Asheville", prod: false }, { name: "Atlanta", prod: true }, { name: "Alajuela", prod: false }, { name: "Austin", prod: true }, { name: "Boston", prod: true }, { name: "Boulder", prod: false }, { name: "Buenos Aires", prod: false }, { name: "Chicago", prod: true }, { name: "Cleveland", prod: true }, { name: "Charlotte", prod: false }, { name: "Columbus", prod: false }, { name: "Corvallis", prod: false }, { name: "Cupertino", prod: false }],
      [{ name: "Dallas", prod: true }, { name: "Denver", prod: false }, { name: "Durham", prod: false }, { name: "El Paso", prod: false }, { name: "Hartford", prod: false }, { name: "Honolulu", prod: true }, { name: "Houston", prod: true }, { name: "Las Vegas", prod: false }, { name: "Los Angeles", prod: true }, { name: "Maynard", prod: false }, { name: "Medellín", prod: false }, { name: "Mexico City", prod: false }, { name: "Miami", prod: true }],
      [{ name: "Milwaukee", prod: false }, { name: "Minneapolis", prod: false }, { name: "Montreal", prod: false }, { name: "New York", prod: true }, { name: "Newark", prod: true }, { name: "Newport Beach", prod: true }, { name: "Newton", prod: false }, { name: "Orlando", prod: false }, { name: "Philadelphia", prod: true }, { name: "Phoenix", prod: false }, { name: "Pittsburgh", prod: false }, { name: "Portland", prod: false }, { name: "Princeton", prod: false }],
      [{ name: "Research Triangle Park", prod: false }, { name: "Reston", prod: true }, { name: "Richmond", prod: false }, { name: "Rochester", prod: false }, { name: "San Diego", prod: false }, { name: "Santo Domingo", prod: false }, { name: "San Francisco", prod: true }, { name: "San José", prod: false }, { name: "San Juan", prod: false }, { name: "São Paulo", prod: false }, { name: "Seattle", prod: false }, { name: "Sioux Falls", prod: false }, { name: "Taos", prod: false }],
      [{ name: "Tampa", prod: false }, { name: "Toronto", prod: true }, { name: "Vancouver", prod: false }, { name: "Washington, DC", prod: true }, { name: "West Palm Beach", prod: false }, { name: "Wilmington", prod: false }, { name: "York", prod: false }],
    ],
  },
  {
    region: "EMEA",
    columns: [
      [{ name: "Aarhus", prod: true }, { name: "Alicante", prod: true }, { name: "Amsterdam", prod: true }, { name: "Athens", prod: false }, { name: "Barcelona", prod: true }, { name: "Berlin", prod: false }, { name: "Bordeaux", prod: false }, { name: "Brussels", prod: false }, { name: "Bucharest", prod: true }, { name: "Budapest", prod: false }, { name: "Copenhagen", prod: true }, { name: "Dubai", prod: true }, { name: "Dublin", prod: true }, { name: "Düsseldorf", prod: false }, { name: "Edinburgh", prod: false }, { name: "Geneva", prod: false }, { name: "Gothenburg", prod: true }],
      [{ name: "Helsinki", prod: true }, { name: "Istanbul", prod: true }, { name: "Johannesburg", prod: false }, { name: "Kragujevac", prod: false }, { name: "Lisbon", prod: false }, { name: "London", prod: true }, { name: "Luxembourg", prod: false }, { name: "Madrid", prod: false }, { name: "Malmö", prod: true }, { name: "Manchester", prod: false }, { name: "Milan", prod: false }, { name: "Montpellier", prod: true }, { name: "Munich", prod: false }, { name: "Oslo", prod: true }, { name: "Palma", prod: true }, { name: "Paris", prod: true }, { name: "Prague", prod: true }],
      [{ name: "Rennes", prod: false }, { name: "Rome", prod: false }, { name: "Saint Petersburg", prod: false }, { name: "Sophia Antipolis", prod: true }, { name: "Split", prod: false }, { name: "Stockholm", prod: false }, { name: "Tel Aviv", prod: true }, { name: "Tourcoing", prod: false }, { name: "Umeå", prod: true }, { name: "Uppsala", prod: true }, { name: "Utrecht", prod: true }, { name: "Valbonne", prod: false }, { name: "Vejle", prod: true }, { name: "Vienna", prod: false }, { name: "Warsaw", prod: true }, { name: "York", prod: true }, { name: "Zurich", prod: false }],
    ],
  },
  {
    region: "APAC",
    columns: [
      [{ name: "Bangkok", prod: false }, { name: "Beijing", prod: true }, { name: "Chennai", prod: true }, { name: "Hong Kong", prod: true }, { name: "Ho Chi Minh City", prod: true }],
      [{ name: "Pingdingshan", prod: true }, { name: "Pune", prod: true }, { name: "Seoul", prod: true }, { name: "Shanghai", prod: true }, { name: "Shenzhen", prod: true }],
      [{ name: "Singapore", prod: true }, { name: "Sydney", prod: false }, { name: "Taipei", prod: false }, { name: "Thao Dien Ward", prod: false }, { name: "Tokyo", prod: true }, { name: "Xi'an", prod: false }],
    ],
  },
];
