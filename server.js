const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// === EL PORTERO DE SEGURIDAD (CORS) ===
// Aquí le decimos que SOLO acepte peticiones de tu página en Render
app.use(cors({
  origin: 'https://thebarbershop-l7sz.onrender.com', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Tu enlace de conexión
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://thebarbershop:Cristian123@cluster0.tparnms.mongodb.net/barberia?retryWrites=true&w=majority";

// Conexión a Base de Datos
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Modelo de la Base de Datos
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

// === RUTAS DE TU API ===

// Leer todos los turnos
app.get('/api/turnos', async (req, res) => {
  try { 
    res.json(await Turno.find().sort({ sort_date: 1, times: 1 })); 
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Guardar un turno nuevo
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
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Editar un turno
app.put('/api/turnos/:id', async (req, res) => {
  try {
    await Turno.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// Borrar un turno
app.delete('/api/turnos/:id', async (req, res) => {
  try {
    await Turno.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Encender el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));