import { TypeReduction, TypeCommande, MethodePaiement } from '@prisma/client';
import type { tcommande, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ajouterPoints, getOffresActives } from './fidelite.service.js';
import { useCheque } from './cheques.service.js';
import { sendEmail } from '../utils/mailer.js';
import { orderConfirmationEmail, reviewRequestEmail } from '../utils/emailTemplates.js';

import * as stockService from './stock.service.js';
import { getOrCreateSessionForTable } from './sessions.service.js';
import { getIo } from '../socket.js';
import { notificationsService } from './notifications.service.js';
import { logger } from '../utils/logger.js';
import { BusinessError } from '../utils/AppError.js';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export interface CommandeItem {
    id: number | string;
    quantite: number;
    prix_unitaire?: number;
    prix_plat?: number;
    commentaire?: string;
    commentaires?: string;
    cuisson?: string;
    format?: string;
    categorieService?: string;
    restrictions_alimentaires?: string[] | string;
    options?: Record<string, string>;
}

export interface CreateCommandeData {
    client_id?: number | string | null;
    items: CommandeItem[];
    type_commande?: "SUR_PLACE" | "A_EMPORTER" | "LIVRAISON";
    mode_paiement?: string;
    commentaire_global?: string | null;
    table_id?: number | string | null;
    session_table_id?: number | string | null;
    date_heure_souhaitee?: string | Date | null;
    adresse?: any;
    tel_livraison?: string;
    pourboire?: number;
    invoiceData?: any;
}

/**
 * Arrondit un montant à 2 décimales.
 */
function roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
}

// ---- HELPERS ----
async function _calculerTotal(items: CommandeItem[], data: CreateCommandeData) {
    const platIds = items.map(i => Number(i.id));
    const plats = await prisma.tplat.findMany({
        where: { id: { in: platIds } },
        include: { tplat_format: true }
    });
    const platMap = new Map(plats.map(p => [p.id, p]));

    let total_estime = roundMoney(items.reduce((acc: number, item: CommandeItem) => {
        const plat = platMap.get(Number(item.id));
        let prix = 0;
        if (plat) {
            prix = Number(plat.prix_plat);
            if (item.format) {
                const formatInfo = plat.tplat_format?.find((f: any) => f.nom_format === item.format);
                if (formatInfo) prix = Number(formatInfo.prix);
            }
        }
        item.prix_unitaire = prix;
        return acc + prix * item.quantite;
    }, 0));

    const pourboire = data.pourboire ? roundMoney(Number(data.pourboire)) : 0;
    if (pourboire < 0 || pourboire > 1000) throw new Error("Pourboire invalide");
    if (pourboire > 0) total_estime = roundMoney(total_estime + pourboire);

    const offres = await getOffresActives();
    let reduction = 0;
    if (offres.length > 0) {
        const meilleureOffre = offres.reduce((prev: any, current: any) => (prev.pourcentage_reduction > current.pourcentage_reduction) ? prev : current);
        const totalHorsPourboire = total_estime - pourboire;
        reduction = roundMoney((totalHorsPourboire * Number(meilleureOffre.pourcentage_reduction || 0)) / 100);
        total_estime = roundMoney(total_estime - reduction);
        logger.debug(`Offre appliquée : ${meilleureOffre.titre} (-${meilleureOffre.pourcentage_reduction}%)`);
    }

    let commentaireFinal = data.commentaire_global || '';
    if (reduction > 0) commentaireFinal += ` (Réduction: -${reduction.toFixed(2)}€)`;
    if (pourboire > 0) commentaireFinal += ` (Pourboire: +${pourboire.toFixed(2)}€)`;

    return { total_estime, commentaireFinal };
}

async function _emettreSocket(commandeComplete: any, type_commande: string) {
    try {
        const io = getIo();
        io.to('cuisinier').emit('nouvelle_commande', commandeComplete);
        io.to('serveur').emit('nouvelle_commande', commandeComplete);
        io.to('manager').emit('nouvelle_commande', commandeComplete);
        io.to('barman').emit('nouvelle_commande', commandeComplete);
        io.emit('menu_updated');

        if (type_commande === 'LIVRAISON') {
            io.to('livreur').emit('nouvelle_commande', commandeComplete);
        }
        logger.debug(`[SOCKET] nouvelle_commande émise pour #${commandeComplete.id}`);
    } catch (err) {
        logger.error("Erreur émission socket:", err);
    }
}

