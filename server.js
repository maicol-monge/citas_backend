require("dotenv").config(); //Cargar variables d entorno
const express = require("express"); //Crear servidor web
const cors = require("cors"); //Para permitir solicitudes desde otro dominio

const db = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const pacienteRoutes = require("./routes/pacienteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const medicoRoutes = require("./routes/medicoRoutes"); // <-- NUEVO

const app = express(); //Instancia del servidor
 //Evitar errores al consumir en React
app.use(cors({
  origin: 'https://citasfrontend-production.up.railway.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json()); //Recibir los datos en JSON

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err);
    process.exit(1); // Sale de la aplicación en caso de error
  }
  console.log("Conectado a la base de datos MySQL");
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});

// Rutas
app.use("/api/usuarios", userRoutes); //Ruta para el registro de usuarios
app.use("/api/pacientes", pacienteRoutes); //Ruta para el registro de usuarios
app.use("/api/admin", adminRoutes); //Ruta para administración
app.use("/api/medico", medicoRoutes); // <-- NUEVO




