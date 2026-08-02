import { AuthView } from "@neondatabase/auth-ui";

type AuthPageProps = {
  params: Promise<{ path: string }>;
};

export default async function AuthPage({ params }: AuthPageProps) {
  const { path } = await params;

  return <AuthView path={path} redirectTo="/onboarding" />;
}
