// Script para testar integração no Console do DevTools
// Execute este código no console do navegador na tela de sessão

console.log('🧪 Iniciando teste de integração...');

// Criar mock de contexto de sessão
const mockSessionContext = {
    sessionId: 'test-session-' + Date.now(),
    isQuickSession: false,
    sessionData: {
        titulo: 'Reunião de Vendas - Acme Corp',
        tipo: 'vendas',
        status: 'ativa'
    },
    persona: {
        id: 1,
        nome: 'Carlos Silva',
        empresa: 'Acme Corp',
        cargo: 'CTO',
        classificacao: 'lead_qualificado',
        potencial_receita: 250000,
        contexto_negocio: {
            situacao_atual: 'Avaliando soluções de automação',
            desafios: ['Processos manuais', 'Custos altos'],
            objetivo: 'Reduzir custos em 30%'
        },
        necessidades: {
            primarias: ['Automação', 'Dashboards', 'Integração']
        },
        objecoes_comuns: {
            preco: 'Orçamento limitado',
            implementacao: 'Tempo de implementação'
        },
        preferencias_comunicacao: {
            tom: 'técnico e direto',
            foco: 'ROI e métricas'
        }
    },
    playbook: {
        id: 1,
        nome: 'Vendas Enterprise B2B',
        tipo_reuniao: 'discovery_call',
        objetivo_primario: 'Identificar necessidades',
        gatilhos_positivos: {
            palavras: ['ROI', 'eficiência', 'automação']
        },
        tecnicas_vendas: {
            principais: ['BANT', 'Consultive Selling']
        },
        tom_comunicacao: {
            linguagem: 'técnica mas acessível',
            postura: 'consultiva'
        }
    }
};

// Salvar no localStorage
localStorage.setItem('activeSessionContext', JSON.stringify(mockSessionContext));
console.log('💾 Contexto salvo no localStorage');

// Recarregar a página para testar o carregamento
console.log('🔄 Recarregando página para testar carregamento...');
location.reload();
