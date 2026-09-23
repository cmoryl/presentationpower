export interface SignatureSection {
  id: string;
  type: 'name' | 'title' | 'company' | 'phone' | 'email' | 'website' | 'address' | 'social' | 'logo' | 'banner' | 'award' | 'divider' | 'custom';
  enabled: boolean;
  value: string;
  label: string;
  icon?: string;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  underline?: boolean;
  bold?: boolean;
  fontSize?: number; // px override
  /** Per-section padding overrides in pixels. Any side omitted defaults to 0. */
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface SocialLink {
  id: string;
  platform:
    | 'linkedin'
    | 'twitter'
    | 'facebook'
    | 'instagram'
    | 'youtube'
    | 'github'
    | 'dribbble'
    | 'behance'
    | 'tiktok'
    | 'whatsapp'
    | 'telegram'
    | 'discord'
    | 'threads'
    | 'bluesky'
    | 'calendly'
    | 'medium';
  url: string;
  enabled: boolean;
}

export interface DividerStyle {
  type: 'line' | 'double' | 'dashed' | 'dotted' | 'gradient' | 'none';
  color: string;
  width: number; // percentage 1-100
  thickness: number; // pixels 1-5
  spacing: number; // margin top/bottom in pixels
}

export interface BorderStyle {
  enabled: boolean;
  side: 'left' | 'top' | 'right' | 'bottom' | 'all';
  color: string;
  width: number; // pixels 1-5
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  radius: number; // pixels 0-20
}

export interface SpacingStyle {
  padding: number; // internal padding
  lineHeight: number; // 1.0-2.0
  sectionGap: number; // gap between sections
  iconGap: number; // gap between icon and text
}

export interface CardStyle {
  background: string; // hex
  shadow: 'none' | 'sm' | 'md' | 'lg';
  radius: number; // 0-24
}

export interface StatusBadge {
  enabled: boolean;
  text: string;
  color: string;
}

export interface UtmConfig {
  enabled: boolean;
  source: string;
  medium: string;
  campaign: string;
}

export interface SignatureData {
  id: string;
  name: string;
  templateId: string;
  sections: SignatureSection[];
  socialLinks: SocialLink[];
  logo: {
    url: string;
    /** Optional 2x (retina) variant of the uploaded logo. */
    url2x?: string;
    width: number;
    height: number;
    shape: 'square' | 'rounded' | 'circle';
  };
  banner: {
    url: string;
    link: string;
    enabled: boolean;
    width: number;
    height: number;
    aspectRatioLocked?: boolean;
  };
  awards: {
    id: string;
    url: string;
    link: string;
    width: number;
  }[];
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
    layout: 'horizontal' | 'vertical' | 'compact';
    divider: DividerStyle;
    border: BorderStyle;
    spacing: SpacingStyle;
    card?: CardStyle;
    /** Overrides the template's default archetype if set. */
    archetype?: ArchetypeId;
  };
  status?: StatusBadge;
  utm?: UtmConfig;
  mobileDisclaimer?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignatureTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'modern' | 'creative' | 'minimal' | 'corporate' | 'reply';
  thumbnail: string;
  defaultSections: SignatureSection[];
  defaultStyling: SignatureData['styling'];
  /** Optional visual variant used by the template picker preview only. Does not affect rendered signatures. */
  previewVariant?: 'banner-top' | 'card-stack' | 'side-accent' | 'split' | 'reply' | 'centered' | 'badge';
  /** Visual archetype that controls the rendered + exported layout shape. */
  archetype?: ArchetypeId;
}

/**
 * Structural layout archetypes. Each archetype has its own React renderer
 * (SignaturePreview) and its own table-based HTML exporter (ExportPanel).
 * Adding a new id requires updating `src/lib/signature/archetypes.tsx`.
 */
export type ArchetypeId =
  | 'classic-stacked'
  | 'photo-divider'
  | 'after-dark'
  | 'two-column-split'
  | 'card-shadow'
  | 'banner-bottom'
  | 'accent-bar'
  | 'business-card-box'
  | 'centered-personal'
  | 'executive-name-first'
  | 'retro-editorial';

