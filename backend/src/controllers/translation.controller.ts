import { Request, Response } from 'express';
import * as translationService from '../services/translation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Traduit un texte d'une langue source vers une langue cible.
 * Par défaut: français → anglais.
 */
export const translate = asyncHandler(async (req: Request, res: Response) => {
    const { text, source, target } = req.body;
    const translatedText = await translationService.translateText(text.trim(), source, target);
    res.json({ translation: translatedText });
});
