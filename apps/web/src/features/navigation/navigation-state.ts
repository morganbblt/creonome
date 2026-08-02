export function isNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
