import { Router } from 'express';
import { getMisNotificaciones, marcarLeida, marcarTodasLeidas, enviarSugerencia, responderSugerencia, getRespuestasSugerencias, getEstadoSugerencia, getSugerenciasEnviadas } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/mis', authenticate, getMisNotificaciones);
router.patch('/:id/read', authenticate, marcarLeida);
router.patch('/read-all', authenticate, marcarTodasLeidas);
router.post('/sugerencia', authenticate, enviarSugerencia);
router.post('/sugerencia/responder', authenticate, responderSugerencia);
router.get('/sugerencias/oferente', authenticate, getRespuestasSugerencias);
router.get('/sugerencia/:oferenteId/estado', authenticate, getEstadoSugerencia);
router.get('/sugerencias/enviadas', authenticate, getSugerenciasEnviadas);

export default router;