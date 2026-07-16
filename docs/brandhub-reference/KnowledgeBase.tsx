import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, HelpCircle, Lightbulb, Search, CreditCard, Plug, Users, Globe, Shield, Play, Video, X, Home, Palette, Languages, Scale, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconKitSection } from "@/components/help/IconKitSection";
import { BiasAccessibilitySection } from "@/components/help/BiasAccessibilitySection";

// Import tutorial videos
import tutorialGettingStarted from "@/assets/videos/tutorial-getting-started.mp4";
import tutorialColorSystems from "@/assets/videos/tutorial-color-systems.mp4";
import tutorialTypography from "@/assets/videos/tutorial-typography.mp4";
import tutorialLogoAssets from "@/assets/videos/tutorial-logo-assets.mp4";
import tutorialSharing from "@/assets/videos/tutorial-sharing.mp4";
import tutorialExportPdf from "@/assets/videos/tutorial-export-pdf.mp4";

const tutorials = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of creating your first brand guide in under 5 minutes.",
    duration: "0:05",
    video: tutorialGettingStarted,
  },
  {
    id: "color-systems",
    title: "Color Systems Deep Dive",
    description: "Master color palettes, A/B testing, and organizing your brand colors.",
    duration: "0:05",
    video: tutorialColorSystems,
  },
  {
    id: "typography",
    title: "Typography Guidelines",
    description: "Set up fonts, text styles, and usage rules for consistent typography.",
    duration: "0:05",
    video: tutorialTypography,
  },
  {
    id: "logo-assets",
    title: "Logo Usage & Assets",
    description: "Upload logos, define clear space rules, and document brand assets.",
    duration: "0:05",
    video: tutorialLogoAssets,
  },
  {
    id: "sharing",
    title: "Sharing & Collaboration",
    description: "Share brand guides with your team and manage access permissions.",
    duration: "0:05",
    video: tutorialSharing,
  },
  {
    id: "export-pdf",
    title: "Exporting to PDF",
    description: "Generate professional PDF exports of your complete brand guidelines.",
    duration: "0:05",
    video: tutorialExportPdf,
  },
];

import { Calendar } from 'lucide-react';

