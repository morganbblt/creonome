const privateKeyPattern = /(?:token|ciphertext|secret|gcsUri|checksumSha256)/i;

export function sanitizePrivacyExport(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePrivacyExport(item));
  }
  if (value instanceof Date || value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateKeyPattern.test(key))
      .map(([key, item]) => [key, sanitizePrivacyExport(item)]),
  );
}
