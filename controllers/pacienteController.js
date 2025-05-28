const db = require("../config/db"); // Ajusta según tu configuración de conexión

// HU04 - Agendar Cita

// Listar especialidades
exports.getEspecialidades = (req, res) => {
  db.query("SELECT * FROM especialidad", (error, rows) => {
    if (error) {
      return res.status(500).json({ error: "Error al obtener especialidades" });
    }
    res.json(rows);
  });
};

// Listar médicos por especialidad
exports.getMedicosPorEspecialidad = (req, res) => {
  const { idEspecialidad } = req.params;
  db.query(
    `SELECT m.id_medico, u.nombres, u.apellidos, m.licencia_medica 
     FROM medico m 
     JOIN usuario u ON m.id_usuario = u.id_usuario 
     WHERE m.id_especialidad = ? AND m.activo = 1`,
    [idEspecialidad],
    (error, rows) => {
      if (error) {
        return res.status(500).json({ error: "Error al obtener médicos" });
      }
      res.json(rows);
    }
  );
};

// Fechas y horas disponibles de un médico
exports.getDisponibilidadMedico = (req, res) => {
  const { idMedico } = req.params;
  db.query(
    "SELECT * FROM horario_medico WHERE id_medico = ?",
    [idMedico],
    (error, horarios) => {
      if (error) {
        return res.status(500).json({ error: "Error al obtener disponibilidad" });
      }
      db.query(
        "SELECT fecha_cita, hora_cita FROM cita WHERE id_medico = ? AND estado IN (0,1)",
        [idMedico],
        (error2, citas) => {
          if (error2) {
            return res.status(500).json({ error: "Error al obtener disponibilidad" });
          }
          res.json({ horarios, citas });
        }
      );
    }
  );
};

// 0=pendiente, 1=finalizada, 2=cancelada por paciente, 3=cancelada por médico
// Crear cita validando reglas
exports.agendarCita = (req, res) => {
  const { id_paciente, id_medico, fecha_cita, hora_cita, motivo } = req.body;
  const hora = parseInt(hora_cita.split(":")[0]);
  if (hora < 6 || hora > 17) {
    return res.status(400).json({ error: "Horario fuera de rango permitido" });
  }
  db.query(
    "SELECT * FROM cita WHERE id_paciente = ? AND fecha_cita = ? AND hora_cita = ? AND estado IN (0,1)",
    [id_paciente, fecha_cita, hora_cita],
    (error, citaPaciente) => {
      if (error) {
        return res.status(500).json({ error: "Error al validar cita" });
      }
      if (citaPaciente.length > 0) {
        return res.status(400).json({ error: "Ya tienes una cita agendada en ese horario" });
      }
      db.query(
        "SELECT * FROM cita WHERE id_medico = ? AND fecha_cita = ? AND hora_cita = ? AND estado IN (0,1)",
        [id_medico, fecha_cita, hora_cita],
        (error2, citaMedico) => {
          if (error2) {
            return res.status(500).json({ error: "Error al validar cita" });
          }
          if (citaMedico.length > 0) {
            return res.status(400).json({ error: "El médico ya tiene una cita en ese horario" });
          }
          db.query(
            "INSERT INTO cita (id_paciente, id_medico, fecha_cita, hora_cita, motivo, estado) VALUES (?, ?, ?, ?, ?, 0)",
            [id_paciente, id_medico, fecha_cita, hora_cita, motivo],
            (error3) => {
              if (error3) {
                return res.status(500).json({ error: "Error al agendar cita" });
              }
              res.json({ mensaje: "Cita agendada exitosamente" });
            }
          );
        }
      );
    }
  );
};

// HU05 - Consultar Mis Citas
exports.getCitasPaciente = (req, res) => {
  const { id_paciente, estado, tipo } = req.query; // tipo: 'futuras' o 'pasadas'
  let query = `
    SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado, c.motivo,
           u.nombres as medico_nombre, u.apellidos as medico_apellido, e.nombre as especialidad
    FROM cita c
    JOIN medico m ON c.id_medico = m.id_medico
    JOIN usuario u ON m.id_usuario = u.id_usuario
    JOIN especialidad e ON m.id_especialidad = e.id_especialidad
    WHERE c.id_paciente = ?
  `;
  const params = [id_paciente];

  if (estado) {
    query += " AND c.estado = ?";
    params.push(estado);
  }
  if (tipo === "futuras") {
    query += " AND c.fecha_cita >= CURDATE()";
  } else if (tipo === "pasadas") {
    query += " AND c.fecha_cita < CURDATE()";
  }
  query += " ORDER BY c.fecha_cita ASC, c.hora_cita ASC";

  db.query(query, params, (error, rows) => {
    if (error) {
      return res.status(500).json({ error: "Error al obtener citas" });
    }
    res.json(rows);
  });
};

