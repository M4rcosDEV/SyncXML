const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    enviarConfig: (config) => ipcRenderer.invoke('enviar-config', config),
    openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
    sendDirectoryPath: (path) => ipcRenderer.send('set-directory-path', path)
});