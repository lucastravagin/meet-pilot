const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),
  apiKey: process.env.OPENAI_KEY,
  playbook: {
    enabled: process.env.PLAYBOOK_ENABLED === 'true',
    defaultPath: process.env.PLAYBOOK_PATH || './playbooks',
    maxFileSize: process.env.PLAYBOOK_MAX_SIZE || '10MB',
    allowedTypes: (process.env.PLAYBOOK_TYPES || 'pdf,docx,txt').split(',')
  },
  
  // Database API
  db: {
    // Personas
    getPersonas: () => ipcRenderer.invoke('db:getPersonas'),
    createPersona: (data) => ipcRenderer.invoke('db:createPersona', data),
    updatePersona: (id, data) => ipcRenderer.invoke('db:updatePersona', id, data),
    deletePersona: (id) => ipcRenderer.invoke('db:deletePersona', id),
    
    // Playbooks
    getPlaybooks: () => ipcRenderer.invoke('db:getPlaybooks'),
    createPlaybook: (data) => ipcRenderer.invoke('db:createPlaybook', data),
    updatePlaybook: (id, data) => ipcRenderer.invoke('db:updatePlaybook', id, data),
    deletePlaybook: (id) => ipcRenderer.invoke('db:deletePlaybook', id),
    
    // Sessões
    getSessoes: (status) => ipcRenderer.invoke('db:getSessoes', status),
    getSessao: (id) => ipcRenderer.invoke('db:getSessao', id),
    createSessao: (data) => ipcRenderer.invoke('db:createSessao', data),
    updateSessao: (id, data) => ipcRenderer.invoke('db:updateSessao', id, data),
    updateSessaoStatus: (id, status) => ipcRenderer.invoke('db:updateSessaoStatus', id, status),
    deleteSessao: (id) => ipcRenderer.invoke('db:deleteSessao', id),
    
    // Técnicas de Vendas
    createTecnicaVenda: (data) => ipcRenderer.invoke('db:createTecnicaVenda', data),
    getTecnicasVenda: (categoria) => ipcRenderer.invoke('db:getTecnicasVenda', categoria),
    
    // Gatilhos de IA
    createGatilhoIA: (data) => ipcRenderer.invoke('db:createGatilhoIA', data),
    getGatilhosIA: (playbook_id, ativo) => ipcRenderer.invoke('db:getGatilhosIA', playbook_id, ativo),
    
    // Analytics
    getAnalyticsPersonas: () => ipcRenderer.invoke('db:getAnalyticsPersonas'),
    getPerformancePlaybooks: () => ipcRenderer.invoke('db:getPerformancePlaybooks'),
    getSessoesPorPeriodo: (dias) => ipcRenderer.invoke('db:getSessoesPorPeriodo', dias)
  }
});
