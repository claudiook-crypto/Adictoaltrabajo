import { Router } from 'express';
import { matchCandidatos, matchOfertas } from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/candidatos', authenticate, matchCandidatos);
router.post('/ofertas', authenticate, matchOfertas);

export default router;

