import { prisma } from '../db.js';
import type { tchequecadeau } from '@prisma/client';
import crypto from 'crypto';

/**
 * Arrondit un montant à 2 décimales (centimes).
 */
function roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
}

/**
 * Génère un code unique pour le chèque cadeau.
 */
function generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

interface CreateChequeData {
    montant: number;
    date_expiration: string | Date;
    client_id?: number | null;
}

/**
 * Crée un chèque cadeau.
 * Vérifie que la date d'expiration n'est pas dans le passé.
 */
export async function createCheque(data: CreateChequeData): Promise<tchequecadeau> {
    const expirationDate = new Date(data.date_expiration);
    const now = new Date();

    if (expirationDate <= now) {
        throw new Error("La date d'expiration doit être dans le futur.");
    }

    const montant = roundMoney(data.montant);
    if (montant <= 0) {
        throw new Error("Le montant doit être positif.");
    }

    return prisma.tchequecadeau.create({
        data: {
            code: generateCode(),
            montant_initial: montant,
            solde_actuel: montant,
            date_expiration: expirationDate,
            client_id: data.client_id ?? null
        }
    });
}

/**
 * Récupère tous les chèques cadeaux.
 */
export async function getAllCheques() {
    return prisma.tchequecadeau.findMany({
        orderBy: { date_creation: 'desc' },
        include: { tclient: true }
    });
}

/**
 * Récupère un chèque par son ID.
 */
export async function getChequeById(id: number | string): Promise<tchequecadeau | null> {
    return prisma.tchequecadeau.findUnique({
        where: { id: Number(id) },
        include: { tclient: true }
    });
}

/**
 * Valide un chèque par son code.
 */
export async function validateCheque(code: string): Promise<tchequecadeau> {
    const cheque = await prisma.tchequecadeau.findUnique({
        where: { code }
    });

    if (!cheque) throw new Error("Chèque introuvable.");
    if (!cheque.est_actif) throw new Error("Chèque inactif.");
    if (new Date() > cheque.date_expiration) throw new Error("Chèque expiré.");
    if (Number(cheque.solde_actuel) <= 0) throw new Error("Solde épuisé.");

    return cheque;
}

/**
 * Utilise un montant sur un chèque cadeau.
 */
export async function useCheque(
    code: string,
    montant: number
): Promise<{ montantUtilise: number; nouveauSolde: number }> {
    return prisma.$transaction(async (tx) => {
        const cheque = await tx.tchequecadeau.findUnique({
            where: { code }
        });

        if (!cheque) throw new Error("Chèque introuvable.");
        if (!cheque.est_actif) throw new Error("Chèque inactif.");
        if (new Date() > cheque.date_expiration) throw new Error("Chèque expiré.");

        const soldeActuel = Number(cheque.solde_actuel);
        if (soldeActuel <= 0) throw new Error("Solde épuisé.");

        const montantUtilise = roundMoney(Math.min(montant, soldeActuel));
        const nouveauSolde = roundMoney(soldeActuel - montantUtilise);

        await tx.tchequecadeau.update({
            where: { code },
            data: {
                solde_actuel: nouveauSolde,
                est_actif: nouveauSolde > 0
            }
        });

        return { montantUtilise, nouveauSolde };
    });
}

/**
 * Désactive un chèque cadeau.
 * Les chèques sont conservés pour l'audit comptable.
 */
export async function deleteCheque(id: number | string): Promise<tchequecadeau> {
    const cheque = await prisma.tchequecadeau.findUnique({ where: { id: Number(id) } });
    if (!cheque) throw new Error("Chèque introuvable.");
    if (!cheque.est_actif) throw new Error("Ce chèque est déjà désactivé.");

    return prisma.tchequecadeau.update({
        where: { id: Number(id) },
        data: { est_actif: false }
    });
}
