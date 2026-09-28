import express from 'express';
import { createAvis, getStatsAvis } from '../controllers/avis.controller.js';

import validate from '../middlewares/validate.js';
import { createAvisSchema } from '../utils/schemas.js';

const router = express.Router();

router.post('/', validate(createAvisSchema), createAvis);
router.get('/stats', getStatsAvis);

export default router;
