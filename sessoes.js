// ===== SESSÕES MANAGER =====
class SessoesManager {
    constructor() {
        this.sessoes = [];
        this.personas = [];
        this.playbooks = [];
        this.filteredSessoes = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        try {
            this.showLoading(true);
            await this.loadData();
            this.setupEventListeners();
            this.renderStats();
            this.renderSessions();
            this.showLoading(false);
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showError('Erro ao carregar dados');
        }
    }

    async loadData() {
        try {
            // Carrega dados do banco
            this.sessoes = await window.electronAPI.db.getSessoes();
            this.personas = await window.electronAPI.db.getPersonas();
            this.playbooks = await window.electronAPI.db.getPlaybooks();
            
            // Aplica filtros
            this.applyFilters();
            
            console.log('📊 Dados carregados:', {
                sessoes: this.sessoes.length,
                personas: this.personas.length,
                playbooks: this.playbooks.length
            });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Botões principais
        document.getElementById('newSessionBtn').addEventListener('click', () => this.openNewSessionModal());
        document.getElementById('quickSessionBtn').addEventListener('click', () => this.startQuickSession());
        document.getElementById('configBtn').addEventListener('click', () => this.goToConfig());
        document.getElementById('analyticsBtn').addEventListener('click', () => this.showAnalytics());

        // Modal
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('newSessionForm').addEventListener('submit', (e) => this.createSession(e));

        // Filtros
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('statusFilter').addEventListener('change', (e) => this.handleFilterChange(e));

        // Fechar modal ao clicar fora
        document.getElementById('newSessionModal').addEventListener('click', (e) => {
            if (e.target.id === 'newSessionModal') {
                this.closeModal();
            }
        });
    }

    // ===== RENDERING =====
    renderStats() {
        const stats = this.calculateStats();
        const container = document.getElementById('statsContainer');
        
        container.innerHTML = `
            <div class="bg-white bg-opacity-10 backdrop-blur-xl rounded-xl p-6 border border-white border-opacity-10">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Total de Sessões</p>
                        <p class="text-2xl font-bold text-white">${stats.total}</p>
                    </div>
                    <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">📊</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-white bg-opacity-10 backdrop-blur-xl rounded-xl p-6 border border-white border-opacity-10">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Taxa de Conversão</p>
                        <p class="text-2xl font-bold text-white">${stats.conversionRate}%</p>
                    </div>
                    <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">📈</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-white bg-opacity-10 backdrop-blur-xl rounded-xl p-6 border border-white border-opacity-10">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Engagement Médio</p>
                        <p class="text-2xl font-bold text-white">${stats.avgEngagement}</p>
                    </div>
                    <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">🎯</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-white bg-opacity-10 backdrop-blur-xl rounded-xl p-6 border border-white border-opacity-10">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-300 text-sm">Esta Semana</p>
                        <p class="text-2xl font-bold text-white">${stats.thisWeek}</p>
                    </div>
                    <div class="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">📅</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderSessions() {
        const ativaSessoes = this.filteredSessoes.filter(s => s.status === 'ativa');
        const agendadaSessoes = this.filteredSessoes.filter(s => s.status === 'agendada');
        const finalizadaSessoes = this.filteredSessoes.filter(s => s.status === 'finalizada');

        // Atualiza contadores
        document.getElementById('activeCount').textContent = ativaSessoes.length;
        document.getElementById('scheduledCount').textContent = agendadaSessoes.length;
        document.getElementById('completedCount').textContent = finalizadaSessoes.length;

        // Renderiza cada seção
        this.renderSessionGrid('activeSessionsGrid', ativaSessoes, 'ativa');
        this.renderSessionGrid('scheduledSessionsGrid', agendadaSessoes, 'agendada');
        this.renderSessionGrid('completedSessionsGrid', finalizadaSessoes, 'finalizada');
    }

    renderSessionGrid(containerId, sessoes, status) {
        const container = document.getElementById(containerId);
        
        if (sessoes.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">${this.getEmptyStateEmoji(status)}</div>
                    <p class="text-gray-400 text-lg">${this.getEmptyStateMessage(status)}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessoes.map(sessao => this.createSessionCard(sessao, status)).join('');
        
        // Adiciona event listeners aos cards
        sessoes.forEach(sessao => {
            const card = document.getElementById(`session-${sessao.id}`);
            if (card) {
                this.setupSessionCardEvents(card, sessao, status);
            }
        });
    }

    createSessionCard(sessao, status) {
        const persona = this.personas.find(p => p.id === sessao.persona_id);
        const playbook = this.playbooks.find(p => p.id === sessao.playbook_id);
        
        const statusConfig = this.getStatusConfig(status);
        const dataFormatada = this.formatDate(sessao.data_agendada);
        const engagementScore = sessao.engagement_score || 0;
        const probabilidade = sessao.probabilidade_fechamento || 0;

        return `
            <div id="session-${sessao.id}" class="session-card bg-white bg-opacity-10 backdrop-blur-xl rounded-xl p-6 border border-white border-opacity-10 hover:bg-opacity-15 transition-all duration-200 cursor-pointer group">
                <!-- Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <div class="w-3 h-3 ${statusConfig.bgColor} rounded-full ${statusConfig.animation}"></div>
                            <span class="${statusConfig.textColor} text-sm font-semibold">${statusConfig.label}</span>
                        </div>
                        <h3 class="text-white font-bold text-lg leading-tight">${sessao.titulo}</h3>
                        ${dataFormatada ? `<p class="text-gray-300 text-sm mt-1">${dataFormatada}</p>` : ''}
                    </div>
                    <div class="dropdown relative">
                        <button class="text-gray-400 hover:text-white p-1 rounded transition-colors duration-200">
                            <span class="text-lg">⋮</span>
                        </button>
                    </div>
                </div>

                <!-- Persona Info -->
                ${persona ? `
                    <div class="mb-4 p-3 bg-white bg-opacity-5 rounded-lg">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                ${persona.nome.charAt(0)}
                            </div>
                            <div class="flex-1">
                                <p class="text-white font-semibold">${persona.nome}</p>
                                <p class="text-gray-300 text-sm">${persona.empresa || 'Empresa não informada'}</p>
                                ${persona.cargo ? `<p class="text-purple-300 text-xs">${persona.cargo}</p>` : ''}
                            </div>
                            <div class="text-right">
                                <span class="inline-block px-2 py-1 bg-purple-500 bg-opacity-20 text-purple-300 text-xs rounded-full">
                                    ${persona.classificacao || 'prospect'}
                                </span>
                            </div>
                        </div>
                        ${persona.potencial_receita > 0 ? `
                            <div class="mt-2 text-sm text-gray-300">
                                💰 Potencial: R$ ${persona.potencial_receita.toLocaleString()}
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="mb-4 p-3 bg-white bg-opacity-5 rounded-lg">
                        <p class="text-gray-400 text-sm">👤 Nenhuma persona selecionada</p>
                    </div>
                `}

                <!-- Playbook Info -->
                ${playbook ? `
                    <div class="mb-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-sm">📚</span>
                            <span class="text-white text-sm font-semibold">${playbook.nome}</span>
                        </div>
                        <p class="text-gray-300 text-xs">${playbook.tipo_reuniao || 'Tipo não definido'}</p>
                        ${playbook.objetivo_primario ? `<p class="text-purple-300 text-xs mt-1">🎯 ${playbook.objetivo_primario}</p>` : ''}
                    </div>
                ` : `
                    <div class="mb-4">
                        <p class="text-gray-400 text-sm">📚 Nenhum playbook selecionado</p>
                    </div>
                `}

                <!-- Metrics (para sessões finalizadas) -->
                ${status === 'finalizada' && (engagementScore > 0 || probabilidade > 0) ? `
                    <div class="mb-4 grid grid-cols-2 gap-3 text-center">
                        ${engagementScore > 0 ? `
                            <div class="p-2 bg-white bg-opacity-5 rounded-lg">
                                <p class="text-xs text-gray-300">Engagement</p>
                                <p class="text-lg font-bold ${this.getScoreColor(engagementScore)}">${engagementScore.toFixed(1)}</p>
                            </div>
                        ` : ''}
                        ${probabilidade > 0 ? `
                            <div class="p-2 bg-white bg-opacity-5 rounded-lg">
                                <p class="text-xs text-gray-300">Prob. Fechamento</p>
                                <p class="text-lg font-bold ${this.getScoreColor(probabilidade/10)}">${probabilidade}%</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Action Button -->
                <div class="mt-4">
                    ${status === 'ativa' ? `
                        <button class="session-action w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2">
                            <span>👁️</span>
                            <span>Entrar na Sessão</span>
                        </button>
                    ` : status === 'agendada' ? `
                        <button class="session-action w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2">
                            <span>▶️</span>
                            <span>Iniciar Sessão</span>
                        </button>
                    ` : `
                        <button class="session-action w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2">
                            <span>📋</span>
                            <span>Ver Detalhes</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    setupSessionCardEvents(card, sessao, status) {
        const actionBtn = card.querySelector('.session-action');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleSessionAction(sessao, status);
            });
        }

        // Click no card para preview
        card.addEventListener('click', () => {
            this.showSessionPreview(sessao);
        });
    }

    // ===== ACTIONS =====
    async handleSessionAction(sessao, status) {
        try {
            if (status === 'agendada') {
                await this.startSession(sessao);
            } else if (status === 'ativa') {
                await this.enterSession(sessao);
            } else {
                this.showSessionDetails(sessao);
            }
        } catch (error) {
            console.error('Erro na ação da sessão:', error);
            this.showError('Erro ao executar ação');
        }
    }

    async startSession(sessao) {
        try {
            this.showLoading(true);
            
            // Atualiza status para ativa
            await window.electronAPI.db.updateSessaoStatus(sessao.id, 'ativa');
            
            // Salva contexto da sessão no localStorage
            const sessionContext = {
                sessionId: sessao.id,
                persona: this.personas.find(p => p.id === sessao.persona_id),
                playbook: this.playbooks.find(p => p.id === sessao.playbook_id),
                sessionData: sessao
            };
            
            localStorage.setItem('activeSessionContext', JSON.stringify(sessionContext));
            
            // Redireciona para a tela de sessão
            window.location.href = 'index-original.html';
            
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            this.showError('Erro ao iniciar sessão');
            this.showLoading(false);
        }
    }

    async enterSession(sessao) {
        // Similar ao startSession, mas para sessões já ativas
        await this.startSession(sessao);
    }

    async startQuickSession() {
        try {
            this.showLoading(true);
            
            // Cria uma sessão rápida sem persona/playbook específicos
            const result = await window.electronAPI.db.createSessao({
                titulo: `Sessão Rápida - ${new Date().toLocaleString()}`,
                status: 'ativa'
            });
            
            const sessionContext = {
                sessionId: result.lastInsertRowid,
                isQuickSession: true,
                sessionData: {
                    id: result.lastInsertRowid,
                    titulo: `Sessão Rápida - ${new Date().toLocaleString()}`,
                    status: 'ativa'
                }
            };
            
            localStorage.setItem('activeSessionContext', JSON.stringify(sessionContext));
            window.location.href = 'index-original.html';
            
        } catch (error) {
            console.error('Erro ao iniciar sessão rápida:', error);
            this.showError('Erro ao iniciar sessão rápida');
            this.showLoading(false);
        }
    }

    // ===== MODAL MANAGEMENT =====
    async openNewSessionModal() {
        document.getElementById('newSessionModal').classList.remove('hidden');
        await this.populateModalSelects();
    }

    closeModal() {
        document.getElementById('newSessionModal').classList.add('hidden');
        document.getElementById('newSessionForm').reset();
    }

    async populateModalSelects() {
        const personaSelect = document.getElementById('personaSelect');
        const playbookSelect = document.getElementById('playbookSelect');
        
        // Populate personas
        personaSelect.innerHTML = '<option value="">Selecione uma persona...</option>';
        this.personas.forEach(persona => {
            const option = document.createElement('option');
            option.value = persona.id;
            option.textContent = `${persona.nome} - ${persona.empresa || 'N/A'}`;
            option.style.color = 'black'; // Força cor preta para as opções
            personaSelect.appendChild(option);
        });
        
        // Populate playbooks
        playbookSelect.innerHTML = '<option value="">Selecione um playbook...</option>';
        this.playbooks.forEach(playbook => {
            const option = document.createElement('option');
            option.value = playbook.id;
            option.textContent = `${playbook.nome} (${playbook.tipo_reuniao || 'N/A'})`;
            option.style.color = 'black'; // Força cor preta para as opções
            playbookSelect.appendChild(option);
        });
    }

    async createSession(e) {
        e.preventDefault();
        
        try {
            this.showLoading(true);
            
            const formData = new FormData(e.target);
            const sessionData = {
                titulo: document.getElementById('sessionTitle').value,
                persona_id: document.getElementById('personaSelect').value || null,
                playbook_id: document.getElementById('playbookSelect').value || null,
                data_agendada: document.getElementById('sessionDateTime').value || null,
                status: 'agendada'
            };
            
            await window.electronAPI.db.createSessao(sessionData);
            
            this.closeModal();
            await this.loadData();
            this.renderStats();
            this.renderSessions();
            
            this.showSuccess('Sessão criada com sucesso!');
            
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            this.showError('Erro ao criar sessão');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== FILTERS & SEARCH =====
    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.applyFilters();
        this.renderSessions();
    }

    handleFilterChange(e) {
        this.currentFilter = e.target.value;
        this.applyFilters();
        this.renderSessions();
    }

    applyFilters() {
        let filtered = [...this.sessoes];
        
        // Filter by status
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(s => s.status === this.currentFilter);
        }
        
        // Filter by search term
        if (this.searchTerm) {
            filtered = filtered.filter(s => 
                s.titulo.toLowerCase().includes(this.searchTerm) ||
                (s.persona_nome && s.persona_nome.toLowerCase().includes(this.searchTerm)) ||
                (s.playbook_nome && s.playbook_nome.toLowerCase().includes(this.searchTerm))
            );
        }
        
        this.filteredSessoes = filtered;
    }

    // ===== UTILITIES =====
    calculateStats() {
        const total = this.sessoes.length;
        const finalizadas = this.sessoes.filter(s => s.status === 'finalizada');
        const fechadas = finalizadas.filter(s => s.resultado === 'fechado');
        const conversionRate = finalizadas.length > 0 ? Math.round((fechadas.length / finalizadas.length) * 100) : 0;
        
        const engagementScores = this.sessoes.filter(s => s.engagement_score > 0).map(s => s.engagement_score);
        const avgEngagement = engagementScores.length > 0 ? 
            (engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length).toFixed(1) : '0.0';
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeek = this.sessoes.filter(s => new Date(s.created_at) >= oneWeekAgo).length;
        
        return { total, conversionRate, avgEngagement, thisWeek };
    }

    getStatusConfig(status) {
        const configs = {
            ativa: {
                label: 'Ativa',
                bgColor: 'bg-green-500',
                textColor: 'text-green-400',
                animation: 'animate-pulse'
            },
            agendada: {
                label: 'Agendada',
                bgColor: 'bg-blue-500',
                textColor: 'text-blue-400',
                animation: ''
            },
            finalizada: {
                label: 'Finalizada',
                bgColor: 'bg-gray-500',
                textColor: 'text-gray-400',
                animation: ''
            }
        };
        return configs[status] || configs.agendada;
    }

    getEmptyStateEmoji(status) {
        const emojis = {
            ativa: '🎯',
            agendada: '📅',
            finalizada: '✅'
        };
        return emojis[status] || '📋';
    }

    getEmptyStateMessage(status) {
        const messages = {
            ativa: 'Nenhuma sessão ativa no momento',
            agendada: 'Nenhuma sessão agendada',
            finalizada: 'Nenhuma sessão finalizada ainda'
        };
        return messages[status] || 'Nenhuma sessão encontrada';
    }

    getScoreColor(score) {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-red-400';
    }

    formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    }

    // ===== NAVIGATION =====
    goToConfig() {
        window.location.href = 'config.html';
    }

    showAnalytics() {
        // TODO: Implementar tela de analytics
        this.showInfo('Analytics em desenvolvimento');
    }

    // ===== UI HELPERS =====
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        // TODO: Implementar sistema de notificação mais elegante
        alert('❌ ' + message);
    }

    showSuccess(message) {
        // TODO: Implementar sistema de notificação mais elegante
        alert('✅ ' + message);
    }

    showInfo(message) {
        // TODO: Implementar sistema de notificação mais elegante
        alert('ℹ️ ' + message);
    }

    showSessionPreview(sessao) {
        // TODO: Implementar modal de preview da sessão
        console.log('Preview da sessão:', sessao);
    }

    showSessionDetails(sessao) {
        // TODO: Implementar tela de detalhes da sessão
        console.log('Detalhes da sessão:', sessao);
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    window.sessoesManager = new SessoesManager();
});
