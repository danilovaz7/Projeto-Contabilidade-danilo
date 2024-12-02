import express from 'express';
import bcrypt from 'bcrypt';
import session from 'express-session';
import { sequilize } from './db/connection.js';
import exphbs from 'express-handlebars';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { Empresa } from './models/Empresas.js';
import { Registro } from './models/Registros.js';
import router from './routes/empresas.js';
import routerRegistro from './routes/registros.js';
import { Op, fn, col } from 'sequelize';
import handlebars from 'express-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = sequilize;
const app = express();
const PORT = 3000;

// Middleware de sessão
app.use(session({
    secret: 'seuSegredo',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.json());

// Configuração do bodyparser
app.use(bodyParser.urlencoded({ extended: false }));

// Configuração do handlebars
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    helpers: {
        abs: function (value) {
            return Math.abs(value); // Retorna o valor absoluto
        },
        eq: function (a, b) {
            return a === b; // Verifica se os valores são iguais
        },
        or: function (a, b) {
            return a || b; // Retorna verdadeiro se qualquer uma das condições for verdadeira
        },
        groupBy: function (array, property) {
            return array.reduce(function (result, currentValue) {
                // Pega o valor da propriedade para agrupar
                const key = currentValue[property];

                // Se o grupo ainda não existir, cria ele
                if (!result[key]) {
                    result[key] = [];
                }
                result[key].push(currentValue);

                return result;
            }, {});
        }
    }
}));


app.set('view engine', 'handlebars');

// Pasta estática
app.use(express.static(path.join(__dirname, 'public')));

app.use('/empresas', router);
app.use('/registros', routerRegistro);

handlebars.create({
    helpers: {
        groupBy: function (array, property) {
            return array.reduce((result, currentValue) => {
                // Pega o valor da propriedade para agrupar
                const key = currentValue[property];
                
                if (!result[key]) {
                    result[key] = [];
                }
                result[key].push(currentValue);
                
                return result;
            }, {});
        }
    }
});

// Conexão com o banco de dados
db.authenticate().then(() => {
    console.log('Êxito na conexão com o banco de dados');
}).catch(err => {
    console.log("Ocorreu um erro na conexão", err);
});

// Rota principal
app.get('/', (req, res) => {
    res.render('index');
});

// Rota de cadastro
app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

// Rota da home do usuário
app.get('/home', (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    res.render('home', {
        empresa: req.session.empresa
    });
});