// HU06 - Cancelar Cita
exports.cancelarCita = (req, res) => {
  const { idCita } = req.params;
  const { id_paciente } = req.body; // Debe venir del token/session en producción
  db.query(
    "SELECT * FROM cita WHERE id_cita = ? AND id_paciente = ?",
    [idCita, id_paciente],
    (error, citas) => {
      if (error) {
        return res.status(500).json({ error: "Error al cancelar cita" });
      }
      if (citas.length === 0) {
        return res.status(403).json({ error: "No autorizado o cita no encontrada" });
      }
      const cita = citas[0];
      if (cita.estado === 2 || cita.estado === 3) {
        return res.status(400).json({ error: "La cita ya fue cancelada o finalizada" });
      }
      const now = new Date();
      const citaDate = new Date(`${cita.fecha_cita}T${cita.hora_cita}`);
      if ((citaDate - now) / (1000 * 60 * 60) < 1) {
        return res.status(400).json({ error: "Solo puedes cancelar con al menos 1 hora de anticipación" });
      }
      db.query("UPDATE cita SET estado = 2 WHERE id_cita = ?", [idCita], (error2) => {
        if (error2) {
          return res.status(500).json({ error: "Error al cancelar cita" });
        }
        res.json({ mensaje: "Cita cancelada exitosamente" });
      });
    }
  );
};

// HU16 - Expediente (para paciente y médico)
// Para paciente: solo su propio historial
exports.getExpedientePaciente = (req, res) => {
  const { id_paciente } = req.query;
  db.query(
    `SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado, c.motivo,
            u.nombres as medico_nombre, u.apellidos as medico_apellido, e.nombre as especialidad,
            inf.id_informe_consulta, inf.descripcion as informe, inf.fecha_registro
     FROM cita c
     JOIN medico m ON c.id_medico = m.id_medico
     JOIN usuario u ON m.id_usuario = u.id_usuario
     JOIN especialidad e ON m.id_especialidad = e.id_especialidad
     LEFT JOIN informe_consulta inf ON c.id_cita = inf.id_cita
     WHERE c.id_paciente = ? AND c.estado = 1
     ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
    [id_paciente],
    (error, rows) => {
      if (error) {
        return res.status(500).json({ error: "Error al obtener expediente" });
      }
      res.json(rows);
    }
  );
};

// Para médico: historial de cualquier paciente por id_paciente
exports.getExpedientePorPaciente = (req, res) => {
  const { id_paciente } = req.params;
  db.query(
    `SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado, c.motivo,
            u.nombres as medico_nombre, u.apellidos as medico_apellido, e.nombre as especialidad,
            inf.id_informe_consulta, inf.descripcion as informe, inf.fecha_registro
     FROM cita c
     JOIN medico m ON c.id_medico = m.id_medico
     JOIN usuario u ON m.id_usuario = u.id_usuario
     JOIN especialidad e ON m.id_especialidad = e.id_especialidad
     LEFT JOIN informe_consulta inf ON c.id_cita = inf.id_cita
     WHERE c.id_paciente = ? 
     ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
    [id_paciente],
    (error, rows) => {
      if (error) {
        return res.status(500).json({ error: "Error al obtener expediente" });
      }
      res.json(rows);
    }
  );
};

// Listar contactos de un paciente
exports.getContactosPaciente = (req, res) => {
  const { id_paciente } = req.query;
  db.query(
    "SELECT * FROM contacto WHERE id_paciente = ? ORDER BY id_contacto DESC",
    [id_paciente],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al obtener contactos" });
      res.json(rows);
    }
  );
};

// Agregar contacto
exports.agregarContactoPaciente = (req, res) => {
  const { id_paciente, nombre, apellido, parentesco, telefono, direccion, correo } = req.body;
  db.query(
    "INSERT INTO contacto (id_paciente, nombre, apellido, parentesco, telefono, direccion, correo) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id_paciente, nombre, apellido, parentesco, telefono, direccion, correo],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error al agregar contacto" });
      res.json({ mensaje: "Contacto agregado correctamente" });
    }
  );
};

// Eliminar contacto
exports.eliminarContactoPaciente = (req, res) => {
  const { id_contacto } = req.params;
  db.query(
    "DELETE FROM contacto WHERE id_contacto = ?",
    [id_contacto],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error al eliminar contacto" });
      res.json({ mensaje: "Contacto eliminado correctamente" });
    }
  );
};