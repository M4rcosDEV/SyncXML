// Configuração da conexão com o PostgreSQL
const { Pool } = require('pg');

let pool; // Variável para armazenar a instância do Pool

const setConfig = (config) => {
    const {nomeBanco, senhaBanco} = config;

    

    if (!nomeBanco || !senhaBanco) {
        throw new Error('Configuração do banco de dados incompleta');
    }

    pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: nomeBanco,
        password: senhaBanco,
        port: 5432, // Porta padrão do PostgreSQL
    });

    console.log('Configuração do pool aplicada com sucesso:', {
        user: 'postgres',
        host: 'localhost',
        database: nomeBanco,
        port: 5432,
    });
};

const getPool = () => {
    if (!pool) {
        throw new Error('Pool não configurado');
    }
    console.log('Pool retornado com sucesso');
    return pool;
};

module.exports = {
    setConfig,
    getPool
};