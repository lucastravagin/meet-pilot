// Main Application Controller for Meet Pilot
class MeetPilotApp {
    constructor() {
        this.session = null;
        this.wavRecorder = null;
        this.aiCoach = null;
        this.playbookManager = null;
        this.isConnected = false;
        this.isRecording = false;
        this.events = {};
        
        this.init();
    }

    async init() {
        console.log('Inicializando Meet Pilot...');
        
        try {
            // Initialize core components with error handling
            console.log('Inicializando WavRecorder...');
            this.wavRecorder = new WavRecorder({ sampleRate: 24000 });
            
            console.log('Inicializando AICoach...');
            this.aiCoach = new AICoach();
            
            console.log('Inicializando PlaybookManager...');
            this.playbookManager = new PlaybookManager();
            
            // Setup UI event listeners
            console.log('Configurando event listeners...');
            this.setupEventListeners();
            
            // Initialize WebRTC session
            console.log('Inicializando sessão WebRTC...');
            await this.initializeSession();
            
            // Update UI state
            console.log('Atualizando estado da UI...');
            this.updateUIState();
            
            console.log('Meet Pilot inicializado com sucesso');
            this.updateStatus('Sistema pronto para uso');
            
        } catch (error) {
            console.error('Erro ao inicializar Meet Pilot:', error);
            this.updateStatus('Erro na inicialização: ' + error.message);
        }
    }

    async initializeSession() {
        try {
            this.session = new Session();
            
            // Setup session event handlers
            this.session.on('connected', () => {
                this.isConnected = true;
                this.updateUIState();
                this.updateStatus('Conectado ao OpenAI Realtime API');
            });

            this.session.on('disconnected', () => {
                this.isConnected = false;
                this.updateUIState();
                this.updateStatus('Desconectado do OpenAI Realtime API');
            });

            this.session.on('error', (error) => {
                console.error('Session error:', error);
                this.updateStatus('Erro na sessão: ' + error.message);
            });

            this.session.on('transcript', (data) => {
                this.handleTranscript(data);
            });
            
            console.log('Sessão inicializada com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar sessão:', error);
            this.updateStatus('Erro ao inicializar sessão: ' + error.message);
        }
    }

