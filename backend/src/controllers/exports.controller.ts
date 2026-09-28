import { Request, Response } from 'express';
import { exportsService } from '../services/exports.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Helper sécurisé pour récupérer la date
 */
const getDateFromQuery = (req: Request): Date => {
    const dateParam = req.query.date;
    if (typeof dateParam === 'string') {
        const parsed = new Date(dateParam);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
};

/**
 * Formate la date au format local YYYY-MM-DD pour le nom de fichier.
 */
const formatDateForFilename = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Génère et télécharge le rapport CSV des transactions journalières.
 */
export const getDailyTransactionsCSV = asyncHandler(async (req: Request, res: Response) => {
    const date = getDateFromQuery(req);
    const csv = await exportsService.generateTransactionsCSV(date);
    const filenameDate = formatDateForFilename(date);

    res.set('Content-Type', 'text/csv');
    res.attachment(`transactions_${filenameDate}.csv`);
    res.send('\uFEFF' + csv);
});

/**
 * Génère et télécharge le rapport CSV détaillé des lignes de commande.
 */
export const getDailyLignesCSV = asyncHandler(async (req: Request, res: Response) => {
    const date = getDateFromQuery(req);
    const csv = await exportsService.generateLignesCSV(date);
    const filenameDate = formatDateForFilename(date);

    res.set('Content-Type', 'text/csv');
    res.attachment(`details_commandes_${filenameDate}.csv`);
    res.send('\uFEFF' + csv);
});

/**
 * Récupère la synthèse de la journée.
 */
export const getDailySummary = asyncHandler(async (req: Request, res: Response) => {
    const date = getDateFromQuery(req);
    const data = await exportsService.getDailyData(date);
    res.json(data.synthese);
});
