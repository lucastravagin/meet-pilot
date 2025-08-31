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
  }
});
