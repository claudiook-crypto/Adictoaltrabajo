import { Router } from 'express';
import { searchCandidates, getCandidatesForOffer, postularAOferta, getPerfilOferente } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/search', authenticate, searchCandidates);
router.get('/for-offer/:offerId', authenticate, getCandidatesForOffer);
router.post('/postular', authenticate, postularAOferta);
router.get('/oferente/:id', authenticate, getPerfilOferente);

export default router;