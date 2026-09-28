import { prisma } from '../db.js';
import type { tevenement, Prisma, TypeEvenement } from '@prisma/client';

/** Filtres pour récupérer les événements */
interface EventFilters {
    type?: string;
    actif?: string | boolean;
}

/** Données pour créer un événement */
interface CreateEventData {
    titre: string;
    description?: string;
    date_debut: string | Date;
    date_fin: string | Date;
    type?: string;
    actif?: boolean;
    plats_ids?: number[];
    couleur_principale?: string;
    couleur_secondaire?: string;
    couleur_texte?: string;
    motif?: string;
    font?: string;
    format?: string;
    text_align?: string;
    button_style?: string;
    opacity?: number;
}

/** Données pour mettre à jour un événement */
interface UpdateEventData extends Partial<CreateEventData> { }

/**
 * Récupère tous les événements avec filtres optionnels.
 */
export async function getAllEvents(filters: EventFilters = {}) {
    const { type, actif } = filters;
    const where: Prisma.tevenementWhereInput = {};

    if (type) where.type = type as TypeEvenement;
    if (actif === 'true' || actif === true) where.actif = true;
    if (actif === 'false' || actif === false) where.actif = false;

    return prisma.tevenement.findMany({
        where,
        include: {
            tevenement_plat: { include: { tplat: true } }
        },
        orderBy: { date_debut: 'desc' }
    });
}

/**
 * Récupère l'événement actif en cours (date actuelle entre début et fin).
 */
export async function getActiveEvent() {
    const now = new Date();
    return prisma.tevenement.findFirst({
        where: {
            actif: true,
            date_debut: { lte: now },
            date_fin: { gte: now }
        },
        orderBy: { date_debut: 'desc' },
        include: {
            tevenement_plat: { include: { tplat: true } }
        }
    });
}

/**
 * Crée un nouvel événement.
 * Valide que la date de fin est après la date de début.
 */
export async function createEvent(data: CreateEventData, image_url: string | null): Promise<tevenement> {
    const {
        titre, description, date_debut, date_fin, type, actif, plats_ids,
        couleur_principale, couleur_secondaire, couleur_texte, motif, font,
        format, text_align, button_style, opacity
    } = data;

    const dateDebut = new Date(date_debut);
    const dateFin = new Date(date_fin);

    if (dateFin < dateDebut) {
        throw new Error("La date de fin doit être postérieure à la date de début.");
    }

    const platIds = Array.isArray(plats_ids) ? plats_ids : [];

    return prisma.tevenement.create({
        data: {
            titre,
            description: description ?? null,
            image_url,
            date_debut: dateDebut,
            date_fin: dateFin,
            type: (type || 'EVENEMENT') as TypeEvenement,
            actif: actif === true,
            couleur_principale: couleur_principale ?? null,
            couleur_secondaire: couleur_secondaire ?? null,
            couleur_texte: couleur_texte ?? null,
            motif: motif ?? null,
            font: font ?? null,
            format: format || 'CARTE',
            text_align: text_align || 'center',
            button_style: button_style || 'filled',
            opacity: opacity ?? 0.0,
            tevenement_plat: {
                create: platIds.map((id: number) => ({ plat_id: id }))
            }
        },
        include: {
            tevenement_plat: { include: { tplat: true } }
        }
    });
}

/**
 * Met à jour un événement existant.
 */
export async function updateEvent(
    id: number | string,
    data: UpdateEventData,
    image_url?: string
): Promise<tevenement> {
    const {
        titre, description, date_debut, date_fin, type, actif, plats_ids,
        couleur_principale, couleur_secondaire, couleur_texte, motif, font,
        format, text_align, button_style, opacity
    } = data;

    return prisma.$transaction(async (tx) => {
        const existing = await tx.tevenement.findUnique({ where: { id: Number(id) } });
        if (!existing) {
            throw new Error("Événement non trouvé");
        }

        // Validation des dates
        const newDateDebut = date_debut ? new Date(date_debut) : existing.date_debut;
        const newDateFin = date_fin ? new Date(date_fin) : existing.date_fin;

        if (newDateFin < newDateDebut) {
            throw new Error("La date de fin doit être postérieure à la date de début.");
        }

        // Mise à jour des plats
        if (plats_ids !== undefined) {
            await tx.tevenement_plat.deleteMany({
                where: { evenement_id: Number(id) }
            });

            if (plats_ids.length > 0) {
                await tx.tevenement_plat.createMany({
                    data: plats_ids.map((pid: number) => ({
                        evenement_id: Number(id),
                        plat_id: pid
                    }))
                });
            }
        }

        // Construction des données de mise à jour 
        const updateData: Prisma.tevenementUpdateInput = {};

        if (titre !== undefined) updateData.titre = titre;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type as TypeEvenement;
        if (date_debut) updateData.date_debut = newDateDebut;
        if (date_fin) updateData.date_fin = newDateFin;
        if (actif !== undefined) updateData.actif = actif;
        if (opacity !== undefined) updateData.opacity = opacity;
        if (image_url) updateData.image_url = image_url;
        if (couleur_principale !== undefined) updateData.couleur_principale = couleur_principale;
        if (couleur_secondaire !== undefined) updateData.couleur_secondaire = couleur_secondaire;
        if (couleur_texte !== undefined) updateData.couleur_texte = couleur_texte;
        if (motif !== undefined) updateData.motif = motif;
        if (font !== undefined) updateData.font = font;
        if (format !== undefined) updateData.format = format;
        if (text_align !== undefined) updateData.text_align = text_align;
        if (button_style !== undefined) updateData.button_style = button_style;

        return tx.tevenement.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                tevenement_plat: { include: { tplat: true } }
            }
        });
    });
}

/**
 * Désactive un événement.
 * L'historique est conservé pour les statistiques et l'audit.
 */
export async function deleteEvent(id: number | string): Promise<tevenement> {
    const event = await prisma.tevenement.findUnique({ where: { id: Number(id) } });
    if (!event) throw new Error("Événement non trouvé.");
    if (!event.actif) throw new Error("Cet événement est déjà désactivé.");

    return prisma.tevenement.update({
        where: { id: Number(id) },
        data: { actif: false }
    });
}
