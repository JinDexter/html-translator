import { Router } from 'express';
import multer from 'multer';
import { TranslationController } from '../controllers/translationController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/translate
router.post('/translate', upload.single('htmlFile'), TranslationController.translateHtmlFile);

export default router;
