// ===== TESTE DO MODELO AVANÇADO DE VENDAS =====

async function testAdvancedSalesModel() {
  console.log('🚀 Testando modelo avançado de vendas...\n');
  
  try {
    // ===== TESTE 1: PERSONAS AVANÇADAS =====
    console.log('📋 1. Testando Personas Avançadas...');
    const personas = await window.electronAPI.db.getPersonas();
    console.log(`Encontradas ${personas.length} personas:`);
    
    personas.forEach(p => {
      console.log(`\n👤 ${p.nome} (${p.empresa})`);
      console.log(`   Cargo: ${p.cargo} | Setor: ${p.setor}`);
      console.log(`   Classificação: ${p.classificacao} | Potencial: R$ ${p.potencial_receita}`);
      console.log(`   Necessidades: ${Object.keys(p.necessidades).length} categorias`);
      console.log(`   Objeções: ${Object.keys(p.objecoes_comuns).length} tipos`);
    });

    // ===== TESTE 2: PLAYBOOKS AVANÇADOS =====
    console.log('\n\n📚 2. Testando Playbooks Avançados...');
    const playbooks = await window.electronAPI.db.getPlaybooks();
    console.log(`Encontrados ${playbooks.length} playbooks:`);
    
    playbooks.forEach(p => {
      console.log(`\n📖 ${p.nome} (${p.tipo_reuniao})`);
      console.log(`   Objetivo: ${p.objetivo_primario}`);
      console.log(`   Target: ${p.persona_target}`);
      console.log(`   Gatilhos+: ${Object.keys(p.gatilhos_positivos).length}`);
      console.log(`   Gatilhos-: ${Object.keys(p.gatilhos_negativos).length}`);
      console.log(`   Técnicas: ${Object.keys(p.tecnicas_vendas).length}`);
    });

    // ===== TESTE 3: CRIAR SESSÃO AVANÇADA =====
    console.log('\n\n🎯 3. Criando Sessão Avançada...');
    const novaSessao = await window.electronAPI.db.createSessao({
      titulo: 'Discovery Call - Luiz Gustavo - ' + new Date().toLocaleString(),
      data_agendada: new Date().toISOString(),
      persona_id: personas[0]?.id,
      playbook_id: playbooks[0]?.id,
      status: 'agendada',
      duracao_minutos: 45,
      objecoes_levantadas: {
        tempo: 'Não tenho tempo para aprender tecnologia',
        complexidade: 'Preciso de algo que já funcione'
      },
      interesse_demonstrado: {
        automacao: 8,
        infraestrutura: 9,
        roi_rapido: 10
      },
      proximos_passos: {
        acao: 'Encaminhar para Kelvin',
        prazo: '2 dias',
        material: 'Demo de infraestrutura'
      },
      engagement_score: 8.5,
      probabilidade_fechamento: 75,
      valor_potencial: 15000
    });
    
    console.log('✅ Sessão criada:', novaSessao);

    // ===== TESTE 4: ANALYTICS =====
    console.log('\n\n📊 4. Testando Analytics...');
    
    const analyticsPersonas = await window.electronAPI.db.getAnalyticsPersonas();
    console.log('Analytics de Personas:');
    analyticsPersonas.forEach(a => {
      console.log(`   ${a.classificacao}: ${a.total} personas, R$ ${a.receita_media?.toFixed(0) || 0} média`);
    });

    const performancePlaybooks = await window.electronAPI.db.getPerformancePlaybooks();
    console.log('\nPerformance de Playbooks:');
    performancePlaybooks.forEach(p => {
      console.log(`   ${p.nome}: ${p.total_sessoes || 0} sessões, ${p.engagement_medio?.toFixed(1) || 0} engagement`);
    });

    console.log('\n✅ Todos os testes do modelo avançado passaram!');
    
    return {
      personas,
      playbooks,
      novaSessao,
      analytics: { analyticsPersonas, performancePlaybooks }
    };

  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    return null;
  }
}

// ===== FUNÇÕES PARA CRIAÇÃO DE DADOS DE TESTE =====

async function createPersonaAdvanced() {
  console.log('👤 Criando persona avançada...');
  
  return await window.electronAPI.db.createPersona({
    nome: 'Carlos Alberto - CTO Fintech',
    empresa: 'PayTech Solutions',
    cargo: 'CTO',
    setor: 'Fintech',
    perfil_profissional: {
      experiencia: '10 anos em tecnologia financeira',
      formacao: 'Ciência da Computação + MBA',
      especializacoes: ['Blockchain', 'Pagamentos digitais', 'IA'],
      equipe: '25 desenvolvedores'
    },
    contexto_negocio: {
      situacao_atual: 'Crescimento rápido, 200% ao ano',
      desafios: ['Escalabilidade', 'Compliance', 'Automação de processos'],
      objetivo: 'Implementar IA para detecção de fraude e atendimento',
      budget: 'R$ 50-100k aprovado'
    },
    necessidades: {
      primarias: ['Solução enterprise', 'Integração com sistemas existentes', 'Suporte 24/7'],
      secundarias: ['Treinamento da equipe', 'Documentação técnica', 'Roadmap de evolução'],
      urgencia: 'Q1 2025 - deadline regulatório'
    },
    objecoes_comuns: {
      seguranca: 'Dados sensíveis, precisa de certificações',
      integracao: 'Sistemas legados complexos',
      performance: 'Não pode impactar latência dos pagamentos'
    },
    preferencias_comunicacao: {
      tom: 'Técnico detalhado',
      canais: ['Email', 'Slack', 'Calls técnicas'],
      frequencia: 'Updates semanais',
      decisao: 'Comitê técnico + financeiro'
    },
    classificacao: 'lead_qualificado',
    potencial_receita: 75000
  });
}

