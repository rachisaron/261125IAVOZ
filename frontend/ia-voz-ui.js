import { IAVozCore } from "./ia-voz-core.js";

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("ia-voz");

  // --- DOM skeleton ---
  root.innerHTML = `
    <div class="iav-widget">
      <div class="iav-header">
        <div class="iav-title">Profe ELE – IA Voz</div>
        <div class="iav-actions">
          <span class="iav-status-dot" data-status="off"></span>
          <button class="iav-gear" title="Config">⚙️</button>
        </div>
      </div>
      <div class="iav-chat" id="iav-chat">
        <div class="iav-bubble iav-assistant">Hola, soy tu profesor virtual. ¡Hablemos!</div>
      </div>
      <div class="iav-footer">
        <div class="iav-input-wrap">
          <input id="iav-text" class="iav-text" placeholder="Escribe algo (opcional)..." />
          <button id="iav-send" class="iav-send" title="Enviar texto">➤</button>
        </div>
        <button id="iav-mic" class="iav-mic" aria-pressed="false" title="Hablar">
          <span class="iav-mic-ripple"></span>
          <span class="iav-mic-icon">🎤</span>
        </button>
      </div>
      <audio id="iav-remote-audio" autoplay></audio>
    </div>
  `;

  const chat = root.querySelector("#iav-chat");
  const micBtn = root.querySelector("#iav-mic");
  const sendBtn = root.querySelector("#iav-send");
  const textInput = root.querySelector("#iav-text");
  const statusDot = root.querySelector(".iav-status-dot");
  const remoteAudio = root.querySelector("#iav-remote-audio");

  // Variable para guardar la referencia a la burbuja "..."
  let pendingUserBubble = null;

  // --- Helpers ---
  const scrollBottom = () => {
    chat.scrollTop = chat.scrollHeight;
  };

  const addUserBubble = (text) => {
    const el = document.createElement("div");
    el.className = "iav-bubble iav-user";
    el.textContent = text;
    chat.appendChild(el);
    scrollBottom();
  };

  const addAssistantBubble = (text) => {
    const el = document.createElement("div");
    el.className = "iav-bubble iav-assistant";
    el.textContent = text;
    chat.appendChild(el);
    scrollBottom();
  };

  const addCorrectionCard = ({ is_error, error, fix, reason }) => {
    const wrap = document.createElement("div");
    wrap.className = "iav-correction-card";

    wrap.innerHTML = `
      <div class="iav-corr-stripe"></div>
      <div class="iav-corr-body">
        <div class="iav-corr-title">Correction</div>

        <div class="iav-corr-row">
          <span class="iav-corr-icon iav-err">✕</span>
          <span class="iav-corr-label"><strong>Dijiste:</strong></span>
          <span class="iav-corr-text iav-corr-text-error">${escapeHtml(error || "")}</span>
        </div>

        <div class="iav-corr-row">
          <span class="iav-corr-icon iav-ok">✔</span>
          <span class="iav-corr-label"><strong>Mejor di:</strong></span>
          <span class="iav-corr-text iav-corr-text-fix">${escapeHtml(fix || "")}</span>
        </div>

        <div class="iav-corr-row">
          <span class="iav-corr-icon">💡</span>
          <span class="iav-corr-label"><strong>Por qué:</strong></span>
          <span class="iav-corr-reason"><em>${escapeHtml(reason || "")}</em></span>
        </div>
      </div>
    `;
    chat.appendChild(wrap);
    scrollBottom();
  };

  function escapeHtml(s) {
    return (s || "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }

  const setConnected = (on) => {
    statusDot.dataset.status = on ? "on" : "off";
    micBtn.setAttribute("aria-pressed", on ? "true" : "false");
  };

  const setTalking = (isTalking) => {
    micBtn.classList.toggle("is-talking", !!isTalking);
  };

  // --- Core instance ---
  const core = new IAVozCore({
    onStatusChange: (s) => {
      if (s === "connected") setConnected(true);
      if (s === "disconnected" || s === "error") setConnected(false);
    },
    // Cuando el usuario empieza a hablar, pintamos "..."
    onUserSpeechStart: () => {
      // Si ya había una pendiente, la dejamos como estaba (raro, pero defensivo)
      if (pendingUserBubble) return;

      pendingUserBubble = document.createElement("div");
      pendingUserBubble.className = "iav-bubble iav-user";
      pendingUserBubble.textContent = "...";
      // Opcional: bajar opacidad para indicar que es temporal
      pendingUserBubble.style.opacity = "0.6";

      chat.appendChild(pendingUserBubble);
      scrollBottom();
    },
    // Cuando llega la transcripción completa
    onUserTranscript: (text) => {
      if (pendingUserBubble) {
        // Reemplazamos los "..." por el texto real
        pendingUserBubble.textContent = text;
        pendingUserBubble.style.opacity = "1";
        pendingUserBubble = null; // Limpiamos la referencia
        scrollBottom();
      } else {
        // Si por alguna razón no se creó el placeholder, creamos burbuja normal
        addUserBubble(text);
      }
    },
    onAssistantMessage: (text) => addAssistantBubble(text),
    onCorrectionCard: (obj) => addCorrectionCard(obj),
    onAudioStream: (stream) => {
      remoteAudio.srcObject = stream;
    },
    onTalking: (v) => setTalking(v),
  });

  // --- Events ---
  micBtn.addEventListener("click", async () => {
    micBtn.disabled = true;
    try {
      await core.toggleConnection();
    } finally {
      micBtn.disabled = false;
    }
  });

  sendBtn.addEventListener("click", () => {
    const txt = textInput.value.trim();
    if (!txt) return;
    addUserBubble(txt);
    textInput.value = "";
    core.sendText(txt);
  });

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
});
