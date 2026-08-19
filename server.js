const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();

// 🔥 1. SOLUCIÓN PARA RENDER: Confiar en el proxy para que express-rate-limit no bloquee el servidor
app.set('trust proxy', 1);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- LIMITADOR DE INTENTOS PARA LOGIN (Seguridad Antifuerza Bruta) ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de inicio de sesión. Intente más tarde.' }
});

// --- CONEXIÓN A MONGODB ---
// Usando tu clave limpia Barberia2026 que creaste en Atlas
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://thebarbershop:Barberia2026@cluster0.tparnms.mongodb.net/barbershop_db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, 
    family: 4 // 🔥 2. SOLUCIÓN DEFINITIVA: Fuerza a Render a usar IPv4 para comunicarse con Atlas
})
.then(() => console.log('✅✅✅ ÉXITO: Conectado a MongoDB Atlas'))
.catch(err => {
    console.error('❌❌❌ ERROR FATAL DE CONEXIÓN A MONGO:', err.message);
    process.exit(1); 
});

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

// 🔥 3. MODELO DE SERVICIOS ACTUALIZADO (Con descripción y duración)
// 🔥 EL NUEVO MODELO DE SERVICIOS
const Service = mongoose.model('Service', new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: false }, // ESTO PERMITE GUARDAR LA DESCRIPCIÓN
    duration: { type: Number, default: 1 } // ESTO PERMITE GUARDAR LAS 2 HORAS
}));

// --- RUTAS DE API ---

// Login
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === 'admin' && password === 'barberia123') {
            return res.json({ role: 'admin' });
        }
        const barber = await Barber.findOne({ username });
        if (barber && barber.password) {
            const passwordMatch = await bcrypt.compare(password, barber.password);
            if (passwordMatch) {
                return res.json({ role: 'barber', barber });
            }
        }
        res.status(401).json({ error: 'Credenciales incorrectas' });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        if (datosBarber.password) {
            datosBarber.password = await bcrypt.hash(datosBarber.password, 10);
        }
        const nuevo = new Barber(datosBarber);
        await nuevo.save();
        res.json(nuevo);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/barbers/:id', async (req, res) => {
    try {
        const datosActualizar = req.body;
        if (datosActualizar.password) {
            datosActualizar.password = await bcrypt.hash(datosActualizar.password, 10);
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

// Servicios (CRUD)
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({});
        res.json(services);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services', async (req, res) => {
    try {
        const nuevo = new Service(req.body);
        await nuevo.save();
        res.json(nuevo);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
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
    } catch (err) { res.status(500).json({ error: err.message }); }
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