async function createPlaybookAdvanced() {
  console.log('📖 Criando playbook avançado...');
  
  return await window.electronAPI.db.createPlaybook({
    nome: 'Enterprise Sales - Fintech',
    tipo_reuniao: 'Technical Demo',
    objetivo_primario: 'Demonstrar capacidades técnicas e segurança',
    persona_target: 'CTOs e Decision Makers técnicos',
    
    abertura: {
      credibilidade: [
        'Vamos começar com uma visão da nossa arquitetura enterprise',
        'Preparei uma demo específica para o contexto de fintech'
      ],
      agenda: 'Arquitetura → Segurança → Integração → ROI → Próximos passos'
    },
    
    qualificacao: {
      discovery_tecnica: [
        'Qual é a stack atual de vocês?',
        'Como está estruturado o pipeline de dados?',
        'Quais são os principais gargalos de performance?',
        'Que certificações são obrigatórias para vocês?'
      ],
      pain_points: [
        'Onde vocês sentem mais dor hoje?',
        'Qual o impacto de não resolver isso?',
        'Já tentaram outras soluções?'
      ]
    },
    
    apresentacao: {
      arquitetura: 'Demonstração da infraestrutura cloud-native',
      seguranca: 'Certificações SOC2, ISO27001, PCI DSS',
      casos_sucesso: 'Banco XYZ - 40% redução fraudes, Fintech ABC - 60% automação'
    },
    
    tratamento_objecoes: {
      seguranca: [
        'Entendo a preocupação. Vamos ver nossa arquitetura de segurança...',
        'Temos audit trail completo e criptografia end-to-end'
      ],
      integracao: [
        'Nossa API REST é compatível com qualquer sistema',
        'Temos conectores prontos para os principais core bancários'
      ],
      performance: [
        'Nossa latência média é de 50ms, bem abaixo do requisito financeiro',
        'Processamos 10k transações/segundo sem degradação'
      ]
    },
    
    fechamento: {
      proximos_passos: [
        'POC de 30 dias com dados reais',
        'Apresentação para o comitê técnico',
        'Proposta comercial personalizada'
      ],
      urgencia: 'Q1 2025 para compliance',
      garantias: 'SLA de 99.9% e suporte 24/7'
    },
    
    gatilhos_positivos: {
      palavras: ['compliance', 'escalabilidade', 'performance', 'certificação'],
      frases: ['precisamos implementar rápido', 'já está aprovado no budget'],
      comportamento: ['faz perguntas técnicas detalhadas', 'pede demo específica']
    },
    
    gatilhos_negativos: {
      palavras: ['muito caro', 'vamos pensar', 'não é prioridade'],
      comportamento: ['não faz perguntas', 'fica no celular', 'delega para júnior']
    },
    
    materiais_apoio: {
      tecnicos: ['Architecture Diagram', 'Security Whitepaper', 'API Documentation'],
      comerciais: ['ROI Calculator', 'TCO Analysis', 'Implementation Timeline'],
      referencias: ['Customer Case Studies', 'Compliance Certificates']
    }
  });
}

// ===== GATILHOS DE IA INTELIGENTES =====

async function createSmartTriggers(playbook_id) {
  console.log('🧠 Criando gatilhos inteligentes de IA...');
  
  const gatilhos = [
    {
      nome: 'Interesse em Segurança',
      tipo: 'palavra_chave',
      condicao: {
        palavras: ['segurança', 'compliance', 'certificação', 'audit'],
        contexto: 'pergunta ou preocupação'
      },
      sugestao: 'Momento ideal para mostrar certificações e arquitetura de segurança. Pergunte sobre requisitos específicos de compliance.',
      prioridade: 9,
      playbook_id
    },
    {
      nome: 'Objeção de Preço',
      tipo: 'sentimento',
      condicao: {
        sentimento: 'resistencia',
        palavras: ['caro', 'preço', 'custo', 'orçamento'],
        contexto: 'hesitação'
      },
      sugestao: 'Mude o foco para valor. Pergunte sobre o custo atual do problema e apresente ROI com números específicos.',
      prioridade: 8,
      playbook_id
    },
    {
      nome: 'Sinal de Fechamento',
      tipo: 'interesse',
      condicao: {
        palavras: ['quando', 'implementar', 'próximos passos', 'contrato'],
        contexto: 'pergunta sobre timeline'
      },
      sugestao: 'OPORTUNIDADE DE FECHAMENTO! Proponha POC ou pilot. Pergunte sobre processo de aprovação e timeline ideal.',
      prioridade: 10,
      playbook_id
    },
    {
      nome: 'Pausa Longa',
      tipo: 'pausa',
      condicao: {
        duracao: '> 5 segundos',
        contexto: 'após pergunta ou proposta'
      },
      sugestao: 'Cliente está processando. Aguarde mais um pouco ou reformule a pergunta de forma mais simples.',
      prioridade: 6,
      playbook_id
    }
  ];

  for (const gatilho of gatilhos) {
    await window.electronAPI.db.createGatilhoIA(gatilho);
  }
  
  console.log(`✅ ${gatilhos.length} gatilhos criados`);
}

console.log('🎯 MODELO AVANÇADO DE VENDAS CARREGADO!');
console.log('📋 Execute: testAdvancedSalesModel() - para testar tudo');
console.log('👤 Execute: createPersonaAdvanced() - criar persona avançada');
console.log('📖 Execute: createPlaybookAdvanced() - criar playbook avançado');
console.log('🧠 Execute: createSmartTriggers(playbook_id) - criar gatilhos IA');
