import { Router } from 'express';
import multer from 'multer';
import { parseCV, uploadCV, uploadImage } from '../controllers/cv.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse', upload.single('cv'), parseCV);
router.post('/upload', upload.single('cv'), uploadCV);
router.post('/upload-image', upload.single('image'), uploadImage);

export default router;
