import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    sugerirMensajeReclutamiento,
    enviarMensaje,
    obtenerChats,
    obtenerMensajes,
    bloquearUsuario
} from '../controllers/chats.controller';

const router = Router();

router.use(authenticate);

router.post('/sugerir', sugerirMensajeReclutamiento);
router.post('/mensaje', enviarMensaje);
router.get('/', obtenerChats);
router.get('/:chatId', obtenerMensajes);
router.post('/bloquear', bloquearUsuario);

export default router;
