import { prisma } from '../db.js';
import { checkTablePreference } from './fidelite.service.js';
import { parseDateTime } from '../utils/helpers.js';
import { StatutReservation, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

const DUREE_RESERVATION_MS = 2 * 60 * 60 * 1000; // 2 heures par défaut

export interface CreateReservationData {
    table_id: number | string;
    date_reservation: string | Date;
    heure_reservation: string;
    nb_personnes: number | string;
    client_id?: number | string;
    nom_client?: string;
    email_client?: string;
    telephone_client?: string;
    commentaire_reservation?: string;
}

/**
 * Récupère toutes les réservations, triées par date.
 */
export const getAllReservations = async () => {
    return await prisma.treservation.findMany({
        include: {
            tclient: true,
            ttableresto: true
        },
        orderBy: { date_reservation: 'asc' }
    });
};

/**
 * Récupère les réservations pour une date donnée.
 */
export const getReservationsByDate = async (date: string | Date) => {
    return await prisma.treservation.findMany({
        where: { date_reservation: new Date(date) },
        include: {
            tclient: true,
            ttableresto: true
        }
    });
};

/**
 * Récupère les réservations d'un client spécifique.
 */
export const getReservationsByClientId = async (client_id: number) => {
    return await prisma.treservation.findMany({
        where: { client_id },
        include: { ttableresto: true },
        orderBy: { date_reservation: 'desc' }
    });
};

/**
 * Crée une réservation avec vérification des conflits (fenêtre de 2h).
 */
export async function createReservation(data: CreateReservationData) {
    const { table_id, date_reservation, heure_reservation } = data;

    const dateStr = data.date_reservation instanceof Date
        ? data.date_reservation.toISOString().split('T')[0]
        : data.date_reservation;

    const dateHeureDebut = parseDateTime(dateStr, heure_reservation);

    if (!dateHeureDebut) {
        throw new Error("Format de date ou heure invalide");
    }

    // Calcul de l'heure de fin estimée (2h plus tard)
    const dateHeureFin = new Date(dateHeureDebut.getTime() + DUREE_RESERVATION_MS);
    const dateJour = new Date(dateHeureDebut);
    dateJour.setHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
        const table = await tx.ttableresto.findUnique({ where: { id: Number(table_id) } });
        if (!table) throw new Error("Table introuvable");
        if (table.est_occupee_par_fusion || table.tables_fusionnees) {
            throw new Error("Cette table fait partie d'une fusion et ne peut pas être réservée séparément.");
        }

        // Vérification Conflit Temps Réel : Table occupée maintenant ?
        // Si la réservation est pour "tout de suite" (dans les 2h), on vérifie si une session est active.
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        if (dateHeureDebut >= now && dateHeureDebut <= twoHoursLater) {
            const sessionActive = await tx.tsessiontable.findFirst({
                where: {
                    table_id: Number(table_id),
                    statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT'] }
                }
            });

            if (sessionActive) {
                throw new Error("Impossible de réserver : Cette table est actuellement occupée par des clients.");
            }
        }

        const startOfDay = new Date(dateJour);
        const endOfDay = new Date(dateJour);
        endOfDay.setHours(23, 59, 59, 999);

        const reservationsExistantes = await tx.treservation.findMany({
            where: {
                table_id: Number(table_id),
                date_reservation: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                statut_reservation: { in: [StatutReservation.EN_ATTENTE, StatutReservation.CONFIRMEE, StatutReservation.ARRIVEE] }
            }
        });

        const conflit = reservationsExistantes.find(res => {
            const resDebut = new Date(res.date_reservation);
            const resHeure = new Date(res.heure_reservation);
            resDebut.setHours(
                resHeure.getUTCHours(),
                resHeure.getUTCMinutes(),
                resHeure.getUTCSeconds(),
                0
            );
            const resFin = new Date(resDebut.getTime() + DUREE_RESERVATION_MS);

            return (resDebut < dateHeureFin && resFin > dateHeureDebut);
        });

        if (conflit) {
            const heureConflit = new Date(conflit.heure_reservation).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            throw new Error(`Conflit : Une réservation existe déjà à ${heureConflit} pour cette table (créneau de 2h).`);
        }

        const reservation = await tx.treservation.create({
            data: {
                client_id: data.client_id ? Number(data.client_id) : null,
                nom_client: data.nom_client,
                email_client: data.email_client,
                telephone_client: data.telephone_client,
                date_reservation: dateJour,
                heure_reservation: dateHeureDebut,
                nb_personnes: Number(data.nb_personnes),
                commentaire_reservation: data.commentaire_reservation || null,
                statut_reservation: StatutReservation.EN_ATTENTE,
                table_id: Number(table_id)
            },
            include: {
                tclient: true
            }
        });

        if (data.client_id) {
            await checkTablePreference(Number(data.client_id), Number(table_id));
        }

        return {
            ...reservation,
            heure_fin_estimee: dateHeureFin
        };
    });
}

