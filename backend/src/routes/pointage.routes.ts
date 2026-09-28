import express from 'express';
import * as pointageController from '../controllers/pointage.controller.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createPointageSchema, updatePointageSchema, validatePointageSchema } from '../utils/schemas.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize(['manager', 'super_admin', 'serveur', 'cuisinier', 'barman', 'livreur']), pointageController.listPointages);
router.post('/', authorize(['manager', 'super_admin', 'serveur', 'cuisinier', 'barman', 'livreur']), validate(createPointageSchema), pointageController.createPointage);
router.patch('/:id', authorize(['manager', 'super_admin', 'serveur', 'cuisinier', 'barman', 'livreur']), validate(updatePointageSchema), pointageController.updatePointage);
router.post('/:id/validate', authorize(['manager', 'super_admin']), validate(validatePointageSchema), pointageController.validatePointage);

export default router;
