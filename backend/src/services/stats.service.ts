import { prisma } from '../db.js';

export type DateRangeOption = 'today' | '7d' | '30d' | Date | string;

/**
 * Plage de dates 
 */
function getDateRange(option: DateRangeOption = 'today') {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (option === '7d') {
        start.setDate(start.getDate() - 7);
    } else if (option === '30d') {
        start.setDate(start.getDate() - 30);
    } else if (option !== 'today' && option) {
        const specificDate = new Date(option);
        start.setTime(specificDate.getTime());
        start.setHours(0, 0, 0, 0);

        end.setTime(start.getTime());
        end.setDate(end.getDate() + 1);
        return { start, end };
    }

    if (option === 'today') {
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
}

/**
 * Calcule les métriques financières.
 */
export const getChiffreAffaires = async (range: DateRangeOption = 'today') => {
    const { start, end } = getDateRange(range);

    // Somme des paiements validés 
    const aggregatePayment = await prisma.tpaiement.aggregate({
        _sum: { montant_paiement: true },
        where: {
            etat_paiement: 'PAYE',
            date_paiement: { gte: start, lte: end }
        }
    });

    const chiffreAffaires = Number(aggregatePayment._sum.montant_paiement || 0);

    //  Nombre de couverts
    const aggregateCouverts = await prisma.tsessiontable.aggregate({
        _sum: { nb_couverts: true },
        where: {
            date_heure_debut: { gte: start, lte: end }
        }
    });

    const totalCouverts = aggregateCouverts._sum.nb_couverts || 0;


    const panierMoyen = totalCouverts > 0
        ? (chiffreAffaires / totalCouverts)
        : 0;

    return {
        chiffreAffaires,
        totalCouverts,
        panierMoyen
    };
};

/**
 * Compte le nombre de couverts confirmés.
 */
export const countCouverts = async (range: DateRangeOption = 'today'): Promise<number> => {
    const { start, end } = getDateRange(range);

    const sessions = await prisma.tsessiontable.aggregate({
        _sum: { nb_couverts: true },
        where: {
            date_heure_debut: { gte: start, lte: end }
        }
    });

    return sessions._sum.nb_couverts || 0;
};

/**
 * Récupère le top 5 des plats les plus vendus.
 */
export const getPlatsPlusVendus = async (range: DateRangeOption = 'today') => {
    const { start, end } = getDateRange(range);

    const topPlats = await prisma.tlignecommande.groupBy({
        by: ['plat_id'],
        _sum: { quantite: true },
        where: {
            tcommande: {
                date_heure_commande: { gte: start, lte: end },
                statut_commande: { not: 'ANNULEE' }
            }
        },
        orderBy: {
            _sum: { quantite: 'desc' }
        },
        take: 5
    });

    if (topPlats.length === 0) return [];

    const platIds = topPlats.map(p => p.plat_id);
    const plats = await prisma.tplat.findMany({
        where: { id: { in: platIds } },
        select: { id: true, nom_plat: true }
    });

    const platMap = new Map(plats.map(p => [p.id, p]));

    return topPlats.map(item => ({
        nom: platMap.get(item.plat_id)?.nom_plat || 'Plat inconnu',
        quantite: item._sum.quantite
    }));
};

/**
 * Calcule les heures d'affluence.
 */
export const getHeuresAffluence = async (range: DateRangeOption = 'today') => {
    const { start, end } = getDateRange(range);

    const commandes = await prisma.tcommande.findMany({
        where: {
            date_heure_commande: { gte: start, lte: end },
            statut_commande: { not: 'ANNULEE' }
        },
        select: { date_heure_commande: true }
    });

    const heuresMap: Record<number, number> = {};

    commandes.forEach(c => {
        const hour = new Date(c.date_heure_commande).getHours();
        heuresMap[hour] = (heuresMap[hour] || 0) + 1;
    });

    return Object.entries(heuresMap)
        .map(([heureStr, count]) => {
            const heure = parseInt(heureStr);
            return {
                heureLabel: `${heure}h-${heure + 1}h`,
                heure: heure,
                commandes: count
            };
        })
        .sort((a, b) => a.heure - b.heure)
        .map(item => ({
            heure: item.heureLabel,
            commandes: item.commandes
        }));
};

/**
 * Récupère l'historique récent des commandes.
 */
export const getHistoriqueCommandes = async (range: DateRangeOption = 'today') => {
    const { start, end } = getDateRange(range);

    const recentCommandes = await prisma.tcommande.findMany({
        where: {
            date_heure_commande: { gte: start, lte: end }
        },
        take: 20,
        orderBy: { date_heure_commande: 'desc' },
        include: {
            tsessiontable: { include: { ttableresto: true } },
            tlignecommande: { include: { tplat: true } }
        }
    });

    return recentCommandes.map(c => ({
        id: c.id,
        table: c.tsessiontable?.ttableresto?.numero_table || '?',
        plat: c.tlignecommande.length > 0
            ? `${c.tlignecommande[0].tplat?.nom_plat || 'Plat inconnu'} ${c.tlignecommande.length > 1 ? `(+${c.tlignecommande.length - 1})` : ''}`
            : 'Aucun plat',
        montant: Number(c.total_estime_commande).toFixed(2) + '€',
        statut: c.statut_commande,
        date: new Date(c.date_heure_commande).toLocaleString('fr-FR')
    }));
};