async function _envoyerEmailConfirmation(commandeId: number, total_estime: number, data: CreateCommandeData, client_id: any, commandeComplete: any) {
    if (!client_id && !data.invoiceData) return;

    try {
        const client = client_id ? await prisma.tclient.findUnique({ where: { id_client: Number(client_id) } }) : null;
        const emailDestinataire = client?.email_client;

        if (data.invoiceData) {
            const { generateReceipt } = await import('./receipts.service.js');
            const pdfBuffer = await generateReceipt(commandeId, data.invoiceData);
            if (emailDestinataire) {
                await sendEmail(emailDestinataire, `Votre Facture - Commande #${commandeId}`,
                    `<p>Merci de votre commande. Votre facture est disponible.</p><p>Total: ${total_estime.toFixed(2)}€</p>`
                );
            }
        } else if (emailDestinataire && commandeComplete && client) {
            const html = orderConfirmationEmail(client.nom_client, commandeId, commandeComplete.tlignecommande as any, total_estime);
            await sendEmail(emailDestinataire, `Confirmation de commande #${commandeId}`, html);
        }
    } catch (e) {
        logger.error("Erreur envoi email confirmation/facture:", e);
    }
}

async function _handlePaiementComplet(commandeId: number, totalPaye: number, commande: any) {
    let nouveauStatut = commande.statut_commande;
    if (commande.statut_commande === 'EN_ATTENTE') nouveauStatut = 'EN_PREPARATION';
    else if (commande.statut_commande === 'SERVIE' || commande.statut_commande === 'LIVREE' || commande.statut_commande === 'EN_PREPARATION') nouveauStatut = 'TERMINEE';

    await prisma.tcommande.update({
        where: { id: commandeId },
        data: { statut_commande: nouveauStatut }
    });

    if (commande.client_id) {
        await ajouterPoints(commande.client_id, Number(commande.total_estime_commande));
    }

    if (commande.session_table_id) {
        await prisma.tsessiontable.update({
            where: { id: commande.session_table_id },
            data: { statut_session: 'A_DEBARRASSER' }
        });
    }

    if (commande.tclient && commande.tclient.email_client) {
        try {
            const html = reviewRequestEmail(commande.tclient.nom_client, commandeId);
            await sendEmail(commande.tclient.email_client, 'Votre avis nous intéresse !', html);
        } catch (e) {
            logger.error("Erreur envoi email avis:", e);
        }
    }

    return { statut: 'PAYE_COMPLET', totalPaye };
}
// ---- FIN HELPERS ----

/**
 * Crée une nouvelle commande avec ses lignes et paiement.
 * création + déduction des stocks.
 */
