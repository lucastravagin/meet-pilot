// Session class for OpenAI Realtime API
class Session {
    constructor(apiKey, streamType) {
        this.apiKey = apiKey;
        this.streamType = streamType;
        this.useSessionToken = true;
        this.ms = null;
        this.pc = null;
        this.dc = null;
        this.muted = false;
    }

    async start(stream, sessionConfig) {
        await this.startInternal(stream, sessionConfig, "/v1/realtime/sessions");
    }

    async startTranscription(stream, sessionConfig) {
        await this.startInternal(stream, sessionConfig, "/v1/realtime/transcription_sessions");
    }

    stop() {
        this.dc?.close();
        this.dc = null;
        this.pc?.close();
        this.pc = null;
        this.ms?.getTracks().forEach(t => t.stop());
        this.ms = null;
        this.muted = false;
    }

    mute(muted) {
        this.muted = muted;
        this.pc.getSenders().forEach(sender => sender.track.enabled = !muted);
    }

    async startInternal(stream, sessionConfig, tokenEndpoint) {
        this.ms = stream;
        this.pc = new RTCPeerConnection();
        this.pc.ontrack = (e) => this.ontrack?.(e);
        this.pc.addTrack(stream.getTracks()[0]);
        this.pc.onconnectionstatechange = () => this.onconnectionstatechange?.(this.pc.connectionState);
        this.dc = this.pc.createDataChannel("");
        this.dc.onopen = (e) => this.onopen?.();
        this.dc.onmessage = (e) => this.onmessage?.(JSON.parse(e.data));

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        try {
            const answer = await this.signal(offer, sessionConfig, tokenEndpoint);
            await this.pc.setRemoteDescription(answer);
        } catch (e) {
            this.onerror?.(e);
        }
    }

    async signal(offer, sessionConfig, tokenEndpoint) {
        const urlRoot = "https://api.openai.com";
        const realtimeUrl = `${urlRoot}/v1/realtime`;
        let sdpResponse;
        if (this.useSessionToken) {
            const sessionUrl = `${urlRoot}${tokenEndpoint}`;
            const sessionResponse = await fetch(sessionUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "openai-beta": "realtime-v1",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(sessionConfig),
            });
            if (!sessionResponse.ok) {
                throw new Error("Failed to request session token");
            }
            const sessionData = await sessionResponse.json();
            const clientSecret = sessionData.client_secret.value;
            sdpResponse = await fetch(`${realtimeUrl}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${clientSecret}`,
                    "Content-Type": "application/sdp"
                },
            });
            if (!sdpResponse.ok) {
                throw new Error("Failed to signal");
            }
        } else {
            const formData = new FormData();
            formData.append("session", JSON.stringify(sessionConfig));
            formData.append("sdp", offer.sdp);
            sdpResponse = await fetch(`${realtimeUrl}`, {
                method: "POST",
                body: formData,
                headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            if (!sdpResponse.ok) {
                throw new Error("Failed to signal");
            }
        }
        return { type: "answer", sdp: await sdpResponse.text() };
    }

    sendMessage(message) {
        this.dc.send(JSON.stringify(message));
    }
}

// WAV Recorder class
class WavRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.combinedStream = null;
    }

    async startRecording(microphoneStream, systemAudioStream) {
        if (this.isRecording) return;

        try {
            // Create audio context to mix streams
            const audioContext = new AudioContext();

            // Create sources for both streams
            const micSource = audioContext.createMediaStreamSource(microphoneStream);
            const systemSource = audioContext.createMediaStreamSource(systemAudioStream);

            // Create a merger to combine the audio
            const merger = audioContext.createChannelMerger(2);

            // Connect both sources to the merger
            micSource.connect(merger, 0, 0);
            systemSource.connect(merger, 0, 1);

            // Create a destination stream
            const destination = audioContext.createMediaStreamDestination();
            merger.connect(destination);

            this.combinedStream = destination.stream;

            // Start recording
            this.mediaRecorder = new MediaRecorder(this.combinedStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.isRecording = true;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            this.mediaRecorder.start(1000); // Collect data every second
            console.log('WAV recording started');

        } catch (error) {
            console.error('Error starting WAV recording:', error);
            throw error;
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;

        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log('WAV recording stopped');
    }

    async saveRecording() {
        if (this.audioChunks.length === 0) return;

        try {
            // Convert to WAV format
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();

            // Convert to WAV using Web Audio API
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Create WAV file
            const wavBlob = this.audioBufferToWav(audioBuffer);

            // Save file
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('WAV file saved');

        } catch (error) {
            console.error('Error saving WAV recording:', error);
        }
    }

    audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }
}

// Playbook Management System
class PlaybookManager {
    constructor() {
        this.documents = new Map();
        this.categories = {
            objections: [],
            scripts: [],
            cases: [],
            questions: []
        };
        this.searchIndex = null;
        this.isEnabled = window.electronAPI?.playbook?.enabled || false;
        this.config = window.electronAPI?.playbook || {};
        this.init();
    }

    init() {
        if (!this.isEnabled) {
            console.log('Playbook system disabled via .env');
            return;
        }

        this.setupUI();
        this.loadStoredDocuments();
        this.updateStatus('Sistema ativado - Pronto para receber documentos');
    }

