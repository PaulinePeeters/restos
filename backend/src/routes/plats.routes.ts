import express from 'express';
import * as platController from '../controllers/plats.controller.js';

import { authMiddleware, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.middleware.js';
import validate from '../middlewares/validate.js';
import { createPlatSchema, updatePlatSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', platController.getPlats);
router.post('/', authMiddleware, authorize(['manager']), upload.single('image'), validate(createPlatSchema), platController.createPlat);
router.put('/:id', authMiddleware, authorize(['manager']), upload.single('image'), validate(updatePlatSchema), platController.updatePlat);
router.delete('/:id', authMiddleware, authorize(['manager']), platController.deletePlat);

export default router;
