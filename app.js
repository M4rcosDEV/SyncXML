const express = require('express');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const {getPool} = require('./config/conexao');

const app = express();
const port = 3000;

// Datas para a consulta
let data_inicial
let data_final

const setDate = (config) => {
    const {dataini, datafim} = config;

    if (!dataini || !datafim) {
        throw new Error('Data não encontrada');
    }
    
    data_inicial = dataini
    data_final = datafim

    console.log('Datas recebidas com sucesso:', {
        data_inicial,
        data_final,
    });

    return { data_inicial, data_final };
};

function formatDate(inputDate) {
    const dateWithoutTimezone = inputDate.replace(/([+-]\d{2}:\d{2})$/, '');

    const formattedDate = dateWithoutTimezone.replace('T', ' ');

    return formattedDate;
}


// Função para obter todos os números do banco de dados dentro de um intervalo de datas
async function obterNumerosDoBanco(config) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        const { data_inicial, data_final } = setDate(config);

        const query = `
            SELECT numnota 
            FROM tab_vend 
            WHERE stavend != 'C' AND datvend BETWEEN $1 AND $2 
            ORDER BY datvend
        `;
        const res = await pool.query(query, [data_inicial, data_final]);
        return res.rows.map(row => row.numnota);
    } catch (err) {
        console.error('Erro ao consultar o banco de dados:', err.message);
        throw err;
    }finally {
        client.release();
    }
}

async function obterValorNotas(config) {
    const pool = getPool(); 
    try {
        const { data_inicial, data_final } = setDate(config);

        const query = `
            SELECT SUM(vlrnota) as vlrnota
            FROM tab_vend 
            WHERE stavend != 'C' AND datvend BETWEEN $1 AND $2
        `;
        const res = await pool.query(query, [data_inicial, data_final]);

        // Acessar o valor correto do resultado
        return res.rows[0].vlrnota;
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
        let dhEmiXML;
        let dhEmi

        if (resultado.nfeProc && resultado.nfeProc.NFe && resultado.nfeProc.NFe[0].infNFe && resultado.nfeProc.NFe[0].infNFe[0].ide && resultado.nfeProc.NFe[0].infNFe[0].ide[0].nNF) {
          
            numnota = resultado.nfeProc.NFe[0].infNFe[0].ide[0].nNF[0].replace('Numero:', '').trim();
            dhEmiXML = resultado.nfeProc.NFe[0].infNFe[0].ide[0].dhEmi[0].replace('Data:', '').trim();
            dhEmi = formatDate(dhEmiXML);

        } else if (resultado.NFe && resultado.NFe.infNFe && resultado.NFe.infNFe[0].ide && resultado.NFe.infNFe[0].ide[0].nNF) {
            // Estrutura alternativa
            numnota = -1
        } else {
            throw new Error('Estrutura do XML não reconhecida');
        }

        if(dhEmi == undefined){
            dhEmi = 'XML sem protocolo'
        }
        
        return {numnota, dhEmi};
    } catch (error) {
        console.log('Erro ao ler ou analisar o arquivo XML para buscar o numero da nota:', error);
        throw error;
    }
}

// Função para extrair o valor do XML
async function extrairValorXML(filePath) {
    const parser = new xml2js.Parser();
    try {
        const data = await fs.promises.readFile(filePath);
        const resultado = await parser.parseStringPromise(data);

        let valorNotaXML;

        if (resultado.nfeProc && resultado.nfeProc.NFe && resultado.nfeProc.NFe[0].infNFe && resultado.nfeProc.NFe[0].infNFe[0].ide && resultado.nfeProc.NFe[0].infNFe[0].ide[0].nNF) {
            // Estrutura padrão
            valorNotaXML = resultado.nfeProc.NFe[0].infNFe[0].total[0].ICMSTot[0].vNF[0].replace('Valor:', '').trim();
        } else if (resultado.NFe && resultado.NFe.infNFe && resultado.NFe.infNFe[0].ide && resultado.NFe.infNFe[0].ide[0].nNF) {
            // Estrutura alternativa
            valorNotaXML = resultado.NFe.infNFe[0].total[0].ICMSTot[0].vNF[0].replace('Valor:', '').trim();
        } else {
            throw new Error('Estrutura do XML não reconhecida');
        }

        return valorNotaXML;
    } catch (error) {
        console.log('Erro ao ler ou analisar o arquivo XML para buscar o valor:', error);
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
                const { numnota, dhEmi } = await extrairNumeroXML(filePath);
                const numeroExtraido = numnota;
                const dataExtraida = dhEmi;
                const valorExtraido = await extrairValorXML(filePath);
                console.log('Numero nota:',numeroExtraido,'Data:', dataExtraida)    
                
                return { arquivo, numeroExtraido,dataExtraida, valorExtraido};
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

// Função para verificar se há números no banco que não estão presentes nos XMLs
async function verificarNumerosNaoPresentesEmXML(numerosDoBanco, numerosExtraidos) {
    const numerosNaoPresentes = numerosDoBanco.filter(n => !numerosExtraidos.includes(n));
    return numerosNaoPresentes;
}


// Inicializador do servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

module.exports = {
    processarDiretorioXML,
    obterNumerosDoBanco,
    verificarNumerosNaoPresentesEmXML,
    extrairNumeroXML,
    extrairValorXML,
    setDate,
    obterValorNotas
};