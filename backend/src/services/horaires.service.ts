import { prisma } from '../db.js';
import type { thoraire, Prisma } from '@prisma/client';

/**
 * Interface de création/mise à jour d'un horaire.
 */
interface CreateHoraireData {
    jour_horaire: string;
    heure_debut: string; // Format "HH:mm"
    heure_fin: string;   // Format "HH:mm"
    personnel_id: number | string;
}

interface UpdateHoraireData extends Partial<CreateHoraireData> { }

/**
 * Crée un objet Date pour une heure donnée (HH:mm), fixé au 01/01/1970.
 * Utilise l'heure locale du serveur pour éviter les décalages UTC lors de la sauvegarde.
 */
function createSafeDateFromTime(timeStr: string): Date {
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
        throw new Error(`Format d'heure invalide : ${timeStr} (attendu HH:mm)`);
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setFullYear(1970, 0, 1);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/**
 * Formate un objet Date en chaîne "HH:mm" (heure locale).
 */
function formatTime(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toTimeString().slice(0, 5);
}

/**
 * Valide que l'heure de fin est après l'heure de début.
 */
function validateTimeRange(start: Date, end: Date) {
    if (end <= start) {
        throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
    }
}

/**
 * Récupère tous les horaires formatés.
 */
export const getAllHoraires = async () => {
    const horaires = await prisma.thoraire.findMany({
        include: { tpersonnel: true },
        orderBy: { jour_horaire: 'desc' }
    });

    return horaires.map(h => ({
        ...h,
        heure_debut: formatTime(h.heure_debut),
        heure_fin: formatTime(h.heure_fin),
    }));
};

/**
 * Récupère les horaires d'un membre du personnel.
 */
export const getHorairesByPersonnelId = async (personnelId: number | string) => {
    const horaires = await prisma.thoraire.findMany({
        where: { personnel_id: Number(personnelId) },
        orderBy: { jour_horaire: 'desc' }
    });

    return horaires.map(h => ({
        ...h,
        heure_debut: formatTime(h.heure_debut),
        heure_fin: formatTime(h.heure_fin),
    }));
};

/**
 * Crée un nouvel horaire avec validation.
 */
export const createHoraire = async (data: CreateHoraireData) => {
    const heureDebutDate = createSafeDateFromTime(data.heure_debut);
    const heureFinDate = createSafeDateFromTime(data.heure_fin);

    validateTimeRange(heureDebutDate, heureFinDate);

    const newHoraire = await prisma.thoraire.create({
        data: {
            jour_horaire: data.jour_horaire,
            heure_debut: heureDebutDate,
            heure_fin: heureFinDate,
            personnel_id: Number(data.personnel_id),
        },
    });

    return {
        ...newHoraire,
        heure_debut: formatTime(newHoraire.heure_debut),
        heure_fin: formatTime(newHoraire.heure_fin),
    };
};

/**
 * Met à jour un horaire existant.
 */
export const updateHoraire = async (id: number | string, data: UpdateHoraireData) => {
    const existing = await prisma.thoraire.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new Error("Horaire non trouvé");

    const updateData: Prisma.thoraireUpdateInput = {};

    if (data.jour_horaire !== undefined) updateData.jour_horaire = data.jour_horaire;
    if (data.personnel_id !== undefined) {
        updateData.tpersonnel = { connect: { id: Number(data.personnel_id) } };
    }

    let newStart = existing.heure_debut;
    let newEnd = existing.heure_fin;

    if (data.heure_debut !== undefined) {
        newStart = createSafeDateFromTime(data.heure_debut);
        updateData.heure_debut = newStart;
    }

    if (data.heure_fin !== undefined) {
        newEnd = createSafeDateFromTime(data.heure_fin);
        updateData.heure_fin = newEnd;
    }

    validateTimeRange(newStart, newEnd);

    const updated = await prisma.thoraire.update({
        where: { id: Number(id) },
        data: updateData
    });

    return {
        ...updated,
        heure_debut: formatTime(updated.heure_debut),
        heure_fin: formatTime(updated.heure_fin),
    };
};

/**
 * Supprime un horaire.
 */
export const deleteHoraire = async (id: number | string) => {
    const existing = await prisma.thoraire.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new Error("Horaire non trouvé");
    // impossible de supprimer un horaire passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(existing.jour_horaire);
    if (shiftDate < today) {
        throw new Error("Impossible de supprimer un horaire passé.");
    }

    return await prisma.thoraire.delete({
        where: { id: Number(id) },
    });
};
