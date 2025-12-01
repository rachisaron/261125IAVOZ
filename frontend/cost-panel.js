/* cost-panel.js
 *
 * Este módulo encapsula toda la lógica relacionada con el panel de costes.
 * Se encarga de crear dinámicamente un contenedor lateral, mantener una lista
 * de interacciones y actualizar su contenido. Al no depender de ninguna
 * funcionalidad del núcleo, puede importarse y eliminarse sin afectar al resto
 * de la aplicación.
 */

import { PRICING } from "./pricing.js";

// Guarda las entradas de coste de cada interacción
const costEntries = [];

/**
 * Crea el panel de costes en el DOM. Si ya existe, no hace nada.
 */
export function initCostPanel() {
  // Comprueba si el panel ya existe
  if (document.getElementById("cost-panel")) return;

  // Crea el elemento contenedor
  const panel = document.createElement("div");
  panel.id = "cost-panel";
  panel.className = "cost-panel";

  // Encabezado del panel
  const heading = document.createElement("h3");
  heading.textContent = "Información de tokens y costes";
  panel.appendChild(heading);

  // Lista donde se agregan las interacciones
  const list = document.createElement("div");
  list.id = "cost-panel-list";
  panel.appendChild(list);

  // Inserta el panel en el body, después del contenido principal
  document.body.appendChild(panel);
}

/**
 * Añade una nueva entrada de coste al panel.
 * @param {Object} entry Objeto con los datos de la interacción:
 * { modelo: string, tokensEntrada: number, tokensSalida: number, precioEntrada: number,
 *   precioSalida: number, costeTotal: number }
 */
export function addCostEntry(entry) {
  costEntries.push(entry);
  renderCostEntries();
}

/**
 * Calcula el coste de una interacción a partir del modelo y los tokens
 * utilizados. Para gpt-4o-transcribe se tiene en cuenta también el número
 * de tokens de audio.
 *
 * @param {string} modelKey Clave del modelo en PRICING (p. ej. 'GPT5_MINI')
 * @param {number} tokensEntrada Tokens de entrada
 * @param {number} tokensSalida Tokens de salida
 * @param {number} audioTokens Tokens de audio (solo para modelos de transcripción)
 * @returns {number} Coste total en USD
 */
export function calculateCost(
  modelKey,
  tokensEntrada,
  tokensSalida,
  audioTokens = 0,
) {
  const pricing = PRICING[modelKey];
  if (!pricing) return 0;

  let total = 0;
  // Modelo de transcripción (gpt4o-transcribe)
  if (modelKey === "GPT4O_TRANSCRIBE") {
    total += (audioTokens / 1_000_000) * pricing.audioInput;
    total += (tokensEntrada / 1_000_000) * pricing.textInput;
    total += (tokensSalida / 1_000_000) * pricing.textOutput;
  } else {
    total += (tokensEntrada / 1_000_000) * pricing.input;
    total += (tokensSalida / 1_000_000) * pricing.output;
  }
  return total;
}

/**
 * Vuelve a renderizar todas las entradas del panel.
 */
function renderCostEntries() {
  const list = document.getElementById("cost-panel-list");
  if (!list) return;

  // Limpia la lista
  list.innerHTML = "";

  // Renderiza cada interacción
  costEntries.forEach(
    (
      {
        modelo,
        tokensEntrada,
        tokensSalida,
        precioEntrada,
        precioSalida,
        costeTotal,
      },
      idx,
    ) => {
      const card = document.createElement("div");
      card.className = "cost-entry";

      card.innerHTML = `
      <strong>Interacción ${idx + 1}</strong><br />
      Modelo: ${modelo}<br />
      Tokens entrada: ${tokensEntrada}<br />
      Tokens salida: ${tokensSalida}<br />
      Precio entrada: $${precioEntrada.toFixed(4)} / M tokens<br />
      Precio salida: $${precioSalida.toFixed(4)} / M tokens<br />
      Total interacción: $${costeTotal.toFixed(6)}
    `;

      list.appendChild(card);
    },
  );
}

// Exporta también la lista por si otras partes necesitan leerla
export function getCostEntries() {
  return costEntries;
}
