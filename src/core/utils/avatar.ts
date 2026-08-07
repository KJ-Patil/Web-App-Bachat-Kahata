/**
 * Profile avatar + display-name handling.
 *
 * Avatars are kept as small inline data URLs (no Storage bucket), so every
 * value that reaches localStorage, Firestore or an <img src> passes through the
 * validators here. Two things matter:
 *
 *  - Size. A data URL is stored inline in the user's Firestore profile
 *    document, which has a hard 1 MiB limit. An oversized value would make the
 *    write fail and silently lose the edit.
 *  - Shape. Only image data URLs and https URLs are ever legitimate here.
 *    Anything else (javascript:, data:text/html, blob:, plain http:) is
 *    rejected on both write and read, so a tampered profile document can never
 *    put an attacker-chosen URL into the DOM.
 */

/** Square thumbnail edge, in pixels. */
export const AVATAR_SIZE = 256;

/**
 * Largest accepted avatar data URL, in characters. A 256px JPEG at q0.85 is
 * ~20-40k, so this leaves generous headroom while staying far below the 1 MiB
 * Firestore document limit.
 */
export const MAX_AVATAR_CHARS = 300_000;

/** Largest source image we will even attempt to decode (8 MB). */
const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024;

/** Display names are short; anything longer is truncated rather than rejected. */
export const MAX_NAME_CHARS = 40;

/** Only these data-URL image types are produced or accepted. */
const DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * True if `value` is safe to persist and to render into an <img src>.
 * Accepts a small image data URL (what this app produces) or an https URL
 * (what an identity provider such as Google returns).
 */
export function isSafeAvatarUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.length > MAX_AVATAR_CHARS) return false;

  if (value.startsWith("data:")) return DATA_URL_PATTERN.test(value);

  // Provider-hosted photo. Parse rather than string-match so that tricks like
  // "https:evil" or a javascript: URL wearing an https prefix cannot pass.
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Narrow an untrusted avatar value to something renderable, or null. */
export function sanitizeAvatarUrl(value: unknown): string | null {
  return isSafeAvatarUrl(value) ? value : null;
}

/**
 * Characters that must never survive into a display name: C0/C1 control codes,
 * zero-width marks, and the bidirectional overrides that let one name be
 * rendered to look like another. Checked by code point rather than by a regex
 * literal so the ranges stay readable.
 */
function isUnsafeNameCodePoint(cp: number): boolean {
  return (
    cp <= 0x1f ||                    // C0 controls
    (cp >= 0x7f && cp <= 0x9f) ||    // DEL + C1 controls
    (cp >= 0x200b && cp <= 0x200f) ||  // zero-width marks
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069)
  );
}

/**
 * Clean an untrusted display name: strip the characters above, collapse
 * whitespace, and cap the length.
 */
export function sanitizeDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value)
    .map((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      if (!isUnsafeNameCodePoint(cp)) return ch;
      // Tab / newline / carriage return become a space so "First<newline>Last"
      // collapses to "First Last" instead of "FirstLast".
      return cp >= 0x09 && cp <= 0x0d ? " " : "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_CHARS);
}

/**
 * Read an image file, crop it to a centered square, and return a small JPEG
 * data URL. Rejects non-images and files too large to decode safely.
 */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Please choose an image file."));
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      return reject(new Error("That image is too large. Please pick one under 8 MB."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        // Centered square crop of the original.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Image processing is not supported here."));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (!isSafeAvatarUrl(dataUrl)) {
          return reject(new Error("That image could not be resized small enough."));
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
