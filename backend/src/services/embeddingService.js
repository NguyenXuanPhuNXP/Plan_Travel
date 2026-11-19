import axios from "axios";

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || "http://localhost:8001";

function normalizeEmbeddingVector(vector) {
  if (!Array.isArray(vector)) return null;
  const normalized = vector
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));

  if (!normalized.length) return null;
  return normalized;
}

export function buildLocationEmbeddingText(location = {}) {
  const tags = Array.isArray(location.tags) ? location.tags.join(", ") : "";
  return [
    location.name || "",
    location.category || "",
    location.subcategory || "",
    location.region || "",
    location.city || "",
    location.province || "",
    location.address || "",
    location.description || "",
    tags
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(". ");
}

export async function generateEmbeddingFromText(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;

  try {
    const response = await axios.post(`${PYTHON_AI_URL}/ai/embed-text`, {
      text: cleanText
    });
    return normalizeEmbeddingVector(response?.data?.embedding);
  } catch (error) {
    console.error("[Embedding] Failed to generate embedding:", error.message);
    return null;
  }
}

export async function generateLocationEmbedding(location) {
  const text = buildLocationEmbeddingText(location);
  return generateEmbeddingFromText(text);
}

export async function refreshSearchCache() {
  try {
    await axios.post(`${PYTHON_AI_URL}/ai/refresh-search-cache`);
  } catch (error) {
    console.error("[Embedding] Failed to refresh search cache:", error.message);
  }
}
