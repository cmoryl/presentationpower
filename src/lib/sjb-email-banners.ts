// San Juan Bowl email banners: six approved designs live in Canva (design
// DAHb866XCIw) — three artwork looks × English and Spanish, all 800 × 350.
// Pictures are exports of that design, metadata-cleaned for email clients.
import playerEs from "@/assets/sjb/sjb-email-player-es.png.asset.json";
import playerEn from "@/assets/sjb/sjb-email-player-en.png.asset.json";
import silhouetteEs from "@/assets/sjb/sjb-email-silhouette-es.png.asset.json";
import silhouetteEn from "@/assets/sjb/sjb-email-silhouette-en.png.asset.json";
import footballEs from "@/assets/sjb/sjb-email-football-es.png.asset.json";
import footballEn from "@/assets/sjb/sjb-email-football-en.png.asset.json";

export interface SjbEmailBanner {
  id: string;
  /** Artwork treatment, as it appears in Canva. */
  look: string;
  language: "es" | "en";
  languageLabel: string;
  label: string;
  /** Page number inside the Canva design. */
  page: number;
  width: number;
  height: number;
  image: string;
  download: string;
  alt: string;
}

/** The one Canva design holding all six banners. */
export const SJB_EMAIL_BANNER_CANVA_URL =
  "https://www.canva.com/design/DAHb866XCIw/jVQig170ur7bMfgFBvLenA/edit";

export const SJB_EMAIL_BANNER_SIZE = { width: 800, height: 350 } as const;

const SIZE = SJB_EMAIL_BANNER_SIZE;

export const SJB_EMAIL_BANNERS: SjbEmailBanner[] = [
  {
    id: "player-es",
    look: "Player in motion",
    language: "es",
    languageLabel: "Spanish",
    label: "Player in motion — Spanish",
    page: 1,
    ...SIZE,
    image: playerEs.url,
    download: "san-juan-bowl-email-player-es.png",
    alt: "Email banner, Spanish: San Juan Bowl shield over a football player in a blue uniform with water spray, CBS Sports Network, Hiram Bithorn Stadium, 16 de diciembre 2026, sanjuanbowl.com",
  },
  {
    id: "player-en",
    look: "Player in motion",
    language: "en",
    languageLabel: "English",
    label: "Player in motion — English",
    page: 2,
    ...SIZE,
    image: playerEn.url,
    download: "san-juan-bowl-email-player-en.png",
    alt: "Email banner, English: San Juan Bowl shield over a football player in a blue uniform with water spray, CBS Sports Network, Hiram Bithorn Stadium, December 16 2026, sanjuanbowl.com",
  },
  {
    id: "silhouette-es",
    look: "Backlit silhouette",
    language: "es",
    languageLabel: "Spanish",
    label: "Backlit silhouette — Spanish",
    page: 3,
    ...SIZE,
    image: silhouetteEs.url,
    download: "san-juan-bowl-email-silhouette-es.png",
    alt: "Email banner, Spanish: San Juan Bowl shield over a backlit football player silhouette in smoke with gold light, CBS Sports Network, Hiram Bithorn Stadium, 16 de diciembre 2026, sanjuanbowl.com",
  },
  {
    id: "silhouette-en",
    look: "Backlit silhouette",
    language: "en",
    languageLabel: "English",
    label: "Backlit silhouette — English",
    page: 4,
    ...SIZE,
    image: silhouetteEn.url,
    download: "san-juan-bowl-email-silhouette-en.png",
    alt: "Email banner, English: San Juan Bowl shield over a backlit football player silhouette in smoke with gold light, CBS Sports Network, Hiram Bithorn Stadium, December 16 2026, sanjuanbowl.com",
  },
  {
    id: "football-es",
    look: "Football close-up",
    language: "es",
    languageLabel: "Spanish",
    label: "Football close-up — Spanish",
    page: 5,
    ...SIZE,
    image: footballEs.url,
    download: "san-juan-bowl-email-football-es.png",
    alt: "Email banner, Spanish: San Juan Bowl shield over a close-up of a brown leather football, CBS Sports Network, Hiram Bithorn Stadium, 16 de diciembre 2026, sanjuanbowl.com",
  },
  {
    id: "football-en",
    look: "Football close-up",
    language: "en",
    languageLabel: "English",
    label: "Football close-up — English",
    page: 6,
    ...SIZE,
    image: footballEn.url,
    download: "san-juan-bowl-email-football-en.png",
    alt: "Email banner, English: San Juan Bowl shield over a close-up of a brown leather football, CBS Sports Network, Hiram Bithorn Stadium, December 16 2026, sanjuanbowl.com",
  },
];

/** The three artwork looks, in Canva page order. */
export const SJB_EMAIL_BANNER_LOOKS = ["Player in motion", "Backlit silhouette", "Football close-up"] as const;
