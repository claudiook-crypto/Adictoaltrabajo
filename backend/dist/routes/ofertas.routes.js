"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ofertas_controller_1 = require("../controllers/ofertas.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Rutas públicas (postulantes necesitan auth para postularse)
router.get('/publicas', auth_middleware_1.authenticate, ofertas_controller_1.getOfertasPublicas);
router.get('/mis-postulaciones', auth_middleware_1.authenticate, ofertas_controller_1.getMisPostulaciones);
// Rutas del oferente
router.get('/mis-ofertas', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.getMisOfertas);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.crearOferta);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.editarOferta);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.eliminarOferta);
router.get('/:id/postulantes', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.getPostulantesDeOferta);
router.patch('/postulaciones/visto', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('oferente'), ofertas_controller_1.marcarPostulacionVisto);
// Postulación (postulante)
router.post('/:id/postular', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('postulante'), ofertas_controller_1.postularseAOferta);
exports.default = router;
