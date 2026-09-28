import { Request, Response } from 'express';
import { prisma } from '../db.js';
import * as sessionService from '../services/sessions.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Crée une nouvelle session pour une table donnée.
 * Vérifie d'abord si une session est déjà active.
 */
export const createSession = asyncHandler(async (req: Request, res: Response) => {
    const { table_id, nb_couverts } = req.body;
    const id = Number(table_id);
    if (isNaN(id)) throw new ValidationError('ID Table invalide.');

    const covers = nb_couverts ? Number(nb_couverts) : 1;
    const session = await sessionService.createSession(id, isNaN(covers) ? 1 : covers);
    res.status(201).json(session);
});

/**
 * Ferme une session active.
 */
export const closeSession = asyncHandler(async (req: Request, res: Response) => {
    const { session_id } = req.body;
    const id = Number(session_id);
    if (isNaN(id)) throw new ValidationError('ID Session invalide.');

    const session = await sessionService.closeSession(id);
    res.status(200).json(session);
});

/**
 * Récupère toutes les tables avec leur session active.
 */
export const getAllTablesWithSessions = asyncHandler(async (req: Request, res: Response) => {
    const tables = await sessionService.getAllTablesWithSessions();
    res.status(200).json(tables);
});

/**
 * Endpoint spécifique pour le scan de QR Code ou l'accès client.
 * Retourne l'ID de la session active ou en crée une nouvelle.
 */
export const handleMenuAccess = asyncHandler(async (req: Request, res: Response) => {
    const { table_id, numero_table } = req.query;

    let id: number;

    if (numero_table) {
        const table = await prisma.ttableresto.findFirst({
            where: { numero_table: String(numero_table), actif: true }
        });
        if (!table) throw new ValidationError('Table introuvable avec ce numéro.');
        id = table.id;
    } else {
        id = Number(table_id);
        if (isNaN(id)) throw new ValidationError('table_id manquant ou invalide.');
    }

    logger.debug('Accès menu pour table_id =', id);

    let isNew = false;
    let session = await prisma.tsessiontable.findFirst({
        where: {
            table_id: id,
            statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT'] },
        },
    });

    if (!session) {
        session = await prisma.tsessiontable.create({
            data: {
                table_id: id,
                statut_session: 'ACTIVE',
                date_heure_debut: new Date(),
                nb_couverts: 1
            },
        });
        isNew = true;
    }
    
    const table = await prisma.ttableresto.findUnique({
        where: { id }
    });

    res.json({ session_id: session.id, table_id: id, numero_table: table?.numero_table, isNew });
});

/**
 * Met à jour le nombre de couverts d'une session.
 */
export const updateCovers = asyncHandler(async (req: Request, res: Response) => {
    const { session_id, nb_couverts } = req.body;
    const id = Number(session_id);
    const covers = Number(nb_couverts);
    if (isNaN(id) || isNaN(covers)) throw new ValidationError('Paramètres invalides.');

    const session = await prisma.tsessiontable.update({
        where: { id },
        data: { nb_couverts: covers }
    });

    res.status(200).json(session);
});

/**
 * Marque une table comme prête après débarrassage.
 */
export const markTableReady = asyncHandler(async (req: Request, res: Response) => {
    const { session_id } = req.body;
    const id = Number(session_id);
    if (isNaN(id)) throw new ValidationError('ID Session invalide.');

    const session = await sessionService.markTableReady(id);
    res.status(200).json(session);
});
