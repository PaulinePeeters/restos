import { prisma } from '../db.js';
import { getTvaRate } from './configuration.service.js';
import type { tcommande, tlignecommande, tclient, tpaiement, tsessiontable, ttableresto, tplat } from '@prisma/client';

/**
 * Interface pour les données synthétisées.
 */
interface DailyDataSynthesis {
    date: string;
    synthese: {
        chiffre_affaires: number;
        tva_estimee: number;
        nb_commandes: number;
        panier_moyen: number;
        repartition_paiement: Record<string, number>;
    };
    details_commandes: (tcommande & {
        tlignecommande: (tlignecommande & { tplat: tplat })[];
        tpaiement: tpaiement[];
        tclient: tclient | null;
        tsessiontable: (tsessiontable & { ttableresto: ttableresto | null }) | null;
    })[];
}

/**
 * Échappe un champ pour le format CSV.
 */
function escapeCsvField(field: string | number | null | undefined): string {
    if (field === null || field === undefined) return '';
    const stringValue = String(field);
    if (/[;"\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export const exportsService = {
    /**
     * Récupère toutes les données de vente pour une date donnée (UTC).
     */
    async getDailyData(date: string | Date = new Date()): Promise<DailyDataSynthesis> {
        const targetDate = new Date(date);

        const startOfDay = new Date(Date.UTC(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            0, 0, 0, 0
        ));

        const endOfDay = new Date(Date.UTC(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            23, 59, 59, 999
        ));

        // Récupérer les commandes
        const commandes = await prisma.tcommande.findMany({
            where: {
                date_heure_commande: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                statut_commande: { not: 'ANNULEE' }
            },
            include: {
                tlignecommande: {
                    include: { tplat: true }
                },
                tpaiement: true,
                tclient: true,
                tsessiontable: {
                    include: { ttableresto: true }
                }
            },
            orderBy: { date_heure_commande: 'asc' }
        });

        let totalCA = 0;
        const repartitionPaiement: Record<string, number> = {};

        commandes.forEach(c => {
            totalCA += Number(c.total_estime_commande);

            c.tpaiement.forEach(p => {
                if (p.etat_paiement === 'PAYE') {
                    const methode = p.methode_paiement || 'INCONNU';
                    repartitionPaiement[methode] = (repartitionPaiement[methode] || 0) + Number(p.montant_paiement);
                }
            });
        });

        // Calculs financiers
        const tvaRate = await getTvaRate();
        // Formule: HT = TTC / (1 + taux/100) -> TVA = TTC - HT
        const totalHT = totalCA / (1 + (tvaRate / 100));
        const totalTVA = totalCA - totalHT;

        const panierMoyen = commandes.length > 0 ? totalCA / commandes.length : 0;

        return {
            date: startOfDay.toISOString().split('T')[0],
            synthese: {
                chiffre_affaires: Number(totalCA.toFixed(2)),
                tva_estimee: Number(totalTVA.toFixed(2)),
                nb_commandes: commandes.length,
                panier_moyen: Number(panierMoyen.toFixed(2)),
                repartition_paiement: repartitionPaiement
            },
            details_commandes: commandes
        };
    },

    /**
     * Génère un CSV des transactions.
     */
    async generateTransactionsCSV(date: string | Date): Promise<string> {
        const data = await this.getDailyData(date);

        // Header
        let csv = 'Date;Heure;Commande ID;Table;Total TTC;Statut;Paiements\n';

        data.details_commandes.forEach(c => {
            const dateHeure = new Date(c.date_heure_commande);
            const heure = dateHeure.toLocaleTimeString('fr-FR', { timeZone: 'UTC' });
            const table = c.tsessiontable?.ttableresto?.numero_table || 'N/A';

            const paiements = c.tpaiement
                .map(p => `${p.methode_paiement}:${p.montant_paiement}`)
                .join('|');

            csv += [
                data.date,
                heure,
                c.id,
                table,
                Number(c.total_estime_commande).toFixed(2),
                c.statut_commande,
                paiements
            ].map(escapeCsvField).join(';') + '\n';
        });

        return csv;
    },

    /**
     * Génère un CSV détaillé des lignes de commande.
     */
    async generateLignesCSV(date: string | Date): Promise<string> {
        const data = await this.getDailyData(date);

        let csv = 'Date;Commande ID;Plat;Categorie;Quantite;Prix Unitaire;Total Ligne\n';

        data.details_commandes.forEach(c => {
            c.tlignecommande.forEach(l => {
                const totalLigne = Number(l.tplat.prix_plat) * l.quantite;

                csv += [
                    data.date,
                    c.id,
                    l.tplat.nom_plat,
                    l.categorie_service,
                    l.quantite,
                    Number(l.tplat.prix_plat).toFixed(2),
                    totalLigne.toFixed(2)
                ].map(escapeCsvField).join(';') + '\n';
            });
        });

        return csv;
    }
};
