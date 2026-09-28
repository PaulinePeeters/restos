import express from 'express';
import * as translationController from '../controllers/translation.controller.js';
import validate from '../middlewares/validate.js';
import { translateSchema } from '../utils/schemas.js';

const router = express.Router();

router.post('/', validate(translateSchema), translationController.translate);

export default router;