const faqs = [
  {
    category: "Getting Started",
    icon: Lightbulb,
    questions: [
      {
        q: "What is BrandHub?",
        a: "BrandHub is a comprehensive brand guide creation platform that helps you build, manage, and share professional brand guidelines. Create stunning brand books with colors, typography, logos, AI-powered analytics, competitive intelligence, multicultural localization, DataForce AI compliance, Oracle Brain strategic intelligence, and dedicated event brand kits—all with enterprise-grade security."
      },
      {
        q: "How do I create my first brand guide?",
        a: "Sign in to your account, click 'New Brand' on the dashboard, and start customizing your brand identity. You can add colors, typography, logos, values, philosophical pillars, and much more to create a complete brand guide."
      },
      {
        q: "Can I share my brand guide publicly?",
        a: "Yes! All brand guides can be made publicly viewable. Share the link with your team, clients, or stakeholders so they can access your brand guidelines anytime—no login required for viewers."
      },
      {
        q: "What are Product Suites?",
        a: "Product Suites let you create a master product with multiple linked sub-products in a streamlined wizard. Perfect for product families with shared branding—master products display a special badge and appear at the top of portal grids."
      }
    ]
  },
  {
    category: "Brand Elements",
    icon: BookOpen,
    questions: [
      {
        q: "What sections can I include in my brand guide?",
        a: "BrandHub supports 25+ sections including: Hero with animated effects, Identity & Mission, Philosophical Pillars, Color Palette, Typography, Logo Usage, Imagery Guidelines, Patterns, Gradients, Icons, QR Codes, Email Signatures, Presentation Templates, Social Media, and more."
      },
      {
        q: "What are Philosophical Pillars?",
        a: "Philosophical Pillars showcase your brand values with high-quality imagery or icons. Toggle between icon and image modes, choose from preset themes like Collaboration or Innovation, or upload custom visuals for a premium editorial feel."
      },
      {
        q: "How do QR Codes work?",
        a: "Create branded QR codes with custom colors, dot styles, corner styles, and logo overlays. Track scan counts for marketing analytics, categorize by use case (Marketing, Events, Print), and download in multiple formats."
      },
      {
        q: "Can I upload presentation templates?",
        a: "Yes! The Presentation Templates section supports PPTX, PDF, and cloud folder links. Templates feature live Office Online previews, fullscreen mode, and auto-generated thumbnails. Perfect for distributing corporate decks and sales materials."
      },
      {
        q: "How do I reorder sections in my brand guide?",
        a: "In edit mode, use the sidebar to drag and drop sections into your preferred order. You can also hide sections you don't need using the eye icon toggle."
      }
    ]
  },
  {
    category: "GlobalLink & Localization",
    icon: Globe,
    questions: [
      {
        q: "What is GlobalLink integration?",
        a: "GlobalLink integration provides real-time translation via the GlobalLink Web API. Configure your API key and project key in Admin Settings to enable live translations for all your brand content across multiple languages."
      },
      {
        q: "What is Demo Mode vs Live Mode?",
        a: "Demo Mode simulates translations by adding language markers to content (e.g., '[es_ES] Your text here')—perfect for testing workflows without API costs. Live Mode uses your actual GlobalLink credentials for production-quality translations."
      },
      {
        q: "How does Translation Hub work?",
        a: "The Translation Hub is your central dashboard for managing all translation jobs. View job status (Pending, In Progress, Completed), track word counts and character counts, monitor cache hit rates, and manage target languages—all from one interface."
      },
      {
        q: "What is translation caching?",
        a: "BrandHub automatically caches translated content to reduce API costs and improve speed. Previously translated content is served instantly from cache. View cache analytics including hit counts, storage usage, and cache efficiency metrics."
      },
      {
        q: "What target languages are supported?",
        a: "Configure any target language your GlobalLink account supports. Common languages include Spanish, French, German, Japanese, Chinese, Portuguese, Italian, and more. Set language priorities and enable/disable languages per organization."
      },
      {
        q: "What GlobalLink products are supported?",
        a: "BrandHub integrates with the full GlobalLink suite: Translation (real-time MT/HT), AI (content optimization), Connect (workflow management), and Fluent (website localization). Enable each product individually in Admin → Localization settings."
      }
    ]
  },
  {
    category: "Multicultural Intelligence",
    icon: Languages,
    questions: [
      {
        q: "What is Multicultural Intelligence?",
        a: "Multicultural Intelligence provides AI-powered cultural insights for your brands, products, and events. Get localization readiness scores, regional market analysis, and recommendations for cultural adaptations across global markets."
      },
      {
        q: "What is a Localization Readiness Score?",
        a: "The Localization Readiness Score (0-100) measures how prepared your brand is for international expansion. It considers content completeness, cultural sensitivity, visual adaptability, and messaging flexibility. Higher scores indicate better global readiness."
      },
      {
        q: "How do Regional Variants work?",
        a: "Regional Variants allow you to create market-specific versions of your brand guides with tailored colors, messaging, imagery, and cultural adaptations. Variants inherit from the parent brand while allowing regional customizations."
      },
      {
        q: "What Cultural Insights are provided?",
        a: "Cultural Insights include primary expansion markets, regional messaging considerations, design adaptations (color sensitivity, imagery guidelines), and specific recommendations for each target market based on your brand's characteristics."
      },
      {
        q: "How does GlobalLink Strategy recommendation work?",
        a: "Based on your brand's profile and expansion goals, the system recommends which GlobalLink products to prioritize: Translation for content localization, AI for automated adaptations, Connect for workflow management, or Fluent for website localization."
      }
    ]
  },
  {
    category: "Event Brand Kits",
    icon: Calendar,
    questions: [
      {
        q: "What are Event Brand Kits?",
        a: "Event Brand Kits are specialized guidelines for conferences, summits, and corporate events. They include everything from venue signage specs to digital banners, schedules, sponsor tiers, and event history—all in one place."
      },
      {
        q: "What sections are included in an Event Kit?",
        a: "Event Kits include: Event Details (dates, venue, attendees), Schedule & Agenda, Sponsor Tiers, Signage Specs (dimensions, placement), Digital Banners (email, social, web), Event Videos, Website Links, and Event History."
      },
      {
        q: "Can I export my Event Kit as a PDF?",
        a: "Yes! Use the Export PDF button to generate a comprehensive event brief including AI-generated insights, schedules, venue information, and all branding assets."
      },
      {
        q: "How do I add sponsors to my event?",
        a: "In the Sponsors section, add sponsor logos organized by tier (Platinum, Gold, Silver, Bronze). Each sponsor can have a logo, website link, and tier designation."
      },
      {
        q: "Can I link an event to a parent brand?",
        a: "Yes! Events can be linked to parent brands, allowing them to inherit brand colors and guidelines while maintaining their own event-specific branding."
      }
    ]
  },
  {
    category: "AI & Analytics",
    icon: HelpCircle,
    questions: [
      {
        q: "What is the Oracle Brain?",
        a: "The Oracle Brain (Master Oracle) is BrandHub's organization-level strategic intelligence backbone. It aggregates institutional knowledge, strategic priorities, unified brand voice, and market intelligence. All entity-level AI analysis—Brand Intelligence, Competitive Reports, Research Briefings, DataForce Compliance, and the AI Assistant—are grounded in Oracle context, ensuring portfolio-wide strategic alignment."
      },
      {
        q: "How does the Oracle Brain integrate with other AI features?",
        a: "The Oracle Brain feeds strategic context downward into every AI function (Brand Intelligence, Competitive Analysis, Market Analysis, Research Briefings, DataForce Compliance, and the AI Assistant). Simultaneously, entity-level insights 'bubble up' into the Oracle knowledge base, creating a continuous bidirectional intelligence loop that gets smarter over time."
      },
      {
        q: "What is Competitive Intelligence?",
        a: "Competitive Intelligence generates comprehensive AI-powered reports with 10 sections including personality matrix radar charts, per-competitor profiles, SWOT analysis, content & messaging audits, and market trends. Reports are grounded in Oracle strategic context for portfolio-aligned insights. Discover competitors automatically or track favorites across analyses."
      },
      {
        q: "What is Brand Intelligence?",
        a: "Brand Intelligence is an AI learning system that builds knowledge about your brand over time. It uses a cumulative merging strategy (new insights merge with existing data, never overwrite), tracks analysis history, confidence scores with temporal decay, cultural insights, global readiness, and provides personalized recommendations based on your feedback—all aligned with the Oracle Brain's strategic context."
      },
      {
        q: "What are Research Briefings?",
        a: "Research Briefings are AI-generated deep-dive reports on your brands, products, or events. They use background job processing for complex analysis and incorporate Oracle strategic context. The Cultural Analysis Generator orchestrates research across multiple AI functions, feeding findings back as learned knowledge."
      },
      {
        q: "How do Brand Health Scores work?",
        a: "Brand Health Scores track completeness and consistency metrics across 35+ sections in 8 strategic categories. The system analyzes section completion with weighted depth-based scoring, identifies missing elements, and provides actionable recommendations. Compliance scores from DataForce AI are also displayed as badges across the platform."
      },
      {
        q: "Can I generate patterns and gradients automatically?",
        a: "Yes! AI generates brand-specific geometric patterns and CSS gradients based on your color palette. Use batch generation to create assets for all brands at once."
      },
      {
        q: "What is the Brand Creative Studio?",
        a: "The Brand Creative Studio enables brand-aware imagery generation with a built-in AI generator, prompt library for reusable templates, and design token export utility for CSS, JSON, and Tailwind configurations."
      }
    ]
  },
  {
    category: "DataForce AI",
    icon: Shield,
    questions: [
      {
        q: "What is DataForce AI?",
        a: "DataForce AI provides four enterprise-grade services: Brand Compliance AI (automated guideline enforcement with strategic alignment scoring), AI-Powered Brand Assistant (multilingual chatbot supporting 15+ languages), Cultural Validation Panel (human-in-the-loop regional validation), and GenAI Brand Training (fine-tuning models on brand-specific voice). All services are Oracle-aligned."
      },
      {
        q: "How does Brand Compliance AI work?",
        a: "Brand Compliance AI automatically scans your brand guides against established guidelines, evaluating 6 dimensions including visual consistency, messaging alignment, typography adherence, and strategic alignment with organization-level standards via the Oracle Brain. Compliance scores appear as color-coded badges (Green 80+, Yellow 60-79, Red <60) across the platform."
      },
      {
        q: "What is Auto-Compliance scanning?",
        a: "Auto-Compliance triggers a debounced (5-second delay) compliance scan automatically whenever a brand guide is saved. This ensures compliance scores are always current without manual intervention. Enable or disable per organization."
      },
      {
        q: "What is Live Mode vs Demo Mode in DataForce?",
        a: "Live Mode connects to actual AI services with API keys for production-quality results. Demo Mode provides simulated AI responses with brand-specific placeholders—perfect for demonstrations, testing workflows, and client presentations without incurring API costs."
      },
      {
        q: "Where can I monitor DataForce AI?",
        a: "DataForce AI has a dedicated tab in the Admin Dashboard with service status, usage metrics, and compliance summaries. A Summary Widget also appears on the Admin Overview page for at-a-glance monitoring."
      }
    ]
  },
  {
    category: "Sharing & Export",
    icon: Globe,
    questions: [
      {
        q: "How do I share my brand guide?",
        a: "Simply copy the URL of your brand guide and share it. Anyone with the link can view your brand guidelines without needing an account."
      },
      {
        q: "What is the Hero Effects Gallery?",
        a: "The Hero Effects Gallery (/hero-effects) is an interactive playground for animated hero backgrounds. Browse 15+ effects, customize density, speed, and colors in real-time, then apply configurations to your brand guides."
      },
      {
        q: "Can I export my brand guide as a PDF?",
        a: "Yes! Use the Export PDF button to generate a downloadable PDF with customizable layouts: Full Guide, Executive Summary, or Style Sheet presets."
      },
      {
        q: "How do Organization Portals work?",
        a: "Organization Portals aggregate all your public brands, products, and events in one branded page. Customize colors, logos, hero effects, and layout options. Access at /org/your-slug."
      }
    ]
  },
  {
    category: "Getting Started & Plans",
    icon: CreditCard,
    questions: [
      {
        q: "How do I get started with BrandHub?",
        a: "Contact our team to get started! We'll walk you through the platform, understand your brand management needs, and set up your organization with the right configuration for your team."
      },
      {
        q: "How does pricing work?",
        a: "We offer flexible plans tailored to your organization's needs. Contact us for a personalized quote based on your team size, feature requirements, and usage needs."
      },
      {
        q: "What's included when I sign up?",
        a: "All plans include brand guide creation, color palettes, typography management, logo usage guidelines, team collaboration, public sharing, and access to AI features. Contact us to learn about GlobalLink integration, competitive intelligence, and advanced features."
      },
      {
        q: "Do you offer custom solutions for enterprises?",
        a: "Yes! We work with organizations of all sizes to create custom solutions. Reach out to discuss white-labeling, custom domains, GlobalLink enterprise integration, advanced integrations, and dedicated support options."
      }
    ]
  },
  {
    category: "Team Collaboration",
    icon: Users,
    questions: [
      {
        q: "Can I invite team members to collaborate?",
        a: "Yes! Invite team members by email with role-based permissions. Invitations include secure tokens that expire after 7 days if not accepted."
      },
      {
        q: "What permission levels are available?",
        a: "We offer multiple permission levels: Viewer (view only), Member (can edit guides), Admin (can manage settings, members, and GlobalLink config), Owner (full control including deletion), and Super Admin (platform-wide access including Application Settings, admin repair tools, organization deletion, and user promotion)."
      },
      {
        q: "How does email masking work?",
        a: "For privacy protection, non-admin users see masked email addresses (***@domain.com) for other team members. Admins see full emails for user management, and you always see your own email."
      },
      {
        q: "How do I remove a team member?",
        a: "Go to your workspace settings, find the People section, and remove the team member. They will immediately lose access to all shared brand guides."
      }
    ]
  },
  {
    category: "Bias Awareness & Accessibility",
    icon: Shield,
    questions: [
      {
        q: "What is Bias Awareness scanning?",
        a: "Bias Awareness is an AI-powered governance feature that evaluates your brand content across four dimensions: Language (inclusive terminology), Visual (representation and stereotypes), Accessibility (WCAG 2.2 compliance, contrast, readability), and AI Governance (responsible AI usage). Each scan produces dimension scores, actionable findings with severity badges, and a Persona Spectrum coverage grid based on the Microsoft Inclusive Design framework."
      },
      {
        q: "What is the Persona Spectrum?",
        a: "The Persona Spectrum is based on Microsoft's Inclusive Design methodology. It evaluates your content against permanent needs (e.g., blindness), temporary needs (e.g., broken arm), and situational needs (e.g., holding a baby) across Vision, Mobility, Hearing, Speech, and Cognitive dimensions. Coverage is determined by alt-text presence, responsive layouts, touch targets, captions, plain language, and navigation clarity."
      },
      {
        q: "How does color accessibility work?",
        a: "BrandHub uses OKLCH perceptual color logic for automated 7:1 contrast compliance, colorblind simulations (Protanopia, Deuteranopia, Tritanopia, Achromatopsia), and Helmholtz-Kohlrausch correction for perceived brightness. It also includes a Global Cultural Symbolism Map for geo-targeted color associations across 7+ markets."
      },
      {
        q: "What accessibility standards are supported?",
        a: "The platform evaluates content against WCAG 2.2 guidelines, ADA/IBC physical accessibility standards (door/corridor widths for events), and inclusive imagery audits for representation, power hierarchies, and trope detection. Results integrate into automated bias monitoring and cohesion reviews."
      },
      {
        q: "Where can I see Bias Awareness reports?",
        a: "Bias Awareness reports are available in three places: (1) The Admin Dashboard 'Bias Awareness' tab with org-wide KPIs and entity scores, (2) The Insights & Updates section as insight cards with deep-dive dialogs, and (3) Individual brand/product/event editors where scans can be triggered. Reports include dimension averages, findings with severity levels, and the Persona Spectrum coverage grid."
      },
      {
        q: "What is the Inclusive Imagery Audit?",
        a: "The Inclusive Imagery Audit deconstructs multi-modal brand assets using the PI&E 'Who Else?' and WFA litmus tests. It evaluates representation diversity, power hierarchies in imagery, and detects visual tropes or stereotypes — providing recommendations for more authentic, representative alternatives."
      },
    ]
  },
  {
    category: "Security & Privacy",
    icon: Shield,
    questions: [
      {
        q: "Is my brand data secure?",
        a: "Yes! BrandHub uses enterprise-grade security with Row Level Security (RLS), encrypted data in transit and at rest, and comprehensive audit logging for compliance."
      },
      {
        q: "How are GlobalLink API credentials stored?",
        a: "GlobalLink API keys and project keys are stored securely in the database with encryption. Alternatively, you can configure them as backend secrets for additional security. Keys are never exposed to client-side code."
      },
      {
        q: "What is Leaked Password Protection?",
        a: "Leaked Password Protection checks new passwords against known breached password databases, preventing users from setting compromised passwords. Enable in authentication settings."
      },
      {
        q: "How does audit logging work?",
        a: "All actions are logged with user ID, session details, device info, and full change diffs (old vs new values). Logs are retained for 30 days and viewable in the Admin Dashboard."
      },
      {
        q: "Where is my data stored?",
        a: "Your data is stored on secure cloud servers with automatic backups. We use trusted infrastructure providers with SOC 2 compliance to ensure reliability and performance."
      }
    ]
  }
];

