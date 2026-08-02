const timecodeBoundary = /(?=\[\d{1,2}:\d{2}(?:\s*[–—-]\s*\d{1,2}:\d{2})?\])/g;

export function splitScriptSegments(body: string): string[] {
  const normalized = body.trim();
  if (!normalized) return [];

  const segments = normalized
    .split(timecodeBoundary)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length ? segments : [normalized];
}
