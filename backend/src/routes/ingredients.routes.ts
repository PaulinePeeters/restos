import express from 'express';
import * as ingredientController from '../controllers/ingredients.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createIngredientSchema, updateIngredientSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', authMiddleware, requireRole(['manager', 'cuisinier', 'serveur', 'barman']), ingredientController.listIngredients);
router.get('/:id', authMiddleware, requireRole(['manager', 'cuisinier']), ingredientController.getIngredient);
router.post('/', authMiddleware, requireRole(['manager', 'cuisinier']), validate(createIngredientSchema), ingredientController.createIngredient);
router.put('/:id', authMiddleware, requireRole(['manager', 'cuisinier']), validate(updateIngredientSchema), ingredientController.updateIngredient);
router.delete('/:id', authMiddleware, requireRole(['manager', 'cuisinier']), ingredientController.deleteIngredient);

export default router;
