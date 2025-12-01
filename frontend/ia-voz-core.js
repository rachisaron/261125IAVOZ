// Core logic for Profe ELE – IA Voz (no DOM here)
export class IAVozCore {
  constructor({
    onStatusChange,
    onUserTranscript,
    onAssistantMessage,
    onCorrectionCard,
    onAudioStream,
    onTalking,
    onUserSpeechStart,
  } = {}) {
    // Callbacks (UI injects)
    this.cb = {
      onStatusChange: onStatusChange || (() => {}),
      onUserTranscript: onUserTranscript || (() => {}),
      onAssistantMessage: onAssistantMessage || (() => {}),
      onCorrectionCard: onCorrectionCard || (() => {}),
      onAudioStream: onAudioStream || (() => {}),
      onTalking: onTalking || (() => {}),
      onUserSpeechStart: onUserSpeechStart || (() => {}),
    };

    // State
    this.connected = false;
    this.assistantSpeaking = false;
    this.studentSpeaking = false;
    this.lastUserTranscript = "";
    this.lastAssistantMessage = ""; // <--- NUEVO: Contexto del profesor
    this.pendingCorrections = [];

    // Internals
    this.pc = null;
    this.dc = null;
    this.micStream = null;
    this.recorder = null;
    this.chunks = [];
    this.answerTextBuffer = {}; // id -> accumulating text

    // Grabación continua con “pre-roll”
    this.recorderTimesliceMs = 250; // cada chunk ≈ 250ms
    this.preRollChunks = 4; // ≈ 1 segundo antes de speech_started
    this.currentUtteranceStartIndex = 0;
    this.lastFlushedIndex = 0;
  }

  async fetchConfig() {
    const res = await fetch("/config");
    if (!res.ok) throw new Error("No /config");
    this.cfg = await res.json();
    return this.cfg;
  }

