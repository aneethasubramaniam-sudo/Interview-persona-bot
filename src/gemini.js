export const DEFAULT_MODEL = "gemini-3.8-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Stream a reply from Gemini.
 * history: [{ role: "user" | "model", text: string }]
 * onToken is called with each new text chunk.
 */
export async function streamChat({ apiKey, model, system, history, signal, onToken }) {
  const url = `${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.7 },
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error("Network error. Check your connection and try again.");
  }

  if (!res.ok) throw new Error(await explainError(res, model));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let blocked = "";

  const handleEvent = (raw) => {
    const data = raw
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data || data === "[DONE]") return;
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      return;
    }
    if (json.promptFeedback?.blockReason) blocked = json.promptFeedback.blockReason;
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (p.text && !p.thought) {
        full += p.text;
        onToken(p.text);
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop();
    events.forEach(handleEvent);
  }
  if (buffer.trim()) handleEvent(buffer);

  if (!full && blocked) throw new Error(`Gemini blocked this prompt (${blocked}). Try rewording.`);
  if (!full) throw new Error("Gemini returned an empty reply. Try again.");
  return full;
}

async function explainError(res, model) {
  let msg = "";
  try {
    const j = await res.json();
    msg = j?.error?.message ?? "";
  } catch {
    /* ignore */
  }
  if (res.status === 400 && /api key/i.test(msg)) return "Your API key looks invalid. Open API key and check it.";
  if (res.status === 401 || res.status === 403) return `Key rejected (${res.status}). ${msg}`.trim();
  if (res.status === 404)
    return `Model "${model}" was not found for your key. Open API key and set a model name that your account can use.`;
  if (res.status === 429) return "Rate limit hit. Wait a bit and try again.";
  return `Gemini error ${res.status}. ${msg}`.trim();
}
