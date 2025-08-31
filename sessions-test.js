// ===== TESTE DA TELA DE SESSÕES =====

async function testSessionsScreen() {
    console.log('🧪 Testando tela de sessões...\n');
    
    try {
        // Testa se a API está disponível
        if (!window.electronAPI?.db) {
            console.error('❌ API do banco não está disponível');
            return;
        }
        
        // 1. Testa carregamento de dados
        console.log('📊 1. Carregando dados...');
        const personas = await window.electronAPI.db.getPersonas();
        const playbooks = await window.electronAPI.db.getPlaybooks();
        const sessoes = await window.electronAPI.db.getSessoes();
        
        console.log(`✅ Personas: ${personas.length}`);
        console.log(`✅ Playbooks: ${playbooks.length}`);
        console.log(`✅ Sessões: ${sessoes.length}`);
        
        // 2. Testa criação de sessão de teste
        console.log('\n🎯 2. Criando sessão de teste...');
        const novaSessao = await window.electronAPI.db.createSessao({
            titulo: 'Teste - Discovery Call - ' + new Date().toLocaleString(),
            persona_id: personas[0]?.id || null,
            playbook_id: playbooks[0]?.id || null,
            data_agendada: new Date().toISOString(),
            status: 'agendada'
        });
        
        console.log('✅ Sessão criada:', novaSessao);
        
        // 3. Testa analytics
        console.log('\n📈 3. Testando analytics...');
        const analyticsPersonas = await window.electronAPI.db.getAnalyticsPersonas();
        const performancePlaybooks = await window.electronAPI.db.getPerformancePlaybooks();
        
        console.log('✅ Analytics personas:', analyticsPersonas);
        console.log('✅ Performance playbooks:', performancePlaybooks);
        
        // 4. Verifica se o manager foi iniciado
        console.log('\n🔧 4. Verificando SessoesManager...');
        if (window.sessoesManager) {
            console.log('✅ SessoesManager carregado');
            console.log('📊 Sessões filtradas:', window.sessoesManager.filteredSessoes.length);
        } else {
            console.log('⚠️ SessoesManager ainda não foi carregado');
        }
        
        console.log('\n✅ Todos os testes passaram!');
        return true;
        
    } catch (error) {
        console.error('❌ Erro nos testes:', error);
        return false;
    }
}

// Função para testar o fluxo de iniciar sessão
async function testStartSessionFlow() {
    console.log('🚀 Testando fluxo de iniciar sessão...');
    
    try {
        const sessoes = await window.electronAPI.db.getSessoes('agendada');
        if (sessoes.length === 0) {
            console.log('⚠️ Nenhuma sessão agendada encontrada');
            return;
        }
        
        const sessao = sessoes[0];
        console.log('📋 Sessão selecionada:', sessao.titulo);
        
        // Simula carregamento do contexto
        const personas = await window.electronAPI.db.getPersonas();
        const playbooks = await window.electronAPI.db.getPlaybooks();
        
        const persona = personas.find(p => p.id === sessao.persona_id);
        const playbook = playbooks.find(p => p.id === sessao.playbook_id);
        
        const sessionContext = {
            sessionId: sessao.id,
            persona: persona,
            playbook: playbook,
            sessionData: sessao
        };
        
        console.log('🎯 Contexto da sessão preparado:');
        console.log('👤 Persona:', persona?.nome || 'Nenhuma');
        console.log('📚 Playbook:', playbook?.nome || 'Nenhum');
        
        // Salva no localStorage (como faria na aplicação real)
        localStorage.setItem('activeSessionContext', JSON.stringify(sessionContext));
        console.log('💾 Contexto salvo no localStorage');
        
        console.log('✅ Fluxo de iniciar sessão testado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro no teste de fluxo:', error);
    }
}

// Função para criar dados de teste adicionais
async function createTestData() {
    console.log('🏗️ Criando dados de teste...');
    
    try {
        // Cria algumas sessões de exemplo
        const testSessions = [
            {
                titulo: 'Discovery Call - Empresa XYZ',
                status: 'agendada',
                data_agendada: new Date(Date.now() + 86400000).toISOString() // Amanhã
            },
            {
                titulo: 'Demo Técnica - StartupABC',
                status: 'agendada',
                data_agendada: new Date(Date.now() + 2 * 86400000).toISOString() // Depois de amanhã
            },
            {
                titulo: 'Follow-up - Cliente Importante',
                status: 'finalizada',
                engagement_score: 8.5,
                probabilidade_fechamento: 85,
                resultado: 'fechado'
            }
        ];
        
        for (const session of testSessions) {
            await window.electronAPI.db.createSessao(session);
        }
        
        console.log(`✅ ${testSessions.length} sessões de teste criadas`);
        
        // Recarrega a página para ver os novos dados
        if (window.sessoesManager) {
            await window.sessoesManager.loadData();
            window.sessoesManager.renderStats();
            window.sessoesManager.renderSessions();
            console.log('🔄 Interface atualizada');
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar dados de teste:', error);
    }
}

console.log('🎯 TESTES DA TELA DE SESSÕES CARREGADOS!');
console.log('📋 Execute: testSessionsScreen() - para testar funcionalidades');
console.log('🚀 Execute: testStartSessionFlow() - para testar iniciar sessão');
console.log('🏗️ Execute: createTestData() - para criar dados de teste');

// Auto-teste quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('\n🚀 Executando auto-teste...');
        testSessionsScreen();
    }, 2000);
});
