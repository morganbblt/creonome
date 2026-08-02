const protectedRoutePrefixes = [
  "/today",
  "/projects",
  "/opportunities",
  "/library",
  "/creator-dna",
  "/profile",
  "/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
