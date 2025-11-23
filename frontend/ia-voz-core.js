/**
 * Profe ELE - IA Voz Core Logic
 * Handles WebRTC, Realtime API, audio recording, transcription, and correction queue
 * NO DOM MANIPULATION - Pure logic only
 */

class IAVozCore {
  constructor() {
    // Connection state
    this.connected = false;
    this.assistantSpeaking = false;
    this.studentSpeaking = false;
    
    // WebRTC components
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    
    // Recording state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentStream = null;
    
    // Correction queue
    this.pendingCorrections = [];
    this.turnIndex = 0;
    this.lastUserTranscript = '';
    
    // Configuration
    this.config = null;
    this.ephemeralToken = null;
    
    // Callbacks (injected by UI)
    this.callbacks = {
      onStatusChange: () => {},
      onUserTranscript: () => {},
      onAssistantMessage: () => {},
      onCorrectionCard: () => {},
      onAudioStream: () => {},
      onTalking: () => {},
      onError: () => {}
    };
  }

  /**
   * Set callbacks for UI interaction
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Load configuration from backend
   */
  async loadConfig() {
    try {
      const response = await fetch('/config');
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      this.callbacks.onError('Failed to load configuration');
      throw error;
    }
  }

  /**
   * Toggle connection (connect/disconnect)
   */
  async toggleConnection() {
    if (this.connected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  /**
   * Connect to Realtime API
   */
  async connect() {
    try {
      // Load config if not already loaded
      if (!this.config) {
        await this.loadConfig();
      }

      // Create ephemeral session
      const sessionResponse = await fetch('/session', { method: 'POST' });
      const { client_secret } = await sessionResponse.json();
      this.ephemeralToken = client_secret;

      // Get microphone access
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection();

      // Add audio track
      this.currentStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.currentStream);
      });

      // Handle incoming audio
      this.peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        this.callbacks.onAudioStream(remoteStream);
      };

      // Create data channel for text messages
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      
      this.dataChannel.onopen = () => {
        console.log('Data channel opened');
      };

      this.dataChannel.onmessage = (event) => {
        this.handleDataChannelMessage(event.data);
      };

      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${this.config.realtimeModel}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.ephemeralToken}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        }
      );

      const answerSDP = await sdpResponse.text();
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSDP
      });

      this.connected = true;
      this.callbacks.onStatusChange('connected');

      // Set up media recorder for transcription
      this.setupMediaRecorder();

    } catch (error) {
      console.error('Connection error:', error);
      this.callbacks.onError('Failed to connect: ' + error.message);
      await this.disconnect();
    }
  }

  /**
   * Disconnect from Realtime API
   */
  async disconnect() {
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop tracks
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.connected = false;
    this.assistantSpeaking = false;
    this.studentSpeaking = false;
    this.ephemeralToken = null;
    
    this.callbacks.onStatusChange('disconnected');
    this.callbacks.onTalking(false);
  }

  /**
   * Set up media recorder for audio capture
   */
  setupMediaRecorder() {
    if (!this.currentStream) return;

    this.mediaRecorder = new MediaRecorder(this.currentStream, {
      mimeType: 'audio/webm'
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      await this.processRecording();
    };

    this.mediaRecorder.start();
  }

  /**
   * Process recorded audio (transcribe and check grammar)
   */
  async processRecording() {
    if (this.audioChunks.length === 0) return;

    try {
      // Create blob from chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Create form data for upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Transcribe audio
      const transcriptResponse = await fetch('/transcribe', {
        method: 'POST',
        body: formData
      });

      const { transcript } = await transcriptResponse.json();
      
      if (transcript && transcript.trim()) {
        this.lastUserTranscript = transcript;
        this.callbacks.onUserTranscript(transcript);

        // Check for grammar errors
        await this.checkGrammar(transcript);
      }

      // Restart recording if still connected
      if (this.connected && this.currentStream) {
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(this.currentStream, {
          mimeType: 'audio/webm'
        });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.onstop = async () => {
          await this.processRecording();
        };
        this.mediaRecorder.start();
      }

    } catch (error) {
      console.error('Error processing recording:', error);
    }
  }

  /**
   * Check grammar and queue corrections
   */
  async checkGrammar(text) {
    try {
      const response = await fetch('/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const correction = await response.json();

      // Always show correction card (even if no error)
      const correctionObj = {
        ...correction,
        createdAt: Date.now(),
        turnIndex: this.turnIndex++
      };

      this.callbacks.onCorrectionCard(correctionObj);

      // If there's an error, queue it for speaking
      if (correction.is_error) {
        this.pendingCorrections.push(correctionObj);
        this.trySpeakNextCorrection();
      }

    } catch (error) {
      console.error('Error checking grammar:', error);
    }
  }

  /**
   * Try to speak the next correction in queue
   */
  trySpeakNextCorrection() {
    // Only speak if connected and no one is talking
    if (!this.connected || this.assistantSpeaking || this.studentSpeaking) {
      return;
    }

    if (this.pendingCorrections.length === 0) {
      return;
    }

    // Get next correction
    const correction = this.pendingCorrections.shift();

    // Send correction to assistant via data channel
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const correctionMessage = `[CORRECCION]\nERROR: "${correction.error}"\nFIX: "${correction.fix}"\nREASON: "${correction.reason}"`;
      
      this.dataChannel.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          instructions: correctionMessage
        }
      }));
    }
  }

  /**
   * Handle messages from data channel
   */
  handleDataChannelMessage(data) {
    try {
      const event = JSON.parse(data);

      switch (event.type) {
        case 'session.created':
          console.log('Session created');
          break;

        case 'input_audio_buffer.speech_started':
          this.studentSpeaking = true;
          this.callbacks.onTalking(true);
          
          // Stop current recording to mark speech boundary
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
          break;

        case 'input_audio_buffer.speech_stopped':
          this.studentSpeaking = false;
          this.callbacks.onTalking(false);
          
          // Recording will automatically restart in processRecording
          break;

        case 'response.audio.delta':
          // Assistant is speaking
          if (!this.assistantSpeaking) {
            this.assistantSpeaking = true;
          }
          break;

        case 'response.audio.done':
          this.assistantSpeaking = false;
          // Try to speak next correction
          this.trySpeakNextCorrection();
          break;

        case 'response.text.delta':
          // Accumulate text
          if (event.delta) {
            // We could accumulate text here if needed
          }
          break;

        case 'response.text.done':
          if (event.text) {
            this.callbacks.onAssistantMessage(event.text);
          }
          break;

        case 'conversation.item.created':
          // Item added to conversation
          if (event.item?.role === 'assistant' && event.item?.content) {
            const textContent = event.item.content.find(c => c.type === 'text');
            if (textContent?.text) {
              this.callbacks.onAssistantMessage(textContent.text);
            }
          }
          break;

        case 'error':
          console.error('Realtime API error:', event);
          this.callbacks.onError('Realtime error: ' + (event.error?.message || 'Unknown error'));
          break;
      }
    } catch (error) {
      console.error('Error handling data channel message:', error);
    }
  }

  /**
   * Send text message (optional feature)
   */
  sendText(text) {
    if (!this.connected || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    this.dataChannel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }));

    this.dataChannel.send(JSON.stringify({
      type: 'response.create'
    }));
  }
}

// Export for use in UI
window.IAVozCore = IAVozCore;