    setupUI() {
        const panel = document.getElementById('playbookPanel');
        if (panel) {
            panel.classList.add('enabled');
        }

        // Update supported types and max size from config
        const typesElement = document.getElementById('supportedTypes');
        const maxSizeElement = document.getElementById('maxSize');
        
        if (typesElement) {
            typesElement.textContent = this.config.allowedTypes?.join(', ').toUpperCase() || 'PDF, DOCX, TXT';
        }
        
        if (maxSizeElement) {
            maxSizeElement.textContent = `Máx ${this.config.maxFileSize || '10MB'}`;
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const uploadSection = document.getElementById('uploadSection');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        }

        if (uploadSection) {
            uploadSection.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadSection.classList.add('drag-over');
            });

            uploadSection.addEventListener('dragleave', () => {
                uploadSection.classList.remove('drag-over');
            });

            uploadSection.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadSection.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
            });
        }
    }

    async handleFileUpload(files) {
        this.updateStatus('Processando arquivos...');
        
        for (const file of files) {
            try {
                await this.processFile(file);
            } catch (error) {
                console.error('Error processing file:', file.name, error);
                this.updateStatus(`Erro ao processar ${file.name}: ${error.message}`);
            }
        }
        
        this.updateStatus('Documentos processados com sucesso');
        this.updateCategoryCounts();
        this.renderDocumentsList();
    }

    async processFile(file) {
        // Validate file type
        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.config.allowedTypes?.includes(extension)) {
            throw new Error(`Tipo de arquivo não suportado: ${extension}`);
        }

        // Validate file size
        const maxSize = this.parseSize(this.config.maxFileSize || '10MB');
        if (file.size > maxSize) {
            throw new Error(`Arquivo muito grande. Máximo: ${this.config.maxFileSize}`);
        }

        const content = await this.extractTextFromFile(file);
        const category = await this.categorizeContent(content);
        
        const document = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: extension,
            size: file.size,
            content: content,
            category: category,
            uploadDate: new Date().toISOString(),
            keywords: this.extractKeywords(content)
        };

        this.documents.set(document.id, document);
        this.categories[category].push(document.id);
        
        // Save to localStorage
        this.saveToStorage();
        
        return document;
    }

    async extractTextFromFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'txt':
                return await file.text();
                
            case 'pdf':
                // For now, return placeholder - PDF parsing would need pdf-parse
                return `[PDF Content] ${file.name} - ${file.size} bytes`;
                
            case 'docx':
                // For now, return placeholder - DOCX parsing would need mammoth
                return `[DOCX Content] ${file.name} - ${file.size} bytes`;
                
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
    }

    async categorizeContent(content) {
        // Simple keyword-based categorization
        const text = content.toLowerCase();
        
        const patterns = {
            objections: ['objeção', 'preço', 'caro', 'orçamento', 'não temos', 'vamos pensar'],
            scripts: ['script', 'roteiro', 'apresentação', 'abertura', 'fechamento'],
            cases: ['caso', 'sucesso', 'cliente', 'resultado', 'roi', 'economia'],
            questions: ['pergunta', 'questão', 'descoberta', 'necessidade', 'dor']
        };

        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return category;
            }
        }

        return 'scripts'; // Default category
    }

    extractKeywords(content) {
        // Simple keyword extraction
        const words = content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    async searchRelevantContent(conversationContext) {
        if (!this.isEnabled || this.documents.size === 0) {
            return '';
        }

        const query = conversationContext.toLowerCase();
        const relevantDocs = [];

        for (const [id, doc] of this.documents) {
            const score = this.calculateRelevanceScore(query, doc);
            if (score > 0.3) {
                relevantDocs.push({ doc, score });
            }
        }

        // Sort by relevance and take top 3
        relevantDocs.sort((a, b) => b.score - a.score);
        
        return relevantDocs
            .slice(0, 3)
            .map(({ doc }) => `[${doc.category.toUpperCase()}] ${doc.content.slice(0, 200)}...`)
            .join('\n\n');
    }

    calculateRelevanceScore(query, document) {
        const content = document.content.toLowerCase();
        const keywords = document.keywords;
        
        let score = 0;
        
        // Direct text match
        if (content.includes(query)) {
            score += 0.5;
        }
        
        // Keyword match
        const queryWords = query.split(/\s+/);
        for (const word of queryWords) {
            if (keywords.includes(word)) {
                score += 0.2;
            }
        }
        
        return Math.min(score, 1);
    }

    updateCategoryCounts() {
        Object.keys(this.categories).forEach(category => {
            const element = document.getElementById(`${category}-count`);
            if (element) {
                const count = this.categories[category].length;
                element.textContent = `${count} documento${count !== 1 ? 's' : ''}`;
            }
        });
    }

    renderDocumentsList() {
        const container = document.getElementById('documentsList');
        if (!container) return;

        container.innerHTML = '';
        
        for (const [id, doc] of this.documents) {
            const item = document.createElement('div');
            item.className = 'document-item';
            item.innerHTML = `
                <div class="document-icon">${this.getDocumentIcon(doc.type)}</div>
                <div class="document-info">
                    <div class="document-name">${doc.name}</div>
                    <div class="document-meta">${doc.category} • ${this.formatFileSize(doc.size)}</div>
                </div>
                <div class="document-actions">
                    <button class="btn-icon" onclick="playbookManager.previewDocument('${id}')" title="Visualizar">👁️</button>
                    <button class="btn-icon" onclick="playbookManager.deleteDocument('${id}')" title="Excluir">🗑️</button>
                </div>
            `;
            container.appendChild(item);
        }
    }

    getDocumentIcon(type) {
        const icons = {
            pdf: '📄',
            docx: '📝',
            txt: '📃'
        };
        return icons[type] || '📄';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    }

    parseSize(sizeStr) {
        const match = sizeStr.match(/^(\d+)(MB|KB|B)$/i);
        if (!match) return 10 * 1024 * 1024; // Default 10MB
        
        const value = parseInt(match[1]);
        const unit = match[2].toUpperCase();
        
        switch (unit) {
            case 'B': return value;
            case 'KB': return value * 1024;
            case 'MB': return value * 1024 * 1024;
            default: return 10 * 1024 * 1024;
        }
    }

    previewDocument(id) {
        const doc = this.documents.get(id);
        if (doc) {
            alert(`Preview: ${doc.name}\n\nCategoria: ${doc.category}\n\nConteúdo (preview):\n${doc.content.slice(0, 300)}...`);
        }
    }

    deleteDocument(id) {
        const doc = this.documents.get(id);
        if (doc && confirm(`Excluir documento "${doc.name}"?`)) {
            // Remove from category
            const categoryIndex = this.categories[doc.category].indexOf(id);
            if (categoryIndex > -1) {
                this.categories[doc.category].splice(categoryIndex, 1);
            }
            
            // Remove from documents
            this.documents.delete(id);
            
            // Update UI
            this.updateCategoryCounts();
            this.renderDocumentsList();
            this.saveToStorage();
            
            this.updateStatus(`Documento "${doc.name}" excluído`);
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('playbookStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    saveToStorage() {
        try {
            const data = {
                documents: Array.from(this.documents.entries()),
                categories: this.categories
            };
            localStorage.setItem('meetPilotPlaybook', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving playbook to storage:', error);
        }
    }

    loadStoredDocuments() {
        try {
            const stored = localStorage.getItem('meetPilotPlaybook');
            if (stored) {
                const data = JSON.parse(stored);
                this.documents = new Map(data.documents || []);
                this.categories = data.categories || this.categories;
                
                this.updateCategoryCounts();
                this.renderDocumentsList();
                
                const docCount = this.documents.size;
                this.updateStatus(`${docCount} documento${docCount !== 1 ? 's' : ''} carregado${docCount !== 1 ? 's' : ''}`);
            }
        } catch (error) {
            console.error('Error loading stored playbook:', error);
            this.updateStatus('Erro ao carregar documentos salvos');
        }
    }
}

// AI Analysis System
class AICoach {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.conversationBuffer = [];
        this.analysisTimer = null;
        this.lastAnalysis = 0;
        this.analysisInterval = 10000; // Analyze every 10 seconds
        this.suggestions = [];
        this.isAnalyzing = false;
    }

    addTranscription(source, text, timestamp) {
        if (!text || text === '...') return;
        
        this.conversationBuffer.push({
            source, // 'user' or 'meeting'
            text,
            timestamp: timestamp || new Date().toISOString()
        });

        // Keep only last 2 minutes of conversation
        const cutoff = Date.now() - (2 * 60 * 1000);
        this.conversationBuffer = this.conversationBuffer.filter(
            item => new Date(item.timestamp).getTime() > cutoff
        );

        // Trigger analysis if enough time has passed
        if (Date.now() - this.lastAnalysis > this.analysisInterval) {
            this.analyzeConversation();
        }
    }

    async analyzeConversation() {
        if (this.isAnalyzing || this.conversationBuffer.length < 3) return;
        
        this.isAnalyzing = true;
        this.lastAnalysis = Date.now();
        
        try {
            updateAIStatus('Analisando conversa...');
            
            const context = this.buildAnalysisContext();
            const analysis = await this.callOpenAIAnalysis(context);
            
            if (analysis && analysis.suggestions) {
                this.processSuggestions(analysis.suggestions);
            }
            
            updateAIStatus('Pronto para ajudar');
        } catch (error) {
            console.error('AI Analysis error:', error);
            updateAIStatus('Erro na análise - tentando novamente...');
        } finally {
            this.isAnalyzing = false;
        }
    }

    buildAnalysisContext() {
        const recentConversation = this.conversationBuffer
            .slice(-10) // Last 10 exchanges
            .map(item => `[${item.source.toUpperCase()}]: ${item.text}`)
            .join('\n');

        return {
            conversation: recentConversation,
            timestamp: new Date().toISOString(),
            bufferSize: this.conversationBuffer.length
        };
    }

    async callOpenAIAnalysis(context) {
        const prompt = await this.buildAnalysisPrompt(context);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Você é um copiloto de reuniões com IA que fornece coaching em tempo real para chamadas de vendas e apresentações. 
                        
                        Analise a conversa e forneça 1-3 sugestões curtas e acionáveis para ajudar o usuário a melhorar sua performance.
                        
                        Foque em:
                        - Identificar objeções e sugerir respostas específicas
                        - Reconhecer sinais de compra e próximos passos
                        - Melhorar engajamento e fluxo da conversa
                        - Sugerir perguntas relevantes ou demonstrações
                        - Recomendações de timing
                        - Use o material de apoio fornecido para sugestões mais específicas
                        
                        Responda APENAS com JSON válido neste formato exato:
                        {
                          "suggestions": [
                            {
                              "type": "objection|opportunity|engagement|next_step",
                              "text": "Sugestão acionável curta (máx 60 chars)",
                              "priority": "high|medium|low",
                              "context": "Breve explicação do porquê esta sugestão é relevante"
                            }
                          ]
                        }`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 400,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
            throw new Error('No content in OpenAI response');
        }

        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response:', content);
            throw new Error('Invalid JSON response from OpenAI');
        }
    }

    async buildAnalysisPrompt(context) {
        let prompt = `Conversa recente:
${context.conversation}

Horário atual: ${context.timestamp}
Tamanho do buffer: ${context.bufferSize} mensagens`;

        // Add session context from persona/playbook if available
        if (sessionContext) {
            const enhancedContext = buildAIContext(context.conversation);
            prompt += `

${enhancedContext}`;
        }

        // Add playbook content if available
        if (playbookManager && playbookManager.isEnabled) {
            const relevantContent = await playbookManager.searchRelevantContent(context.conversation);
            if (relevantContent) {
                prompt += `

Material de apoio adicional da base de conhecimento:
${relevantContent}`;
            }
        }

        prompt += `

Analise esta conversa e forneça sugestões de coaching para o usuário melhorar sua performance na reunião. Use o contexto da persona, playbook e material de apoio quando disponível para sugestões mais específicas e acionáveis.`;

        return prompt;
    }

    processSuggestions(suggestions) {
        // Clear old suggestions
        this.suggestions = [];
        
        // Add new suggestions with timestamps
        suggestions.forEach(suggestion => {
            const enrichedSuggestion = {
                ...suggestion,
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                displayed: false
            };
            this.suggestions.push(enrichedSuggestion);
        });

        // Display suggestions in UI
        this.displaySuggestions();
    }

    displaySuggestions() {
        const container = document.getElementById('suggestionsContainer');
        if (!container) return;

        // Clear waiting message
        container.innerHTML = '';

        this.suggestions.forEach((suggestion, index) => {
            if (suggestion.displayed) return;
            
            setTimeout(() => {
                this.createSuggestionCard(suggestion, container);
                suggestion.displayed = true;
            }, index * 500); // Stagger animations
        });
    }

    createSuggestionCard(suggestion, container) {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.dataset.suggestionId = suggestion.id;

        const typeColors = {
            objection: '#EF4444',
            opportunity: '#10B981', 
            engagement: '#3B82F6',
            next_step: '#A259FF'
        };

        const typeIcons = {
            objection: '⚠️',
            opportunity: '💡',
            engagement: '🎯',
            next_step: '→'
        };

        const typeLabels = {
            objection: 'Objeção',
            opportunity: 'Oportunidade',
            engagement: 'Engajamento',
            next_step: 'Próximo Passo'
        };

        card.innerHTML = `
            <div class="suggestion-type" style="color: ${typeColors[suggestion.type] || '#A259FF'}">
                ${typeIcons[suggestion.type] || '💡'} ${typeLabels[suggestion.type] || suggestion.type}
            </div>
            <div class="suggestion-text">${suggestion.text}</div>
            <div class="suggestion-context" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                ${suggestion.context}
            </div>
            <div class="suggestion-actions">
                <button class="btn-small" onclick="copySuggestion('${suggestion.id}')">Copiar</button>
                <button class="btn-small" onclick="dismissSuggestion('${suggestion.id}')">Dispensar</button>
            </div>
        `;

        container.appendChild(card);

        // Auto-remove after 12 seconds
        setTimeout(() => {
            if (card.parentNode) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (card.parentNode) {
                        card.parentNode.removeChild(card);
                    }
                }, 300);
            }
        }, 12000);
    }
}

// Global variables
let microphoneSession = null;
let systemAudioSession = null;
let microphoneSessionConfig = null;
let systemAudioSessionConfig = null;
let microphoneVadTime = 0;
let systemAudioVadTime = 0;
let wavRecorder = new WavRecorder();
let microphoneStream = null;
let systemAudioStream = null;
let aiCoach = null;
let playbookManager = null;

// DOM elements
const micResults = document.getElementById('micResults');
const speakerResults = document.getElementById('speakerResults');
const micStatus = document.getElementById('micStatus');
const micSelect = document.getElementById('micSelect');
const speakerStatus = document.getElementById('speakerStatus');
const recordStatus = document.getElementById('recordStatus');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const recordBtn = document.getElementById('recordBtn');

// Session Context Management
let sessionContext = null;
let personaData = null;
let playbookData = null;

// Load session context from localStorage (set by sessoes.html)
function loadSessionContext() {
    try {
        const stored = localStorage.getItem('activeSessionContext');
        if (stored) {
            sessionContext = JSON.parse(stored);
            personaData = sessionContext.persona;
            playbookData = sessionContext.playbook;
            
            console.log('🎯 Contexto da sessão carregado:', {
                sessionId: sessionContext.sessionId,
                persona: personaData?.nome || 'Nenhuma',
                playbook: playbookData?.nome || 'Nenhum',
                isQuickSession: sessionContext.isQuickSession || false
            });
            
            // Update UI with session context
            updateSessionUI();
            
            return true;
        } else {
            console.log('ℹ️ Nenhum contexto de sessão encontrado - sessão sem preparação');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar contexto da sessão:', error);
        return false;
    }
}

// Update UI with loaded session context
function updateSessionUI() {
    const sessionTitle = document.getElementById('sessionTitle');
    
    if (sessionContext) {
        // Update session title
        if (sessionContext.sessionData?.titulo) {
            sessionTitle.textContent = sessionContext.sessionData.titulo;
        }
        
        // Update AI status with context info
        const aiStatus = document.getElementById('aiStatus');
        if (aiStatus) {
            if (personaData && playbookData) {
                aiStatus.textContent = `Coaching: ${personaData.nome} | ${playbookData.nome}`;
            } else if (personaData) {
                aiStatus.textContent = `Coaching: ${personaData.nome}`;
            } else if (playbookData) {
                aiStatus.textContent = `Coaching: ${playbookData.nome}`;
            } else if (sessionContext.isQuickSession) {
                aiStatus.textContent = 'Sessão Rápida - IA Adaptativa';
            }
        }
        
        // Show context preview in suggestions container
        showContextPreview();
    }
}

// Show context preview before starting
function showContextPreview() {
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    if (!suggestionsContainer || !sessionContext) return;
    
    const contextHTML = `
        <div class="context-preview">
            <div class="context-header">
                <h4>🎯 Contexto da Sessão Carregado</h4>
            </div>
            
            ${personaData ? `
                <div class="context-section">
                    <h5>👤 Persona: ${personaData.nome}</h5>
                    <div class="context-details">
                        <p><strong>Empresa:</strong> ${personaData.empresa || 'N/A'}</p>
                        <p><strong>Cargo:</strong> ${personaData.cargo || 'N/A'}</p>
                        <p><strong>Classificação:</strong> ${personaData.classificacao || 'prospect'}</p>
                        ${personaData.potencial_receita > 0 ? `<p><strong>Potencial:</strong> R$ ${personaData.potencial_receita.toLocaleString()}</p>` : ''}
                    </div>
                    
                    ${personaData.necessidades?.primarias ? `
                        <div class="context-needs">
                            <strong>Necessidades Principais:</strong>
                            <ul>
                                ${personaData.necessidades.primarias.map(n => `<li>${n}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${personaData.objecoes_comuns && Object.keys(personaData.objecoes_comuns).length > 0 ? `
                        <div class="context-objections">
                            <strong>Objeções Esperadas:</strong>
                            <ul>
                                ${Object.entries(personaData.objecoes_comuns).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            ${playbookData ? `
                <div class="context-section">
                    <h5>📚 Playbook: ${playbookData.nome}</h5>
                    <div class="context-details">
                        <p><strong>Tipo:</strong> ${playbookData.tipo_reuniao || 'N/A'}</p>
                        <p><strong>Objetivo:</strong> ${playbookData.objetivo_primario || 'N/A'}</p>
                        ${playbookData.persona_target ? `<p><strong>Target:</strong> ${playbookData.persona_target}</p>` : ''}
                    </div>
                    
                    ${playbookData.gatilhos_positivos && Object.keys(playbookData.gatilhos_positivos).length > 0 ? `
                        <div class="context-triggers">
                            <strong>Gatilhos Positivos:</strong>
                            ${playbookData.gatilhos_positivos.palavras ? `
                                <p>Palavras-chave: ${playbookData.gatilhos_positivos.palavras.join(', ')}</p>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${playbookData.tecnicas_vendas && Object.keys(playbookData.tecnicas_vendas).length > 0 ? `
                        <div class="context-techniques">
                            <strong>Técnicas Principais:</strong>
                            ${playbookData.tecnicas_vendas.principais ? `
                                <ul>
                                    ${playbookData.tecnicas_vendas.principais.map(t => `<li>${t}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            ${sessionContext.isQuickSession ? `
                <div class="context-section">
                    <h5>⚡ Sessão Rápida</h5>
                    <p>A IA irá se adaptar durante a conversa e sugerir personas/playbooks relevantes.</p>
                </div>
            ` : ''}
            
            <div class="context-footer">
                <p class="context-hint">💡 Inicie a sessão para receber coaching personalizado baseado neste contexto</p>
            </div>
        </div>
    `;
    
    suggestionsContainer.innerHTML = contextHTML;
}

// Build enhanced context for AI coach
function buildAIContext(conversationText) {
    let contextPrompt = '';
    
    // Base conversation context - conversationText is already a formatted string
    if (conversationText && typeof conversationText === 'string' && conversationText.trim().length > 0) {
        contextPrompt += `\n## CONVERSA ATUAL:\n${conversationText}\n`;
    }
    
    // Add persona context if available
    if (personaData) {
        contextPrompt += `\n## CONTEXTO DA PERSONA:\n`;
        contextPrompt += `Nome: ${personaData.nome}\n`;
        contextPrompt += `Empresa: ${personaData.empresa || 'N/A'}\n`;
        contextPrompt += `Cargo: ${personaData.cargo || 'N/A'}\n`;
        contextPrompt += `Classificação: ${personaData.classificacao || 'prospect'}\n`;
        
        if (personaData.potencial_receita > 0) {
            contextPrompt += `Potencial de Receita: R$ ${personaData.potencial_receita.toLocaleString()}\n`;
        }
        
        // Add business context
        if (personaData.contexto_negocio) {
            const contexto = personaData.contexto_negocio;
            if (contexto.situacao_atual) contextPrompt += `Situação Atual: ${contexto.situacao_atual}\n`;
            if (contexto.desafios) contextPrompt += `Desafios: ${Array.isArray(contexto.desafios) ? contexto.desafios.join(', ') : contexto.desafios}\n`;
            if (contexto.objetivo) contextPrompt += `Objetivo: ${contexto.objetivo}\n`;
        }
        
        // Add needs
        if (personaData.necessidades?.primarias) {
            contextPrompt += `Necessidades Principais: ${personaData.necessidades.primarias.join(', ')}\n`;
        }
        
        // Add common objections
        if (personaData.objecoes_comuns && Object.keys(personaData.objecoes_comuns).length > 0) {
            contextPrompt += `Objeções Comuns:\n`;
            Object.entries(personaData.objecoes_comuns).forEach(([key, value]) => {
                contextPrompt += `- ${key}: ${value}\n`;
            });
        }
        
        // Add communication preferences
        if (personaData.preferencias_comunicacao) {
            const pref = personaData.preferencias_comunicacao;
            if (pref.tom) contextPrompt += `Tom de Comunicação Preferido: ${pref.tom}\n`;
            if (pref.foco) contextPrompt += `Foco: ${pref.foco}\n`;
        }
    }
    
    // Add playbook context if available
    if (playbookData) {
        contextPrompt += `\n## ESTRATÉGIA DE VENDAS (PLAYBOOK):\n`;
        contextPrompt += `Nome: ${playbookData.nome}\n`;
        contextPrompt += `Tipo de Reunião: ${playbookData.tipo_reuniao || 'N/A'}\n`;
        contextPrompt += `Objetivo Primário: ${playbookData.objetivo_primario || 'N/A'}\n`;
        
        // Add opening strategies
        if (playbookData.abertura) {
            contextPrompt += `\nESTRATÉGIAS DE ABERTURA:\n`;
            if (playbookData.abertura.rapport) {
                contextPrompt += `Rapport: ${Array.isArray(playbookData.abertura.rapport) ? playbookData.abertura.rapport.join('; ') : playbookData.abertura.rapport}\n`;
            }
            if (playbookData.abertura.tom) {
                contextPrompt += `Tom: ${playbookData.abertura.tom}\n`;
            }
        }
        
        // Add qualification questions
        if (playbookData.qualificacao?.perguntas_chave) {
            contextPrompt += `\nPERGUNTAS DE QUALIFICAÇÃO:\n${playbookData.qualificacao.perguntas_chave.join('\n')}\n`;
        }
        
        // Add objection handling
        if (playbookData.tratamento_objecoes && Object.keys(playbookData.tratamento_objecoes).length > 0) {
            contextPrompt += `\nTRATAMENTO DE OBJEÇÕES:\n`;
            Object.entries(playbookData.tratamento_objecoes).forEach(([key, value]) => {
                const responses = Array.isArray(value) ? value.join('; ') : value;
                contextPrompt += `${key}: ${responses}\n`;
            });
        }
        
        // Add positive triggers
        if (playbookData.gatilhos_positivos?.palavras) {
            contextPrompt += `\nGATILHOS POSITIVOS: ${playbookData.gatilhos_positivos.palavras.join(', ')}\n`;
        }
        
        // Add negative triggers
        if (playbookData.gatilhos_negativos?.palavras) {
            contextPrompt += `\nGATILHOS NEGATIVOS (ATENÇÃO): ${playbookData.gatilhos_negativos.palavras.join(', ')}\n`;
        }
        
        // Add sales techniques
        if (playbookData.tecnicas_vendas?.principais) {
            contextPrompt += `\nTÉCNICAS DE VENDAS: ${playbookData.tecnicas_vendas.principais.join(', ')}\n`;
        }
        
        // Add communication tone
        if (playbookData.tom_comunicacao) {
            const tom = playbookData.tom_comunicacao;
            if (tom.linguagem) contextPrompt += `Linguagem Recomendada: ${tom.linguagem}\n`;
            if (tom.postura) contextPrompt += `Postura: ${tom.postura}\n`;
            if (tom.foco) contextPrompt += `Foco: ${tom.foco}\n`;
        }
    }
    
    // Add coaching instructions
    contextPrompt += `\n## INSTRUÇÕES DE COACHING:\n`;
    contextPrompt += `Você é um coach de vendas em tempo real. Baseado no contexto da persona e playbook acima, forneça sugestões específicas, práticas e acionáveis para maximizar o resultado desta reunião.\n`;
    contextPrompt += `Suas sugestões devem ser:\n`;
    contextPrompt += `1. Específicas para esta persona e situação\n`;
    contextPrompt += `2. Baseadas nas técnicas do playbook selecionado\n`;
    contextPrompt += `3. Sensíveis ao momento da conversa\n`;
    contextPrompt += `4. Práticas e acionáveis\n`;
    contextPrompt += `5. Focadas em resultados de vendas\n\n`;
    
    return contextPrompt;
}
const modelSelect = document.getElementById('modelSelect');
const aiStatus = document.getElementById('aiStatus');
const suggestionsContainer = document.getElementById('suggestionsContainer');

// Utility functions
function updateAIStatus(status) {
    if (aiStatus) {
        aiStatus.textContent = status;
    }
}

function copySuggestion(suggestionId) {
    const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (card) {
        const text = card.querySelector('.suggestion-text').textContent;
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const btn = card.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Copiado!';
            btn.style.background = 'var(--success)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1000);
        });
    }
}

function dismissSuggestion(suggestionId) {
    const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (card.parentNode) {
                card.parentNode.removeChild(card);
            }
        }, 300);
    }
}

// Configuration
const CONFIG = {
    API_ENDPOINTS: {
        session: 'https://api.openai.com/v1/realtime/sessions',
        realtime: 'https://api.openai.com/v1/realtime'
    },
    VOICE: 'echo',
    VOICES: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'],
    INITIAL_MESSAGE: {
        text: "The transcription will probably be in English."
    }
};

function updateMicSelect() {
    navigator.mediaDevices.enumerateDevices().then(devices => {
        devices.forEach(device => {
            if (device.kind === 'audioinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;
                micSelect.appendChild(option);
            }
        });
    });
}

// Update status display
function updateStatus(streamType, isConnected) {
    const statusElement = streamType === 'microphone' ? micStatus : speakerStatus;
    const statusCard = statusElement;

    if (isConnected) {
        statusCard.className = 'status-card connected';
        statusCard.querySelector('.status-value').textContent = 'Conectado';
    } else {
        statusCard.className = 'status-card disconnected';
        statusCard.querySelector('.status-value').textContent = 'Desconectado';
    }
}

// Handle messages from microphone session
function handleMicrophoneMessage(parsed) {
    console.log('Received microphone message:', parsed);
    let transcript = null;

    switch (parsed.type) {
        case "transcription_session.created":
            microphoneSessionConfig = parsed.session;
            console.log("microphone session created: " + microphoneSessionConfig.id);
            break;
        case "input_audio_buffer.speech_started":
            transcript = {
                transcript: '...',
                partial: true,
            }
            handleMicrophoneTranscript(transcript);
            break;
        case "input_audio_buffer.speech_stopped":
            transcript = {
                transcript: '...',
                partial: true,
            }
            handleMicrophoneTranscript(transcript);
            microphoneVadTime = performance.now() - microphoneSessionConfig.turn_detection.silence_duration_ms;
            break;
        case "conversation.item.input_audio_transcription.completed":
            const elapsed = performance.now() - microphoneVadTime;
            transcript = {
                transcript: parsed.transcript,
                partial: false,
                latencyMs: elapsed.toFixed(0)
            }
            handleMicrophoneTranscript(transcript);
            break;
    }
}

// Handle messages from system audio session
function handleSystemAudioMessage(parsed) {
    console.log('Received system audio message:', parsed);
    let transcript = null;

    switch (parsed.type) {
        case "transcription_session.created":
            systemAudioSessionConfig = parsed.session;
            console.log("system audio session created: " + systemAudioSessionConfig.id);
            break;
        case "input_audio_buffer.speech_started":
            transcript = {
                transcript: '...',
                partial: true,
            }
            handleSystemAudioTranscript(transcript);
            break;
        case "input_audio_buffer.speech_stopped":
            transcript = {
                transcript: '...',
                partial: true,
            }
            handleSystemAudioTranscript(transcript);
            systemAudioVadTime = performance.now() - systemAudioSessionConfig.turn_detection.silence_duration_ms;
            break;
        case "conversation.item.input_audio_transcription.completed":
            const elapsed = performance.now() - systemAudioVadTime;
            transcript = {
                transcript: parsed.transcript,
                partial: false,
                latencyMs: elapsed.toFixed(0)
            }
            handleSystemAudioTranscript(transcript);
            break;
    }
}

// Handle microphone transcript updates
function handleMicrophoneTranscript(transcript) {
    const text = transcript.transcript;
    if (!text) {
        return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const prefix = transcript.partial ? '' : `[${timestamp}] `;

    if (!transcript.partial) {
        micResults.textContent += `${prefix}${text}\n`;
        micResults.scrollTop = micResults.scrollHeight;
        
        // Send to AI Coach for analysis
        if (aiCoach && text.trim() !== '...') {
            aiCoach.addTranscription('user', text, new Date().toISOString());
        }
    }
}

// Handle system audio transcript updates
function handleSystemAudioTranscript(transcript) {
    const text = transcript.transcript;
    if (!text) {
        return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const prefix = transcript.partial ? '' : `[${timestamp}] `;

    if (!transcript.partial) {
        speakerResults.textContent += `${prefix}${text}\n`;
        speakerResults.scrollTop = speakerResults.scrollHeight;
        
        // Send to AI Coach for analysis
        if (aiCoach && text.trim() !== '...') {
            aiCoach.addTranscription('meeting', text, new Date().toISOString());
        }
    }
}

// Handle errors
function handleError(e, streamType) {
    console.error(`${streamType} session error:`, e);
    alert(`Error (${streamType}): ` + e.message);
    stop();
}

// Start transcription
async function start() {
    try {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        modelSelect.disabled = true;

        // Initialize AI Coach
        if (!aiCoach) {
            aiCoach = new AICoach(window.electronAPI.apiKey);
        }
        updateAIStatus('Inicializando...');

        // Get microphone stream
        microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: {
                    exact: micSelect.value
                }
            },
            video: false
        });

        await window.electronAPI.enableLoopbackAudio();

        // Get display media (system audio)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true
        });

        await window.electronAPI.disableLoopbackAudio();

        // Remove video tracks, keep only audio
        const videoTracks = displayStream.getTracks().filter(t => t.kind === 'video');
        videoTracks.forEach(t => t.stop() && displayStream.removeTrack(t));

        systemAudioStream = displayStream;

        // Create microphone session
        microphoneSession = new Session(window.electronAPI.apiKey, 'microphone');
        microphoneSession.onconnectionstatechange = state => {
            console.log('Microphone connection state:', state);
            updateStatus('microphone', state === 'connected');
        };
        microphoneSession.onmessage = handleMicrophoneMessage;
        microphoneSession.onerror = (e) => handleError(e, 'microphone');

        // Create system audio session
        systemAudioSession = new Session(window.electronAPI.apiKey, 'system_audio');
        systemAudioSession.onconnectionstatechange = state => {
            console.log('System audio connection state:', state);
            updateStatus('speaker', state === 'connected');
        };
        systemAudioSession.onmessage = handleSystemAudioMessage;
        systemAudioSession.onerror = (e) => handleError(e, 'system_audio');

        // Configure sessions
        const sessionConfig = {
            input_audio_transcription: {
                model: modelSelect.value,
                prompt: "",
            },
            turn_detection: {
                type: "server_vad",
                silence_duration_ms: 10,
            }
        };

        // Start transcription with both streams
        await Promise.all([
            microphoneSession.startTranscription(microphoneStream, sessionConfig),
            systemAudioSession.startTranscription(displayStream, sessionConfig)
        ]);

        // Enable record button
        recordBtn.disabled = false;
        updateAIStatus('Ouvindo e pronto para dar dicas');
        console.log('Transcription started for both streams');

    } catch (error) {
        console.error('Error starting transcription:', error);
        alert('Erro ao iniciar transcrição: ' + error.message);
        stop();
    }
}

// Stop transcription
function stop() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    recordBtn.disabled = true;
    modelSelect.disabled = false;

    // Stop AI Coach
    if (aiCoach) {
        aiCoach.conversationBuffer = [];
        aiCoach.suggestions = [];
    }
    updateAIStatus('Sessão encerrada');
    
    // Clear suggestions
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '<div class="waiting-message">Inicie sua sessão de reunião para receber sugestões de coaching com IA</div>';
    }

    // Stop recording if active
    if (wavRecorder.isRecording) {
        wavRecorder.stopRecording();
        updateRecordStatus(false);
    }

    microphoneSession?.stop();
    microphoneSession = null;
    microphoneSessionConfig = null;

    systemAudioSession?.stop();
    systemAudioSession = null;
    systemAudioSessionConfig = null;

    // Stop and clean up streams
    microphoneStream?.getTracks().forEach(t => t.stop());
    systemAudioStream?.getTracks().forEach(t => t.stop());
    microphoneStream = null;
    systemAudioStream = null;

    updateStatus('microphone', false);
    updateStatus('speaker', false);
    updateRecordStatus(false);

    const timestamp = new Date().toLocaleTimeString();
    micResults.textContent = `[${timestamp}] Aguardando entrada do microfone...\n`;
    speakerResults.textContent = `[${timestamp}] Aguardando áudio da reunião...\n`;
}

