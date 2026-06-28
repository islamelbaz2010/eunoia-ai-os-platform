/**
 * Converts a human-readable string into a URL-safe slug with a random suffix
 * to prevent collisions. Used for organization slugs.
 *
 * Examples:
 *   slugify("Grand Palace Hotel") → "grand-palace-hotel-a3b2c"
 *   slugify("!!!")                → "org-x7y8z"
 */
export function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