export async function creerCommandeService(data: CreateCommandeData) {
    const {
        client_id = null,
        items,
        type_commande = "SUR_PLACE",
        mode_paiement = "SUR_PLACE",
        table_id = null,
        session_table_id = null,
        date_heure_souhaitee = null
    } = data;

    const typesValides = ["SUR_PLACE", "A_EMPORTER", "LIVRAISON"];
    const modesPaiementValides = ["SUR_PLACE", "EN_LIGNE", "ESPECES", "CB", "CHEQUE_CADEAU", "TICKET_RESTO", "BANCONTACT", "PAYCONIQ", "PAYPAL"];
    
    if (!typesValides.includes(type_commande)) throw new Error("Type de commande invalide.");
    if (!modesPaiementValides.includes(mode_paiement)) throw new Error(`Mode de paiement invalide: ${mode_paiement}`);
    if (!items || !Array.isArray(items) || items.length === 0) throw new Error("Aucun article dans la commande.");

    let session_id = session_table_id;
    if (type_commande !== 'SUR_PLACE') {
        // Un client avec un vieux table_id dans son localStorage a pu créer une session 
        // fantôme via /menu-access. On nettoie les sessions vides pour libérer la table.
        const tableIdToCheck = table_id || (session_id ? (await prisma.tsessiontable.findUnique({ where: { id: Number(session_id) } }))?.table_id : null);
        
        if (tableIdToCheck) {
             const activeSessions = await prisma.tsessiontable.findMany({
                 where: {
                     table_id: Number(tableIdToCheck),
                     statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT'] }
                 },
                 include: { tcommande: true }
             });
             
             for (const s of activeSessions) {
                 if (s.tcommande.length === 0) {
                     await prisma.tsessiontable.delete({ where: { id: s.id } });
                 }
             }
        }
        session_id = null;
    } else {
        if (session_id) {
            const existingSession = await prisma.tsessiontable.findUnique({ where: { id: Number(session_id) } });
            if (!existingSession) session_id = null;
        }
        if (!session_id && table_id) {
            const session = await getOrCreateSessionForTable(table_id);
            session_id = session.id;
        }
    }

    const { total_estime, commentaireFinal } = await _calculerTotal(items, data);

    const isPaid = !["SUR_PLACE", "EN_LIGNE"].includes(mode_paiement);

    const nouvelleCommande = await prisma.$transaction(async (tx) => {
        // Vérification et déduction des stocks
        const collectedAlerts: string[] = [];
        const collectedIngredientIds: number[] = [];
        for (const item of items) {
            const available = await stockService.checkDishAvailability(item.id, tx);
            if (available < item.quantite) {
                throw new Error(`Stock insuffisant pour le plat #${item.id} (Dispo: ${available}, Demandé: ${item.quantite})`);
            }
            const { alerts, ingredientIds } = await stockService.deductIngredients(item.id, item.quantite, tx);
            collectedAlerts.push(...alerts);
            collectedIngredientIds.push(...ingredientIds);
        }

        const commande = await tx.tcommande.create({
            data: {
                client_id: client_id ? Number(client_id) : null,
                session_table_id: session_id ? Number(session_id) : null,
                type_commande: type_commande as TypeCommande,
                date_heure_commande: new Date(),
                date_heure_souhaitee: date_heure_souhaitee ? new Date(date_heure_souhaitee) : null,
                adresse_livraison: type_commande === 'LIVRAISON' && data.adresse ? 
                    `${data.adresse.rue}, ${data.adresse.codePostal} ${data.adresse.ville}` : null,
                tel_livraison: type_commande === 'LIVRAISON' ? data.tel_livraison : null,
                statut_commande: "EN_ATTENTE",
                commentaire_global: commentaireFinal.trim() || null,
                total_estime_commande: total_estime,
                tlignecommande: {
                    create: items.map((item: CommandeItem) => {
                        let restrictions = item.restrictions_alimentaires;
                        if (Array.isArray(restrictions)) {
                            restrictions = restrictions.join(', ');
                        }
                        return {
                            plat_id: Number(item.id),
                            quantite: item.quantite,
                            prix_unitaire: item.prix_unitaire,
                            commentaire: item.commentaire || item.commentaires || null,
                            cuisson: item.cuisson || item.options?.cuisson || null,
                            format: item.format || item.options?.format || null,
                            categorie_service: item.categorieService || item.options?.categorieService || 'CUISINE',
                            statut_service: 'EN_ATTENTE',
                            restrictions_alimentaires: restrictions || null
                        };
                    }) as any
                },
                tpaiement: {
                    create: {
                        montant_paiement: total_estime,
                        date_paiement: new Date(),
                        methode_paiement: mode_paiement as MethodePaiement,
                        etat_paiement: isPaid ? "PAYE" : "EN_ATTENTE",
                    }
                }
            },
            include: {
                tlignecommande: true,
                tpaiement: true,
            }
        });

        return { commande, collectedAlerts, collectedIngredientIds };
    });

    if (nouvelleCommande.collectedAlerts.length > 0) {
        logger.warn(`[STOCK ALERT] Stock bas pour commande #${nouvelleCommande.commande.id}:`, nouvelleCommande.collectedAlerts);
        // Émettre les notifications de stock bas
        await stockService.emitStockAlerts(nouvelleCommande.collectedAlerts, nouvelleCommande.collectedIngredientIds);
    }

    let commandeComplete: any = null;
    try {
        commandeComplete = await prisma.tcommande.findUnique({
            where: { id: nouvelleCommande.commande.id },
            include: {
                tlignecommande: { include: { tplat: { include: { tcategorieplat: true } } } },
                tsessiontable: { include: { ttableresto: true } },
                tpaiement: true,
                tclient: true
            }
        });

        if (commandeComplete) {
            await _emettreSocket(commandeComplete, type_commande as string);
        }
    } catch (err) {
        logger.error("Erreur émission socket:", err);
    }

    await _envoyerEmailConfirmation(nouvelleCommande.commande.id, total_estime, data, client_id, commandeComplete);

    return nouvelleCommande.commande;
}
/**
 * Récupère les commandes actives (En attente, En préparation, Servie).
 */
