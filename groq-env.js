/**
 * Normalize GROQ_API_KEY from .env (fixes quotes, commas, stray whitespace).
 */
export function getGroqApiKey() {
  const raw = process.env.GROQ_API_KEY ?? "";
  return raw
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/,+$/g, "")
    .trim();
}
