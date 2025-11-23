/**
 * Profe ELE - IA Voz UI
 * Handles all DOM manipulation and user interactions
 */

class IAVozUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Initialize core
    this.core = new IAVozCore();
    
    // Elements
    this.statusDot = null;
    this.chatArea = null;
    this.micBtn = null;
    this.micWaves = null;
    this.audioElement = null;
    this.textInput = null;
    this.sendBtn = null;

    // Initialize
    this.render();
    this.setupCallbacks();
    this.setupEventListeners();
  }

  /**
   * Render the initial HTML structure
   */
  render() {
    this.container.innerHTML = `
      <!-- Header -->
      <div class="iav-header">
        <div class="iav-header-title">Profe ELE – IA Voz</div>
        <div class="iav-header-right">
          <div class="iav-status-dot" id="iav-status-dot"></div>
          <button class="iav-settings-btn" id="iav-settings-btn" aria-label="Settings">
            ⚙️
          </button>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="iav-chat" id="iav-chat">
        <div class="iav-message assistant">
          Hola, soy tu profesor virtual. ¡Hablemos!
        </div>
      </div>

      <!-- Footer -->
      <div class="iav-footer">
        <div class="iav-input-row">
          <input 
            type="text" 
            class="iav-text-input" 
            id="iav-text-input"
            placeholder="Escribe un mensaje (opcional)..."
            aria-label="Text input"
          />
          <button class="iav-send-btn" id="iav-send-btn">
            Enviar
          </button>
        </div>
        
        <div class="iav-mic-container">
          <div class="iav-mic-waves" id="iav-mic-waves">
            <div class="iav-mic-wave"></div>
            <div class="iav-mic-wave"></div>
            <div class="iav-mic-wave"></div>
          </div>
          <button class="iav-mic-btn" id="iav-mic-btn" aria-label="Microphone">
            🎤
          </button>
        </div>
      </div>

      <!-- Hidden audio element for playback -->
      <audio id="iav-audio" autoplay></audio>
    `;

    // Store element references
    this.statusDot = document.getElementById('iav-status-dot');
    this.chatArea = document.getElementById('iav-chat');
    this.micBtn = document.getElementById('iav-mic-btn');
    this.micWaves = document.getElementById('iav-mic-waves');
    this.audioElement = document.getElementById('iav-audio');
    this.textInput = document.getElementById('iav-text-input');
    this.sendBtn = document.getElementById('iav-send-btn');
    this.settingsBtn = document.getElementById('iav-settings-btn');
  }

  /**
   * Setup callbacks for core events
   */
  setupCallbacks() {
    this.core.setCallbacks({
      onStatusChange: (status) => this.handleStatusChange(status),
      onUserTranscript: (text) => this.addMessage(text, 'user'),
      onAssistantMessage: (text) => this.addMessage(text, 'assistant'),
      onCorrectionCard: (correction) => this.addCorrectionCard(correction),
      onAudioStream: (stream) => this.handleAudioStream(stream),
      onTalking: (isTalking) => this.handleTalking(isTalking),
      onError: (error) => this.handleError(error)
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Microphone button
    this.micBtn.addEventListener('click', async () => {
      await this.core.toggleConnection();
    });

    // Send button
    this.sendBtn.addEventListener('click', () => {
      this.sendTextMessage();
    });

    // Text input enter key
    this.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendTextMessage();
      }
    });

    // Settings button (placeholder)
    this.settingsBtn.addEventListener('click', () => {
      alert('Configuración próximamente...');
    });
  }

  /**
   * Handle status change
   */
  handleStatusChange(status) {
    if (status === 'connected') {
      this.statusDot.classList.add('connected');
      this.micBtn.classList.add('connected');
      this.micBtn.textContent = '⏸️';
    } else {
      this.statusDot.classList.remove('connected');
      this.micBtn.classList.remove('connected');
      this.micBtn.textContent = '🎤';
      this.micWaves.classList.remove('active');
    }
  }

  /**
   * Handle talking state
   */
  handleTalking(isTalking) {
    if (isTalking) {
      this.micWaves.classList.add('active');
    } else {
      this.micWaves.classList.remove('active');
    }
  }

  /**
   * Handle audio stream
   */
  handleAudioStream(stream) {
    if (this.audioElement) {
      this.audioElement.srcObject = stream;
    }
  }

  /**
   * Handle error
   */
  handleError(error) {
    console.error('UI Error:', error);
    this.addMessage(`Error: ${error}`, 'system');
  }

  /**
   * Add message bubble to chat
   */
  addMessage(text, type) {
    if (!text || !text.trim()) return;

    const messageEl = document.createElement('div');
    messageEl.className = `iav-message ${type}`;
    messageEl.textContent = this.escapeHtml(text);

    this.chatArea.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Add correction card to chat
   */
  addCorrectionCard(correction) {
    const cardEl = document.createElement('div');
    cardEl.className = 'iav-correction-card';

    cardEl.innerHTML = `
      <div class="iav-correction-title">Correction</div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon error">✕</div>
        <div class="iav-correction-label">Dijiste:</div>
        <div class="iav-correction-text error">${this.escapeHtml(correction.error)}</div>
      </div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon fix">✔</div>
        <div class="iav-correction-label">Mejor di:</div>
        <div class="iav-correction-text fix">${this.escapeHtml(correction.fix)}</div>
      </div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon reason">💡</div>
        <div class="iav-correction-label">Por qué:</div>
        <div class="iav-correction-text reason">${this.escapeHtml(correction.reason)}</div>
      </div>
    `;

    this.chatArea.appendChild(cardEl);
    this.scrollToBottom();
  }

  /**
   * Send text message
   */
  sendTextMessage() {
    const text = this.textInput.value.trim();
    if (!text) return;

    this.addMessage(text, 'user');
    this.core.sendText(text);
    this.textInput.value = '';
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    this.chatArea.scrollTop = this.chatArea.scrollHeight;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new IAVozUI('ia-voz');
});
