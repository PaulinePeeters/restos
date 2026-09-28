import { prisma } from '../db.js';
import type { tavis } from '@prisma/client';

/**
 * Crée un avis pour une commande.
 * Vérifie qu'un avis n'existe pas déjà pour cette commande.
 */
export async function creerAvis(
    commandeId: number | string,
    note: number,
    commentaire: string | null
): Promise<tavis> {
    const cmdId = Number(commandeId);
    const noteNum = Number(note);

    if (noteNum < 1 || noteNum > 5 || !Number.isInteger(noteNum)) {
        throw new Error('La note doit être un entier entre 1 et 5.');
    }
    const existingAvis = await prisma.tavis.findFirst({
        where: { commande_id: cmdId }
    });

    if (existingAvis) {
        throw new Error('Un avis existe déjà pour cette commande.');
    }

    return prisma.tavis.create({
        data: {
            commande_id: cmdId,
            note: noteNum,
            commentaire
        }
    });
}

/**
 * Récupère la moyenne et le nombre total d'avis.
 */
export async function getMoyenneAvis(): Promise<{ moyenne: number; nombre: number }> {
    const aggregations = await prisma.tavis.aggregate({
        _avg: { note: true },
        _count: { note: true }
    });

    const rawMoyenne = aggregations._avg.note || 0;

    return {
        moyenne: Math.round(rawMoyenne * 10) / 10,
        nombre: aggregations._count.note || 0
    };
}

/**
 * Récupère un avis par ID de commande.
 */
export async function getAvisByCommande(commandeId: number | string): Promise<tavis | null> {
    return prisma.tavis.findFirst({
        where: { commande_id: Number(commandeId) }
    });
}
