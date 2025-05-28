// const mysql = require("mysql2");

// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT || 3306,
// });

// module.exports = db;

const mysql = require("mysql2");

let connection;

function connectWithRetry() {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error al conectar a MySQL:", err.message);
      console.log("Reintentando conexión en 5 segundos...");
      setTimeout(connectWithRetry, 5000); // Espera 5s y reintenta
    } else {
      console.log("✅ Conectado a la base de datos MySQL");
    }
  });
}

connectWithRetry();

module.exports = connection;