// Update record status display
function updateRecordStatus(isRecording) {
    const statusCard = recordStatus;
    
    if (isRecording) {
        statusCard.className = 'status-card connected';
        statusCard.querySelector('.status-value').textContent = 'Gravando';
        recordBtn.textContent = 'Parar Gravação';
    } else {
        statusCard.className = 'status-card disconnected';  
        statusCard.querySelector('.status-value').textContent = 'Parada';
        recordBtn.textContent = 'Iniciar Gravação';
    }
}

// Handle recording button click
async function toggleRecording() {
    if (!wavRecorder.isRecording) {
        try {
            await wavRecorder.startRecording(microphoneStream, systemAudioStream);
            updateRecordStatus(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Erro ao iniciar gravação: ' + error.message);
        }
    } else {
        wavRecorder.stopRecording();
        updateRecordStatus(false);
    }
}

// Add event listeners
startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
recordBtn.addEventListener('click', toggleRecording);
updateMicSelect();

// Initialize with session context
async function initializeApp() {
    console.log('🚀 Meet Pilot - Iniciando aplicação...');
    
    // Load session context first
    const hasContext = loadSessionContext();
    
    try {
        // Initialize Playbook Manager (already initializes itself in constructor)
        playbookManager = new PlaybookManager();
        
        console.log('✅ PlaybookManager inicializado');
        
        if (hasContext) {
            console.log('🎯 Sessão iniciada com contexto de persona/playbook');
        } else {
            console.log('ℹ️ Sessão iniciada sem contexto pré-definido - modo adaptativo');
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar PlaybookManager:', error);
    }
}

// Initialize the app
initializeApp();

// Cleanup on page unload
window.addEventListener('beforeunload', stop);
