import { Request, Response } from 'express';
import * as tablesService from '../services/tables.service.js';
import * as qrCodeGenerator from '../utils/qrCodeGenerator.js';
import { getIdParam } from '../utils/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

/**
 * Récupère toutes les tables du restaurant.
 */
export const getAllTables = asyncHandler(async (req: Request, res: Response) => {
    const tables = await tablesService.getAllTables();
    res.json(tables);
});

/**
 * Récupère les tables disponibles pour une date, heure et capacité donnée.
 */
export const getAvailableTables = asyncHandler(async (req: Request, res: Response) => {
    const { date, heure, capacite } = req.query;

    if (!date || !heure || !capacite) {
        throw new ValidationError('Les paramètres date, heure et capacite sont requis.');
    }

    const capaciteRequise = parseInt(capacite as string, 10);
    if (isNaN(capaciteRequise) || capaciteRequise < 1) {
        throw new ValidationError('La capacité doit être un nombre positif.');
    }

    // Construire les dates
    const dateObj = new Date(date as string);
    const [heures, minutes] = (heure as string).split(':').map(Number);
    const heureObj = new Date();
    heureObj.setHours(heures, minutes, 0, 0);

    const tablesDisponibles = await tablesService.getAvailableTables(dateObj, heureObj, capaciteRequise);
    res.json(tablesDisponibles);
});

/**
 * Fusionne plusieurs tables en une table principale.
 */
export const fusionnerTables = asyncHandler(async (req: Request, res: Response) => {
    const { mainTableId, tablesToMergeIds } = req.body;

    await tablesService.fusionnerTables(mainTableId, tablesToMergeIds);
    res.json({ message: 'Tables fusionnées avec succès.' });
});

/**
 * Défusionne les tables liées à une table principale.
 */
export const defusionnerTables = asyncHandler(async (req: Request, res: Response) => {
    const { mainTableId } = req.body;

    await tablesService.defusionnerTables(mainTableId);
    res.json({ message: 'Tables défusionnées avec succès.' });
});

/**
 * Met à jour une table.
 */
export const updateTable = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const updatedTable = await tablesService.updateTable(id, req.body);
    res.json(updatedTable);
});

/**
 * Met à jour plusieurs tables en lot.
 */
export const updateTablesBatch = asyncHandler(async (req: Request, res: Response) => {
    const updates = req.body;
    if (!Array.isArray(updates)) {
        throw new ValidationError('Format invalide : un tableau est attendu.');
    }

    await tablesService.updateTablesBatch(updates);
    res.json({ message: 'Tables mises à jour avec succès.' });
});

/**
 * Crée une nouvelle table.
 */
export const createTable = asyncHandler(async (req: Request, res: Response) => {
    const newTable = await tablesService.createTable(req.body);
    res.status(201).json(newTable);
});

/**
 * Supprime une table.
 */
export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    await tablesService.deleteTable(id);
    res.json({ message: 'Table supprimée.' });
});

/**
 * Envoie le prochain service pour une table.
 */
export const fireNextCourse = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const result = await tablesService.fireNextCourse(id);
    res.json({ message: 'Suite envoyée.', count: result.count });
});

/**
 * Génère un QR Code pour une table.
 */
export const getQRCode = asyncHandler(async (req: Request, res: Response) => {
    const id = getIdParam(req.params.id);
    if (!id) throw new ValidationError('ID invalide.');

    const table = await tablesService.getTableById(id);
    if (!table) throw new NotFoundError('Table');

    const qrCodeUrl = await qrCodeGenerator.generateQRCode(id);
    res.json({ qrCodeUrl });
});


export default {
    getAllTables,
    getAvailableTables,
    fusionnerTables,
    defusionnerTables,
    updateTable,
    updateTablesBatch,
    createTable,
    deleteTable,
    fireNextCourse,
    getQRCode
};
