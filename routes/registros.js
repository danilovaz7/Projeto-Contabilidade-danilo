import express from 'express';
import { Registro } from '../models/Registros.js';


const routerRegistro = express.Router();


routerRegistro.post('/add', async (req, res) => {
    let {conta, debito, credito, id_empresa,historico,mes_registro} = req.body;
    
    console.log(conta, debito, credito, id_empresa,historico,mes_registro)

    await Registro.create({
        conta,
        debito,
        credito,
        id_empresa,
        historico,
        mes_registro
    });
    
});

export default routerRegistro;
