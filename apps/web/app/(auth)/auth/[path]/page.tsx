import { AuthView } from "@neondatabase/auth-ui";

type AuthPageProps = {
  params: Promise<{ path: string }>;
};

export default async function AuthPage({ params }: AuthPageProps) {
  const { path } = await params;

  return (
    <AuthView
      path={path}
      redirectTo="/onboarding"
      classNames={{
        form: { icon: "size-4 shrink-0" },
        // The bundled divider row relies on its Separator children growing
        // via flexbox to fill the row, which doesn't hold up against this
        // app's Tailwind build (the separators collapse and the "Or
        // continue with" text overflows past the card edge). Force the
        // layout with an explicit grid instead of depending on that.
        continueWith: "!grid !grid-cols-[1fr_auto_1fr] !items-center !gap-2",
        separator: "!w-full",
      }}
    />
  );
}
