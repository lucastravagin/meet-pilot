// Script de teste do banco de dados
// Adicione este código no console do DevTools ou em um arquivo de teste

async function testDatabase() {
  console.log('🧪 Testando banco de dados...');
  
  try {
    // Teste 1: Listar personas
    console.log('\n📋 Testando personas...');
    const personas = await window.electronAPI.db.getPersonas();
    console.log('Personas encontradas:', personas.length);
    personas.forEach(p => console.log(`- ${p.nome} (${p.empresa})`));
    
    // Teste 2: Listar playbooks
    console.log('\n📚 Testando playbooks...');
    const playbooks = await window.electronAPI.db.getPlaybooks();
    console.log('Playbooks encontrados:', playbooks.length);
    playbooks.forEach(p => console.log(`- ${p.nome} (${p.tipo_reuniao})`));
    
    // Teste 3: Criar nova sessão
    console.log('\n🎯 Testando criação de sessão...');
    const novaSessao = await window.electronAPI.db.createSessao({
      titulo: 'Reunião de Teste - ' + new Date().toLocaleString(),
      data_agendada: new Date().toISOString(),
      persona_id: personas[0]?.id || null,
      playbook_id: playbooks[0]?.id || null,
      status: 'agendada'
    });
    console.log('Nova sessão criada:', novaSessao);
    
    // Teste 4: Listar sessões
    console.log('\n📅 Testando sessões...');
    const sessoes = await window.electronAPI.db.getSessoes();
    console.log('Sessões encontradas:', sessoes.length);
    sessoes.forEach(s => console.log(`- ${s.titulo} (${s.status}) - Persona: ${s.persona_nome || 'Nenhuma'}`));
    
    console.log('\n✅ Todos os testes passaram!');
    
    return {
      personas,
      playbooks,
      sessoes
    };
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    return null;
  }
}

// Função para criar uma nova persona de teste
async function createTestPersona() {
  return await window.electronAPI.db.createPersona({
    nome: 'Maria Santos - Diretora de TI',
    empresa: 'InnovaCorp',
    contexto: {
      cargo: 'Diretora de TI',
      setor: 'Varejo',
      tamanho_empresa: 'Grande (500+ funcionários)',
      desafios: ['Modernização de infraestrutura', 'Segurança cibernética'],
      interesses: ['Cloud computing', 'Transformação digital']
    },
    preferencias: {
      comunicacao: 'Técnico mas acessível',
      tempo_reuniao: '45-60 minutos',
      foco: 'Soluções práticas e seguras'
    }
  });
}

// Função para criar um novo playbook de teste
async function createTestPlaybook() {
  return await window.electronAPI.db.createPlaybook({
    nome: 'Vendas B2B - Infraestrutura Cloud',
    tipo_reuniao: 'Technical Demo',
    gatilhos: {
      palavras_chave: ['segurança', 'compliance', 'uptime', 'migração'],
      situacoes: ['duvida_tecnica', 'objecao_seguranca', 'comparacao_solucoes']
    },
    respostas: {
      seguranca: [
        'Nossa solução possui certificações ISO 27001 e SOC 2...',
        'Implementamos criptografia end-to-end em todas as comunicações...'
      ],
      uptime: [
        'Garantimos 99.9% de uptime com SLA robusto...',
        'Temos redundância em múltiplas zonas de disponibilidade...'
      ]
    },
    recursos: {
      documentos: ['Security Whitepaper', 'Architecture Diagram'],
      demos: ['Cloud Migration Demo', 'Security Dashboard']
    }
  });
}

console.log('🚀 Funções de teste carregadas!');
console.log('Execute: testDatabase() para testar o banco');
console.log('Execute: createTestPersona() para criar uma persona de teste');
console.log('Execute: createTestPlaybook() para criar um playbook de teste');
