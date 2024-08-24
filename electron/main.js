const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { processarDiretorioXML, obterNumerosDoBanco, verificarNumerosNaoPresentesEmXML, obterValorNotas} = require('../app');
const { setConfig } = require('../config/conexao');
const { setDate } = require('../app');



ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
  });
  if (result.canceled) {
      return null;
  }
  return result.filePaths[0];
});

let selectedDirectory = '';

ipcMain.on('set-directory-path', (event, directoryPath) => {
    selectedDirectory = directoryPath;  // Armazena o caminho do diretório selecionado
    console.log('Diretório Selecionado:', selectedDirectory);

    // Você pode iniciar o processamento do diretório aqui se necessário:
});


let config = {};

// Configurar IPC se necessário
ipcMain.handle('enviar-config', async (event, newConfig) => {
  if (!newConfig) {
      console.error('Configuração não recebida ou é undefined');
      throw new Error('Configuração não recebida');
  }

  try {

      config = newConfig; // Atualize a configuração

      // Atualize a configuração no módulo de conexão
      setConfig(config);
      setDate(config);

      const diretorioXML = selectedDirectory

      // Exemplo de como você pode usar as configurações
      console.log('Configurações recebidas:', config);

      // Processar os arquivos XML e verificar números
      const resultados = await processarDiretorioXML(diretorioXML);
      const numerosExtraidos = resultados.map(r => r.numeroExtraido);
      const valoresExtraidos = resultados.map(r => r.valorExtraido);
      const datasExtraidas = resultados.map(r => r.dataExtraida);
      const numerosDoBanco = await obterNumerosDoBanco(config);
      const valorNotas = await obterValorNotas(config);
      const numerosNaoPresentes = await verificarNumerosNaoPresentesEmXML(numerosDoBanco, numerosExtraidos);
      total = resultados.length;

      
      // Enviar a resposta de volta para o frontend
      return {
          resultados,
          datasExtraidas,
          valoresExtraidos,
          numerosNaoPresentes,
          valorNotas,
          total
      };

  } catch (error) {
      console.error('Erro ao processar configurações:', error);
      throw error;
  }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Usar preload.js para segurança
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    // Enviar uma mensagem ao frontend após carregar a janela
    win.webContents.on('did-finish-load', async () => {
        try {
            const diretorioXML = 'C:/Users/dev/Desktop/xmls'; // Substitua pelo seu diretório
            const resultados = await processarDiretorioXML(diretorioXML);

            // Obter números extraídos dos XMLs
            const numerosExtraidos = resultados.map(r => r.numeroExtraido);

            // Obter números do banco de dados
            const numerosDoBanco = await obterNumerosDoBanco();

            // Verificar números no banco que não estão presentes nos XMLs
            const numerosNaoPresentes = await verificarNumerosNaoPresentesEmXML(numerosDoBanco, numerosExtraidos);

            // Enviar dados para o frontend
            win.webContents.send('dados-processados', {
                resultados,
                numerosNaoPresentes
            });

        } catch (error) {
            console.error('Erro ao processar dados XML:', error);
        }
    });
}



app.whenReady().then(() => {
    console.log("App is ready");
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});



