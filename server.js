const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// === CONFIGURACIÓN CORS REQUERIDA ===
app.use(cors({
  origin: 'https://thebarbershop-l7sz.onrender.com', // Tu frontend autorizado
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
// ====================================

app.use(express.json());

// Reemplaza <db_password> con tu contraseña real (ej. Cristian123)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://thebarbershop:<db_password>@cluster0.tparnms.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error MongoDB:', err));

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

// API Routes
app.get('/api/turnos', async (req, res) => {
  try { res.json(await Turno.find().sort({ sort_date: 1, times: 1 })); } 
  catch (err) { res.status(500).json({ error: err.message }); }
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
      times: times.join(','),
      client_name: clientName,
      client_phone: clientPhone
    });
    await nuevo.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/turnos/:id', async (req, res) => {
  await Turno.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Servir Frontend (Carpeta dist)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));