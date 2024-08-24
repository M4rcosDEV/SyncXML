const express = require('express');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gasiq',
    password: 'amstopams',
    port: 5432,
});

// Função para obter todos os números do banco de dados
async function obterNumerosDoBanco() {
    try {
        const query = `SELECT numnota FROM tab_vend`; // Atualize com sua tabela e coluna
        const res = await pool.query(query);
        return res.rows.map(row => row.numnota);
    } catch (err) {
        console.error('Erro ao consultar o banco de dados:', err.message);
        throw err;
    }
}

// Função para extrair o número do XML
async function extrairNumeroXML(filePath) {
    const parser = new xml2js.Parser();
    try {
        const data = await fs.promises.readFile(filePath);
        const resultado = await parser.parseStringPromise(data);

        let numnota;

        if (resultado.nfeProc && resultado.nfeProc.NFe && resultado.nfeProc.NFe[0].infNFe && resultado.nfeProc.NFe[0].infNFe[0].ide && resultado.nfeProc.NFe[0].infNFe[0].ide[0].nNF) {
            // Estrutura padrão
            numnota = resultado.nfeProc.NFe[0].infNFe[0].ide[0].nNF[0].replace('Numero:', '').trim();
        } else if (resultado.NFe && resultado.NFe.infNFe && resultado.NFe.infNFe[0].ide && resultado.NFe.infNFe[0].ide[0].nNF) {
            // Estrutura alternativa
            numnota = resultado.NFe.infNFe[0].ide[0].nNF[0].replace('Numero:', '').trim();
        } else {
            throw new Error('Estrutura do XML não reconhecida');
        }

        return numnota;
    } catch (error) {
        console.log('Erro ao ler ou analisar o arquivo XML:', error);
        throw error;
    }
}

// Função para verificar se algum número extraído não está no banco de dados
async function verificarNumerosNoBanco(numerosExtraidos) {
    try {
        const numerosDoBanco = await obterNumerosDoBanco();
        return numerosExtraidos.filter(n => !numerosDoBanco.includes(n));
    } catch (error) {
        throw error;
    }
}

// Função para processar todos os arquivos XML em um diretório
async function processarDiretorioXML(diretorio) {
    try {
        const arquivos = await fs.promises.readdir(diretorio);
        const arquivosXML = arquivos.filter(arquivo => arquivo.endsWith('.xml'));

        if (arquivosXML.length === 0) {
            console.log('Nenhum arquivo XML encontrado no diretório.');
            return [];
        }

        const resultados = await Promise.all(arquivosXML.map(async (arquivo) => {
            const filePath = path.join(diretorio, arquivo);
            try {
                const numeroExtraido = await extrairNumeroXML(filePath);
                return { arquivo, numeroExtraido };
            } catch (error) {
                console.error('Erro ao extrair número do arquivo', arquivo, error);
                return null;
            }
        }));

        return resultados.filter(result => result !== null);
    } catch (error) {
        console.log('Erro ao ler o diretório', error);
        throw error;
    }
}

// Diretório onde os arquivos XML estão localizados
const diretorioXML = 'C:/Users/dev/Desktop/xmls';

// Processar todos os arquivos XML no diretório
(async () => {
    try {
        const resultados = await processarDiretorioXML(diretorioXML);

        console.log('Resultados de todos os arquivos XML:');
        resultados.forEach(resultado => {
            console.log(`Arquivo: ${resultado.arquivo}, Número extraído: ${resultado.numeroExtraido}`);
        });

        const numerosExtraidos = resultados.map(r => r.numeroExtraido);
        const numerosNaoPresentes = await verificarNumerosNoBanco(numerosExtraidos);

        console.log('Números extraídos não encontrados no banco de dados:');
        numerosNaoPresentes.forEach(numero => {
            console.log(numero);
        });
    } catch (error) {
        console.error('Erro ao processar diretório XML:', error);
    }
})();

// Inicializador do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});