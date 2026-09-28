import { logger } from '../utils/logger.js';
import { prisma } from '../db.js';
import { sendEmail } from '../utils/mailer.js';
import { eventEmail } from '../utils/emailTemplates.js';
import { CONFIG_KEYS, getConfigNumber } from './configuration.service.js';

/**
 * Interface pour batcher les emails
 */
const EMAIL_BATCH_SIZE = 50;
const EMAIL_BATCH_DELAY_MS = 2000; // 2 secondes entre les lots

/**
 * Ajoute des points de fidélité à un client.
 * 1€ = 1 point
 */
export async function ajouterPoints(clientId: number, montant: any) {
    if (!clientId) return;

    let montantFloat = 0;
    if (typeof montant === 'number') montantFloat = montant;
    else if (montant && typeof montant.toNumber === 'function') montantFloat = montant.toNumber();
    else if (montant && montant.toString) montantFloat = parseFloat(montant.toString());

    if (isNaN(montantFloat) || montantFloat <= 0) return;

    const pointsPerEuro = await getConfigNumber(CONFIG_KEYS.POINTS_PER_EURO, 1);
    const pointsGagnes = Math.floor(montantFloat * pointsPerEuro);

    if (pointsGagnes <= 0) return;

    try {
        await prisma.tclient.update({
            where: { id_client: clientId },
            data: {
                points_fidelite: {
                    increment: pointsGagnes
                }
            }
        });
        logger.debug(`Client ${clientId} a gagné ${pointsGagnes} points (Ratio: ${pointsPerEuro}).`);
    } catch (error) {
        logger.error('Erreur ajout points :', error);
    }
}

/**
 * Utilise des points pour obtenir une récompense.
 * déduction points + création historique.
 */
export async function utiliserPoints(clientId: number, recompenseId: number) {
    return prisma.$transaction(async (tx) => {
        const client = await tx.tclient.findUnique({ where: { id_client: clientId } });
        const recompense = await tx.trecompense.findUnique({ where: { id: recompenseId } });

        if (!client || !recompense) throw new Error("Client ou récompense introuvable.");

        if (client.points_fidelite < recompense.cout_points) {
            throw new Error(`Solde insuffisant (Requis: ${recompense.cout_points}, Actuel: ${client.points_fidelite})`);
        }

        // Décrémenter les points
        await tx.tclient.update({
            where: { id_client: clientId },
            data: { points_fidelite: { decrement: recompense.cout_points } }
        });

        // Enregistrer l'obtention
        await tx.tclient_recompense.create({
            data: {
                client_id: clientId,
                recompense_id: recompenseId,
                date_obtention: new Date()
            }
        });

        return {
            success: true,
            pointsRestants: client.points_fidelite - recompense.cout_points,
            message: `Récompense "${recompense.nom}" obtenue !`
        };
    });
}

/**
 * Met à jour les préférences de table d'un client.
 */
export async function checkTablePreference(clientId: number, tableId: number) {
    if (!clientId || !tableId) return;

    try {
        await prisma.tclient_preference_table.upsert({
            where: {
                client_id_table_id: {
                    client_id: clientId,
                    table_id: tableId
                }
            },
            update: {
                nombre_reservations: { increment: 1 }
            },
            create: {
                client_id: clientId,
                table_id: tableId,
                nombre_reservations: 1
            }
        });
    } catch (error) {
        logger.error('Erreur mise à jour préférence table :', error);
    }
}

/**
 * Récupère les offres de promotion actives actuellement.
 */
export async function getOffresActives() {
    const now = new Date();
    return prisma.tevenement.findMany({
        where: {
            type: 'PROMOTION',
            actif: true,
            date_debut: { lte: now },
            date_fin: { gte: now }
        }
    });
}

/**
 * Récupère la table favorite d'un client.
 */
export async function getTableFavorite(clientId: number) {
    return prisma.tclient_preference_table.findFirst({
        where: { client_id: clientId },
        orderBy: { nombre_reservations: 'desc' },
        include: { ttableresto: true }
    });
}

/**
 * Crée une nouvelle offre promotionnelle.
 */
export async function createOffre(data: any) {
    return prisma.tevenement.create({
        data: {
            titre: data.titre || data.nom_event,
            date_debut: new Date(data.date_debut),
            date_fin: new Date(data.date_fin),
            pourcentage_reduction: data.pourcentage_reduction,
            description: data.description,
            type: 'PROMOTION',
            actif: true,
            format: 'CARTE',
            text_align: 'center',
            button_style: 'filled',
            opacity: 0.0
        }
    });
}

/**
 * Désactive une offre promotionnelle.
 */
export async function deleteOffre(id: number | string) {
    const offre = await prisma.tevenement.findUnique({ where: { id: Number(id) } });
    if (!offre) throw new Error("Offre introuvable.");

    return prisma.tevenement.update({
        where: { id: Number(id) },
        data: { actif: false }
    });
}

/**
 * Récupère toutes les offres promotionnelles (toutes dates confondues).
 */
export async function getAllOffres() {
    return prisma.tevenement.findMany({
        where: { type: 'PROMOTION' },
        orderBy: { date_debut: 'desc' }
    });
}

/**
 * Récupère une offre par son ID.
 */
export async function getOffreById(id: number | string) {
    return prisma.tevenement.findUnique({
        where: { id: Number(id) }
    });
}

/**
 * Récupère tous les clients ayant renseigné une adresse email.
 */
export async function getAllClientsWithEmail() {
    return prisma.tclient.findMany({
        where: {
            actif: true,
            email_client: { not: null as any }
        },
        select: {
            email_client: true,
            nom_client: true
        }
    });
}

/**
 * delay pour le batching
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Envoie un email de broadcast pour une offre.
 * Traite les emails par lots pour éviter de saturer le serveur SMTP.
 */
export async function broadcastOfferToClients(offre: any): Promise<number> {
    const clients = await prisma.tclient.findMany({
        where: {
            actif: true,
            email_client: { not: null as any }
        },
        select: { email_client: true }
    });

    const html = eventEmail(offre.titre, offre.description || '');
    let mailsSent = 0;

    (async () => {
        logger.debug(`[BROADCAST] Début d'envoi pour ${clients.length} clients...`);

        for (let i = 0; i < clients.length; i += EMAIL_BATCH_SIZE) {
            const batch = clients.slice(i, i + EMAIL_BATCH_SIZE);

            await Promise.all(batch.map(client => {
                if (client.email_client) {
                    return sendEmail(client.email_client, `Événement Spécial : ${offre.titre}`, html)
                        .then(() => mailsSent++)
                        .catch(err => logger.error(`[MAIL ERROR] ${client.email_client}`, err.message));
                }
                return Promise.resolve();
            }));

            // Pause entre les lots pour soulager le SMTP
            if (i + EMAIL_BATCH_SIZE < clients.length) {
                await delay(EMAIL_BATCH_DELAY_MS);
            }
        }
        logger.debug(`[BROADCAST] Terminé. ${mailsSent} emails envoyés.`);
    })();
    return clients.length;
}

/**
 * Active ou désactive le statut VIP d'un client.
 */
export async function toggleVipStatus(clientId: number, est_vip: boolean) {
    if (!clientId) throw new Error("ID Client manquant.");
    return prisma.tclient.update({
        where: { id_client: clientId },
        data: { est_vip: est_vip }
    });
}
