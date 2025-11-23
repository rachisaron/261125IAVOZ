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
        <div class="iav-header-title" data-testid="text-app-title">Profe ELE – IA Voz</div>
        <div class="iav-header-right">
          <div class="iav-status-dot" id="iav-status-dot" data-testid="status-connection"></div>
          <button class="iav-settings-btn" id="iav-settings-btn" data-testid="button-settings" aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.3 4.3m-5.8 0L2.8 5.8M23 12h-6m-6 0H1m20.2 6.2l-4.3-4.3m-5.8 0l-4.3 4.3"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="iav-chat" id="iav-chat" data-testid="container-chat">
        <div class="iav-message assistant" data-testid="message-assistant-initial">
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
            data-testid="input-text-message"
            placeholder="Escribe un mensaje (opcional)..."
            aria-label="Text input"
          />
          <button class="iav-send-btn" id="iav-send-btn" data-testid="button-send">
            Enviar
          </button>
        </div>
        
        <div class="iav-mic-container">
          <div class="iav-mic-waves" id="iav-mic-waves" data-testid="indicator-mic-waves">
            <div class="iav-mic-wave"></div>
            <div class="iav-mic-wave"></div>
            <div class="iav-mic-wave"></div>
          </div>
          <button class="iav-mic-btn" id="iav-mic-btn" data-testid="button-microphone" aria-label="Microphone">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Hidden audio element for playback -->
      <audio id="iav-audio" autoplay data-testid="audio-playback"></audio>
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
      this.micBtn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
    } else {
      this.statusDot.classList.remove('connected');
      this.micBtn.classList.remove('connected');
      this.micBtn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      `;
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
    messageEl.setAttribute('data-testid', `message-${type}-${Date.now()}`);

    this.chatArea.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Add correction card to chat
   */
  addCorrectionCard(correction) {
    const cardEl = document.createElement('div');
    cardEl.className = 'iav-correction-card';
    cardEl.setAttribute('data-testid', `card-correction-${correction.turnIndex || Date.now()}`);

    cardEl.innerHTML = `
      <div class="iav-correction-title" data-testid="text-correction-title">Correction</div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="iav-correction-label">Dijiste:</div>
        <div class="iav-correction-text error" data-testid="text-error">${this.escapeHtml(correction.error)}</div>
      </div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon fix">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="iav-correction-label">Mejor di:</div>
        <div class="iav-correction-text fix" data-testid="text-fix">${this.escapeHtml(correction.fix)}</div>
      </div>
      <div class="iav-correction-row">
        <div class="iav-correction-icon reason">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
        </div>
        <div class="iav-correction-label">Por qué:</div>
        <div class="iav-correction-text reason" data-testid="text-reason">${this.escapeHtml(correction.reason)}</div>
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