const KnowledgeBase = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<typeof tutorials[0] | null>(null);
  const [activeSection, setActiveSection] = useState<"general" | "iconkit" | "bias">("general");
  const { settings } = useAppSettings();
  
  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <AppBreadcrumbs
          items={[]}
          currentPage="Knowledge Base"
          currentIcon={HelpCircle}
        />
      </div>

      {/* Hero */}
      <section className="py-6 sm:py-12 px-4 sm:px-6 text-center border-b border-border/30">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="p-3 bg-accent/10 rounded-2xl w-fit mx-auto">
            <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            Find answers to common questions and learn how to make the most of BrandHub.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto mt-6 sm:mt-8 px-2">
            <Search className="absolute left-5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Section Tabs */}
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant={activeSection === "general" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("general")}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              General FAQ
            </Button>
            <Button
              variant={activeSection === "iconkit" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("iconkit")}
              className="gap-2"
            >
              <Palette className="h-4 w-4" />
              IconKIT
            </Button>
            <Button
              variant={activeSection === "bias" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("bias")}
              className="gap-2"
            >
              <Scale className="h-4 w-4" />
              Bias & Accessibility
            </Button>
          </div>
        </div>
      </section>

      {/* Video Tutorials Section */}
      {settings.pageSections?.videoTutorials && (
        <section className="py-8 sm:py-12 px-4 sm:px-6 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <div className="p-3 bg-accent/10 rounded-xl w-fit mx-auto mb-4">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Video Tutorials</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Watch step-by-step guides to master BrandHub quickly.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tutorials.map((tutorial) => (
                <Card 
                  key={tutorial.id}
                  className="overflow-hidden border-border/50 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedVideo(tutorial)}
                >
                  <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center relative overflow-hidden">
                    <video 
                      src={tutorial.video} 
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="relative w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-accent-foreground ml-1" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-1">{tutorial.title}</h3>
                    <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">{tutorial.duration}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* In-depth Guides */}
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="p-3 bg-accent/10 rounded-xl w-fit mx-auto mb-4">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">In-depth Guides</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Long-form references and playbooks for getting more out of AI in your design workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Link to="/knowledge/claude-for-designers" className="group">
              <Card className="h-full overflow-hidden border-border/50 hover:shadow-lg hover:border-accent/40 transition-all">
                <div className="aspect-video bg-gradient-to-br from-accent/20 via-accent/10 to-background flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-accent" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 flex items-center gap-1">
                    Claude for Designers
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A practical, design-team-focused guide to working with Claude — prompts, workflows, and use cases.
                  </p>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {activeSection === "iconkit" ? (
            <IconKitSection searchQuery={searchQuery} />
          ) : activeSection === "bias" ? (
            <BiasAccessibilitySection searchQuery={searchQuery} />
          ) : (
            <>
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No results found for "{searchQuery}"</p>
                  <Button 
                    variant="link" 
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                filteredFaqs.map((category) => (
                  <div key={category.category} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-5 w-5 text-accent" />
                      <h2 className="text-xl font-semibold text-foreground">{category.category}</h2>
                    </div>
                    
                    <Accordion type="single" collapsible className="space-y-2">
                      {category.questions.map((faq, index) => (
                        <AccordionItem 
                          key={index} 
                          value={`${category.category}-${index}`}
                          className="border border-border/50 rounded-lg px-4 bg-card/50"
                        >
                          <AccordionTrigger className="text-left hover:no-underline">
                            <span className="font-medium text-foreground">{faq.q}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 border-t border-border/30">
        <div className="max-w-2xl mx-auto text-center space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Still have questions?</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Can't find what you're looking for? We're here to help.
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:support@brandhub.com">Contact Support</a>
          </Button>
        </div>
      </section>

      {/* Video Player Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <DialogTitle className="text-base sm:text-lg">{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {selectedVideo && (
              <video
                src={selectedVideo.video}
                className="w-full h-full"
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
          <div className="p-3 sm:p-4 pt-2">
            <p className="text-sm text-muted-foreground">{selectedVideo?.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
