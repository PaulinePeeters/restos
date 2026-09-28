import { logger } from '../utils/logger.js';
import { prisma } from '../db.js';
import { ajouterPoints } from './fidelite.service.js';
import { sendEmail } from '../utils/mailer.js';
import { reviewRequestEmail } from '../utils/emailTemplates.js';

/**
 * Arrondit un nombre à 2 décimales.
 */
function roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
}

/**
 * Traite un paiement pour une commande spécifique.
 */
export async function processPayment(commandeId: number | string, montantBrut: number, methode: any, pourboire: number = 0) {
    const id = Number(commandeId);

    return prisma.$transaction(async (tx) => {
        const commande = await tx.tcommande.findUnique({
            where: { id },
            include: { tclient: true }
        });

        if (!commande) throw new Error("Commande non trouvée");

        // Calcul du reste à payer actuel
        const paiementsExistants = await tx.tpaiement.findMany({
            where: { commande_id: id, etat_paiement: 'PAYE' }
        });

        const totalDejaPaye = paiementsExistants.reduce((acc, p) => acc + Number(p.montant_paiement), 0);
        const resteAPayer = roundMoney(Number(commande.total_estime_commande) - totalDejaPaye);

        const montantNet = roundMoney(montantBrut - pourboire);

        if (montantNet > resteAPayer + 0.01) {
            throw new Error(`Le montant net (${montantNet}€) est supérieur au reste à payer (${resteAPayer}€)`);
        }

        // Création du paiement
        const paiement = await tx.tpaiement.create({
            data: {
                commande_id: id,
                montant_paiement: montantNet,
                date_paiement: new Date(),
                methode_paiement: methode,
                etat_paiement: 'PAYE'
            }
        });

        // Calcul du nouveau solde
        const nouveauTotalPaye = roundMoney(totalDejaPaye + montantNet);
        const nouveauReste = roundMoney(Number(commande.total_estime_commande) - nouveauTotalPaye);

        let statutPaiement = 'PAYE_PARTIEL';

        // Clôture de la commande si tout est payé
        if (nouveauReste <= 0.01) {
            statutPaiement = 'PAYE_COMPLET';

            await tx.tcommande.update({
                where: { id },
                data: { statut_commande: 'TERMINEE' }
            });

            if (commande.client_id) {
                await ajouterPoints(commande.client_id, Number(commande.total_estime_commande));
            }

            // ferme la session et libère la table
            if (commande.session_table_id) {
                await tx.tsessiontable.update({
                    where: { id: commande.session_table_id },
                    data: { statut_session: 'TERMINEE', date_heure_fin: new Date() }
                });
            }
        }

        return {
            statut: statutPaiement,
            totalPaye: nouveauTotalPaye,
            reste: nouveauReste <= 0.01 ? 0 : nouveauReste,
            paiementId: paiement.id,
            client: commande.tclient
        };
    }).then(async (result) => {
        if (result.statut === 'PAYE_COMPLET' && result.client && result.client.email_client) {
            try {
                const html = reviewRequestEmail(result.client.nom_client, id);
                sendEmail(result.client.email_client, 'Votre avis nous intéresse !', html).catch(err => logger.error("Erreur envoi email avis:", err));
            } catch (emailError) {
                logger.error("Erreur préparation email avis:", emailError);
            }
        }
        return result;
    });
}

/**
 * Calcule le partage de l'addition (split bill).
 */
export async function splitBill(commandeId: number | string, type: 'EQUAL' | 'ITEM', nbPersonnes = 1, itemsSelected: string[] = []) {
    const id = Number(commandeId);

    const commande = await prisma.tcommande.findUnique({
        where: { id },
        include: { tlignecommande: { include: { tplat: true } } }
    });

    if (!commande) throw new Error("Commande non trouvée");

    // Calculer ce qui a déjà été payé
    const paiements = await prisma.tpaiement.findMany({
        where: { commande_id: id, etat_paiement: 'PAYE' }
    });
    const totalPaye = paiements.reduce((acc, p) => acc + Number(p.montant_paiement), 0);
    const resteAPayer = roundMoney(Number(commande.total_estime_commande) - totalPaye);

    if (resteAPayer <= 0.01) return { resteAPayer: 0, message: "Commande déjà soldée" };

    if (type === 'EQUAL') {
        if (nbPersonnes < 1) throw new Error("Nombre de personnes invalide");

        // éviter les décimales infinies
        const baseMontant = Math.floor((resteAPayer / nbPersonnes) * 100) / 100;
        const totalBase = baseMontant * nbPersonnes;
        const resteCentimes = roundMoney(resteAPayer - totalBase);

        return {
            type: 'EQUAL',
            total: resteAPayer,
            nbPersonnes,
            montantParPersonne: baseMontant,
            montantDernierPersonne: roundMoney(baseMontant + resteCentimes),
            resteIndivisible: resteCentimes,
            message: resteCentimes > 0 ? `Le dernier convive doit payer ${roundMoney(baseMontant + resteCentimes)}€` : undefined
        };
    } else if (type === 'ITEM') {
        let totalItems = 0;
        const details: any[] = [];

        for (const ligneId of itemsSelected) {
            const ligne = commande.tlignecommande.find(l => l.id === Number(ligneId));
            if (ligne) {
                const prixLigne = Number(ligne.prix_unitaire || ligne.tplat.prix_plat) * ligne.quantite;
                totalItems += prixLigne;
                details.push({ ligneId: ligne.id, nom: ligne.tplat.nom_plat, montant: roundMoney(prixLigne) });
            }
        }

        return {
            type: 'ITEM',
            totalSelectionne: roundMoney(totalItems),
            details
        };
    }

    throw new Error("Type de split invalide");
}
