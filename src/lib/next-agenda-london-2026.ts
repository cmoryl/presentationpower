import type { AgendaBandLayoutId, AgendaBandTreatmentId, AgendaFooterFillId, AgendaFooterHeightId, AgendaFooterStyleId, AgendaRowStyleId, AgendaSession } from "./next-agenda";

/**
 * NEXT 2026 London (EMEA, 24–25 September 2026, QEII Centre) division
 * programmes, as supplied on the approved agenda sheets. One record per NEXT
 * division: room line, footer lines and the two-day session list, set in the
 * approved agenda look (programme cards, no eyebrow).
 *
 * Copy here is the issued programme. Do not paraphrase it — an operator edits a
 * saved board, never this record.
 */
export type LondonAgendaProgramme = {
  title: string;
  meta: string;
  sessions: AgendaSession[];
  days?: { label: string; meta: string; sessions: AgendaSession[] }[];
  rowStyle?: AgendaRowStyleId;
  bandTreatment?: AgendaBandTreatmentId;
  bandLayout?: AgendaBandLayoutId;
  eyebrow?: string;
  locationLine?: string;
  footnote?: string;
  footerLeft?: string;
  footerRight?: string;
  footerCentre?: string;
  footerStyle?: AgendaFooterStyleId;
  footerFill?: AgendaFooterFillId;
  footerHeight?: AgendaFooterHeightId;
  footerCaps?: boolean;
};

const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

/** DataForceNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const DATAFORCE_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-2:15 PM", "Registration & Networking", "", { muted: true }),
  row("2:15-2:30 PM", "Welcome to DataForceNEXT, Robert Rizzo", ""),
  row("2:35-3:35 PM", "CX Without Waiting: How AI Voice Agents Improve Customer Experience", "Speaker: Josh Baker, SYNTHESIA"),
  row("3:35-3:50 PM", "BREAK", "", { muted: true }),
  row("3:50-4:40 PM", "Fueling AI With Real-World Data: Audio & Multimodal Data Collection at Scale", "Speaker: Xavier Fort, DATAFORCE"),
  row("4:45-5:30 PM", "Close the Loop: Scalable Survey Data Collection", "Speakers: Ellen Stirbu, Roberto Rizzo, DATAFORCE"),
  row("5:35-5:55 PM", "Closing Remarks: DataForceNEXT", ""),
  row("5:55 PM", "Post-event Cocktail Reception", "", { muted: true }),
];

/** DigitalNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const DIGITAL_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to DigitalNEXT", "Tim Coughlin, TransPerfect"),
  row("1:45-2:15 PM", "Intro to Digital: The Three AI Swimlanes", "Shane Madden, TransPerfect"),
  row("2:15-2:45 PM", "Fireside Chat with Peec AI: Platform x Agency | Making AI Visibility Data Actionable", "Moderator: Gemma Houghton, TransPerfect\nPanelists: Antonia Breitenfellner, Peec AI & Julie Franck, TransPerfect"),
  row("2:45-3:15 PM", "Bluefish AI: AI Search - Where We Are Today and What's Coming Next", "Mike Bagliebter, Bluefish AI"),
  row("3:15-3:30 PM", "BREAK", "", { muted: true }),
  row("3:30-3:55 PM", "Podean: The Future of Marketplace Commerce: Winning in an AI-Powered Amazon Ecosystem.", "Fred Pearce, Podean"),
  row("3:55-4:20 PM", "Kellanova: Building a Global Digital Center of Excellence", "Roisin Devine, Kellanova"),
  row("4:20-4:45 PM", "Aura: Building the Marketing Operating System", "Mario Lenoci, TransPerfect Digital"),
  row("4:45-5:20 PM", "Fairmont Hotels: Scaling Global Digital Experiences", "Edouard Lemaire, Fairmont Hotels"),
  row("5:20-5:45 PM", "Beyond the Campaign: How Creative Production Turns Great Ideas Into Lasting Value", "Ben Clark, The Mill & TransPerfect"),
  row("5:45-6:00 PM", "Closing Remarks: DigitalNEXT", "Henry Barfoot-Saunt, TransPerfect"),
  row("6:00 PM", "Post-event Cocktail into Evening Reception", "", { muted: true }),
];

/** DigitalNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const DIGITAL_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:15 PM", "Amazon.com: Linguistic QA of Production Contnet", "Danielle Guenther, Amazon"),
  row("1:15-1:45 PM", "Two Circles: Impact of Underage Social Media Ban", "Moe Hamdhaidari, Two Circles"),
  row("1:45-2:10 PM", "Segment of One: AI-Powered Content Personalisation at Scale", "Harry Thakkar, Avatria"),
  row("2:10-2:40 PM", "Open Forum: Ask the Digital Marketing Experts", "Dana Weber, Julie Franck, Henry Barfoot-Saunt, Ben Clark from TransPerfect"),
  row("2:40-2:55 PM", "Closing Remarks: DigitalNEXT", "Tim Coughlin, TransPerfect Digital"),
  row("2:55 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** ExperienceNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const EXPERIENCE_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to ExperienceNEXT", "Nate Fong, TRANSPERFECT"),
  row("1:45-2:30 PM", "Event Realty Check: Events that Drive ROI", "Kate Flower, Fan Duel"),
  row("2:30-3:15 PM", "Lucy's Practical Ways to Operate with AI for Your Events, Starting Now", "Lucy Postlethwaite, Practical AI & Nate Fong, TransPerfect"),
  row("3:15-3:30 PM", "Product Spotlight: TransPerfect Live Event Mgmt", "Nate Fong , TRANSPERFECT"),
  row("3:30-3:50 PM", "BREAK", "", { muted: true }),
  row("3:50-4:20 PM", "Accessibility Is No Longer Optional: Designing Events Everyone Can Participate In", "Jaden Ellman, TRANSERFECT"),
  row("4:20-4:50 PM", "AI Will Never Tell You No", "Meredith Shottes, Miller Tanner"),
  row("4:50-5:15 PM", "Product Spotlight: GlobalLink Live and Custom AI", "Peter Cselenyi, TransPerfect"),
  row("5:15-6:00 PM", "AI in Meetings & Events: What’s Real, What’s Hype, and Where Teams Are Seeing ROI", "Moderator: Nate Fong\nPannelists: Meredith (Miller Tanner), Kate (Fan Duel), Lucy (Practical AI)"),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** ExperienceNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const EXPERIENCE_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:00 PM", "Day Two Kickoff", "Nate Fong, TRANSPERFECT"),
  row("1:00-1:30 PM", "Behind the Scenes: How Global Brands Actually Pull Off Their Biggest Events", "Moderator: Nate Fong, TransPerfect\nPannellists: Kate (Fan Duel), Stephane (Zoom), Katie Streten (Emota)"),
  row("1:30-2:00 PM", "Fireside Chat: Meeting Tech is Democratized", "Stephane Barrett, Zoom + Nate Fong, TransPerfect"),
  row("2:00-2:15 PM", "Product Spotlight: GlobalLink Events", "Justyn Vasquez, TRANSPERFECT"),
  row("2:15-2:45 PM", "Stop Designing Events, Start Designing Behaviors", "Katie Streten, Emota"),
  row("2:45-3:00 PM", "Product Spotlight: GlobalLink TV", "Patrick Farley, TRANSPERFECT"),
  row("3:00-3:10 PM", "Closing Remarks", "Nate Fong, TransPerfect"),
  row("3:10 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** FinanceNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const FINANCE_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-3:30 PM", "Will join GlobalLinkNEXT agenda", ""),
  row("3:30-3:45 PM", "BREAK", "", { muted: true }),
  row("3:45-4:10 PM", "Nobody Gets Fired for Saying No: How to Build an AI Use Case for Your Boss Speaker: Stuart McIntyre, formerly Standard Chartered", ""),
  row("4:15-4:40 PM", "From Crawlability to AI Visibility: Why Technical SEO Matters More Than Ever", "Speaker: Pinar Basar, OKX"),
  row("4:45-6:00 PM", "Will join GlobalLinkNEXT agenda", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** FinanceNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const FINANCE_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:45 PM", "Will join GlobalLinkNEXT agenda", ""),
  row("1:50-2:15 PM", "Global Reputation, Local Relevance: Scaling Trust Across Europe Speaker: Rebecca Bond, Peter Engstrom, VANGUARD", ""),
  row("2:15-2:40 PM", "Elevating Translation Management to an Intelligent Global Content Ecosystem", "Speaker: Sarah Tatjana Baier, UBS"),
  row("2:40-3:05 PM", "AllianceBernstein’s Translation Journey with GlobalLink AI", "Rick Cannon, AllianceBernstein & Justin Potts, TransPerfect"),
  row("3:05-3:10 PM", "Closing Remarks FinanceNEXT", ""),
  row("3:10 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** GamesNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const GAMES_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to GamesNEXT", "Semion Branzburg, TransPerfect"),
  row("1:45-2:30 PM", "Building and Scaling Games in the New Production Ecosystem", "Tim Willits, Saber Interactive"),
  row("2:30-3:20 PM", "Panel - The New Production Ecosystem for Games", "Juney Dijkstra (moderator/EA), Jeff Skelton (Blizzard), Yota Wada (Square Enix)"),
  row("3:20-3:35 PM", "Lightning Talk: Building New Game Teams Before the Game Is Clear", "Marco Colombo (Supercell)"),
  row("3:35-3:50 PM", "BREAK", "", { muted: true }),
  row("3:50-4:20 PM", "Forget the Metaverse. The Simulation Is Already Here", "Tsahi Liberman, Alloi"),
  row("4:20-4:50 PM", "Your Game Database Knows What Changed. It Should Know Why it Matters.", "Carol Gine & Britta Aagaard, TransPerfect"),
  row("4:50-5:20 PM", "From Cleanup Crew to Control Room - What Happens When CX Gets a Seat at the Table", "Mika Palevsky, Papaya Gaming"),
  row("5:20-6:00 PM", "Panel - Producing and Bringing Games to Market in 2026", "Moderator Sam Carlisle (XDS Spark), Mattias Wiking (Winterkeep Interactive), Errol Ismail (Expression Games), Jeff Pabst (Gamesmiths)"),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** GamesNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const GAMES_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:15 PM", "From Supplier to Strategic Partner: Rethinking QA Outsourcing", "Cristian Girbea, Rovio"),
  row("1:15-1:45 PM", "Stop Looking for a Publisher. Start Looking for a partner", "Maciej Laczny, Untold Tales"),
  row("1:45-2:20 PM", "Why AI Made the Gaming Job Market a Buyer’s Market — and Why It Doesn’t Matter Anymore. - Fabio Davide, Sony PlayStation", ""),
  row("2:20-2:50 PM", "Panel - Leadership, D&I, and the Future Games Workforce", "Melissa Phillips, Kish Hirani, Women in Games International Joanie Kraut, Harriet Frayling, Many Cats Studios"),
  row("2:50-3:05 PM", "Closing Remarks: GamesNEXT Andrew Stanley, TransPerfect", ""),
  row("3:05 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** GlobalLinkNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const GLOBALLINK_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to GlobalLink NEXT", "Jens Huijgen & Chi Patel, TransPerfect & Pep Rosenfeld, BOOM Chicago"),
  row("1:45-2:30 PM", "Building What’s NEXT: Inside TransPerfect's GlobalLink Technology", "Moderator: Imran Sadiq\nTopics:\nPanelists: Keith Bazil, Joe Campbell, Julien Didier, Anna Z, TransPerfect"),
  row("2:30-3:00 PM", "One Platform, One Voice: How Hilti Built a Global Localization Backbone", "Speaker: Karel Rozkosny, HILTI"),
  row("3:00-3:30 PM", "Mind the Gap! Why AI Translation Needs Governance", "Speakers: Ty Trainer & Hilary Wright, TransPerfect"),
  row("3:30-3:45 PM", "BREAK", "", { muted: true }),
  row("3:45-4:10 PM", "illycaffè: Brewing AI-Powered Innovation", "Speaker: Francesco Mandia, ILLYCAFFE", { parallels: [{ time: "3:45-4:15 PM", title: "Tripadvisor: Adapting to a New Era of Travel Discovery", detail: "Speaker: Ashley Jones, TRIPADVISOR\nABBEY (4)" }] }),
  row("4:15-4:40 PM", "TP INTERNAL SESSION", "GL TV", { parallels: [{ time: "4:15 PM", title: "Built to Evolve: Redesigning Fairmont.com to Unlock the Future of Digital Hospitality", detail: "Speaker: Brittany Borrego, FAIRMONT\nABBEY (4)" }] }),
  row("4:45-5:10 PM", "AWS: Managing an AI-Forward Content Supply Chain", "Speaker: Lindis Barry, AWS"),
  row("5:10-5:50 PM", "The Human Side of AI Adoption: What Nobody Tells You", "Moderator by Aaron Campbell\nEstee Lauder, Illy, Sanofi, Standared Chartered"),
  row("5:50-6:00 PM", "Closing Remarks", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** GlobalLinkNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const GLOBALLINK_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:10 PM", "AWS: Becoming AI-Forward - Scaling Localization & Content with Agentic AI", "Speaker: Jonathan Smith, AWS"),
  row("1:15-1:40 PM", "Aura: Building the Marketing Operating System", "Speakers: Matt Hauser & Mario Lenoci, TRANSPERFECT"),
  row("1:45-2:10 PM", "Turning Information Into Advantage", "Speaker: Mark Lawyer, TRANSPERFECT"),
  row("2:15-2:40 PM", "Scaling Creative Without Losing Control: A Guide to AI in Content Production", "Speaker: Danielle Penny, EASYJET"),
  row("2:45-3:10 PM", "Beyond Loyalty: How Global Hotel Alliance Builds One Experience Across 50+ Brands", "Speaker: Nicolas le Roux, GLOBAL HOTEL ALLIANCE"),
  row("3:10-3:15 PM", "Closing Remarks", ""),
  row("3:15 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** LearnNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const LEARN_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to LearnNEXT", "Rob Rusk, TransPerfect"),
  row("1:45-2:10 PM", "Stop Producing Learning. Start Activating It.", "Samir DAS, META"),
  row("2:10-2:35 PM", "From the Training Room to the Operations Table: Where Learning Becomes Business Strategy", "Roaa Fawzi, FALAK INVESTMENT HUB"),
  row("2:35-3:00 PM", "Building Human-Centred customer experiences in the AI Era", "Maria Primus, NESTLÉ NESPRESSO"),
  row("3:00-3:15 PM", "BREAK", "", { muted: true }),
  row("3:15-3:40 PM", "Who is coaching the coach?", "Matt WATTS, RFU"),
  row("3:40-4:05 PM", "From Learning to Business Impact", "Divya MISHRA, DANONE"),
  row("4:05-4:30 PM", "When Nobody Has Time to Learn: What Really Deserves Attention?", "Ed CHEDZOY, STANDARD CHARTERED"),
  row("4:30-4:40 PM", "BREAK", "", { muted: true }),
  row("4:40-5:05 PM", "Scaling Enablement Without Scaling Teams: The Learner-Led Revolution: Blueprint for designing learner-led curriculums supported by AI practice feedback to increase reach without expanding your L&D headcount", "Meghna MAHENDRA, GOOGLE"),
  row("5:05-5:30 PM", "From Training to Transformation: Building the Connected Workforce", "Niklas MONTELIN, TETRA PAK"),
  row("5:30-5:55 PM", "The Cost of Convenience: A Practical Guide to Using AI When Designing Learning Tim Robinson, TransPerfect", ""),
  row("5:55-6:00 PM", "LearnNEXT Day One Closing Remarks", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** LearnNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const LEARN_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:10 PM", "FROM AWARENESS TO ACTION - How we moved from one-size-fits-all training to behavior engagement.", "Gosia GRABIEC & Sofia GARCIA, HEINEKEN"),
  row("1:10-1:35 PM", "Learning at Scale: What We Got Right, What We Got Wrong, and What We’re Still Learning", "Nicole Stead, ING"),
  row("1:35-2:00 PM", "From Upstart to Impact: The New Hire Journey", "Randy RICHARDSON, WÜRTH"),
  row("2:00-2:25 PM", "Embracing Uncertainty in Medical Education - Sasha GRUBMAN, ONCOBETA", ""),
  row("2:25-2:55 PM", "From Translation to Transformation: Building Scalable Learning Experiences at Moët &Chandon as a French brand with a strong international footprint.", "Yuka GANSSER, MOËT & CHANDON"),
  row("2:55-3:00 PM", "LearnNEXT Closing Remarks", ""),
  row("3:00 PM", "Event Close & Takedown", "", { muted: true }),
];

/** LegalNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const LEGAL_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-2:00 PM", "Legal Networking & Introductions", ""),
  row("2:00-2:50 PM", "The Future Lawyer", "Speakers:\nRichard Coopey, Grosvenor Law\nSian Whitby, Latham & Watkins\nNik Bruce Smith, Quinn Emanuel\nThai Nguyen, Close Brothers\nAl-Karim Makhani, TransPerfect Legal"),
  row("2:50-2:55 PM", "BREAK", "", { muted: true }),
  row("2:55-3:00 PM", "In-House | Roundtable (Rutherford)", "", { parallels: [{ time: "2:55-3:00 PM", title: "Rising Stars | Panel (Moore)", detail: "" }, { time: "2:55-3:00 PM", title: "Disclosure | Panel (Whittle)", detail: "" }] }),
  row("3:00-3:50 PM", "Managing External Counsel in the AI Era", "Speaker: Christian Breen, TransPerfect Legal", { parallels: [{ time: "3:00-4:00 PM", title: "AI in Practice: The Work Lawyers Do Every Day", detail: "Speakers:\nEdward Irwin, Peters & Peters\nJosie Welland, Sidley Austin\nAimee Mullan, Signature Litigation\nMaz Jamnejad, Gibson Dunn" }, { time: "3:00-4:00 PM", title: "Modern Data: Beyond Emails & Documents", detail: "Speakers:\nSasha Shearer, RPC\nSally Mantell, Farrer & Co\nStephanie Silverston, Greenberg Traurig\n(MODERATOR: BILLY OLIVER)" }] }),
  row("3:50-4:00 PM", "BREAK", "", { muted: true }),
  row("4:00-4:50 PM", "Data Discipline: Getting Your House In Order", "Speaker: Kelly Hagedorn, Alston & Bird", { parallels: [{ time: "4:00-5:00 PM", title: "Thriving, Not Just Surviving: Building a Sustainable Career in an AI World", detail: "Speakers:\nLouise Lau, Pallas Partners\nAndrew Woolsey, Cooke, Young & Keidan\nKatie Byrne, Irwin Mitchell\nColin Gibson, ex-Fieldfisher" }, { time: "4:00-5:00 PM", title: "Generative AI: From Document Review to Legal Strategy", detail: "Speakers:\nImogen Jones, DAC Beachcroft\nPerveen Hill, Withers\nFrancesca Ruddy, Fountain Court Chambers\nGeorgie Rawson, Cleary Gottlieb\n(MODERATOR: STEFAN NIGAM)" }] }),
  row("4:50-5:00 PM", "BREAK", "", { muted: true }),
  row("5:00-5:50 PM", "Risk to Resolut: Using Data to Make Better Decisions", "Speaker: Angie Nolet, TransPerfect Legal", { parallels: [{ time: "5:00 PM", title: "Quiz & Social", detail: "(MODERATORS: Chidubem Agu and Clara Tinkler)" }, { time: "5:00 PM", title: "From Terabytes to Truth", detail: "Speakers:\nSusie Buergi, Norton Rose Fulbright\nJames Rickwood-Dodsworth, Kelkoo Group\nRupert Goodway, Quinn Emanuel\n(MODERATOR: RAJUAN PASHA)" }] }),
  row("5:50-6:00 PM", "LegalNEXT Closing Remarks", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** LegalNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const LEGAL_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:40 PM", "AI Economics: Pricing, Licensing & Profitability", "Speakers:\nNatalia Chumak, Signature Litigation\nBen Sigler, Stephenson Harwood\nMatthew Dashper Hughes, gunnercooke\n(MODERATOR: DAN MEYERS)"),
  row("1:40-1:45 PM", "BREAK", "", { muted: true }),
  row("1:45-2:20 PM", "Building the NextGen: AI, Culture & Succession", "Speakers:\nLucy Pert, Hausfeld\nKate Vernon, Quinn Emanuel\nAlex Sciannaca, Hogan Lovells\nDuran Ross, Lewis Silkin\n(MODERATOR: DANIELLE GIANNECCHINI)"),
  row("2:20-2:25 PM", "BREAK", "", { muted: true }),
  row("2:25-3:00 PM", "The Human Advantage: Winning Clients in an AI World", "Speakers:\nAmy Schnee, Informa\nLayla Bakkar, Tesco\nChristos Matthews, AND Digital\nRich Harris, Robert Walters\n(MODERATOR: Matthew Felten)"),
  row("3:00 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** LifeSciNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const LIFE_SCI_DAY_ONE: AgendaSession[] = [
  row("11:35 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-2:05 PM", "Innovation in Motion: TransPerfect’s Life Sciences Product Roadmap", "Nick Peris & Adam Schefflan, TransPerfect"),
  row("2:05-2:15 PM", "Veeva Partnership and Integration Spotlight", "Jose Burgos, TransPerfect"),
  row("2:15-2:50 PM", "From Workflow to Value: Unlocking Operational and Cost Efficiencies with Veeva Integration", "Georges Tavares, SANOFI & Aniket Agarwal, Sandoz"),
  row("2:50-3:05 PM", "From Prompts to Pipelines: LLM Orchestration", "Jose Burgos, TransPerfect"),
  row("3:05-3:40 PM", "Separating Hype from Impact: Where AI Is Driving Results in Pharma", "Denise Mayes Gascard, Sanofi"),
  row("3:40-3:55 PM", "Procurement Role in Leading the Way on Translation Management", "Ashna Amarshi, GSK"),
  row("3:55-4:15 PM", "BREAK", "", { muted: true }),
  row("4:15-4:40 PM", "One Hub, Smarter Content: Regeneron’s Sponsor Centralization + AI Strategy", "Hobson Lopes, Regeneron"),
  row("4:40-5:05 PM", "TransPerfect Digital Spotlight", "Jase George, TransPerfect"),
  row("5:05-5:30 PM", "Partnering With Patients: Practical Strategies for Meaningful Engagement", "Sarah McClure, Sanofi"),
  row("5:30-5:55 PM", "Global strategy to local adoption, there is no secret to success, just a formula", "Tim Batchelor, Ipsen"),
  row("5:55-6:00 PM", "Day One Closing Remarks", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "(6:00-7:00 PM on 5th, 7:00-8:00 PM LifeSci & OpTImize invited to join everyone on the Ground Floor)", { muted: true }),
];

/** LifeSciNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const LIFE_SCI_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:10 PM", "Mission: Possible", "A Transformation Story - From Impossible Odds to Global Impact\nIgnacio Matias Hernández-Agramonte, Baxter &\nMar Zaragoza Gomez, TransPerfect"),
  row("1:10-1:20 PM", "TransPerfect Digital Health Spotlight", "Heidi Campbell, TransPerfect"),
  row("1:20-1:45 PM", "Digital Health Product Roadmapping Panel: Aligning Sponsor Expectations, Minimizing Patient Burden, and Streamlining Language & File Management", "Michael Hannon, Daiichi Sankyo, INES Smajic, Medidata, Adam Schefflan, TransPerfect"),
  row("1:45-2:10 PM", "AI Governance & Responsible AI", "Fireside Chat\nAndrew Cochrane, Novartis\nTy Trainer, TransPerfect"),
  row("2:10-2:35 PM", "A Scalable Foundation for ePI, Reuse and Automation", "Giacomo Testori, NovoNordisk"),
  row("2:35-2:40 PM", "Day Two Closing Remarks", ""),
  row("2:40 PM", "Event Close & Takedown (no on-site cocktail)", "", { muted: true }),
];

/** MediaNEXT London — THURSDAY, SEPTEMBER 24, 2026. */
const MEDIA_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  row("1:30-1:40 PM", "Welcome to MediaNext", ""),
  row("1:40-2:25 PM", "Technology spotlight: Media tech road map", "Paulette Pantoja, TransPerfect Media"),
  row("2:25-2:55 PM", "Seedance 2.5: AI, Creativity & the Future of Production", "John Paul Giancarlo, Byte Dance"),
  row("2:55-3:35 PM", "Beyond Post-Editors: Why Media Translators Matter More Than Ever in an AI World", "Alberto De La Puente Nieto, NBCUniversal"),
  row("3:35-3:45 PM", "BREAK", "", { muted: true }),
  row("3:45-4:15 PM", "Riding the wave - In conversation with Ulli Stroef and Danilo Pejaković", "Toon2Tango and Leonine Studios"),
  row("4:15-4:45 PM", "The next version of us", "Gemma O’Kane and Ty Trainer"),
  row("4:45-5:15 PM", "AI: The Optimization Paradox", "Marianne Carpentier, Former TFI"),
  row("5:15-5:50 PM", "On Our Radar: Emerging Technology in Media", "AI across an Entreprise\nSpeakers: Tom Batchelor: Batch Collective, Aaron Bhugobaun: Chapter Forge Media, Eric Heath: Pokemon, Gemma O'Kane: TransPerfect Media"),
  row("5:50-6:00 PM", "MediaNEXT Closing Remarks", ""),
  row("6:00 PM", "Post-event Networking Cocktail Reception", "", { muted: true }),
];

