const db = require("../config/db");
const bcrypt = require("bcryptjs"); //Libreria para encriptar contraseñas

exports.registerUser = (req, res) => {
  const {
    nombres,
    apellidos,
    direccion,
    telefono,
    correo,
    contrasena,
    sexo,
    rol,
    fechaNacimiento, // <-- puedes agregar este campo si lo pides en el frontend
  } = req.body;

  if (
    !nombres ||
    !apellidos ||
    !direccion ||
    !telefono ||
    !correo ||
    !contrasena ||
    !sexo ||
    !rol
  ) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

  if (!passwordRegex.test(contrasena)) {
    return res.status(400).json({
      message:
        "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
    });
  }

  // Verificar si el correo ya existe
  const checkEmailSql = "SELECT * FROM usuario WHERE correo = ?";
  db.query(checkEmailSql, [correo], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error al verificar el correo" });
    }

    if (results.length > 0) {
      return res
        .status(400)
        .json({ message: "El correo ya está registrado. Usa otro email." });
    }

    // Encriptar y registrar
    bcrypt.hash(contrasena, 10, (err, hash) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error al encriptar la contraseña" });
      }

      const insertSql =
        "INSERT INTO usuario (nombres, apellidos, direccion, telefono, correo, contrasena, sexo, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      db.query(
        insertSql,
        [nombres, apellidos, direccion, telefono, correo, hash, sexo, rol],
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error al registrar el usuario" });
          }

          // Insertar en paciente
          const id_usuario = result.insertId;
          const insertPacienteSql =
            "INSERT INTO paciente (id_usuario, fechaNacimiento) VALUES (?, ?)";
          db.query(
            insertPacienteSql,
            [id_usuario, fechaNacimiento || null],
            (err2) => {
              if (err2) {
                return res
                  .status(500)
                  .json({ message: "Error al registrar el paciente" });
              }
              res.status(201).json({ message: "Paciente registrado correctamente" });
            }
          );
        }
      );
    });
  });
};

exports.loginUser = (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  // Verificar si el correo existe
  const checkEmailSql = "SELECT * FROM usuario WHERE correo = ?";
  db.query(checkEmailSql, [correo], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error al verificar el correo" });
    }

    if (results.length === 0) {
      return res
        .status(400)
        .json({ message: "Correo o contraseña incorrectos" });
    }

    // Comparar la contraseña
    const user = results[0];
    bcrypt.compare(contrasena, user.contrasena, (err, isMatch) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error al comparar la contraseña" });
      }

      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Correo o contraseña incorrectos" });
      }

      // Dependiendo del rol, obtener datos adicionales
      if (user.rol === "medico") {
        db.query(
          "SELECT * FROM medico WHERE id_usuario = ?",
          [user.id_usuario],
          (err2, medicoResults) => {
            if (err2) {
              return res.status(500).json({ message: "Error al obtener datos de médico" });
            }
            res.json({
              message: "Inicio de sesión exitoso",
              user,
              medico: medicoResults[0] || null,
            });
          }
        );
      } else if (user.rol === "paciente") {
        db.query(
          "SELECT * FROM paciente WHERE id_usuario = ?",
          [user.id_usuario],
          (err2, pacienteResults) => {
            if (err2) {
              return res.status(500).json({ message: "Error al obtener datos de paciente" });
            }
            res.json({
              message: "Inicio de sesión exitoso",
              user,
              paciente: pacienteResults[0] || null,
            });
          }
        );
      } else {
        // Otros roles
        res.json({ message: "Inicio de sesión exitoso", user });
      }
    });
  });
};

exports.cambiarContrasena = (req, res) => {
  const { id_usuario, contrasenaActual, nuevaContrasena } = req.body;

  if (!id_usuario || !contrasenaActual || !nuevaContrasena) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  if (!passwordRegex.test(nuevaContrasena)) {
    return res.status(400).json({
      message: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
    });
  }

  // Obtener la contraseña actual del usuario
  db.query("SELECT contrasena FROM usuario WHERE id_usuario = ?", [id_usuario], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error al verificar el usuario" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const hashActual = results[0].contrasena;
    // Comparar la contraseña actual
    bcrypt.compare(contrasenaActual, hashActual, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: "Error al comparar la contraseña" });
      }
      if (!isMatch) {
        return res.status(400).json({ message: "La contraseña actual es incorrecta" });
      }

      // Encriptar la nueva contraseña
      bcrypt.hash(nuevaContrasena, 10, (err, hashNueva) => {
        if (err) {
          return res.status(500).json({ message: "Error al encriptar la nueva contraseña" });
        }

        // Actualizar la contraseña en la base de datos
        db.query(
          "UPDATE usuario SET contrasena = ? WHERE id_usuario = ?",
          [hashNueva, id_usuario],
          (err2) => {
            if (err2) {
              return res.status(500).json({ message: "Error al actualizar la contraseña" });
            }
            res.json({ message: "Contraseña actualizada correctamente" });
          }
        );
      });
    });
  });
};
