const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class MeetPilotDB {
  constructor() {
    // Cria o banco na pasta do usuário
    const dbPath = path.join(__dirname, 'meetpilot.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // Habilita chaves estrangeiras
    this.db.pragma('foreign_keys = ON');
    
    // Cria as tabelas
    this.createTables();
    
    console.log('✅ Banco de dados SQLite inicializado');
  }

  createTables() {
    // Tabela de Personas (Leads/Clientes)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        empresa TEXT,
        cargo TEXT,
        setor TEXT,
        perfil_profissional TEXT, -- JSON: experiência, formação, histórico
        contexto_negocio TEXT, -- JSON: situação atual, desafios, objetivos
        necessidades TEXT, -- JSON: dores, urgências, prioridades
        objecoes_comuns TEXT, -- JSON: preço, tempo, autoridade, necessidade
        preferencias_comunicacao TEXT, -- JSON: tom, canal, frequência
        historico_interacoes TEXT, -- JSON: calls anteriores, touchpoints
        classificacao TEXT DEFAULT 'prospect', -- prospect, lead_qualificado, cliente, perdido
        potencial_receita REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Playbooks (Estratégias de Vendas)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS playbooks (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo_reuniao TEXT, -- discovery, demo, fechamento, follow_up
        objetivo_primario TEXT, -- qualificar, demonstrar_valor, fechar, etc
        persona_target TEXT, -- Para qual tipo de persona funciona melhor
        
        -- Estrutura da conversa
        abertura TEXT, -- JSON: frases de abertura, rapport building
        qualificacao TEXT, -- JSON: perguntas para discovery
        apresentacao TEXT, -- JSON: argumentos de venda, casos de sucesso
        tratamento_objecoes TEXT, -- JSON: objeções e respostas
        fechamento TEXT, -- JSON: técnicas de close, próximos passos
        
        -- Inteligência de vendas
        gatilhos_positivos TEXT, -- JSON: palavras/situações que indicam interesse
        gatilhos_negativos TEXT, -- JSON: red flags para atenção
        tecnicas_vendas TEXT, -- JSON: técnicas específicas para aplicar
        tom_comunicacao TEXT, -- JSON: como falar, que linguagem usar
        
        -- Recursos de apoio
        materiais_apoio TEXT, -- JSON: slides, cases, demos, calculadoras
        argumentos_prova TEXT, -- JSON: dados, estatísticas, testimonials
        scripts_personalizados TEXT, -- JSON: scripts por situação
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Sessões (Calls/Reuniões)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessoes (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        data_agendada DATETIME,
        persona_id TEXT,
        playbook_id TEXT,
        status TEXT DEFAULT 'agendada', -- agendada, ativa, finalizada, cancelada
        
        -- Dados da call
        duracao_minutos INTEGER,
        transcricao_completa TEXT,
        momentos_chave TEXT, -- JSON: timestamps importantes
        objecoes_levantadas TEXT, -- JSON: objeções durante a call
        interesse_demonstrado TEXT, -- JSON: sinais de interesse
        proximos_passos TEXT, -- JSON: follow-ups acordados
        
        -- Análise da performance
        tecnicas_aplicadas TEXT, -- JSON: quais técnicas do playbook foram usadas
        pontos_fortes TEXT, -- JSON: o que funcionou bem
        pontos_melhoria TEXT, -- JSON: oportunidades de melhoria
        resultado TEXT, -- qualificado, demo_agendada, proposta_enviada, fechado, perdido
        valor_potencial REAL,
        probabilidade_fechamento INTEGER, -- 0-100
        
        -- Insights da IA
        insights_ia TEXT, -- JSON: sugestões e análises da IA
        sentiment_analysis TEXT, -- JSON: análise de sentimento da conversa
        engagement_score REAL, -- 0-10 baseado no engajamento
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (persona_id) REFERENCES personas (id),
        FOREIGN KEY (playbook_id) REFERENCES playbooks (id)
      )
    `);

    // Tabela de Técnicas de Vendas (Biblioteca de conhecimento)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tecnicas_vendas (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        categoria TEXT, -- rapport, qualificacao, apresentacao, objecoes, fechamento
        descricao TEXT,
        quando_usar TEXT, -- contextos ideais
        como_aplicar TEXT, -- passo a passo
        exemplos_frases TEXT, -- JSON: frases e scripts
        casos_sucesso TEXT, -- JSON: quando funcionou bem
        armadilhas_evitar TEXT, -- JSON: erros comuns
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Gatilhos de IA (Para coaching em tempo real)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gatilhos_ia (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT, -- palavra_chave, sentimento, pausa, objecao, interesse
        condicao TEXT, -- JSON: condições para ativar
        sugestao TEXT, -- O que a IA deve sugerir
        prioridade INTEGER DEFAULT 5, -- 1-10 (10 = altíssima)
        ativo BOOLEAN DEFAULT 1,
        playbook_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playbook_id) REFERENCES playbooks (id)
      )
    `);

    console.log('✅ Tabelas criadas/verificadas - Modelo avançado de vendas');
  }

  // ===== PERSONAS =====
  createPersona(data) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO personas (
        id, nome, empresa, cargo, setor, perfil_profissional, 
        contexto_negocio, necessidades, objecoes_comuns, 
        preferencias_comunicacao, historico_interacoes, 
        classificacao, potencial_receita
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      data.nome,
      data.empresa || null,
      data.cargo || null,
      data.setor || null,
      JSON.stringify(data.perfil_profissional || {}),
      JSON.stringify(data.contexto_negocio || {}),
      JSON.stringify(data.necessidades || {}),
      JSON.stringify(data.objecoes_comuns || {}),
      JSON.stringify(data.preferencias_comunicacao || {}),
      JSON.stringify(data.historico_interacoes || []),
      data.classificacao || 'prospect',
      data.potencial_receita || 0
    );
  }

  getPersonas() {
    const stmt = this.db.prepare('SELECT * FROM personas ORDER BY created_at DESC');
    const rows = stmt.all();
    
    return rows.map(row => ({
      ...row,
      perfil_profissional: JSON.parse(row.perfil_profissional || '{}'),
      contexto_negocio: JSON.parse(row.contexto_negocio || '{}'),
      necessidades: JSON.parse(row.necessidades || '{}'),
      objecoes_comuns: JSON.parse(row.objecoes_comuns || '{}'),
      preferencias_comunicacao: JSON.parse(row.preferencias_comunicacao || '{}'),
      historico_interacoes: JSON.parse(row.historico_interacoes || '[]')
    }));
  }

  updatePersona(id, data) {
    const stmt = this.db.prepare(`
      UPDATE personas 
      SET nome = ?, empresa = ?, cargo = ?, setor = ?, 
          perfil_profissional = ?, contexto_negocio = ?, necessidades = ?, 
          objecoes_comuns = ?, preferencias_comunicacao = ?, 
          classificacao = ?, potencial_receita = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      data.nome,
      data.empresa || null,
      data.cargo || null,
      data.setor || null,
      JSON.stringify(data.perfil_profissional || {}),
      JSON.stringify(data.contexto_negocio || {}),
      JSON.stringify(data.necessidades || {}),
      JSON.stringify(data.objecoes_comuns || {}),
      JSON.stringify(data.preferencias_comunicacao || {}),
      data.classificacao || 'prospect',
      data.potencial_receita || 0,
      id
    );
  }

  deletePersona(id) {
    const stmt = this.db.prepare('DELETE FROM personas WHERE id = ?');
    return stmt.run(id);
  }

  // ===== PLAYBOOKS =====
  createPlaybook(data) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO playbooks (
        id, nome, tipo_reuniao, objetivo_primario, persona_target,
        abertura, qualificacao, apresentacao, tratamento_objecoes, fechamento,
        gatilhos_positivos, gatilhos_negativos, tecnicas_vendas, tom_comunicacao,
        materiais_apoio, argumentos_prova, scripts_personalizados
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      data.nome,
      data.tipo_reuniao || null,
      data.objetivo_primario || null,
      data.persona_target || null,
      JSON.stringify(data.abertura || {}),
      JSON.stringify(data.qualificacao || {}),
      JSON.stringify(data.apresentacao || {}),
      JSON.stringify(data.tratamento_objecoes || {}),
      JSON.stringify(data.fechamento || {}),
      JSON.stringify(data.gatilhos_positivos || {}),
      JSON.stringify(data.gatilhos_negativos || {}),
      JSON.stringify(data.tecnicas_vendas || {}),
      JSON.stringify(data.tom_comunicacao || {}),
      JSON.stringify(data.materiais_apoio || {}),
      JSON.stringify(data.argumentos_prova || {}),
      JSON.stringify(data.scripts_personalizados || {})
    );
  }

  getPlaybooks() {
    const stmt = this.db.prepare('SELECT * FROM playbooks ORDER BY created_at DESC');
    const rows = stmt.all();
    
    return rows.map(row => ({
      ...row,
      abertura: JSON.parse(row.abertura || '{}'),
      qualificacao: JSON.parse(row.qualificacao || '{}'),
      apresentacao: JSON.parse(row.apresentacao || '{}'),
      tratamento_objecoes: JSON.parse(row.tratamento_objecoes || '{}'),
      fechamento: JSON.parse(row.fechamento || '{}'),
      gatilhos_positivos: JSON.parse(row.gatilhos_positivos || '{}'),
      gatilhos_negativos: JSON.parse(row.gatilhos_negativos || '{}'),
      tecnicas_vendas: JSON.parse(row.tecnicas_vendas || '{}'),
      tom_comunicacao: JSON.parse(row.tom_comunicacao || '{}'),
      materiais_apoio: JSON.parse(row.materiais_apoio || '{}'),
      argumentos_prova: JSON.parse(row.argumentos_prova || '{}'),
      scripts_personalizados: JSON.parse(row.scripts_personalizados || '{}')
    }));
  }

  deletePlaybook(id) {
    const stmt = this.db.prepare('DELETE FROM playbooks WHERE id = ?');
    return stmt.run(id);
  }

  // ===== SESSÕES =====
  createSessao(data) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO sessoes (id, titulo, data_agendada, persona_id, playbook_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      data.titulo,
      data.data_agendada || null,
      data.persona_id || null,
      data.playbook_id || null,
      data.status || 'agendada'
    );
  }

  getSessoes(status = null) {
    let query = `
      SELECT s.*, p.nome as persona_nome, pl.nome as playbook_nome
      FROM sessoes s
      LEFT JOIN personas p ON s.persona_id = p.id
      LEFT JOIN playbooks pl ON s.playbook_id = pl.id
    `;
    
    if (status) {
      query += ' WHERE s.status = ?';
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const stmt = this.db.prepare(query);
    const rows = status ? stmt.all(status) : stmt.all();
    
    return rows.map(row => ({
      ...row,
      insights: JSON.parse(row.insights || '{}')
    }));
  }

  getSessao(id) {
    const stmt = this.db.prepare(`
      SELECT s.*, p.nome as persona_nome, pl.nome as playbook_nome
      FROM sessoes s
      LEFT JOIN personas p ON s.persona_id = p.id
      LEFT JOIN playbooks pl ON s.playbook_id = pl.id
      WHERE s.id = ?
    `);
    
    const row = stmt.get(id);
    
    if (!row) return null;
    
    return {
      ...row,
      insights: JSON.parse(row.insights || '{}')
    };
  }

  updateSessao(id, data) {
    const stmt = this.db.prepare(`
      UPDATE sessoes 
      SET titulo = ?, data_agendada = ?, persona_id = ?, playbook_id = ?, status = ?, 
          transcricao = ?, insights = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      data.titulo,
      data.data_agendada || null,
      data.persona_id || null,
      data.playbook_id || null,
      data.status,
      data.transcricao || null,
      JSON.stringify(data.insights || {}),
      id
    );
  }

  updateSessaoStatus(id, status) {
    const stmt = this.db.prepare(`
      UPDATE sessoes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    return stmt.run(status, id);
  }

  deleteSessao(id) {
    const stmt = this.db.prepare('DELETE FROM sessoes WHERE id = ?');
    return stmt.run(id);
  }

  // ===== TÉCNICAS DE VENDAS =====
  createTecnicaVenda(data) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO tecnicas_vendas (id, nome, categoria, descricao, quando_usar, como_aplicar, exemplos_frases, casos_sucesso, armadilhas_evitar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      data.nome,
      data.categoria,
      data.descricao,
      data.quando_usar,
      data.como_aplicar,
      JSON.stringify(data.exemplos_frases || []),
      JSON.stringify(data.casos_sucesso || []),
      JSON.stringify(data.armadilhas_evitar || [])
    );
  }

  getTecnicasVenda(categoria = null) {
    let query = 'SELECT * FROM tecnicas_vendas';
    if (categoria) {
      query += ' WHERE categoria = ?';
    }
    query += ' ORDER BY nome';
    
    const stmt = this.db.prepare(query);
    const rows = categoria ? stmt.all(categoria) : stmt.all();
    
    return rows.map(row => ({
      ...row,
      exemplos_frases: JSON.parse(row.exemplos_frases || '[]'),
      casos_sucesso: JSON.parse(row.casos_sucesso || '[]'),
      armadilhas_evitar: JSON.parse(row.armadilhas_evitar || '[]')
    }));
  }

  // ===== GATILHOS DE IA =====
  createGatilhoIA(data) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO gatilhos_ia (id, nome, tipo, condicao, sugestao, prioridade, playbook_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      id,
      data.nome,
      data.tipo,
      JSON.stringify(data.condicao || {}),
      data.sugestao,
      data.prioridade || 5,
      data.playbook_id || null
    );
  }

  getGatilhosIA(playbook_id = null, ativo = true) {
    let query = 'SELECT * FROM gatilhos_ia WHERE ativo = ?';
    let params = [ativo ? 1 : 0];
    
    if (playbook_id) {
      query += ' AND playbook_id = ?';
      params.push(playbook_id);
    }
    
    query += ' ORDER BY prioridade DESC, nome';
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map(row => ({
      ...row,
      condicao: JSON.parse(row.condicao || '{}'),
      ativo: Boolean(row.ativo)
    }));
  }

  // ===== ANALYTICS E RELATÓRIOS =====
  getAnalyticsPersonas() {
    const stmt = this.db.prepare(`
      SELECT 
        classificacao,
        COUNT(*) as total,
        AVG(potencial_receita) as receita_media,
        SUM(potencial_receita) as receita_total
      FROM personas 
      GROUP BY classificacao
    `);
    return stmt.all();
  }

  getPerformancePlaybooks() {
    const stmt = this.db.prepare(`
      SELECT 
        p.nome,
        p.tipo_reuniao,
        COUNT(s.id) as total_sessoes,
        AVG(s.engagement_score) as engagement_medio,
        COUNT(CASE WHEN s.resultado IN ('qualificado', 'fechado') THEN 1 END) as sucessos
      FROM playbooks p
      LEFT JOIN sessoes s ON p.id = s.playbook_id
      GROUP BY p.id, p.nome, p.tipo_reuniao
      ORDER BY engagement_medio DESC
    `);
    return stmt.all();
  }

  getSessoesPorPeriodo(dias = 30) {
    const stmt = this.db.prepare(`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_sessoes,
        AVG(engagement_score) as engagement_medio,
        COUNT(CASE WHEN resultado = 'fechado' THEN 1 END) as fechamentos
      FROM sessoes 
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `);
    return stmt.all(dias);
  }

  // ===== UTILS =====
  close() {
    this.db.close();
  }

  // Método para seed inicial
  seedData() {
    try {
      // Persona baseada na análise: Luiz Gustavo (Advogado)
      this.createPersona({
        nome: 'Luiz Gustavo Silva',
        empresa: 'Prefeitura Municipal + Negócios Próprios',
        cargo: 'Advogado / Cargo de Confiança',
        setor: 'Jurídico / Empreendedorismo',
        perfil_profissional: {
          experiencia: '5 anos como advogado',
          formacao: 'Direito',
          especializacoes: ['Licitações', 'Direito Municipal'],
          empreendimentos: ['Lava-rápido', 'Empresa de licitações']
        },
        contexto_negocio: {
          situacao_atual: 'Múltiplos negócios, pouco tempo',
          objetivo_principal: 'Automatizar advocacia com IA para atendimentos básicos',
          desafios: ['Falta de tempo para aprender', 'Precisa de infraestrutura pronta'],
          urgencia: 'Alta - quer implementar rapidamente'
        },
        necessidades: {
          primarias: ['Infraestrutura pronta', 'Solução automatizada', 'Suporte técnico'],
          secundarias: ['Integração simples', 'ROI rápido'],
          nao_quer: ['Cursos longos', 'Aprendizado técnico complexo']
        },
        objecoes_comuns: {
          tempo: 'Não tenho tempo para aprender tecnologia',
          complexidade: 'Preciso de algo que já funcione',
          prioridade: 'Advocacia não é meu foco principal'
        },
        preferencias_comunicacao: {
          tom: 'Direto e prático',
          foco: 'Resultados imediatos',
          decisao: 'Rápida, baseada em eficiência'
        },
        classificacao: 'lead_qualificado',
        potencial_receita: 15000
      });

      // Persona baseada na análise: Andre Baptista (Engenheiro/Consultor IA)
      this.createPersona({
        nome: 'Andre Baptista',
        empresa: 'Consultoria IA (própria)',
        cargo: 'Engenheiro/Consultor IA',
        setor: 'Consultoria / Tecnologia',
        perfil_profissional: {
          experiencia: '2 anos com IA, 1 ano empresa própria',
          formacao: 'Engenharia Civil + TI',
          especializacoes: ['IA', 'Consultoria técnica'],
          transicao: 'De engenharia civil para IA'
        },
        contexto_negocio: {
          situacao_atual: 'Empresa própria há 1 ano',
          problemas: ['Dificuldade na abordagem ao cliente', 'Falta de nicho definido'],
          objetivo: 'Definir caminho claro e estruturar vendas'
        },
        necessidades: {
          primarias: ['Mentoria em vendas', 'Definição de nicho', 'Estrutura comercial'],
          secundarias: ['Network', 'Cases de sucesso', 'Metodologia de vendas']
        },
        objecoes_comuns: {
          investimento: 'Preciso ver ROI claro',
          tempo: 'Já tentei outras abordagens',
          adequacao: 'Vai funcionar para meu negócio?'
        },
        preferencias_comunicacao: {
          tom: 'Técnico mas acessível',
          demonstracao: 'Cases práticos e resultados reais',
          decisao: 'Analítica, precisa de dados'
        },
        classificacao: 'prospect',
        potencial_receita: 7000
      });

      // Playbook baseado no estilo do Erick
      this.createPlaybook({
        nome: 'Discovery Call - Estilo Erick',
        tipo_reuniao: 'Discovery Call',
        objetivo_primario: 'Qualificar necessidade e encaminhar para solução adequada',
        persona_target: 'Empreendedores técnicos buscando automação',
        abertura: {
          rapport: [
            'vi que você preencheu o formulário ali, né?',
            'queria saber mais de você aí hoje',
            'qual que é a sua visão, qual que é o seu momento'
          ],
          tom: 'Conversacional, próximo, sem formalidade excessiva'
        },
        qualificacao: {
          perguntas_chave: [
            'qual que é a sua visão sobre [área específica]?',
            'isso seria só para você ou para outros [profissionais]?',
            'o que que faria mais sentido para você?',
            'que que você acha?'
          ],
          foco: 'Entender contexto real antes de apresentar solução'
        },
        apresentacao: {
          abordagem: 'Honestidade comercial',
          tecnica: 'Identificar fit real com solução',
          diferencial: 'Transparência sobre limitações'
        },
        tratamento_objecoes: {
          honestidade_comercial: 'sendo até justo com você, cara',
          redirecionamento: 'Encaminhar para quem tem solução mais adequada',
          transparencia: 'Admitir quando a solução não é ideal'
        },
        fechamento: {
          proximo_passo: 'Direcionamento estratégico',
          sem_pressao: 'Foco na adequação, não na venda forçada'
        },
        gatilhos_positivos: {
          palavras: ['automatizar', 'infraestrutura', 'pronto', 'rápido'],
          situacoes: ['urgência', 'múltiplos negócios', 'falta de tempo']
        },
        gatilhos_negativos: {
          palavras: ['aprender', 'curso', 'estudar'],
          situacoes: ['quer desenvolver internamente', 'tem muito tempo livre']
        },
        tecnicas_vendas: {
          principais: ['Qualificação inicial', 'Honestidade comercial', 'Encaminhamento estratégico'],
          tom_voz: 'Coloquial, próximo, sem arrogância técnica'
        },
        tom_comunicacao: {
          linguagem: 'Gírias e expressões coloquiais',
          postura: 'Consultor, não vendedor',
          foco: 'Resultados práticos do cliente'
        }
      });

      // Playbook baseado no estilo do Kelvin
      this.createPlaybook({
        nome: 'Acelerador - Estilo Kelvin',
        tipo_reuniao: 'Demo + Fechamento',
        objetivo_primario: 'Demonstrar valor e fechar acelerador',
        persona_target: 'Desenvolvedores e consultores querendo empreender',
        abertura: {
          energia: [
            'galera seguinte ó',
            'vamos lá',
            'o negócio é o seguinte'
          ],
          quebra_gelo: 'Linguagem coloquial e direta'
        },
        qualificacao: {
          discovery: [
            'sacou',
            'entenderam',
            'qual é a situação aí'
          ]
        },
        apresentacao: {
          storytelling: 'Cases reais (100k em 2 meses, contrato de 92k)',
          analogias: 'Comparações práticas e didáticas',
          transparencia: 'Mostra processos reais, não esconde nada'
        },
        tratamento_objecoes: {
          mindset: [
            'você tá com a cabeça de executor, você tá pensando errado',
            'o segredo não é você ser o cara que faz tudo',
            'pense como estrategista'
          ],
          praticidade: 'MVP, validação, ferramentas prontas'
        },
        fechamento: {
          urgencia: 'Crescimento da comunidade',
          flexibilidade: 'Opções de pagamento',
          diferencial: 'Não é curso, é acelerador com suporte ativo'
        },
        materiais_apoio: {
          cases: ['Espire', 'Script Viral'],
          demonstracoes: ['Código real', 'Processos práticos'],
          calculadoras: ['ROI', 'Potencial de receita']
        },
        scripts_personalizados: {
          objecao_complexidade: 'é um PowerPoint, um sonho e coragem',
          foco_estrategico: 'não tenha cabeça de desenvolver tudo',
          validacao: 'simples assim, de verdade'
        }
      });

      console.log('✅ Dados de exemplo criados com base na análise de vendas');
    } catch (error) {
      console.log('ℹ️ Dados de exemplo já existem ou erro:', error.message);
    }
  }
}

module.exports = MeetPilotDB;