export async function getCommandesActivesService() {
    return await prisma.tcommande.findMany({
        where: {
            statut_commande: {
                in: ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE']
            }
        },
        include: {
            tlignecommande: {
                include: {
                    tplat: {
                        include: {
                            tcategorieplat: true
                        }
                    }
                }
            },
            tsessiontable: {
                include: {
                    ttableresto: true
                }
            },
            tpaiement: true
        },
        orderBy: {
            date_heure_commande: 'asc'
        }
    });
}


/**
 * Récupère les commandes en attente ou en préparation pour la cuisine.
 */
export async function getCommandesCuisineService() {
    return await prisma.tcommande.findMany({
        where: {
            statut_commande: {
                in: ['EN_ATTENTE', 'EN_PREPARATION']
            }
        },
        include: {
            tlignecommande: {
                include: {
                    tplat: {
                        include: {
                            tcategorieplat: true
                        }
                    }
                }
            },
            tsessiontable: {
                include: {
                    ttableresto: true
                }
            },
            tpaiement: true
        },
        orderBy: {
            date_heure_commande: 'asc'
        }
    });
}

/**
 * Ajoute un paiement à une commande. Gère le statut et les points fidélité.
 */
export async function addPaiement(commandeId: number | string, montant: number, methode: any) {
    await prisma.tpaiement.create({
        data: {
            commande_id: Number(commandeId),
            montant_paiement: montant,
            date_paiement: new Date(),
            methode_paiement: methode,
            etat_paiement: 'PAYE'
        }
    });

    // Vérifier le total payé
    const paiements = await prisma.tpaiement.findMany({
        where: { commande_id: Number(commandeId), etat_paiement: 'PAYE' }
    });

    const totalPaye = paiements.reduce((acc, p) => acc + Number(p.montant_paiement), 0);

    const commande = await prisma.tcommande.findUnique({
        where: { id: Number(commandeId) },
        include: { tclient: true }
    });

    if (!commande) throw new Error("Commande non trouvée");

    if (totalPaye >= Number(commande.total_estime_commande) - 0.01) {
        return await _handlePaiementComplet(Number(commandeId), totalPaye, commande);
    }

    return { statut: 'PAYE_PARTIEL', totalPaye, reste: Number(commande.total_estime_commande) - totalPaye };
}

/**
 * Annule une commande avec justification.
 * Restaure le stock des ingrédients pour toutes les lignes non déjà annulées.
 */
export async function annulerCommande(id: number | string, justification: string) {
    const commandeId = Number(id);

    // Récupérer les lignes de commande pour savoir quoi restituer au stock
    const commande = await prisma.tcommande.findUnique({
        where: { id: commandeId },
        include: { tlignecommande: true }
    });

    if (!commande) throw new Error("Commande introuvable");

    // Seules les lignes non déjà annulées individuellement ont consommé du stock
    const lignesActives = commande.tlignecommande.filter(
        l => l.statut_service !== 'ANNULEE' as any
    );

    return await prisma.$transaction(async (tx) => {
        // Restituer les ingrédients au stock pour chaque ligne active
        for (const ligne of lignesActives) {
            await stockService.restoreIngredients(ligne.plat_id, ligne.quantite, tx);
        }

        return await tx.tcommande.update({
            where: { id: commandeId },
            data: {
                statut_commande: 'ANNULEE',
                justification_annulation: justification,
                tpaiement: {
                    updateMany: {
                        where: { etat_paiement: 'PAYE' },
                        data: { etat_paiement: 'ANNULE' }
                    }
                }
            }
        });
    });
}

/**
 * Applique une réduction à une commande.
 */
