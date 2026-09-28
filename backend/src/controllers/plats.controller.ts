import { Request, Response } from 'express';
import * as platService from '../services/plats.service.js';
import * as stockService from '../services/stock.service.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';

/**
 * Récupère tous les plats avec calcul du stock disponible.
 */
export const getPlats = asyncHandler(async (req: Request, res: Response) => {
    const [plats, stocks] = await Promise.all([
        platService.getAllPlats(),
        stockService.getAllStock()
    ]);

    // Créer une map ingrédient -> quantité disponible
    const stockMap = new Map();
    stocks.forEach((s: any) => stockMap.set(s.id, Number(s.stock_actuel)));

    // Calculer le nombre de portions max pour chaque plat
    const platsWithStock = plats.map((p: any) => {
        let maxServings = 9999;
        if (p.tplat_ingredient && p.tplat_ingredient.length > 0) {
            for (const item of p.tplat_ingredient) {
                const stockDispo = stockMap.get(item.ingredient_id) || 0;
                const qtUtilisee = Number(item.qt_utilisee);

                if (qtUtilisee <= 0) continue; // Eviter division par 0

                const possible = Math.floor(stockDispo / qtUtilisee);
                if (possible < maxServings) maxServings = possible;
            }
            if (maxServings === 9999) maxServings = 0;
        } else {
            maxServings = 999;
        }
        return { ...p, max_servings: maxServings };
    });

    res.json(platsWithStock);
});

/**
 * Crée un nouveau plat.
 */
export const createPlat = asyncHandler(async (req: Request, res: Response) => {
    const data = { ...req.body };
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const categorie_id = data.categorie_id || data.categorie;

    const plat = await platService.ajouterPlat({
        ...data,
        categorie_id,
        nom_en: data.nom_plat_en,
        description_en: data.description_plat_en,
        nom_nl: data.nom_plat_nl,
        description_nl: data.description_plat_nl,
        image_url
    });

    res.status(201).json(plat);
});

/**
 * Met à jour un plat existant.
 */
export const updatePlat = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const data = { ...req.body };
    const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const categorie_id = data.categorie_id || data.categorie;

    const plat = await platService.modifierPlat(id, {
        ...data,
        categorie_id,
        nom_en: data.nom_plat_en,
        description_en: data.description_plat_en,
        nom_nl: data.nom_plat_nl,
        description_nl: data.description_plat_nl,
        image_url
    });

    res.json(plat);
});

/**
 * Supprime un plat.
 */
export const deletePlat = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await platService.supprimerPlat(id);
    res.json({ message: 'Plat supprimé avec succès.' });
});