// Rota do diário do usuário
app.get('/diario', (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    Registro.findAll({
        where: {
            id_empresa: req.session.empresa.id
        },
        order: [
            ['createdAt', 'DESC']
        ]
    })
        .then(registrosEmpresa => {
            const registrosFormatados = registrosEmpresa.map(registro => {
                const data = new Date(registro.createdAt);
                const ano = data.getFullYear();
                const mes = String(data.getMonth() + 1).padStart(2, '0');
                const dia = String(data.getDate()).padStart(2, '0');

                return {
                    ...registro,
                    createdAt: `${ano}-${mes}-${dia}`
                };
            });

            res.render('diario', {
                registrosEmpresa: registrosFormatados
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send('Erro ao buscar registros.');
        });
});
/*
app.get('/balancete', async (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    try {
        const registrosEmpresa = await Registro.findAll({
            where: {
                id_empresa: req.session.empresa.id
            },
            attributes: [
                'conta',
                [fn('SUM', col('debito')), 'total_debito'],
                [fn('SUM', col('credito')), 'total_credito']
            ],
            group: ['conta'],
            order: [['createdAt', 'DESC']]
        });

        const registrosComTotal = registrosEmpresa.map(registro => {
            const total_debito = parseFloat(registro.get('total_debito')) || 0;
            const total_credito = parseFloat(registro.get('total_credito')) || 0;
            const total = total_debito - total_credito;

            return {
                conta: registro.get('conta'),
                total_debito,
                total_credito,
                total,
                isPositive: total > 0,
                isNegative: total < 0,
                isZero: total == 0,
                isPL: registro.get('conta') === 'Capital Social'
            };
        });

        res.render('balancete', {
            registrosComTotal,
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar registros.');
    }
});
*/
// Rota do lançamento de registros
app.get('/lancamento', (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }
    res.render('lancamento', {
        empresa: req.session.empresa
    });
});

// Rota do razão de registros
app.get('/razao', async (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    try {
        // Consulta ao banco de dados
        const registrosEmpresa = await Registro.findAll({
            where: {
                id_empresa: req.session.empresa.id,
            },
            attributes: [
                'conta',
                'mes_registro',
                [fn('SUM', col('debito')), 'total_debito'],
                [fn('SUM', col('credito')), 'total_credito'],
            ],
            group: ['conta', 'mes_registro'],
            order: [
                ['mes_registro', 'ASC'],
                ['conta', 'ASC'],
            ],
        });

        // Converte os registros para JSON
        const registrosEmpresaJSON = registrosEmpresa.map((registro) => registro.toJSON());

        // Agrupa os registros por mês
        const registrosAgrupados = registrosEmpresaJSON.reduce((acc, registro) => {
            const mes = registro.mes_registro; // Obtém o mês do registro
            if (!acc[mes]) {
                acc[mes] = [];
            }
            acc[mes].push(registro);
            return acc;
        }, {});

        console.log(registrosEmpresa)
        // Passa os dados para o template Handlebars
        res.render('razao', {
            registrosEmpresa: registrosAgrupados,
        });
    } catch (err) {
        console.error('Erro ao buscar registros:', err);
        res.status(500).send('Erro ao buscar registros.');
    }
});



app.get('/balancete', async (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    try {
        const registrosEmpresa = await Registro.findAll({
            where: {
                id_empresa: req.session.empresa.id
            },
            attributes: [
                'conta',
                [fn('SUM', col('debito')), 'total_debito'],
                [fn('SUM', col('credito')), 'total_credito'],
                'mes_registro'  // Agrupar apenas pelo mês
            ],
            group: ['conta', 'mes_registro'], // Agrupando apenas por conta e mês
            order: [['mes_registro', 'DESC'], ['createdAt', 'DESC']]  // Ordenar por mês
        });

        const registrosComTotal = registrosEmpresa.map(registro => {
            const total_debito = parseFloat(registro.get('total_debito')) || 0;
            const total_credito = parseFloat(registro.get('total_credito')) || 0;
            const total = total_debito - total_credito;

            return {
                conta: registro.get('conta'),
                total_debito,
                total_credito,
                total,
                mes_registro: registro.get('mes_registro'),  // Mês do registro
                isPositive: total > 0,
                isNegative: total < 0,
                isPL: registro.get('conta') === 'Capital Social' 
            };
        });

        // Agrupar os registros por mês
        const registrosPorMes = registrosComTotal.reduce((acc, registro) => {
            const chave = registro.mes_registro;  // Agrupando apenas pelo mês
            if (!acc[chave]) {
                acc[chave] = [];
            }
            acc[chave].push(registro);
            return acc;
        }, {});

        // Calculando totais por mês
        const totaisPorMes = Object.keys(registrosPorMes).map(chave => {
            const registros = registrosPorMes[chave];
            const totalAtivos = registros.filter(r => r.isPositive && r.conta !== 'Capital Social')
                .reduce((sum, r) => sum + r.total, 0);
            const totalPassivos = registros.filter(r => r.isNegative)
                .reduce((sum, r) => sum + r.total, 0);
            const totalPatrimonioLiquido = registros.filter(r => r.isPL)
                .reduce((sum, r) => sum + r.total, 0);

                const totalDebitos = registros.reduce((sum, r) => sum + r.total_debito, 0);
                const totalCreditos = registros.reduce((sum, r) => sum + r.total_credito, 0);
            

            return {
                mes: chave,
                totalAtivos,
                totalPassivos,
                totalPatrimonioLiquido,
                registros,
                totalDebitos,
                totalCreditos

            };
        });

        res.render('balancete', {
            totaisPorMes
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar registros.');
    }
});

app.get('/balanco', async (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    try {
        const registrosEmpresa = await Registro.findAll({
            where: {
                id_empresa: req.session.empresa.id
            },
            attributes: [
                'conta',
                [fn('SUM', col('debito')), 'total_debito'],
                [fn('SUM', col('credito')), 'total_credito']
            ],
            group: ['conta'],
            order: [['createdAt', 'DESC']]
        });

        const registrosComTotal = registrosEmpresa.map(registro => {
            const total_debito = parseFloat(registro.get('total_debito')) || 0;
            const total_credito = parseFloat(registro.get('total_credito')) || 0;
            const total = total_debito - total_credito;

            return {
                conta: registro.get('conta'),
                total_debito,
                total_credito,
                total,
                isPositive: total > 0,
                isNegative: total < 0,
                isPL: registro.get('conta') === 'Capital Social' || registro.get('conta') === 'Lucros acumulados'
            };
            
        });

        const totalAtivos = registrosComTotal
            .filter(registro => registro.isPositive && (registro.conta !== 'Capital Social' && registro.conta !== 'Lucros acumulados'))
             .reduce((sum, registro) => sum + registro.total, 0);

        const totalPassivos = registrosComTotal
            .filter(registro => registro.isNegative)
            .reduce((sum, registro) => sum + registro.total, 0);

        const totalPatrimonioLiquido = registrosComTotal
            .filter(registro => registro.isPL)
            .reduce((sum, registro) => sum + registro.total, 0);

        res.render('balanco', {
            registrosComTotal,
            totalAtivos,
            totalPassivos,
            totalPatrimonioLiquido
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar registros.');
    }
});


// Rota para perfil
app.get('/perfil', (req, res) => {
    if (!req.session.empresa) {
        return res.redirect('/login');
    }

    res.render('perfil', {
        empresa: req.session.empresa
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

// Rota para autenticar login
app.get('/login/auth', async (req, res) => {
    const { email, password } = req.query;

    try {
        const empresa = await Empresa.findOne({ where: { email } });

        if (!empresa) {
            console.log("Usuário não encontrado");
            return res.status(401).send("Usuário não encontrado");
        }

        const isMatch = await bcrypt.compare(password, empresa.password);

        if (!isMatch) {
            console.log("Senha incorreta");
            return res.status(401).send("Senha incorreta");
        }

        req.session.empresa = {
            id: empresa.id,
            name: empresa.name,
            email: empresa.email,
            cnpj: empresa.cnpj,
            createdAt: empresa.createdAt
        };

        return res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao fazer login");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