export async function appliquerReduction(id: number | string, type: string, valeur: number, isPourcentage = false) {
    const commande = await prisma.tcommande.findUnique({ where: { id: Number(id) } });
    if (!commande) throw new Error("Commande non trouvée");

    let nouveauTotal = Number(commande.total_estime_commande);

    let reduction = 0;
    if (isPourcentage) {
        reduction = (nouveauTotal * valeur) / 100;
    } else {
        reduction = valeur;
    }

    nouveauTotal = Math.max(0, nouveauTotal - reduction);

    return await prisma.tcommande.update({
        where: { id: Number(id) },
        data: {
            total_estime_commande: nouveauTotal,
            type_reduction: type as TypeReduction,
            commentaire_global: (commande.commentaire_global || '') + ` [Réduction ${type}: -${reduction.toFixed(2)}€]`
        }
    });
}

/**
 * Valide un paiement en ligne en attente.
 */
export async function validerPaiementEnLigne(id: number | string) {
    const commandeId = Number(id);

    await prisma.tpaiement.updateMany({
        where: { commande_id: commandeId, methode_paiement: 'EN_LIGNE', etat_paiement: 'EN_ATTENTE' },
        data: { etat_paiement: 'PAYE' }
    });

    const paiements = await prisma.tpaiement.findMany({
        where: { commande_id: commandeId, etat_paiement: 'PAYE' }
    });

    const totalPaye = paiements.reduce((acc, p) => acc + Number(p.montant_paiement), 0);

    const commande = await prisma.tcommande.findUnique({
        where: { id: commandeId },
        include: { tclient: true }
    });

    if (!commande) throw new Error("Commande non trouvée");

    if (totalPaye >= Number(commande.total_estime_commande) - 0.01) {
        return await _handlePaiementComplet(commandeId, totalPaye, commande);
    }

    return { statut: 'PAYE_PARTIEL', totalPaye };
}

/**
 * Refuse un paiement en ligne et annule la commande.
 */
export async function refuserPaiementEnLigne(id: number | string, justification = 'Paiement Refusé') {
    await prisma.tpaiement.updateMany({
        where: { commande_id: Number(id), methode_paiement: 'EN_LIGNE', etat_paiement: 'EN_ATTENTE' },
        data: { etat_paiement: 'ANNULE' }
    });

    return await prisma.tcommande.update({
        where: { id: Number(id) },
        data: {
            statut_commande: 'ANNULEE',
            justification_annulation: justification
        }
    });
}

/**
 * Utilise un chèque cadeau pour payer une commande.
 */
export async function payerParChequeCadeau(commandeId: number | string, code: string) {
    //  Calculer le reste à payer
    const paiements = await prisma.tpaiement.findMany({
        where: { commande_id: Number(commandeId), etat_paiement: 'PAYE' }
    });
    const totalPaye = paiements.reduce((acc, p) => acc + Number(p.montant_paiement), 0);

    const commande = await prisma.tcommande.findUnique({ where: { id: Number(commandeId) } });
    if (!commande) throw new Error("Commande non trouvée");

    const reste = Number(commande.total_estime_commande) - totalPaye;

    if (reste <= 0) throw new Error("Commande déjà payée");

    //  Utiliser le chèque
    const { montantUtilise } = await useCheque(code, reste);

    //  Enregistrer le paiement
    return await addPaiement(commandeId, montantUtilise, 'CHEQUE_CADEAU');
}

/**
 * Met à jour le statut de service d'une ligne de commande.
 */
