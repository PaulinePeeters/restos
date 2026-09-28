import { prisma } from '../db.js';
import type { tlignecommande, Prisma, StatutService, TypeReduction } from '@prisma/client';
import * as stockService from './stock.service.js';

/**
 * Interface pour les données de mise à jour d'une ligne de commande.
 */
interface UpdateLigneCommandeData {
    statut?: StatutService;
    est_annule?: boolean;
    raison_annulation?: string;
    est_offert?: boolean;
    raison_offert?: string;
}

/**
 * Met à jour une ligne de commande (statut, annulation, offre).
 */
export async function updateLigneCommande(
    id: number | string,
    data: UpdateLigneCommandeData
): Promise<tlignecommande> {

    const existing = await prisma.tlignecommande.findUnique({
        where: { id: Number(id) }
    });

    if (!existing) {
        throw new Error(`Ligne de commande ${id} introuvable.`);
    }

    const updateData: Prisma.tlignecommandeUpdateInput = {};
    const auditEvents: Prisma.tnotifcuisineCreateInput[] = [];

    if (data.statut && data.statut !== existing.statut_service) {
        updateData.statut_service = data.statut;

        auditEvents.push({
            date_heure_envoi: new Date(),
            statut: data.statut,
            tlignecommande: { connect: { id: Number(id) } }
        });
    }

    if (data.est_annule === true) {
        if (existing.statut_service !== 'ANNULEE' as StatutService) {
            updateData.statut_service = 'ANNULEE' as StatutService;

            auditEvents.push({
                date_heure_envoi: new Date(),
                statut: 'ANNULEE',
                tlignecommande: { connect: { id: Number(id) } }
            });
        }

        if (data.raison_annulation) {
            updateData.justification_annulation = data.raison_annulation;
        }
    }

    if (data.est_offert === true) {
        updateData.type_reduction = 'OFFERT' as TypeReduction;

        if (data.raison_offert) {
            const newComment = existing.commentaire
                ? `${existing.commentaire} | Offert: ${data.raison_offert}`
                : `Offert: ${data.raison_offert}`;

            if (existing.commentaire !== newComment) {
                updateData.commentaire = newComment;
            }
        }
    } else if (data.est_offert === false) {
        updateData.type_reduction = null;
    }

    if (Object.keys(updateData).length === 0 && auditEvents.length === 0) {
        return existing;
    }

    const updated = await prisma.$transaction(async (tx) => {
        const ligneUpdated = await tx.tlignecommande.update({
            where: { id: Number(id) },
            data: updateData
        });

        for (const evt of auditEvents) {
            await tx.tnotifcuisine.create({ data: evt });
        }

        // Restaurer le stock si la ligne vient d'être annulée 
        if (data.est_annule === true && existing.statut_service !== 'ANNULEE' as StatutService) {
            await stockService.restoreIngredients(existing.plat_id, existing.quantite, tx);
        }

        return ligneUpdated;
    });

    return updated;
}
