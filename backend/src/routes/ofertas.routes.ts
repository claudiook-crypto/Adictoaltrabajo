import { Router } from 'express';
import {
    getOfertasPublicas,
    getMisOfertas,
    crearOferta,
    editarOferta,
    eliminarOferta,
    getPostulantesDeOferta,
    postularseAOferta,
    getMisPostulaciones,
    marcarPostulacionVisto,
    cancelarPostulacion,
    modificarCVPostulacion
} from '../controllers/ofertas.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas (postulantes necesitan auth para postularse)
router.get('/publicas',           authenticate, getOfertasPublicas);
router.get('/mis-postulaciones',  authenticate, getMisPostulaciones);

// Rutas del oferente
router.get('/mis-ofertas',    authenticate, requireRole('oferente'), getMisOfertas);
router.post('/',              authenticate, requireRole('oferente'), crearOferta);
router.put('/:id',            authenticate, requireRole('oferente'), editarOferta);
router.delete('/:id',         authenticate, requireRole('oferente'), eliminarOferta);
router.get('/:id/postulantes', authenticate, requireRole('oferente'), getPostulantesDeOferta);
router.patch('/postulaciones/visto', authenticate, requireRole('oferente'), marcarPostulacionVisto);

// Postulación (postulante)
router.post('/:id/postular', authenticate, requireRole('postulante'), postularseAOferta);
router.delete('/postulaciones/:postulacionId', authenticate, requireRole('postulante'), cancelarPostulacion);
router.put('/postulaciones/:id/cv', authenticate, requireRole('postulante'), modificarCVPostulacion);

export default router;
