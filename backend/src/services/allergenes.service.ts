import { prisma } from '../db.js';

export async function getAllAllergenes() {
    return prisma.tallergene.findMany({
        orderBy: { nom: 'asc' }
    });
}
