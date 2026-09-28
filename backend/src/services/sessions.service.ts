import { prisma } from '../db.js';
import { ConflictError, NotFoundError } from '../utils/AppError.js';

const DUREE_RESERVATION_MS = 2 * 60 * 60 * 1000;

/**
 * Crée une session si aucune session active n'existe pour cette table.
 */
export const createSession = async (tableId: number, nb_couverts: number = 1) => {
    return await prisma.$transaction(async (tx) => {
        const reservationsActives = await tx.treservation.findMany({
            where: {
                table_id: tableId,
                statut_reservation: { in: ['EN_ATTENTE', 'CONFIRMEE'] }
            },
            orderBy: {
                date_reservation: 'desc'
            }
        });

        const now = new Date();

        for (const reservation of reservationsActives) {
            const startDate = new Date(reservation.date_reservation);
            const startTime = new Date(reservation.heure_reservation);

            if (isNaN(startDate.getTime()) || isNaN(startTime.getTime())) {
                continue;
            }

            startDate.setHours(
                startTime.getUTCHours(),
                startTime.getUTCMinutes(),
                startTime.getUTCSeconds(),
                0
            );

            const endDate = new Date(startDate.getTime() + DUREE_RESERVATION_MS);

            if (now >= startDate && now < endDate) {
                throw new ConflictError('Cette table est réservée et ne peut pas être ouverte par le serveur pendant le créneau de réservation.');
            }
        }

        const activeSession = await tx.tsessiontable.findFirst({
            where: {
                table_id: tableId,
                statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT', 'A_DEBARRASSER'] }
            }
        });

        if (activeSession) {
            throw new ConflictError('Une session est déjà ouverte pour cette table');
        }

        return await tx.tsessiontable.create({
            data: {
                date_heure_debut: new Date(),
                statut_session: 'ACTIVE',
                table_id: tableId,
                nb_couverts: nb_couverts,
            },
        });
    });
};

/**
 * Ferme une session (statut TERMINEE) et met à jour la réservation ARRIVEE associée à TERMINEE.
 */
export const closeSession = async (sessionId: number) => {
    return await prisma.$transaction(async (tx) => {
        // Récupérer la session
        const session = await tx.tsessiontable.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundError('Session');
        }

        //  Vérification des commandes en cours ou non payées
        const commandes = await tx.tcommande.findMany({
            where: {
                session_table_id: sessionId,
                statut_commande: { not: 'ANNULEE' } 
            },
            include: {
                tpaiement: true
            }
        });

        for (const cmd of commandes) {
            // Vérifier si commande terminée
            if (cmd.statut_commande !== 'TERMINEE') {
                throw new ConflictError(`Impossible de fermer : La commande #${cmd.id} est encore en statut ${cmd.statut_commande}.`);
            }

            // Vérifier si totalement payée
            const totalPaye = cmd.tpaiement
                .filter(p => p.etat_paiement === 'PAYE')
                .reduce((sum, p) => sum + Number(p.montant_paiement), 0);

            if (totalPaye < Number(cmd.total_estime_commande) - 0.01) {
                throw new ConflictError(`Impossible de fermer : La commande #${cmd.id} n'est pas totalement réglée (Reçu: ${totalPaye}€ / Total: ${cmd.total_estime_commande}€).`);
            }
        }

        // Mettre à jour toute réservation ARRIVEE associée à cette table
        const reservationArrivee = await tx.treservation.findFirst({
            where: {
                table_id: session.table_id,
                statut_reservation: 'ARRIVEE',
            },
            orderBy: {
                date_reservation: 'desc',
            },
        });

        if (reservationArrivee) {
            await tx.treservation.update({
                where: { id: reservationArrivee.id },
                data: { statut_reservation: 'TERMINEE' },
            });
        }

        // Fermeture de la session
        return tx.tsessiontable.update({
            where: { id: sessionId },
            data: {
                date_heure_fin: new Date(),
                statut_session: 'TERMINEE',
            },
        });
    });
};

/**
 * Retourne la session active d'une table, si elle existe.
 */
export const getActiveSessionByTable = async (tableId: number) => {
    return prisma.tsessiontable.findFirst({
        where: {
            table_id: tableId,
            statut_session: 'ACTIVE',
        },
    });
};

export const getAllTablesWithSessions = async () => {
    return prisma.ttableresto.findMany({
        where: { actif: true },
        include: {
            tsessiontable: {
                where: { statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT', 'A_DEBARRASSER'] } },
                orderBy: { date_heure_debut: 'desc' },
                take: 1,
                include: {
                    tcommande: {
                        where: { statut_commande: { in: ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE'] } },
                        include: {
                            tlignecommande: {
                                include: {
                                    tplat: true
                                }
                            }
                        }
                    }
                }
            },
            treservation: {
                where: { statut_reservation: { in: ['EN_ATTENTE', 'CONFIRMEE', 'ARRIVEE'] } },
                include: { tclient: true }
            }
        },
    });
};

/**
 * Récupère ou crée une session active pour une table donnée.
 * Utilisé principalement pour le scan QR Code.
 */
export async function getOrCreateSessionForTable(table_id: number | string) {
    const id = Number(table_id);

    const table = await prisma.ttableresto.findUnique({
        where: { id },
    });
    if (!table) throw new NotFoundError('Table');

    let session = await prisma.tsessiontable.findFirst({
        where: {
            table_id: id,
            statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT'] },
        },
    });

    if (!session) {
        session = await prisma.tsessiontable.create({
            data: {
                table_id: id,
                statut_session: 'ACTIVE',
                date_heure_debut: new Date(),
            },
        });
    }

    return session;
}

/**
 * Marque une session A_DEBARRASSER comme TERMINEE (table prête pour le prochain client).
 */
export const markTableReady = async (sessionId: number) => {
    const session = await prisma.tsessiontable.findUnique({
        where: { id: sessionId },
    });

    if (!session) throw new NotFoundError('Session');
    if (session.statut_session !== 'A_DEBARRASSER') {
        throw new ConflictError('Cette session n\'est pas en attente de débarrassage.');
    }

    return prisma.tsessiontable.update({
        where: { id: sessionId },
        data: {
            statut_session: 'TERMINEE',
            date_heure_fin: new Date(),
        },
    });
};
