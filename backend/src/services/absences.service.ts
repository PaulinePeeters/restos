import { prisma } from '../db.js';
import type { Prisma, tabsencepersonnel, ttypeconge, StatutAbsence } from '@prisma/client';
import { logger } from '../utils/logger.js';

type AbsenceWithType = tabsencepersonnel & { ttypeconge: ttypeconge | null };

/** Données pour créer une absence */
interface CreateAbsenceData {
    personnel_id: number | string;
    date_debut: Date | string;
    date_fin: Date | string;
    motif_absence?: string;
    type_conge_id?: number | string;
    justificatif_url?: string;
}

/**
 * Normalise une date en fixant l'heure à midi UTC.
 */
function normalizeDate(d: Date | string): Date {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
        throw new Error(`Date invalide fournie : ${d}`);
    }
    date.setUTCHours(12, 0, 0, 0);
    return date;
}

/**
 * Calcule le nombre de jours ouvrés entre deux dates.
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const curDate = new Date(startDate);
    curDate.setUTCHours(12, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(12, 0, 0, 0);

    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return Math.max(0, count);
}

/**
 * Met à jour le solde de congés/récupération d'un membre du personnel.
 */
async function updateLeaveBalance(
    tx: Prisma.TransactionClient,
    absence: AbsenceWithType,
    operation: 'increment' | 'decrement'
): Promise<void> {
    if (!absence.ttypeconge) {
        logger.warn(`[Absence] Aucune mise à jour de solde pour l'absence ${absence.id}: Type de congé manquant.`);
        return;
    }

    const days = calculateBusinessDays(absence.date_debut, absence.date_fin);
    if (days <= 0) {
        logger.warn(`[Absence] Aucune mise à jour de solde pour l'absence ${absence.id}: 0 jours ouvrés calculés.`);
        return;
    }

    if (absence.ttypeconge.deduit_solde_conges) {
        await tx.tpersonnel.update({
            where: { id: absence.personnel_id },
            data: { solde_conges: { [operation]: days } }
        });
        logger.debug(`[Absence] Solde congés ${operation === 'decrement' ? 'déduit' : 'restitué'} de ${days}j pour le personnel ${absence.personnel_id}`);
    } else if (absence.ttypeconge.est_recuperation) {
        const hours = days * 8.0;
        await tx.tpersonnel.update({
            where: { id: absence.personnel_id },
            data: { solde_recuperation: { [operation]: hours } }
        });
        logger.debug(`[Absence] Solde récup ${operation === 'decrement' ? 'déduit' : 'restitué'} de ${hours}h pour le personnel ${absence.personnel_id}`);
    } else {
        logger.debug(`[Absence] Le type de congé "${absence.ttypeconge.nom}" n'impacte pas les soldes.`);
    }
}

/**
 * Crée une nouvelle demande d'absence.
 */
export async function creerAbsence(data: CreateAbsenceData): Promise<tabsencepersonnel> {
    const { personnel_id, date_debut, date_fin, motif_absence, type_conge_id, justificatif_url } = data;

    if (!personnel_id || !date_debut || !date_fin) {
        throw new Error('personnel_id, date_debut et date_fin sont obligatoires');
    }

    const createData: Prisma.tabsencepersonnelCreateInput = {
        date_debut: normalizeDate(date_debut),
        date_fin: normalizeDate(date_fin),
        motif_absence: motif_absence ?? null,
        statut: 'EN_ATTENTE',
        justificatif_url: justificatif_url ?? null,
        tpersonnel: { connect: { id: Number(personnel_id) } }
    };

    if (type_conge_id) {
        createData.ttypeconge = { connect: { id: Number(type_conge_id) } };
    }

    return prisma.tabsencepersonnel.create({ data: createData });
}

/**
 * Récupère toutes les absences avec filtres optionnels.
 */
export async function getAllAbsences(filtre: Prisma.tabsencepersonnelWhereInput = {}) {
    return prisma.tabsencepersonnel.findMany({
        where: filtre,
        include: { tpersonnel: true, ttypeconge: true },
        orderBy: { date_debut: 'asc' }
    });
}

/**
 * Met à jour le statut d'une absence.
 * Gère automatiquement le solde de congés.
 */
export async function mettreAJourStatut(id: number | string, statut: StatutAbsence): Promise<tabsencepersonnel> {
    const idNum = Number(id);

    return prisma.$transaction(async (tx) => {
        const absence = await tx.tabsencepersonnel.findUnique({
            where: { id: idNum },
            include: { ttypeconge: true }
        });

        if (!absence) throw new Error('Absence non trouvée');

        // Passage à VALIDEE -> déduire le solde
        if (statut === 'VALIDEE' && absence.statut !== 'VALIDEE') {
            await updateLeaveBalance(tx, absence, 'decrement');
        }
        // Annulation d'une validation -> restituer le solde
        else if (absence.statut === 'VALIDEE' && statut !== 'VALIDEE') {
            await updateLeaveBalance(tx, absence, 'increment');
        }

        return tx.tabsencepersonnel.update({
            where: { id: idNum },
            data: { statut }
        });
    });
}

/**
 * Supprime ou annule une absence.
 * - EN_ATTENTE : suppression physique autorisée (demande non encore traitée).
 * - VALIDEE / REFUSEE : suppression interdite pour traçabilité légale,
 *   passage au statut ANNULEE avec restitution du solde si nécessaire.
 */
export async function deleteAbsence(id: number | string): Promise<tabsencepersonnel> {
    const idNum = Number(id);

    return prisma.$transaction(async (tx) => {
        const absence = await tx.tabsencepersonnel.findUnique({
            where: { id: idNum },
            include: { ttypeconge: true }
        });

        if (!absence) throw new Error('Absence non trouvée');

        // Demande non encore traitée : suppression physique OK
        if (absence.statut === 'EN_ATTENTE') {
            return tx.tabsencepersonnel.delete({ where: { id: idNum } });
        }

        // Absence déjà traitée : on passe en ANNULEE pour traçabilité
        if (absence.statut === 'VALIDEE') {
            await updateLeaveBalance(tx, absence, 'increment');
        }

        return tx.tabsencepersonnel.update({
            where: { id: idNum },
            data: { statut: 'ANNULEE' }
        });
    });
}
