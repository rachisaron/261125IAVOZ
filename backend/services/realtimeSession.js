// Create ephemeral client_secret for WebRTC Realtime
export async function createRealtimeEphemeral({ model, voice, instructions }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      // The realtime service reads these instructions for the session
      instructions,
      // Ask realtime to produce audio; the browser will negotiate codecs
      modalities: ["audio", "text"],
      turn_detection: {
        type: "server_vad",
        silence_duration_ms: 900,
        threshold: 0.6,
        prefix_padding_ms: 300,
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Realtime session failed: ${resp.status} ${text}`);
  }
  return await resp.json(); // contains { client_secret: { value, expires_at, ... } }
}
