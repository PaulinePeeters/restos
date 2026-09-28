import { prisma } from '../db.js';

/**
 * Récupère tous les types de congés.
 */
export async function getAllTypes() {
    return prisma.ttypeconge.findMany();
}