export const defaultDivider: DividerStyle = {
  type: 'none',
  color: '#e5e7eb',
  width: 100,
  thickness: 1,
  spacing: 8,
};

export const defaultBorder: BorderStyle = {
  enabled: true,
  side: 'left',
  color: '#FF6A2B',
  width: 2,
  style: 'solid',
  radius: 0,
};

export const defaultSpacing: SpacingStyle = {
  padding: 20,
  lineHeight: 1.4,
  sectionGap: 4,
  iconGap: 6,
};

export const defaultCard: CardStyle = {
  background: '#ffffff',
  shadow: 'none',
  radius: 0,
};

export const defaultStatus: StatusBadge = {
  enabled: false,
  text: 'Available',
  color: '#10b981',
};

export const defaultUtm: UtmConfig = {
  enabled: false,
  source: 'email_signature',
  medium: 'email',
  campaign: '',
};

export const defaultSocialLinks: SocialLink[] = [
  { id: 'linkedin', platform: 'linkedin', url: '', enabled: true },
  { id: 'twitter', platform: 'twitter', url: '', enabled: false },
  { id: 'facebook', platform: 'facebook', url: '', enabled: false },
  { id: 'instagram', platform: 'instagram', url: '', enabled: false },
  { id: 'youtube', platform: 'youtube', url: '', enabled: false },
  { id: 'github', platform: 'github', url: '', enabled: false },
  { id: 'tiktok', platform: 'tiktok', url: '', enabled: false },
  { id: 'whatsapp', platform: 'whatsapp', url: '', enabled: false },
  { id: 'telegram', platform: 'telegram', url: '', enabled: false },
  { id: 'discord', platform: 'discord', url: '', enabled: false },
  { id: 'threads', platform: 'threads', url: '', enabled: false },
  { id: 'bluesky', platform: 'bluesky', url: '', enabled: false },
  { id: 'calendly', platform: 'calendly', url: '', enabled: false },
  { id: 'medium', platform: 'medium', url: '', enabled: false },
];

export const defaultSections: SignatureSection[] = [
  { id: 'name', type: 'name', enabled: true, value: 'John Smith', label: 'Full Name' },
  { id: 'title', type: 'title', enabled: true, value: 'Senior Marketing Manager', label: 'Job Title' },
  { id: 'company', type: 'company', enabled: true, value: 'Acme Corporation', label: 'Company' },
  { id: 'phone', type: 'phone', enabled: true, value: '+1 (555) 123-4567', label: 'Phone' },
  { id: 'email', type: 'email', enabled: true, value: 'john.smith@acme.com', label: 'Email' },
  { id: 'website', type: 'website', enabled: true, value: 'www.acme.com', label: 'Website' },
  { id: 'address', type: 'address', enabled: false, value: '123 Business Ave, Suite 100, New York, NY 10001', label: 'Address' },
];