export async function updateLigneStatut(ligneId: number | string, statut: any) {
    const updated = await prisma.tlignecommande.update({
        where: { id: Number(ligneId) },
        data: { statut_service: statut },
        include: { tplat: true, tcommande: { include: { tsessiontable: { include: { ttableresto: true } } } } }
    });

    try {
        const io = getIo();
        io.emit('statut_ligne_updated', updated);
        logger.debug(`[SOCKET] statut_ligne_updated émis pour ligne #${ligneId} -> ${statut}`);

        if (statut === 'PRET') {
            const typeCmd = updated.tcommande?.type_commande;
            let destInfo = '?';
            if (typeCmd === TypeCommande.SUR_PLACE) {
                destInfo = `Table ${updated.tcommande?.tsessiontable?.ttableresto?.numero_table || '?'}`;
            } else if (typeCmd === TypeCommande.A_EMPORTER) {
                destInfo = 'À emporter';
            } else if (typeCmd === TypeCommande.LIVRAISON) {
                destInfo = 'Livraison';
            }
            const plat = updated.tplat.nom_plat;
            await notificationsService.createNotification(
                'COMMANDE',
                `Plat prêt : ${plat} (${destInfo})`,
                'serveur',
                { commandeId: updated.commande_id, ligneId: updated.id }
            );
        }

        // Mise à jour automatique du statut de la commande globale
        const commande = await prisma.tcommande.findUnique({
            where: { id: updated.commande_id },
            include: { tlignecommande: true }
        });

        if (commande && commande.statut_commande !== 'TERMINEE' && commande.statut_commande !== 'ANNULEE' && commande.statut_commande !== 'LIVREE') {
            const lignes = commande.tlignecommande.filter((l: any) => l.statut_service !== 'ANNULEE');
            if (lignes.length > 0) {
                const allServies = lignes.every((l: any) => l.statut_service === 'SERVIE');
                const allPretsOrServies = lignes.every((l: any) => l.statut_service === 'PRET' || l.statut_service === 'SERVIE');
                const anyInPrep = lignes.some((l: any) => l.statut_service === 'EN_CUISINE' || l.statut_service === 'PRET' || l.statut_service === 'SERVIE');

                let newStatut = commande.statut_commande;
                if (allPretsOrServies) {
                    newStatut = 'SERVIE';
                } else if (anyInPrep && commande.statut_commande === 'EN_ATTENTE') {
                    newStatut = 'EN_PREPARATION';
                }

                if (newStatut !== commande.statut_commande) {
                    const updatedCommande = await prisma.tcommande.update({
                        where: { id: commande.id },
                        data: { statut_commande: newStatut }
                    });
                    io.emit('commande_modifiee', updatedCommande);
                    logger.debug(`[AUTO-STATUS] Commande #${commande.id} passée à ${newStatut}`);

                    if (commande.type_commande === TypeCommande.LIVRAISON && newStatut === 'SERVIE') {
                        await notificationsService.createNotification(
                            'COMMANDE',
                            `Commande #${commande.id} prête pour livraison`,
                            'livreur',
                            { commandeId: commande.id }
                        );
                    }
                }
            }
        }
    } catch (err) {
        logger.error("Erreur notification ou auto-status:", err);
    }

    return updated;
}

/**
 * Met à jour le statut global d'une commande.
 * Si le statut devient ANNULEE, restaure le stock des lignes actives.
 */
export async function updateCommandeStatutService(id: number | string, statut: any) {
    const commandeId = Number(id);

    // Récupérer l'état actuel avant mise à jour
    const avant = await prisma.tcommande.findUnique({
        where: { id: commandeId },
        include: { tlignecommande: true },
    });

    if (!avant) throw new Error("Commande introuvable");

    // Si on passe en ANNULEE, restaurer le stock des lignes non déjà annulées
    const updated = await prisma.$transaction(async (tx) => {
        if (statut === 'ANNULEE' && avant.statut_commande !== 'ANNULEE') {
            const lignesActives = avant.tlignecommande.filter(
                l => l.statut_service !== 'ANNULEE' as any
            );
            for (const ligne of lignesActives) {
                await stockService.restoreIngredients(ligne.plat_id, ligne.quantite, tx);
            }
            logger.debug(`[STOCK] Stock restauré pour ${lignesActives.length} ligne(s) de la commande #${commandeId}`);
        }

        return tx.tcommande.update({
            where: { id: commandeId },
            data: { statut_commande: statut },
            include: {
                tlignecommande: { include: { tplat: true } },
                tsessiontable: { include: { ttableresto: true } },
                tpaiement: true,
                tclient: true
            }
        });
    });

    try {
        const io = getIo();
        io.emit('nouvelle_commande', updated);
        logger.debug(`[SOCKET] Statut commande #${id} mis à jour -> ${statut}`);

        if (updated.type_commande === 'LIVRAISON' && (statut === 'EN_PREPARATION' || statut === 'SERVIE')) {
            await notificationsService.createNotification(
                'COMMANDE',
                `Commande #${id} mise à jour : ${statut}`,
                'livreur',
                { commandeId: updated.id }
            );
        }
    } catch (err) {
        logger.error("Erreur émission socket:", err);
    }

    return updated;
}

