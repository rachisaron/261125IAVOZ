// Uses gpt-4o-transcribe via the audio/transcriptions REST endpoint
export async function transcribeOnce(buffer, mimetype = "audio/webm") {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const form = new FormData();
  const file = new Blob([buffer], { type: mimetype });
  form.append("file", file, "speech.webm");
  form.append("model", "gpt-4o-transcribe");
  form.append("language", "es");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Transcription error: ${resp.status} ${txt}`);
  }
  const data = await resp.json(); // { text: "..." }
  return data.text || "";
}
