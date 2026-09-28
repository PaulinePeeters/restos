import express from 'express';
import * as categoriesController from '../controllers/categories.controller.js';
import validate from '../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', categoriesController.listCategories);
router.post('/', validate(createCategorySchema), categoriesController.createCategory);
router.put('/:id', validate(updateCategorySchema), categoriesController.updateCategory);
router.delete('/:id', categoriesController.deleteCategory);

export default router;
