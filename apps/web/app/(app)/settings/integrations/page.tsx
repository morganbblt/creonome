import type { Metadata } from "next";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

export const metadata: Metadata = { title: "Integrations" };

const providers = [
  {
    name: "TikTok",
    mark: "TT",
    description:
      "TikTok insights and publishing connections are planned after the MVP.",
  },
  {
    name: "Instagram",
    mark: "IG",
    description:
      "Instagram insights and publishing connections are planned after the MVP.",
  },
] as const;

export default function IntegrationsPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5.5 py-8.5 pb-14">
      <h1 className="mb-5.5 text-3xl font-semibold tracking-tight sm:text-4xl">
        Integrations
      </h1>
      <div className="flex flex-col gap-3">
        {providers.map((provider) => (
          <Card key={provider.name} className="gap-3">
            <CardHeader className="flex-row items-center gap-3.5">
              <Avatar className="rounded-control">
                <AvatarFallback className="rounded-control font-mono text-[11px]">
                  {provider.mark}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">
                  {provider.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Optional social connection
                </p>
              </div>
              <Badge variant="accent">Coming soon</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {provider.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
