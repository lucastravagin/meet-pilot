const { app, BrowserWindow } = require('electron')
const { initMain: initAudioLoopback } = require('electron-audio-loopback');
const path = require('node:path')
const dotenv = require('dotenv');

dotenv.config();

initAudioLoopback();

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
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})