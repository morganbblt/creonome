import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRightIcon,
  CreditCardIcon,
  PlugIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { UnavailableState } from "@/src/features/management/unavailable-state";

export const metadata: Metadata = { title: "Settings" };

const sections = [
  {
    href: "/settings/billing",
    icon: CreditCardIcon,
    title: "Billing",
    description: "Plan, credits, and payment method.",
  },
  {
    href: "/settings/integrations",
    icon: PlugIcon,
    title: "Integrations",
    description: "TikTok, Instagram, and storage connections.",
  },
  {
    href: "/settings/privacy",
    icon: ShieldIcon,
    title: "Privacy",
    description: "Data export, training opt-out, and account deletion.",
  },
] as const;

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5.5 py-8.5 pb-14">
      <header className="mb-5.5">
        <p className="mb-2 text-[10.5px] font-medium tracking-wider text-muted-foreground uppercase">
          Account &amp; workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your account, connections, and data.
        </p>
      </header>

      <section aria-labelledby="settings-sections-heading" className="mb-6">
        <h2
          id="settings-sections-heading"
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Sections
        </h2>
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <Card key={section.href} className="gap-0 py-0">
              <CardContent className="px-0">
                <Link
                  href={section.href}
                  className="flex items-center gap-3.5 rounded-card px-4.5 py-4 transition-colors hover:bg-secondary/60"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-9.5 shrink-0 place-items-center rounded-control bg-secondary text-foreground"
                  >
                    <section.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {section.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="settings-language-heading" className="mb-6">
        <h2
          id="settings-language-heading"
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Language
        </h2>
        <Card className="gap-0 py-4">
          <CardContent className="flex items-center justify-between gap-3.5 max-[480px]:flex-col max-[480px]:items-start">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Product language
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Français uniquement pour le moment — more languages are planned
                for a later release.
              </p>
            </div>
            <Select defaultValue="fr" disabled>
              <SelectTrigger
                size="sm"
                className="w-[150px] shrink-0"
                aria-label="Product language"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="settings-members-heading">
        <h2
          id="settings-members-heading"
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Members
        </h2>
        <UnavailableState
          icon={<UsersIcon className="size-[18px]" />}
          title="Creonome is single-user for now"
          description="Invites, roles, and shared access arrive with team workspaces in the Alpha phase. Nothing changes about your account or data until then."
          actionHref="/settings/billing"
          actionLabel="View seat plans"
        />
      </section>
    </main>
  );
}
