/** Resolves relative storage paths returned by the API for web and native image components. */
export function resolveMenuImageUri(imageUrl?: string | null, apiBaseUrl?: string) {
  if (!imageUrl) return undefined;
  return imageUrl.startsWith('/') && apiBaseUrl ? `${apiBaseUrl}${imageUrl}` : imageUrl;
}
