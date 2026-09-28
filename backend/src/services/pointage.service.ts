import { prisma } from '../db.js';

/**
 * Crée un nouveau pointage.
 */
export async function createPointage(data: any) {
    const { personnel_id, date, heure_debut } = data;

    const personnel = await prisma.tpersonnel.findUnique({ where: { id: Number(personnel_id) } });
    if (!personnel) throw new Error("Personnel introuvable");

    return prisma.tpointage.create({
        data: {
            personnel_id: Number(personnel_id),
            date: new Date(date),
            heure_debut: new Date(heure_debut),
            statut: 'EN_ATTENTE'
        }
    });
}

/**
 * Met à jour un pointage.
 */
export async function updatePointage(id: number | string, data: any) {
    const pointageId = Number(id);
    const pointage = await prisma.tpointage.findUnique({ where: { id: pointageId } });
    if (!pointage) throw new Error("Pointage introuvable");

    const updateData: any = { ...data };

    if (data.heure_fin) {
        updateData.heure_fin = new Date(data.heure_fin);
        const debut = new Date(pointage.heure_debut);
        debut.setFullYear(1970, 0, 1);

        const fin = new Date(updateData.heure_fin);
        fin.setFullYear(1970, 0, 1);

        if (fin < debut) {
            fin.setDate(fin.getDate() + 1);
        }

        const pause = (data.pause_minutes !== undefined) ? Number(data.pause_minutes) : pointage.pause_minutes;

        let diffMs = fin.getTime() - debut.getTime();
        diffMs -= (pause * 60 * 1000);
        if (diffMs < 0) diffMs = 0;

        const hours = diffMs / (1000 * 60 * 60);
        updateData.heures_prestees = parseFloat(hours.toFixed(2));

        let standardHours = 0;

        const pointageDate = new Date(pointage.date);
        const pad = (n: number) => String(n).padStart(2, '0');
        const pointageDateKey = `${pointageDate.getFullYear()}-${pad(pointageDate.getMonth() + 1)}-${pad(pointageDate.getDate())}`;

        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const dayName = days[pointageDate.getDay()];

        const schedule = await prisma.thoraire.findFirst({
            where: {
                personnel_id: pointage.personnel_id,
                OR: [
                    { jour_horaire: pointageDateKey },
                    { jour_horaire: dayName }
                ]
            },
            orderBy: {
                id: 'desc'
            }
        });

        if (schedule) {
            const sStart = new Date(schedule.heure_debut);
            const sEnd = new Date(schedule.heure_fin);
            sStart.setFullYear(1970, 0, 1);
            sEnd.setFullYear(1970, 0, 1);
            if (sEnd < sStart) sEnd.setDate(sEnd.getDate() + 1);

            standardHours = (sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60);
        }

        if (updateData.heures_prestees > standardHours) {
            updateData.heures_supp = parseFloat((updateData.heures_prestees - standardHours).toFixed(2));
            updateData.statut = 'EN_ATTENTE'; // Nécessite validation si heures supp
        } else {
            updateData.heures_supp = 0;
            updateData.statut = 'VALIDEE'; // Auto-validé si respect horaires
        }

        if (data.pause_minutes !== undefined) {
            updateData.pause_minutes = Number(data.pause_minutes);
        }

        return prisma.tpointage.update({
            where: { id: pointageId },
            data: updateData
        });
    }

    return prisma.tpointage.update({
        where: { id: pointageId },
        data: updateData
    });
}

/**
 * Récupère les pointages avec filtres optionnels.
 */
export async function getPointages(filtre: any = {}) {
    const where: any = {};

    if (filtre.personnel_id) {
        where.personnel_id = Number(filtre.personnel_id);
    }

    if (filtre.date) {
        where.date = new Date(filtre.date);
    }

    if (filtre.statut) {
        where.statut = filtre.statut;
    }

    return prisma.tpointage.findMany({
        where,
        include: { tpersonnel: true },
        orderBy: { date: 'desc' }
    });
}

/**
 * Valide ou refuse un pointage (validation heures supp).
 * Met à jour le solde de récupération du personnel si validé.
 */
export async function validerPointage(id: number | string, validatedByManager = true) {
    const pointageId = Number(id);
    const pointage = await prisma.tpointage.findUnique({ where: { id: pointageId } });
    if (!pointage) throw new Error("Pointage introuvable");

    if (pointage.statut !== 'EN_ATTENTE') {
        return pointage;
    }

    return prisma.$transaction(async (tx) => {
        const updated = await tx.tpointage.update({
            where: { id: pointageId },
            data: { statut: validatedByManager ? 'VALIDEE' : 'REFUSEE' }
        });

        if (validatedByManager && Number(pointage.heures_supp || 0) > 0) {
            await tx.tpersonnel.update({
                where: { id: pointage.personnel_id },
                data: {
                    solde_recuperation: { increment: Number(pointage.heures_supp) }
                }
            });
        }

        return updated;
    });
}