/**
 * Met à jour une réservation.
 */
export async function updateReservation(id: number | string, data: any) {
    return prisma.$transaction(async (tx) => {
        const oldRes = await tx.treservation.findUnique({ where: { id: Number(id) } });

        const updated = await tx.treservation.update({
            where: { id: Number(id) },
            data,
            include: { tclient: true }
        });

        if (data.statut_reservation === 'ARRIVEE' && oldRes?.statut_reservation !== 'ARRIVEE') {
            const existingSession = await tx.tsessiontable.findFirst({
                where: {
                    table_id: updated.table_id,
                    statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT', 'A_DEBARRASSER'] }
                }
            });

            if (!existingSession) {
                await tx.tsessiontable.create({
                    data: {
                        date_heure_debut: new Date(),
                        statut_session: 'ACTIVE',
                        table_id: updated.table_id
                    }
                });
            }
        }

        return updated;
    });
}

/**
 * Annule une réservation selon son statut.
 * Toutes les réservations sont conservées (soft delete) pour préserver
 * l'historique et les statistiques (taux de conversion, patterns).
 */
export async function deleteReservation(id: number | string) {
    const reservation = await prisma.treservation.findUnique({ where: { id: Number(id) } });
    if (!reservation) throw new Error("Réservation introuvable.");

    if (['ANNULEE', 'TERMINEE'].includes(reservation.statut_reservation)) {
        throw new Error("Cette réservation est déjà clôturée.");
    }

    return prisma.treservation.update({
        where: { id: Number(id) },
        data: { statut_reservation: StatutReservation.ANNULEE }
    });
}

/**
 * Annule une réservation existante.
 * Vérifie que l'utilisateur est propriétaire de la réservation ou manager.
 * Une réservation ne peut être annulée que si elle n'est pas déjà terminée/annulée.
 */
export async function cancelReservation(reservationId: number | string, clientId?: number | string) {
    const id = Number(reservationId);
    if (isNaN(id)) throw new Error('ID réservation invalide');

    const reservation = await prisma.treservation.findUnique({
        where: { id }
    });

    if (!reservation) {
        throw new Error('Réservation introuvable');
    }
    if (clientId) {
        const cId = Number(clientId);
        if (!isNaN(cId) && reservation.client_id !== cId) {
            throw new Error('Vous n\'êtes pas autorisé à annuler cette réservation');
        }
    }

    // Vérifier que la réservation peut être annulée
    if (['ANNULEE', 'TERMINEE', 'ARRIVEE', 'NON_PRESENT'].includes(reservation.statut_reservation)) {
        throw new Error(`Cette réservation ne peut pas être annulée (statut: ${reservation.statut_reservation})`);
    }

    // Annuler la réservation
    return await prisma.treservation.update({
        where: { id },
        data: {
            statut_reservation: StatutReservation.ANNULEE
        }
    });
}

/**
 * Gestion des No-Shows 
 */
export const checkNoShows = async () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = await prisma.treservation.findMany({
        where: {
            statut_reservation: StatutReservation.CONFIRMEE,
            date_reservation: today
        }
    });

    let processed = 0;
    for (const res of reservations) {
        const resDateTime = new Date(res.date_reservation);
        const timePart = new Date(res.heure_reservation);
        resDateTime.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);

        const deadline = new Date(resDateTime.getTime() + 20 * 60000); // 20 min de tolérance

        if (now > deadline) {
            logger.info(`[NO-SHOW] Réservation #${res.id} (Client: ${res.nom_client}) marquée comme NON_PRESENT.`);

            await prisma.treservation.update({
                where: { id: res.id },
                data: { statut_reservation: StatutReservation.NON_PRESENT }
            });

            if (res.empreinte_bancaire) {
                const penalty = res.nb_personnes * 20;
                logger.info(`[PENALTY] Prélèvement de ${penalty}€ sur l'empreinte ${res.empreinte_bancaire} pour la réservation #${res.id}`);
            }
            processed++;
        }
    }
    if (processed > 0) logger.info(`[CRON] ${processed} réservations marquées comme No-Show.`);
};