export const createDefaultSignature = (): SignatureData => ({
  id: crypto.randomUUID(),
  name: 'My Signature',
  templateId: 'professional-classic',
  sections: [...defaultSections],
  socialLinks: [...defaultSocialLinks],
  logo: {
    url: '',
    width: 80,
    height: 80,
    shape: 'square',
  },
  banner: {
    url: '',
    link: '',
    enabled: false,
    width: 500,
    height: 100,
    aspectRatioLocked: false,
  },
  awards: [],
  styling: {
    primaryColor: '#FF6A2B',
    secondaryColor: '#64748b',
    fontFamily: 'Arial, sans-serif',
    fontSize: 'medium',
    layout: 'horizontal',
    divider: { ...defaultDivider },
    border: { ...defaultBorder },
    spacing: { ...defaultSpacing },
    card: { ...defaultCard },
  },
  status: { ...defaultStatus },
  utm: { ...defaultUtm },
  mobileDisclaimer: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const fontOptions = [
  // Sans-serif
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial', category: 'Sans Serif' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica', category: 'Sans Serif' },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: 'Helvetica Neue', category: 'Sans Serif' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana', category: 'Sans Serif' },
  { value: 'Tahoma, Geneva, sans-serif', label: 'Tahoma', category: 'Sans Serif' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS', category: 'Sans Serif' },
  { value: "'Segoe UI', Tahoma, Geneva, sans-serif", label: 'Segoe UI', category: 'Sans Serif' },
  { value: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif", label: 'Lucida Sans', category: 'Sans Serif' },
  { value: "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif", label: 'Franklin Gothic', category: 'Sans Serif' },
  { value: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif", label: 'Gill Sans', category: 'Sans Serif' },
  { value: 'Calibri, Candara, Segoe, Optima, Arial, sans-serif', label: 'Calibri', category: 'Sans Serif' },
  { value: "'Optima', 'Segoe UI', Candara, sans-serif", label: 'Optima', category: 'Sans Serif' },
  { value: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', label: 'System UI', category: 'Sans Serif' },

  // Serif
  { value: 'Georgia, serif', label: 'Georgia', category: 'Serif' },
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman', category: 'Serif' },
  { value: 'Times, serif', label: 'Times', category: 'Serif' },
  { value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", label: 'Palatino', category: 'Serif' },
  { value: "'Book Antiqua', Palatino, serif", label: 'Book Antiqua', category: 'Serif' },
  { value: 'Cambria, Georgia, serif', label: 'Cambria', category: 'Serif' },
  { value: "'Baskerville', 'Baskerville Old Face', Georgia, serif", label: 'Baskerville', category: 'Serif' },
  { value: "'Garamond', 'EB Garamond', Georgia, serif", label: 'Garamond', category: 'Serif' },
  { value: "'Didot', 'Bodoni MT', Didot, serif", label: 'Didot', category: 'Serif' },

  // Monospace
  { value: "'Courier New', Courier, monospace", label: 'Courier New', category: 'Monospace' },
  { value: "'Lucida Console', Monaco, monospace", label: 'Lucida Console', category: 'Monospace' },
  { value: 'Monaco, Consolas, monospace', label: 'Monaco', category: 'Monospace' },
  { value: "Consolas, 'Andale Mono', monospace", label: 'Consolas', category: 'Monospace' },
  { value: "'Andale Mono', AndaleMono, monospace", label: 'Andale Mono', category: 'Monospace' },

  // Display / Casual
  { value: "'Brush Script MT', cursive", label: 'Brush Script', category: 'Display' },
  { value: "'Comic Sans MS', 'Comic Sans', cursive", label: 'Comic Sans', category: 'Display' },
  { value: 'Impact, Haettenschweiler, sans-serif', label: 'Impact', category: 'Display' },
  { value: "Copperplate, 'Copperplate Gothic Light', serif", label: 'Copperplate', category: 'Display' },
];

export const fontSizeValues = {
  small: { name: '12px', title: '14px', info: '11px' },
  medium: { name: '14px', title: '16px', info: '12px' },
  large: { name: '16px', title: '18px', info: '14px' },
};

export const dividerTypeOptions = [
  { value: 'none', label: 'None' },
  { value: 'line', label: 'Solid Line' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double Line' },
  { value: 'gradient', label: 'Gradient' },
];

export const borderSideOptions = [
  { value: 'left', label: 'Left' },
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'all', label: 'All Sides' },
];

export const borderStyleOptions = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

export const bannerSizeOptions = [
  { label: 'Leaderboard', width: 728, height: 90 },
  { label: 'Large Leaderboard', width: 970, height: 90 },
  { label: 'Billboard', width: 970, height: 250 },
  { label: 'Medium Rectangle', width: 300, height: 250 },
  { label: 'Large Rectangle', width: 336, height: 280 },
  { label: 'Half Page', width: 300, height: 600 },
  { label: 'Wide Skyscraper', width: 300, height: 600 },
  { label: 'Skyscraper', width: 160, height: 600 },
  { label: 'Banner', width: 468, height: 60 },
  { label: 'Mobile Banner', width: 320, height: 50 },
];
