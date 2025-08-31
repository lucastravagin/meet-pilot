const { app, BrowserWindow, ipcMain } = require('electron')
const { initMain: initAudioLoopback } = require('electron-audio-loopback');
const path = require('node:path')
const dotenv = require('dotenv');
const MeetPilotDB = require('./database');

dotenv.config();

initAudioLoopback();

// Inicializa o banco de dados
let db;

function initDatabase() {
  try {
    db = new MeetPilotDB();
    db.seedData(); // Cria dados de exemplo na primeira execução
    console.log('✅ Sistema de banco de dados iniciado');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Meet Pilot - Copiloto de Reuniões com IA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  })

  // Start with configuration screen
  mainWindow.loadFile('config.html')
}

app.whenReady().then(() => {
  initDatabase();
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ===== IPC HANDLERS PARA BANCO DE DADOS =====

// Personas
ipcMain.handle('db:getPersonas', () => {
  return db.getPersonas();
});

ipcMain.handle('db:createPersona', (event, data) => {
  return db.createPersona(data);
});

ipcMain.handle('db:updatePersona', (event, id, data) => {
  return db.updatePersona(id, data);
});

ipcMain.handle('db:deletePersona', (event, id) => {
  return db.deletePersona(id);
});

// Playbooks
ipcMain.handle('db:getPlaybooks', () => {
  return db.getPlaybooks();
});

ipcMain.handle('db:createPlaybook', (event, data) => {
  return db.createPlaybook(data);
});

ipcMain.handle('db:updatePlaybook', (event, id, data) => {
  return db.updatePlaybook(id, data);
});

ipcMain.handle('db:deletePlaybook', (event, id) => {
  return db.deletePlaybook(id);
});

// Sessões
ipcMain.handle('db:getSessoes', (event, status = null) => {
  return db.getSessoes(status);
});

ipcMain.handle('db:getSessao', (event, id) => {
  return db.getSessao(id);
});

ipcMain.handle('db:createSessao', (event, data) => {
  return db.createSessao(data);
});

ipcMain.handle('db:updateSessao', (event, id, data) => {
  return db.updateSessao(id, data);
});

ipcMain.handle('db:updateSessaoStatus', (event, id, status) => {
  return db.updateSessaoStatus(id, status);
});

ipcMain.handle('db:deleteSessao', (event, id) => {
  return db.deleteSessao(id);
});

// Técnicas de Vendas
ipcMain.handle('db:createTecnicaVenda', (event, data) => {
  return db.createTecnicaVenda(data);
});

ipcMain.handle('db:getTecnicasVenda', (event, categoria) => {
  return db.getTecnicasVenda(categoria);
});

// Gatilhos de IA
ipcMain.handle('db:createGatilhoIA', (event, data) => {
  return db.createGatilhoIA(data);
});

ipcMain.handle('db:getGatilhosIA', (event, playbook_id, ativo) => {
  return db.getGatilhosIA(playbook_id, ativo);
});

// Analytics
ipcMain.handle('db:getAnalyticsPersonas', () => {
  return db.getAnalyticsPersonas();
});

ipcMain.handle('db:getPerformancePlaybooks', () => {
  return db.getPerformancePlaybooks();
});

ipcMain.handle('db:getSessoesPorPeriodo', (event, dias) => {
  return db.getSessoesPorPeriodo(dias);
});

app.on('window-all-closed', function () {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') app.quit()
})