/**
 * Modifie les lignes d'une commande existante.
 * Gère le stock, recalcule le total et empêche de modifier des plats déjà servis ou prêts.
 */
export async function modifierLignesCommande(id: number | string, nouvellesLignes: any[]) {
    const commandeId = Number(id);

    return await prisma.$transaction(async (tx) => {
        const commande = await tx.tcommande.findUnique({
            where: { id: commandeId },
            include: { tlignecommande: { include: { tplat: true } } }
        });

        if (!commande) throw new BusinessError("NOT_FOUND", "Commande introuvable");
        if (['TERMINEE', 'ANNULEE', 'LIVREE'].includes(commande.statut_commande)) {
            throw new BusinessError("INVALID_STATE", `Impossible de modifier une commande avec le statut ${commande.statut_commande}`);
        }

        const anciennesLignes = commande.tlignecommande;
        const alertes: string[] = [];
        const ingIds: number[] = [];

        // Validation et Ajustement des stocks
        for (const oldLigne of anciennesLignes) {
            const newLigne = nouvellesLignes.find((l: any) => l.id && Number(l.id) === oldLigne.id);

            if (['PRET', 'SERVIE'].includes(oldLigne.statut_service as string)) {
                if (!newLigne) {
                    throw new BusinessError("INVALID_STATE", `Impossible de supprimer le plat '${oldLigne.tplat.nom_plat}' car il est déjà ${oldLigne.statut_service}.`);
                }
                if (Number(newLigne.quantite) !== oldLigne.quantite || Number(newLigne.plat_id) !== oldLigne.plat_id) {
                    throw new BusinessError("INVALID_STATE", `Impossible de modifier la quantité/le plat pour '${oldLigne.tplat.nom_plat}' car il est déjà ${oldLigne.statut_service}.`);
                }
            }

            if (!newLigne) {
                // Ligne supprimée : restituer le stock
                if ((oldLigne.statut_service as string) !== 'ANNULEE') {
                    await stockService.restoreIngredients(oldLigne.plat_id, oldLigne.quantite, tx);
                }
            } else if ((oldLigne.statut_service as string) !== 'ANNULEE') {
                // Ligne modifiée : ajuster le stock (seulement sur les quantités, le changement de plat_id n'est pas autorisé pour les plats en cours)
                if (Number(newLigne.plat_id) !== oldLigne.plat_id) {
                    throw new BusinessError("INVALID_ACTION", "Impossible de changer le plat d'une ligne existante. Veuillez supprimer et ajouter.");
                }
                const diff = Number(newLigne.quantite) - oldLigne.quantite;
                if (diff > 0) {
                    const available = await stockService.checkDishAvailability(oldLigne.plat_id, tx);
                    if (available < diff) throw new BusinessError("STOCK_ERROR", `Stock insuffisant pour augmenter la quantité de '${oldLigne.tplat.nom_plat}'`);
                    const { alerts, ingredientIds } = await stockService.deductIngredients(oldLigne.plat_id, diff, tx);
                    alertes.push(...alerts);
                    ingIds.push(...ingredientIds);
                } else if (diff < 0) {
                    await stockService.restoreIngredients(oldLigne.plat_id, Math.abs(diff), tx);
                }
            }
        }

        for (const newLigne of nouvellesLignes) {
            if (!newLigne.id) {
                // Nouvelle ligne : vérifier et déduire le stock
                const available = await stockService.checkDishAvailability(newLigne.plat_id, tx);
                if (available < Number(newLigne.quantite)) {
                    const platInfo = await tx.tplat.findUnique({ where: { id: Number(newLigne.plat_id) } });
                    throw new BusinessError("STOCK_ERROR", `Stock insuffisant pour '${platInfo?.nom_plat}'`);
                }
                const { alerts, ingredientIds } = await stockService.deductIngredients(newLigne.plat_id, Number(newLigne.quantite), tx);
                alertes.push(...alerts);
                ingIds.push(...ingredientIds);
            }
        }

        // MAJ des lignes en base
        const newIds = nouvellesLignes.filter((l: any) => l.id).map((l: any) => Number(l.id));
        const idsToDelete = anciennesLignes.filter(l => !newIds.includes(l.id)).map(l => l.id);

        if (idsToDelete.length > 0) {
            await tx.tlignecommande.deleteMany({ where: { id: { in: idsToDelete } } });
        }

        for (const newLigne of nouvellesLignes) {
            let restrictions = newLigne.restrictions_alimentaires;
            if (Array.isArray(restrictions)) restrictions = restrictions.join(', ');

            let prixUnitaire: number | null = null;
            if (newLigne.plat_id) {
                const platInfo = await tx.tplat.findUnique({ where: { id: Number(newLigne.plat_id) }, include: { tplat_format: true } });
                if (platInfo) {
                    prixUnitaire = Number(platInfo.prix_plat);
                    if (newLigne.format) {
                        const formatInfo = platInfo.tplat_format?.find(f => f.nom_format === newLigne.format);
                        if (formatInfo) prixUnitaire = Number(formatInfo.prix);
                    }
                }
            }

            if (newLigne.id) {
                await tx.tlignecommande.update({
                    where: { id: Number(newLigne.id) },
                    data: {
                        quantite: Number(newLigne.quantite),
                        prix_unitaire: prixUnitaire,
                        commentaire: newLigne.commentaire || null,
                        cuisson: newLigne.cuisson || null,
                        format: newLigne.format || null,
                        restrictions_alimentaires: restrictions || null
                    }
                });
            } else {
                await tx.tlignecommande.create({
                    data: {
                        commande_id: commandeId,
                        plat_id: Number(newLigne.plat_id),
                        quantite: Number(newLigne.quantite),
                        prix_unitaire: prixUnitaire,
                        commentaire: newLigne.commentaire || null,
                        cuisson: newLigne.cuisson || null,
                        format: newLigne.format || null,
                        categorie_service: newLigne.categorie_service || 'CUISINE',
                        statut_service: 'EN_ATTENTE',
                        restrictions_alimentaires: restrictions || null
                    }
                });
            }
        }

        // Recalculer le total
        const lignesApresMaj = await tx.tlignecommande.findMany({
            where: { commande_id: commandeId },
            include: { tplat: { include: { tplat_format: true } } }
        });

        const sumLignes = lignesApresMaj.filter(l => l.statut_service !== 'ANNULEE' as any).reduce((acc, l) => {
            let prix = Number(l.tplat.prix_plat);
            if (l.format) {
                const formatInfo = l.tplat.tplat_format?.find((f: any) => f.nom_format === l.format);
                if (formatInfo) prix = Number(formatInfo.prix);
            }
            return acc + prix * l.quantite;
        }, 0);

        let total_estime = sumLignes;
        
        await tx.tcommande.update({
            where: { id: commandeId },
            data: { total_estime_commande: roundMoney(total_estime) }
        });

        const commandeMiseAJour = await tx.tcommande.findUnique({
            where: { id: commandeId },
            include: {
                tlignecommande: { include: { tplat: { include: { tcategorieplat: true } } } },
                tsessiontable: { include: { ttableresto: true } },
                tpaiement: true,
                tclient: true
            }
        });

        return { commandeMiseAJour, alertes, ingIds };
    }).then(async (result) => {
        if (result.alertes.length > 0) {
            await stockService.emitStockAlerts(result.alertes, result.ingIds);
        }
        
        try {
            const io = getIo();
            io.emit('commande_modifiee', result.commandeMiseAJour);
            io.to('cuisinier').emit('nouvelle_commande', result.commandeMiseAJour); // Forcer un rafraîchissement
        } catch (err) {
            logger.error("Erreur émission socket modif commande:", err);
        }

        return result.commandeMiseAJour;
    });
}

/**
 * Récupère les commandes de type LIVRAISON en cours.
 */
export async function getLivraisonsService() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    return await prisma.tcommande.findMany({
        where: {
            type_commande: 'LIVRAISON',
            OR: [
                {
                    statut_commande: {
                        notIn: ['TERMINEE', 'ANNULEE', 'LIVREE']
                    }
                },
                {
                    statut_commande: 'LIVREE',
                    updated_at: {
                        gte: oneHourAgo
                    }
                }
            ]
        },
        include: {
            tclient: {
                include: {
                    tadresselivraison: {
                        where: { est_par_defaut: true }
                    }
                }
            },
            tlignecommande: {
                include: {
                    tplat: true
                }
            },
            tpaiement: true
        },
        orderBy: {
            updated_at: 'desc'
        }
    });
}