/** MediaNEXT London — FRIDAY, SEPTEMBER 25, 2026. */
const MEDIA_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row("9:45-10:30 AM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("10:30-11:45 AM", "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality", "Will Guidara", { track: "KEYNOTE" }),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  row("12:45-1:15 PM", "Case Study: All3Media International Digital Media Services", "Claire Feeney - All3 Media"),
  row("1:15-1:45 PM", "Emerging Markets as the Future of Global Entertainment", "Ram Veerapaneni - Mango Mass Media"),
  row("1:45-2:15 PM", "The Vertical Entertainment Boom: Trends, Formats, and Content that Travels", "Sachin Singh - Kuku TV"),
  row("2:15-2:45 PM", "Introducing: The Mill, a TransPerfect Company", "Béatrice Bauwens with client partner, Excuse my French"),
  row("2:45-2:50 PM", "MediaNEXT Closing Remarks", ""),
  row("2:50 PM", "Event Close & Takedown", "(no on-site cocktail)", { muted: true }),
];

/** Every London 2026 division programme, keyed by NEXT division id. */
export const LONDON_2026_PROGRAMMES: Record<string, LondonAgendaProgramme> = {
  "dataforce": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "WORDSWORTH 4TH FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/DATAFORCE",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: DATAFORCE_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: DATAFORCE_DAY_ONE },
    ],
  },
  "digital": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "GIELGUD 2ND FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/DIGITAL",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: DIGITAL_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: DIGITAL_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: DIGITAL_DAY_TWO },
    ],
  },
  "experience": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "ALBERT 2ND FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/EXPERIENCE",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: EXPERIENCE_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: EXPERIENCE_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: EXPERIENCE_DAY_TWO },
    ],
  },
  "finance": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "VICTORIA 2ND FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/FINANCE",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: FINANCE_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: FINANCE_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: FINANCE_DAY_TWO },
    ],
  },
  "games": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "WESTMINSTER 4TH FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/GAMES",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: GAMES_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: GAMES_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: GAMES_DAY_TWO },
    ],
  },
  "globallink": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "FLEMING 3RD FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/GLOBALLINK",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: GLOBALLINK_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: GLOBALLINK_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: GLOBALLINK_DAY_TWO },
    ],
  },
  "learn": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/LEARN",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: LEARN_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: LEARN_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: LEARN_DAY_TWO },
    ],
  },
  "legal": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "WHITTLE 3RD FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/LEGAL",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: LEGAL_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: LEGAL_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: LEGAL_DAY_TWO },
    ],
  },
  "life-sci": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "MOUNTBATTEN 5TH FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/LIFESCI",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: LIFE_SCI_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: LIFE_SCI_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: LIFE_SCI_DAY_TWO },
    ],
  },
  "media": {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "OLIVIER 2ND FLOOR",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/MEDIA",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: MEDIA_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: MEDIA_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: MEDIA_DAY_TWO },
    ],
  },
};
