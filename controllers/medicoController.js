const db = require("../config/db");

// HU08 - Definir Disponibilidad de Horario
exports.getHorarios = (req, res) => {
  const { id_medico } = req.query;
  db.query(
    "SELECT * FROM horario_medico WHERE id_medico = ? ORDER BY FIELD(dia_semana, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'), hora_inicio",
    [id_medico],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al obtener horarios" });
      res.json(rows);
    }
  );
};

exports.agregarHorario = (req, res) => {
  const { id_medico, dia_semana, hora_inicio, hora_fin } = req.body;
  if (!id_medico || !dia_semana || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }
  db.query(
    "INSERT INTO horario_medico (id_medico, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)",
    [id_medico, dia_semana, hora_inicio, hora_fin],
    (err) => {
      if (err) {
        // Devuelve el error real para depuración
        return res.status(500).json({ error: "Error al agregar horario", detalle: err.sqlMessage || err.message });
      }
      res.json({ mensaje: "Horario agregado correctamente" });
    }
  );
};

exports.eliminarHorario = (req, res) => {
  const { id_horario_medico } = req.params;
  db.query(
    "DELETE FROM horario_medico WHERE id_horario_medico = ?",
    [id_horario_medico],
    (err) => {
      if (err) return res.status(500).json({ error: "Error al eliminar horario" });
      res.json({ mensaje: "Horario eliminado correctamente" });
    }
  );
};

// HU09 - Ver Citas Asignadas como Médico
exports.getCitasMedico = (req, res) => {
  const { id_medico, estado, q, fecha } = req.query;
  let sql = `
    SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado, c.motivo,
           p.id_paciente, u.nombres as paciente_nombre, u.apellidos as paciente_apellido
    FROM cita c
    JOIN paciente p ON c.id_paciente = p.id_paciente
    JOIN usuario u ON p.id_usuario = u.id_usuario
    WHERE c.id_medico = ?
  `;
  const params = [id_medico];
  if (estado) {
    sql += " AND c.estado = ?";
    params.push(estado);
  }
  if (q) {
    sql += " AND (u.nombres LIKE ? OR u.apellidos LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (fecha) {
    sql += " AND c.fecha_cita = ?";
    params.push(fecha);
  }
  sql += " ORDER BY c.fecha_cita ASC, c.hora_cita ASC";
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas" });
    res.json(rows);
  });
};

// HU10 - Cancelar Cita como Médico
exports.cancelarCitaMedico = (req, res) => {
  const { idCita } = req.params;
  const { id_medico } = req.body;
  db.query(
    "SELECT * FROM cita WHERE id_cita = ? AND id_medico = ?",
    [idCita, id_medico],
    (err, citas) => {
      if (err) return res.status(500).json({ error: "Error al cancelar cita" });
      if (citas.length === 0) return res.status(403).json({ error: "No autorizado o cita no encontrada" });
      const cita = citas[0];
      if (cita.estado === 1 || cita.estado === 2 || cita.estado === 3) {
        return res.status(400).json({ error: "La cita ya fue finalizada o cancelada" });
      }
      db.query(
        "UPDATE cita SET estado = 3 WHERE id_cita = ?",
        [idCita],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Error al cancelar cita" });
          res.json({ mensaje: "Cita cancelada exitosamente" });
        }
      );
    }
  );
};

// HU09/HU16 - Detalle de cita e informe
exports.getDetalleCita = (req, res) => {
  const { id_cita } = req.params;
  db.query(
    `SELECT c.*, u.nombres as paciente_nombre, u.apellidos as paciente_apellido, 
            e.nombre as especialidad, inf.descripcion as informe, inf.fecha_registro
     FROM cita c
     JOIN paciente p ON c.id_paciente = p.id_paciente
     JOIN usuario u ON p.id_usuario = u.id_usuario
     JOIN medico m ON c.id_medico = m.id_medico
     JOIN especialidad e ON m.id_especialidad = e.id_especialidad
     LEFT JOIN informe_consulta inf ON c.id_cita = inf.id_cita
     WHERE c.id_cita = ?`,
    [id_cita],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al obtener detalle" });
      if (rows.length === 0) return res.status(404).json({ error: "Cita no encontrada" });
      res.json(rows[0]);
    }
  );
};

// HU09 - Agregar informe a cita finalizada
exports.agregarInforme = (req, res) => {
  const { id_cita } = req.params;
  const { descripcion } = req.body;
  // Inserta informe y actualiza estado
  db.query(
    "INSERT INTO informe_consulta (id_cita, descripcion, fecha_registro) VALUES (?, ?, NOW())",
    [id_cita, descripcion],
    (err) => {
      if (err) return res.status(500).json({ error: "Error al guardar informe" });
      db.query(
        "UPDATE cita SET estado = 1 WHERE id_cita = ?",
        [id_cita],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Error al actualizar estado" });
          res.json({ mensaje: "Informe agregado y cita finalizada" });
        }
      );
    }
  );
};

// HU16 - Expediente de paciente (para médico)
exports.getExpedientePaciente = (req, res) => {
  const { id_paciente } = req.query;
  db.query(
    `SELECT c.id_cita, c.fecha_cita, c.hora_cita, c.estado, inf.descripcion as informe, inf.fecha_registro
     FROM cita c
     LEFT JOIN informe_consulta inf ON c.id_cita = inf.id_cita
     WHERE c.id_paciente = ?
     ORDER BY c.fecha_cita DESC, c.hora_cita DESC`,
    [id_paciente],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al obtener expediente" });
      res.json(rows);
    }
  );
};

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