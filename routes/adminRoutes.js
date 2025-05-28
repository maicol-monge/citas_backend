const express = require("express");
const {
  getUsuarios,
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  getMedicos,
  crearMedico,
  editarMedico,
  eliminarMedico,
  getEspecialidades,
  crearEspecialidad,
  editarEspecialidad,
  eliminarEspecialidad,
  registrarMedico,
  cambiarEstadoMedico,
  getMedicoById,
  buscarPacientes,
  getContactosPacienteAdmin,
  agregarContactoPacienteAdmin,
  editarContactoPacienteAdmin,
  eliminarContactoPacienteAdmin,
  getPacientePorId,
  reporteCitasPorFecha,
  reporteCitasPorMedico,
  reporteCitasPorEspecialidad,
  historialCitasPaciente
} = require("../controllers/adminController");

const router = express.Router();

// Usuarios
router.get("/usuarios", getUsuarios);
router.post("/usuarios", crearUsuario);
router.put("/usuarios/:id_usuario", editarUsuario);
router.delete("/usuarios/:id_usuario", eliminarUsuario);

// Médicos
router.get("/medicos", getMedicos);
router.post("/medicos", crearMedico);
router.put("/medicos/:id_medico/estado", cambiarEstadoMedico);
router.get("/medicos/:id_medico", getMedicoById);
router.put("/medicos/:id_medico", editarMedico);
router.delete("/medicos/:id_medico", eliminarMedico);
router.post("/registrar-medico", registrarMedico);

// Especialidades
router.get("/especialidades", getEspecialidades);
router.post("/especialidades", crearEspecialidad);
router.put("/especialidades/:id_especialidad", editarEspecialidad);
router.delete("/especialidades/:id_especialidad", eliminarEspecialidad);

// Buscar pacientes
router.get("/buscar-pacientes", buscarPacientes);

// CRUD de contactos de paciente (admin)
router.get("/contactos-paciente", getContactosPacienteAdmin);
router.post("/contactos-paciente", agregarContactoPacienteAdmin);
router.put("/contactos-paciente/:id_contacto", editarContactoPacienteAdmin);
router.delete("/contactos-paciente/:id_contacto", eliminarContactoPacienteAdmin);

// Obtener paciente por ID
router.get("/paciente/:id_paciente", getPacientePorId);

// Reportes
router.get("/reporte-citas-fecha", reporteCitasPorFecha);
router.get("/reporte-citas-medico", reporteCitasPorMedico);
router.get("/reporte-citas-especialidad", reporteCitasPorEspecialidad);
router.get("/historial-citas-paciente", historialCitasPaciente);

module.exports = router;