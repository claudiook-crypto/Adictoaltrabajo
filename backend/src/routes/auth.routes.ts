import { Router } from 'express';
import { register, login, googleLogin, updateProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.put('/profile', authenticate, updateProfile);

export default router;