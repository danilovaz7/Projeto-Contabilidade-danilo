import { Sequelize } from "sequelize";
import { sequilize } from '../db/connection.js';

const db = sequilize;

export const Registro = db.define('registro', {
    conta: {
        type: Sequelize.STRING,
    },
    credito: {
        type: Sequelize.INTEGER,
    },
    debito: {
        type: Sequelize.INTEGER,
    },
    historico: {
        type: Sequelize.STRING,
    },
    id_empresa : {
        type: Sequelize.INTEGER,
    },
    mes_registro: {
        type: Sequelize.INTEGER
    }
})