  async toggleConnection() {
    if (this.connected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      await this.fetchConfig();

      // 1) Get ephemeral client_secret for Realtime
      const sessRes = await fetch("/session", { method: "POST" });
      const { client_secret } = await sessRes.json();
      if (!client_secret?.value)
        throw new Error("No client_secret from /session");
      const token = client_secret.value;

      // 2) Create RTCPeerConnection
      this.pc = new RTCPeerConnection();
      this.dc = this.pc.createDataChannel("oai-events");
      this.dc.onopen = () => this.cb.onStatusChange("datachannel_open");
      this.dc.onmessage = (ev) => this.handleRealtimeEvent(ev);

      // Remote audio track to UI
      this.pc.ontrack = (e) => {
        const [remoteStream] = e.streams;
        this.cb.onAudioStream(remoteStream);
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc.connectionState === "connected") {
          this.connected = true;
          this.cb.onStatusChange("connected");
          // Ask model to greet once
          if (this.dc && this.dc.readyState === "open") {
            this.dc.send(
              JSON.stringify({
                type: "response.create",
                response: { temperature: this.cfg.realtimeTemperature },
              }),
            );
          }

          // En cuanto haya conexión, arrancamos grabación continua
          try {
            if (this.recorder && this.recorder.state === "inactive") {
              this.recorder.start(this.recorderTimesliceMs);
              console.log("[REC] Recorder en modo continuo iniciado.");
            }
          } catch (err) {
            console.error("[REC] Error al iniciar MediaRecorder:", err);
          }
        } else if (
          this.pc.connectionState === "disconnected" ||
          this.pc.connectionState === "failed" ||
          this.pc.connectionState === "closed"
        ) {
          this.connected = false;
          this.cb.onStatusChange("disconnected");
        }
      };

      // 3) Get mic, add tracks
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      this.micStream
        .getTracks()
        .forEach((t) => this.pc.addTrack(t, this.micStream));

      // 4) Negotiate SDP with OpenAI Realtime via fetch (WebRTC over HTTPS)
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(this.cfg.realtimeModel)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/sdp",
          },
        },
      );

      const answerSDP = await sdpResponse.text();
      await this.pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

      // Recorder para el audio del alumno (para /transcribe) – modo continuo
      this.recorder = new MediaRecorder(this.micStream, {
        mimeType: "audio/webm",
      });

      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      // Cada vez que paramos la grabadora (un turno de alumno), montamos el Blob,
      // lo mandamos a /transcribe y reiniciamos la grabación para el siguiente turno.
      this.recorder.onstop = () => {
        // Evitar transcripción si estamos desconectando
        if (!this.connected) {
          console.log(
            "[REC] Desconexión en curso, ignorando último fragmento.",
          );
          this.chunks = [];
          return;
        }

        try {
          const blob = new Blob(this.chunks, { type: "audio/webm" });
          this.chunks = [];
          console.log("[REC] Utterance Blob size:", blob.size);

          if (blob.size > 0) {
            this.sendBlobToTranscribe(blob);
          } else {
            console.warn("[REC] Blob sin datos en onstop, no se transcribe.");
          }
        } catch (err) {
          console.error("[REC] Error construyendo Blob en onstop:", err);
        }

        // Reiniciar grabación para el siguiente turno
        try {
          if (this.connected && this.recorder.state === "inactive") {
            this.recorder.start(this.recorderTimesliceMs);
            console.log(
              "[REC] Recorder reiniciado para siguiente turno del alumno.",
            );
          }
        } catch (err) {
          console.error("[REC] Error al reiniciar MediaRecorder:", err);
        }
      };

      // 🔹 Arrancamos el MediaRecorder en cuanto existe, para que haya chunks
      try {
        if (this.recorder.state === "inactive") {
          this.recorder.start(this.recorderTimesliceMs);
          console.log(
            "[REC] Recorder en modo continuo iniciado (post-instanciación).",
          );
        }
      } catch (err) {
        console.error(
          "[REC] Error al iniciar MediaRecorder (post-instanciación):",
          err,
        );
      }
    } catch (e) {
      console.error("Connect error", e);
      this.cb.onStatusChange("error");
    }
  }

  async disconnect() {
    try {
      this.connected = false;
      if (this.recorder && this.recorder.state !== "inactive")
        this.recorder.stop();
      if (this.dc && this.dc.readyState === "open") this.dc.close();
      if (this.pc) this.pc.close();
      if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.warn("Disconnect issue", e);
    } finally {
      this.cb.onStatusChange("disconnected");
    }
  }

  // UI may call this to send typed text (optional)
  sendText(text) {
    if (!this.dc || this.dc.readyState !== "open") return;
    const item = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    };
    this.dc.send(JSON.stringify(item));
    this.dc.send(
      JSON.stringify({
        type: "response.create",
        response: { temperature: this.cfg.realtimeTemperature },
      }),
    );
  }

  // Ask grammar oracle via REST
  async requestCorrection(text) {
    try {
      // --- MODIFICACIÓN: Enviar también el contexto ---
      const payload = {
        text,
        context: this.lastAssistantMessage || "",
      };

      const res = await fetch("/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // ------------------------------------------------

      const corr = await res.json();
      if (corr && typeof corr.is_error === "boolean") {
        // Solo mostramos tarjeta cuando hay error
        if (corr.is_error) {
          this.cb.onCorrectionCard(corr);
          this.pendingCorrections.push({
            ...corr,
            createdAt: Date.now(),
            turnIndex: Date.now(),
          });
          this.trySpeakNextCorrection();
        }
      }
    } catch (e) {
      console.error("Correction failed", e);
    }
  }

  trySpeakNextCorrection() {
    if (!this.connected) return;
    if (this.assistantSpeaking) return;
    if (this.studentSpeaking) return;
    if (this.pendingCorrections.length === 0) return;

    const corr = this.pendingCorrections.shift();
    if (!this.dc || this.dc.readyState !== "open") return;

    // Build special block so the Realtime model follows the rule in the prompt
    const block = `[CORRECCION]
ERROR: "${corr.error}"
FIX: "${corr.fix}"
REASON: "${corr.reason}"`;

    this.assistantSpeaking = true;
    this.cb.onTalking(true);

    this.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: block }],
        },
      }),
    );
    this.dc.send(
      JSON.stringify({
        type: "response.create",
        response: { temperature: this.cfg.realtimeTemperature },
      }),
    );
  }

  async sendBlobToTranscribe(blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, "utterance.webm");

      const r = await fetch("/transcribe", { method: "POST", body: form });
      const { transcript } = await r.json();

      this.lastUserTranscript = transcript || "";
      console.log("[REC] Transcripción recibida:", this.lastUserTranscript);

      if (this.lastUserTranscript) {
        this.cb.onUserTranscript(this.lastUserTranscript);
        // Ask correction oracle
        this.requestCorrection(this.lastUserTranscript);
      }
    } catch (e) {
      console.error("Transcribe failed", e);
    }
  }

  flushUtteranceToTranscribe(startIndex) {
    // Esta función ya no se usa en el flujo actual, pero la dejamos por si
    // quieres depurar o volver a probar recortes manuales en el futuro.
    const len = this.chunks.length;

    if (!len) {
      console.warn("[REC] flushUtteranceToTranscribe sin chunks.");
      return;
    }

    const safeStart =
      typeof startIndex === "number" && !Number.isNaN(startIndex)
        ? Math.max(0, Math.min(startIndex, len))
        : this.lastFlushedIndex;

    if (len <= safeStart) {
      console.warn("[REC] Segmento vacío al flush", { safeStart, len });
      return;
    }

    const end = len;
    const segment = this.chunks.slice(safeStart, end);
    this.lastFlushedIndex = end;

    const blob = new Blob(segment, { type: "audio/webm" });
    console.log("[REC] Enviando segmento a /transcribe", {
      start: safeStart,
      end,
      chunks: segment.length,
      approxMs: segment.length * this.recorderTimesliceMs,
      size: blob.size,
    });

    if (blob.size === 0) {
      console.warn("[REC] Blob sin datos, no se llama a /transcribe.");
      return;
    }

    this.sendBlobToTranscribe(blob);
  }

  handleRealtimeEvent(ev) {
    try {
      const msg = JSON.parse(ev.data);
      const t = msg.type || "";
      console.log("[RT EVENT]", t, msg);

      if (t.includes("speech")) {
        console.log(
          `[DEBUG] Evento VAD recibido: ${t} a las ${new Date().toISOString()}`,
        );
      }

      // Simple VAD signals from server
      if (t === "input_audio_buffer.speech_started") {
        this.studentSpeaking = true;
        this.cb.onTalking(false);
        this.cb.onUserSpeechStart();

        const len = this.chunks.length;
        const preRollStart = Math.max(0, len - this.preRollChunks);
        this.currentUtteranceStartIndex = Math.max(
          this.lastFlushedIndex,
          preRollStart,
        );

        console.log(
          "[DEBUG] El servidor dice que empezaste a hablar. Marcando inicio de frase en buffer de audio...",
        );
        console.log(
          "[REC] speech_started len=",
          len,
          "startIndex=",
          this.currentUtteranceStartIndex,
        );
      }

      if (t === "input_audio_buffer.speech_stopped") {
        console.log(`[DEBUG] El servidor dice que dejaste de hablar.`);
        this.studentSpeaking = false;

        const startIndex = this.currentUtteranceStartIndex;
        const endIndex = this.chunks.length;
        console.log(
          "[REC] speech_stopped start=",
          startIndex,
          "end=",
          endIndex,
        );

        // Ahora dejamos que sea onstop quien empaquete y reinicie la grabadora
        if (this.recorder && this.recorder.state === "recording") {
          try {
            this.recorder.stop();
            console.log(
              "[REC] Recorder.stop() ejecutado en speech_stopped (turno completo).",
            );
          } catch (err) {
            console.error(
              "[REC] Error al hacer recorder.stop() en speech_stopped:",
              err,
            );
          }
        } else {
          console.warn(
            "[REC] speech_stopped pero recorder no está en recording:",
            this.recorder?.state,
          );
        }

        // After user stops, we may speak pending corrections
        setTimeout(() => this.trySpeakNextCorrection(), 450);
      }

      // Track assistant speech lifecycle
      if (t === "response.started") {
        this.assistantSpeaking = true;
        this.cb.onTalking(true);
      }

      // Incluir response.audio_transcript.delta
      if (
        t === "response.output_text.delta" ||
        t === "response.text.delta" ||
        t === "response.audio_transcript.delta"
      ) {
        const id = msg.response_id || msg.response?.id || "default";
        const delta = msg.delta || "";
        console.log("[RT TEXT DELTA]", { id, delta, raw: msg });
        this.answerTextBuffer[id] = (this.answerTextBuffer[id] || "") + delta;
      }

      // Comprobar response_id en response.completed/.done
      if (t === "response.completed" || t === "response.done") {
        const id = msg.response?.id || msg.response_id || "default";
        const full = this.answerTextBuffer[id] || "";
        console.log("[RT RESPONSE DONE]", { id, full, raw: msg });

        // --- MODIFICACIÓN: Guardar contexto ---
        if (full) {
          this.lastAssistantMessage = full; // Guardamos lo que dijo el profe
          this.cb.onAssistantMessage(full);
        }
        // --------------------------------------

        delete this.answerTextBuffer[id];
        this.assistantSpeaking = false;
        this.cb.onTalking(false);
        // If user not speaking, maybe speak next correction
        if (!this.studentSpeaking) this.trySpeakNextCorrection();
      }
    } catch (e) {
      // Unknown message types are expected sometimes
    }
  }
}
