/* pricing.js
 *
 * Contiene las constantes de precios por millón de tokens para los
 * modelos utilizados en la aplicación. Estos valores se basan en la
 * documentación pública de OpenAI (diciembre de 2025) y pueden
 * modificarse sin afectar al resto del proyecto.
 */

export const PRICING = {
  // GPT‑5 Mini: $0.25 por 1M tokens de entrada, $2.00 por 1M tokens de salida
  GPT5_MINI: { input: 0.25, output: 2.0 },

  // GPT‑Realtime: $4.00 por 1M tokens de entrada, $16.00 por 1M tokens de salida
  GPT_REALTIME: { input: 4.0, output: 16.0 },

  /*
   * GPT‑4o‑Transcribe:
   *  - audioInput: coste por 1M de tokens de audio
   *  - textInput: coste por 1M de tokens de entrada
   *  - textOutput: coste por 1M de tokens de salida
   */
  GPT4O_TRANSCRIBE: {
    audioInput: 6.0,
    textInput: 2.5,
    textOutput: 10.0,
  },
};
