import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SignatureStudio } from "@/components/signature/SignatureStudio";

export const Route = createFileRoute("/signatures")({
  head: () => ({
    meta: [
      { title: "Email signatures · TransPerfect Element" },
      {
        name: "description",
        content:
          "Build an on-brand TransPerfect email signature: approved palette, division lockup and Outlook-safe HTML, plus a contact card, QR code and reply-short version.",
      },
      { property: "og:title", content: "Email signatures · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Governed email signatures for every TransPerfect division — approved colours, lockups and an Outlook-safe export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignaturesPage,
});

function SignaturesPage() {
  return (
    <AppShell>
      <SignatureStudio />
    </AppShell>
  );
}
