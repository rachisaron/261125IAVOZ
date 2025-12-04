/**
 * PROFE ELE - COST TRACKER (VERSIÓN DETALLADA 4 MÉTRICAS)
 * Desglose total de tokens: Txt In/Out y Audio In/Out para Realtime.
 * Precios: gpt-realtime (GA), gpt-5-mini, gpt-4o-transcribe.
 */

(function () {
  // --- PRECIOS (USD) ---
  const PRICING = {
    realtime: {
      text_input: 4.0 / 1_000_000,
      text_output: 16.0 / 1_000_000,
      audio_input: 32.0 / 1_000_000,
      audio_output: 64.0 / 1_000_000,
    },
    grammar: {
      input: 0.25 / 1_000_000,
      output: 2.0 / 1_000_000,
    },
    transcribe: {
      per_minute: 0.006,
    },
  };

  // --- ESTADO ACUMULADO ---
  const totals = {
    realtime: 0,
    // Desglose Realtime
    rt_txt_in: 0,
    rt_aud_in: 0,
    rt_txt_out: 0,
    rt_aud_out: 0,
    // Otros modelos
    grammar: 0,
    transcribe: 0,
    all: 0,
  };

  // --- UI (Panel Visual Mejorado) ---
  const ui = document.createElement("div");
  ui.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 380px;
    background: rgba(10, 20, 30, 0.98); color: #4dabf7; font-family: 'Courier New', monospace;
    padding: 0; border-radius: 12px; z-index: 9999; font-size: 14px;
    box-shadow: 0 4px 25px rgba(0,0,0,0.7); border: 1px solid #1c7ed6; overflow: hidden;
  `;

  ui.innerHTML = `
    <div style="background:#1864ab; color:#fff; padding: 10px 14px; font-weight:bold; display:flex; justify-content:space-between;">
      <span>💰 TRACKER DETALLADO</span>
      <span style="opacity:0.8">GA</span>
    </div>

    <div style="padding: 12px 14px; background: rgba(0,0,0,0.3); border-bottom: 1px solid #1c7ed6;">

      <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed rgba(255,255,255,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
           <span style="color:#74c0fc; font-weight:bold; font-size:15px;">🗣️ Realtime Total:</span>
           <span id="sum-realtime" style="color:#fff; font-weight:bold; font-size:15px;">$0.000000</span>
        </div>
        <div style="font-size:12px; color:#a5d8ff; display:grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
           <div style="display:flex; justify-content:space-between;"><span>In Txt:</span> <span id="rt-txt-in" style="color:#fff;">0</span></div>
           <div style="display:flex; justify-content:space-between;"><span>In Aud:</span> <span id="rt-aud-in" style="color:#ffd43b;">0</span></div>
           <div style="display:flex; justify-content:space-between;"><span>Out Txt:</span> <span id="rt-txt-out" style="color:#fff;">0</span></div>
           <div style="display:flex; justify-content:space-between;"><span>Out Aud:</span> <span id="rt-aud-out" style="color:#ffd43b;">0</span></div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:#ffec99;">🧠 Oráculo:</span>
        <span id="sum-grammar" style="color:#fff;">$0.000000</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:#b2f2bb;">🎤 Transcrip:</span>
        <span id="sum-transcribe" style="color:#fff;">$0.000000</span>
      </div>
    </div>

    <div id="cost-log" style="height:140px; overflow-y:auto; padding: 10px 14px; color:#a5d8ff; display:flex; flex-direction:column-reverse; font-size:13px;"></div>

    <div style="background:#102a44; border-top:1px solid #1c7ed6; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:bold;">TOTAL:</span>
      <span id="cost-total" style="color:#fff; font-weight:bold; font-size:19px; text-shadow:0 0 10px rgba(77,171,247,0.5);">$0.000000</span>
    </div>
  `;
  document.body.appendChild(ui);

  // Referencias UI
  const els = {
    realtime: ui.querySelector("#sum-realtime"),
    // Contadores de Tokens
    rtTxtIn: ui.querySelector("#rt-txt-in"),
    rtAudIn: ui.querySelector("#rt-aud-in"),
    rtTxtOut: ui.querySelector("#rt-txt-out"),
    rtAudOut: ui.querySelector("#rt-aud-out"),
    // Otros
    grammar: ui.querySelector("#sum-grammar"),
    transcribe: ui.querySelector("#sum-transcribe"),
    total: ui.querySelector("#cost-total"),
    log: ui.querySelector("#cost-log"),
  };

  /**
   * Actualiza contadores y log
   * @param {string} type - 'realtime' | 'grammar' | 'transcribe'
   * @param {number} cost - Costo calculado
   * @param {string} label - Etiqueta para el log
   * @param {string} detail - Detalle técnico
   * @param {Object} [tokenData] - Objeto con desglose {txtIn, audIn, txtOut, audOut}
   */
  function trackEvent(type, cost, label, detail, tokenData = null) {
    if (cost <= 0 && !tokenData) return;

    // 1. Actualizar Acumulados Costo
    totals[type] += cost;
    totals.all += cost;

    // 2. Actualizar Tokens Realtime (si aplica)
    if (type === "realtime" && tokenData) {
      totals.rt_txt_in += tokenData.txtIn || 0;
      totals.rt_aud_in += tokenData.audIn || 0;
      totals.rt_txt_out += tokenData.txtOut || 0;
      totals.rt_aud_out += tokenData.audOut || 0;

      // Actualizar UI de Tokens
      els.rtTxtIn.textContent = totals.rt_txt_in.toLocaleString();
      els.rtAudIn.textContent = totals.rt_aud_in.toLocaleString();
      els.rtTxtOut.textContent = totals.rt_txt_out.toLocaleString();
      els.rtAudOut.textContent = totals.rt_aud_out.toLocaleString();
    }

    // 3. Actualizar UI Totales
    els[type].textContent = `$${totals[type].toFixed(6)}`;
    els.total.textContent = `$${totals.all.toFixed(6)}`;

    // 4. Añadir al Log
    const color =
      type === "realtime"
        ? "#74c0fc"
        : type === "grammar"
          ? "#ffec99"
          : "#b2f2bb";
    const line = document.createElement("div");
    line.style.marginBottom = "4px";
    line.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    line.style.paddingBottom = "2px";
    line.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <span style="color:${color}; font-weight:bold;">[${label}]</span>
        <span style="color:#fff;">$${cost.toFixed(6)}</span>
      </div>
      <div style="color:#666;">${detail}</div>
    `;
    els.log.prepend(line);
  }

  // --- INTERCEPTOR 1: FETCH ---
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;

    // A) Transcripción
    if (url.includes("/transcribe")) {
      if (init && init.body instanceof FormData) {
        const audioFile = init.body.get("audio");
        if (audioFile) {
          const sizeBytes = audioFile.size;
          const estimatedSeconds = sizeBytes / 4000;
          const minutes = estimatedSeconds / 60;
          const cost = minutes * PRICING.transcribe.per_minute;
          trackEvent(
            "transcribe",
            cost,
            "AUDIO",
            `${estimatedSeconds.toFixed(1)}s`,
          );
        }
      }
    }

    const response = await originalFetch(input, init);

    // B) Gramática (gpt-5-mini)
    if (url.includes("/correct")) {
      const clone = response.clone();
      try {
        let inputBody = "";
        if (init && init.body) inputBody = init.body;

        const data = await clone.json();
        const outputBody = JSON.stringify(data);

        const inputTokens = inputBody.length / 4;
        const outputTokens = outputBody.length / 4;

        const cost =
          inputTokens * PRICING.grammar.input +
          outputTokens * PRICING.grammar.output;
        trackEvent(
          "grammar",
          cost,
          "ORÁCULO",
          `In:${Math.round(inputTokens)} Out:${Math.round(outputTokens)}`,
        );
      } catch (e) {}
    }

    return response;
  };

  // --- INTERCEPTOR 2: WEBRTC (Realtime) ---
  const origCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
  RTCPeerConnection.prototype.createDataChannel = function (label, options) {
    const dc = origCreateDataChannel.call(this, label, options);
    if (label === "oai-events") {
      const descriptor = Object.getOwnPropertyDescriptor(
        RTCDataChannel.prototype,
        "onmessage",
      );
      Object.defineProperty(dc, "onmessage", {
        set: function (fn) {
          this.addEventListener("message", (ev) => {
            handleRealtimeMessage(ev.data);
          });
          this.addEventListener("message", fn);
        },
      });
    }
    return dc;
  };

  function handleRealtimeMessage(data) {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "response.done" && msg.response && msg.response.usage) {
        const u = msg.response.usage;

        // Desglose de tokens
        const txtIn = u.input_token_details?.text_tokens || 0;
        const audIn = u.input_token_details?.audio_tokens || 0;
        const txtOut = u.output_token_details?.text_tokens || 0;
        const audOut = u.output_token_details?.audio_tokens || 0;

        // Cálculo de costo
        const costInput =
          txtIn * PRICING.realtime.text_input +
          audIn * PRICING.realtime.audio_input;
        const costOutput =
          txtOut * PRICING.realtime.text_output +
          audOut * PRICING.realtime.audio_output;

        const totalCost = costInput + costOutput;
        const totalTokens = txtIn + audIn + txtOut + audOut;

        // Enviar datos al tracker
        trackEvent(
          "realtime",
          totalCost,
          "REALTIME",
          `Total: ${totalTokens} toks`,
          { txtIn, audIn, txtOut, audOut }, // Pasamos el objeto detallado
        );
      }
    } catch (e) {}
  }

  console.log("✅ Tracker V5 (Breakdown Completo) Activado");
})();