    setupEventListeners() {
        // Connect/Disconnect button
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.toggleConnection());
        }

        // Record button
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => this.toggleRecording());
        }

        // Clear conversation button
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearConversation());
        }

        // Export conversation button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportConversation());
        }

        // Manual analysis button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.triggerManualAnalysis());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                this.toggleRecording();
            }
        });
    }

    async toggleConnection() {
        try {
            if (this.isConnected) {
                await this.disconnect();
            } else {
                await this.connect();
            }
        } catch (error) {
            console.error('Error toggling connection:', error);
            this.updateStatus('Erro na conexão: ' + error.message);
        }
    }

    async connect() {
        if (!this.session) {
            await this.initializeSession();
        }

        this.updateStatus('Conectando...');
        await this.session.start();
    }

    async disconnect() {
        if (this.isRecording) {
            await this.stopRecording();
        }

        this.updateStatus('Desconectando...');
        await this.session.stop();
    }

    async toggleRecording() {
        try {
            if (this.isRecording) {
                await this.stopRecording();
            } else {
                await this.startRecording();
            }
        } catch (error) {
            console.error('Error toggling recording:', error);
            this.updateStatus('Erro na gravação: ' + error.message);
        }
    }

    async startRecording() {
        if (!this.isConnected) {
            this.updateStatus('Conecte-se primeiro antes de gravar');
            return;
        }

        this.updateStatus('Iniciando gravação...');
        
        // Start recording
        await this.wavRecorder.begin();
        
        // Start session recording if available
        if (this.session && this.session.startRecording) {
            await this.session.startRecording();
        }
        
        this.isRecording = true;
        this.updateUIState();
        this.updateStatus('Gravando... (Ctrl+Space para parar)');
    }

    async stopRecording() {
        this.updateStatus('Parando gravação...');
        
        // Stop recording
        await this.wavRecorder.end();
        
        // Stop session recording if available
        if (this.session && this.session.stopRecording) {
            await this.session.stopRecording();
        }
        
        this.isRecording = false;
        this.updateUIState();
        this.updateStatus('Gravação parada');
    }

    handleTranscript(data) {
        const { speaker, text, timestamp } = data;
        
        // Add to AI coach conversation history
        if (this.aiCoach) {
            this.aiCoach.addToConversation(speaker, text, timestamp);
        }
        
        // Update transcript UI
        this.addToTranscript(speaker, text, timestamp);
        
        // Update conversation stats
        this.updateConversationStats();
    }

    addToTranscript(speaker, text, timestamp) {
        const transcript = document.getElementById('transcript');
        if (!transcript) return;

        const entry = document.createElement('div');
        entry.className = `transcript-entry ${speaker.toLowerCase()}`;
        
        const time = new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        entry.innerHTML = `
            <div class="transcript-header">
                <span class="speaker">${speaker}</span>
                <span class="timestamp">${time}</span>
            </div>
            <div class="transcript-text">${text}</div>
        `;

        transcript.appendChild(entry);
        transcript.scrollTop = transcript.scrollHeight;
    }

    updateConversationStats() {
        if (!this.aiCoach) return;

        const summary = this.aiCoach.getConversationSummary();
        
        // Update stats in UI
        const statsElement = document.getElementById('conversationStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Entradas:</span>
                    <span class="stat-value">${summary.totalEntries}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Participantes:</span>
                    <span class="stat-value">${summary.speakers}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Duração:</span>
                    <span class="stat-value">${summary.duration}</span>
                </div>
            `;
        }
    }

    updateUIState() {
        // Update connect button
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.textContent = this.isConnected ? 'Desconectar' : 'Conectar';
            connectBtn.classList.toggle('connected', this.isConnected);
        }

        // Update record button
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.textContent = this.isRecording ? 'Parar Gravação' : 'Iniciar Gravação';
            recordBtn.classList.toggle('recording', this.isRecording);
            recordBtn.disabled = !this.isConnected;
        }

        // Update status indicators
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.textContent = this.isConnected ? 'Conectado' : 'Desconectado';
            connectionStatus.className = `status ${this.isConnected ? 'connected' : 'disconnected'}`;
        }

        const recordingStatus = document.getElementById('recordingStatus');
        if (recordingStatus) {
            recordingStatus.textContent = this.isRecording ? 'Gravando' : 'Parado';
            recordingStatus.className = `status ${this.isRecording ? 'recording' : 'stopped'}`;
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('mainStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log('Status:', message);
    }

    clearConversation() {
        if (this.aiCoach) {
            this.aiCoach.clearConversation();
        }
        this.updateConversationStats();
    }

    exportConversation() {
        if (this.aiCoach) {
            this.aiCoach.exportConversation();
        }
    }

    async triggerManualAnalysis() {
        if (this.aiCoach) {
            await this.aiCoach.triggerAnalysis();
        }
    }

    // Event system for components communication
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    // Cleanup on app shutdown
    async cleanup() {
        try {
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            if (this.isConnected) {
                await this.disconnect();
            }
            
            console.log('Meet Pilot finalizado');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Global instances for easy access
let meetPilotApp;
let aiCoach;
let playbookManager;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        meetPilotApp = new MeetPilotApp();
        
        // Make instances globally accessible for UI interactions
        window.aiCoach = meetPilotApp.aiCoach;
        window.playbookManager = meetPilotApp.playbookManager;
        
        // Global references for backward compatibility
        aiCoach = meetPilotApp.aiCoach;
        playbookManager = meetPilotApp.playbookManager;
        
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        
        const statusElement = document.getElementById('mainStatus');
        if (statusElement) {
            statusElement.textContent = 'Erro na inicialização: ' + error.message;
        }
    }
});

// Cleanup on window close
window.addEventListener('beforeunload', async () => {
    if (meetPilotApp) {
        await meetPilotApp.cleanup();
    }
});
