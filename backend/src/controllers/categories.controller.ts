import { Request, Response } from 'express';
import * as categoryService from '../services/categories.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Récupère toutes les catégories.
 */
export const listCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await categoryService.getAllCategories();
    res.json(categories);
});

/**
 * Crée une nouvelle catégorie.
 */
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { nom_categorie, parent_id } = req.body;
    const newCategory = await categoryService.createCategory(nom_categorie, parent_id);
    res.status(201).json(newCategory);
});

/**
 * Met à jour une catégorie.
 */
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updated = await categoryService.updateCategory(id, req.body);
    res.json(updated);
});

/**
 * Supprime une catégorie.
 */
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await categoryService.deleteCategory(id);
    res.json({ message: 'Catégorie supprimée.' });
});
