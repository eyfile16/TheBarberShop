const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- LIMITADOR DE INTENTOS PARA LOGIN (Seguridad Antifuerza Bruta) ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo 10 intentos fallidos por IP
    message: { error: 'Demasiados intentos de inicio de sesión. Intente más tarde.' }
});

// --- CONEXIÓN A MONGODB (Conexión Directa y Forzada) ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://thebarbershop:thebarbershop@cluster0-shard-00-00.tparnms.mongodb.net:27017,cluster0-shard-00-01.tparnms.mongodb.net:27017,cluster0-shard-00-02.tparnms.mongodb.net:27017/barbershop_db?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error fatal al conectar:', err));

// --- MODELOS ---
const Turno = mongoose.model('Turno', new mongoose.Schema({
    barber_name: String,
    service_name: String,
    price: Number,
    date_day: String,
    sort_date: Date,
    times: String,
    client_name: String,
    client_phone: String
}));

const Barber = mongoose.model('Barber', new mongoose.Schema({
    name: { type: String, required: true },
    whatsapp_number: { type: String, required: true },
    status: { type: String, default: 'Disponible' },
    username: { type: String, required: false },
    password: { type: String, required: false }
}));

// --- RUTAS DE API ---

// Login (Súper Admin y Barberos con Bcrypt)
app.post('/api/login', loginLimiter, async (req, res) => {
    console.log("👉 DATOS QUE LLEGARON DESDE LA PÁGINA:", req.body);

    const { username, password } = req.body;
    try {
        // Validación del Súper Admin (puedes moverlo a variables de entorno si gustas)
        if (username === 'admin' && password === 'barberia123') {
            return res.json({ role: 'admin' });
        }

        // Buscar barbero por su username
        const barber = await Barber.findOne({ username });
        if (barber && barber.password) {
            // Comparar la contraseña ingresada con el hash guardado en MongoDB
            const passwordMatch = await bcrypt.compare(password, barber.password);
            if (passwordMatch) {
                return res.json({ role: 'barber', barber });
            }
        }

        res.status(401).json({ error: 'Credenciales incorrectas' });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Barberos
app.get('/api/barbers', async (req, res) => {
    try {
        const barbers = await Barber.find({});
        res.json(barbers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/barbers', async (req, res) => {
    try {
        const datosBarber = req.body;
        // Encriptar la contraseña antes de guardarla si viene incluida
        if (datosBarber.password) {
            const saltRounds = 10;
            datosBarber.password = await bcrypt.hash(datosBarber.password, saltRounds);
        }

        const nuevo = new Barber(datosBarber);
        await nuevo.save();
        res.json(nuevo);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/barbers/:id', async (req, res) => {
    try {
        const datosActualizar = req.body;
        // Si actualizan la contraseña, la volvemos a encriptar
        if (datosActualizar.password) {
            const saltRounds = 10;
            datosActualizar.password = await bcrypt.hash(datosActualizar.password, saltRounds);
        }

        await Barber.findByIdAndUpdate(req.params.id, datosActualizar);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/barbers/:id', async (req, res) => {
    try {
        await Barber.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Turnos
app.get('/api/turnos', async (req, res) => {
    try {
        const turnos = await Turno.find({}).sort({ sort_date: 1 });
        res.json(turnos);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/turnos', async (req, res) => {
    try {
        const { barber, service, date, times, clientName, clientPhone } = req.body;
        
        const nuevo = new Turno({
            barber_name: barber.name,
            service_name: service.name,
            price: service.price,
            date_day: `${date.dayName} ${date.dayNumber} ${date.monthName}`,
            sort_date: new Date(date.fullDate),
            times: Array.isArray(times) ? times.join(',') : times,
            client_name: clientName,
            client_phone: clientPhone
        });
        
        await nuevo.save();
        res.json({ success: true });
    } catch (err) { 
        console.error("Error guardando turno:", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.put('/api/turnos/:id', async (req, res) => {
    try {
        await Turno.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/turnos/:id', async (req, res) => {
    try {
        await Turno.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SERVIR FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));