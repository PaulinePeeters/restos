import { Request, Response } from 'express';
import * as ingredientService from '../services/ingredients.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Récupère la liste de tous les ingrédients.
 */
export const listIngredients = asyncHandler(async (req: Request, res: Response) => {
    const ingredients = await ingredientService.getAllIngredients();
    res.json(ingredients);
});

/**
 * Récupère un ingrédient par son ID.
 */
export const getIngredient = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const ingredient = await ingredientService.getIngredientById(id);
    if (!ingredient) throw new NotFoundError('Ingrédient');

    res.json(ingredient);
});

/**
 * Crée un nouvel ingrédient.
 */
export const createIngredient = asyncHandler(async (req: Request, res: Response) => {
    const newIngredient = await ingredientService.createIngredient(req.body);
    res.status(201).json(newIngredient);
});

/**
 * Met à jour un ingrédient existant.
 */
export const updateIngredient = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updated = await ingredientService.updateIngredient(id, req.body);
    res.json(updated);
});

/**
 * Supprime un ingrédient.
 */
export const deleteIngredient = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await ingredientService.deleteIngredient(id);
    res.status(204).send();
});
