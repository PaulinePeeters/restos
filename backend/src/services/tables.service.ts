import { prisma } from '../db.js';
import { StatutReservation } from '@prisma/client';
import { getIo } from '../socket.js';

const DUREE_RESERVATION_MS = 2 * 60 * 60 * 1000;

/**
 * Récupère toutes les tables du restaurant.
 * Inclut la session active si elle existe.
 */
export const getAllTables = async () => {
    return await prisma.ttableresto.findMany({
        where: { actif: true },
        include: {
            treservation: {
                where: {
                    statut_reservation: {
                        in: ['EN_ATTENTE', 'CONFIRMEE', 'ARRIVEE'],
                    },
                },
                orderBy: {
                    date_reservation: 'desc',
                },
                include: {
                    tclient: true
                }
            },
            tsessiontable: {
                where: {
                    statut_session: {
                        not: 'TERMINEE',
                    },
                },
                orderBy: {
                    date_heure_debut: 'desc',
                },
                take: 1,
                include: {
                    tcommande: {
                        where: { statut_commande: { in: ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE'] } },
                        include: {
                            tlignecommande: {
                                include: {
                                    tplat: {
                                        include: {
                                            tcategorieplat: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        },
        orderBy: {
            id: 'asc',
        },
    });
};

/**
 * Récupère les tables disponibles pour une date, heure et capacité donnée.
 * Exclut les tables réservées/occupées pendant ce créneau.
 */
export const getAvailableTables = async (
    dateReservation: Date,
    heureReservation: Date,
    capaciteRequise: number
) => {
    const dateJour = new Date(dateReservation);
    dateJour.setHours(0, 0, 0, 0);

    const dateHeureFin = new Date(heureReservation.getTime() + DUREE_RESERVATION_MS);

    // Récupérer toutes les réservations pour ce jour qui chevauchent le créneau
    const reservationsExistantes = await prisma.treservation.findMany({
        where: {
            date_reservation: dateJour,
            statut_reservation: { in: [StatutReservation.EN_ATTENTE, StatutReservation.CONFIRMEE, StatutReservation.ARRIVEE] }
        }
    });

    // Identifier les IDs de tables occupées par ces réservations
    const tablesOccupees = new Set<number>();
    for (const res of reservationsExistantes) {
        const resHeure = new Date(res.heure_reservation);
        const resDebut = new Date(dateJour);
        resDebut.setHours(
            resHeure.getUTCHours(),
            resHeure.getUTCMinutes(),
            resHeure.getUTCSeconds(),
            0
        );
        const resFin = new Date(resDebut.getTime() + DUREE_RESERVATION_MS);

        // Vérifier chevauchement
        if (resDebut < dateHeureFin && resFin > heureReservation) {
            tablesOccupees.add(res.table_id);
        }
    }

    // Récupérer les tables libres avec capacité suffisante
    const tablesDisponibles = await prisma.ttableresto.findMany({
        where: {
            actif: true,
            capacite_table: { gte: capaciteRequise },
            est_occupee_par_fusion: false,
            id: { notIn: Array.from(tablesOccupees) }
        },
        orderBy: {
            id: 'asc',
        },
        include: {
            treservation: {
                where: {
                    statut_reservation: { in: [StatutReservation.EN_ATTENTE, StatutReservation.CONFIRMEE, StatutReservation.ARRIVEE] }
                },
                include: {
                    tclient: true
                }
            },
            tsessiontable: {
                where: { statut_session: { not: 'TERMINEE' } }
            }
        }
    });

    return tablesDisponibles;
};

/**
 * Récupère une table par son identifiant.
 */
export const getTableById = async (id: number | string) => {
    return await prisma.ttableresto.findUnique({
        where: { id: Number(id) }
    });
};

/**
 * Fusionne plusieurs tables en une table principale.
 * - Calcule la capacité totale.
 * - Marque la table principale comme fusionnée et met à jour sa capacité.
 * - Marque les tables secondaires comme occupées par fusion.
 */
export const fusionnerTables = async (mainTableId: number, tablesToMergeIds: number[]) => {
    return prisma.$transaction(async (tx) => {
        const tablesToMerge = await tx.ttableresto.findMany({
            where: { id: { in: tablesToMergeIds } }
        });

        const addedCapacity = tablesToMerge.reduce((acc, t) => acc + t.capacite_table, 0);

        // Mise à jour de la table principale
        await tx.ttableresto.update({
            where: { id: mainTableId },
            data: {
                est_fusionnee: true,
                tables_fusionnees: tablesToMergeIds.join(','),
                est_occupee_par_fusion: false,
                capacite_table: { increment: addedCapacity }
            },
        });

        // Mise à jour des tables fusionnées secondaires
        await tx.ttableresto.updateMany({
            where: {
                id: { in: tablesToMergeIds },
            },
            data: {
                est_occupee_par_fusion: true,
                est_fusionnee: false,
                tables_fusionnees: null,
            },
        });
    });
};

/**
 * Défusionne les tables précédemment fusionnées.
 * - Récupère la table principale pour identifier les tables fusionnées.
 * - Restaure la capacité et le statut de la table principale.
 */
export const defusionnerTables = async (mainTableId: number) => {
    return prisma.$transaction(async (tx) => {
        // Récupérer la table principale pour avoir les IDs fusionnées
        const mainTable = await tx.ttableresto.findUnique({
            where: { id: mainTableId },
        });

        if (!mainTable || !mainTable.est_fusionnee || !mainTable.tables_fusionnees) {
            throw new Error("La table n'est pas fusionnée ou n'a pas de tables fusionnées");
        }

        const tablesToReleaseIds = mainTable.tables_fusionnees.split(',').map(id => parseInt(id));

        // Récupérer les tables à libérer pour obtenir leur capacité
        const tablesToRelease = await tx.ttableresto.findMany({
            where: { id: { in: tablesToReleaseIds } }
        });

        const removedCapacity = tablesToRelease.reduce((acc, t) => acc + t.capacite_table, 0);

        // Remettre la table principale à dispo (fusion annulée)
        await tx.ttableresto.update({
            where: { id: mainTableId },
            data: {
                est_fusionnee: false,
                tables_fusionnees: null,
                est_occupee_par_fusion: false,
                capacite_table: { decrement: removedCapacity }
            },
        });

        // Libérer les tables fusionnées secondaires
        await tx.ttableresto.updateMany({
            where: {
                id: { in: tablesToReleaseIds },
            },
            data: {
                est_occupee_par_fusion: false,
            },
        });
    });
};


/**
 * Met à jour les propriétés d'une table.
 */
export const updateTable = async (id: number | string, data: any) => {
    return await prisma.ttableresto.update({
        where: { id: Number(id) },
        data: {
            pos_x: data.pos_x,
            pos_y: data.pos_y,
            largeur: data.largeur,
            hauteur: data.hauteur,
            orientation: data.orientation,
            capacite_table: data.capacite_table,
            numero_table: data.numero_table,
            salle: data.salle,
            type_element: data.type_element,
            rotation: data.rotation
        }
    });
};

/**
 * Met à jour plusieurs tables.
 * Pour sauvegarder l'agencement de la salle en une fois.
 */
export const updateTablesBatch = async (updates: any[]) => {
    const promises = updates.map(update =>
        prisma.ttableresto.update({
            where: { id: Number(update.id) },
            data: {
                pos_x: update.pos_x,
                pos_y: update.pos_y,
                largeur: update.largeur,
                hauteur: update.hauteur,
                orientation: update.orientation,
                capacite_table: update.capacite_table,
                numero_table: update.numero_table,
                salle: update.salle,
                type_element: update.type_element,
                rotation: update.rotation
            }
        })
    );
    return await Promise.all(promises);
};

/**
 * Crée une nouvelle table.
 */
export const createTable = async (data: any) => {
    return await prisma.ttableresto.create({
        data: {
            numero_table: data.numero_table,
            capacite_table: data.capacite_table,
            pos_x: data.pos_x,
            pos_y: data.pos_y,
            largeur: data.largeur,
            hauteur: data.hauteur,
            orientation: data.orientation,
            salle: data.salle || 'Principale',
            type_element: data.type_element || 'table',
            rotation: data.rotation || 0
        }
    });
};

/**
 * Désactive une table.
 * Vérifie qu'aucune session active n'est en cours.
 * Les données historiques (sessions, commandes) sont préservées.
 */
export const deleteTable = async (id: number | string) => {
    const tableId = Number(id);
    const table = await prisma.ttableresto.findUnique({ where: { id: tableId } });
    if (!table) throw new Error("Table introuvable.");
    if (!table.actif) throw new Error("Cette table est déjà désactivée.");

    const sessionActive = await prisma.tsessiontable.findFirst({
        where: {
            table_id: tableId,
            statut_session: { in: ['ACTIVE', 'EN_ATTENTE_PAIEMENT'] }
        }
    });
    if (sessionActive) throw new Error("Impossible : une session est en cours sur cette table.");

    return await prisma.ttableresto.update({
        where: { id: tableId },
        data: { actif: false }
    });
};

/**
 * Envoie la "Suite" pour une table donnée.
 * Trouve la session active, récupère les commandes non terminées, et passe les lignes "EN_ATTENTE" à "EN_CUISINE".
 */
export const fireNextCourse = async (tableId: number | string) => {
    const session = await prisma.tsessiontable.findFirst({
        where: {
            table_id: Number(tableId),
            statut_session: 'ACTIVE'
        },
        include: {
            tcommande: {
                where: { statut_commande: { not: 'TERMINEE' } },
                include: {
                    tlignecommande: {
                        where: { statut_service: 'EN_ATTENTE' },
                        include: { tplat: { include: { tcategorieplat: true } } }
                    }
                }
            },
            ttableresto: true
        }
    });

    if (!session) throw new Error("Aucune session active pour cette table");

    const lignesEnAttente = session.tcommande.flatMap(c => c.tlignecommande);

    if (lignesEnAttente.length === 0) return { count: 0 };

    const getOrdre = (nom_categorie: string) => {
        const txt = nom_categorie.toUpperCase();
        if (txt.includes('ENTRÉE') || txt.includes('ENTREE')) return 1;
        if (txt.includes('PLAT')) return 2;
        if (txt.includes('DESSERT')) return 3;
        return 2;
    };

    let minOrdre = 99;
    for (const ligne of lignesEnAttente) {
        const cat = ligne.tplat?.tcategorieplat?.nom_categorie || '';
        const ordre = getOrdre(cat);
        if (ordre < minOrdre) minOrdre = ordre;
    }

    const ligneIdsToFire = lignesEnAttente
        .filter(ligne => {
            const cat = ligne.tplat?.tcategorieplat?.nom_categorie || '';
            return getOrdre(cat) === minOrdre;
        })
        .map(l => l.id);

    const result = await prisma.tlignecommande.updateMany({
        where: { id: { in: ligneIdsToFire } },
        data: { statut_service: 'EN_CUISINE' }
    });

    if (result.count > 0) {
        try {
            const io = getIo();
            // Notifier la cuisine
            io.to('cuisinier').emit('nouvelle_commande', {
                tsessiontable: {
                    ttableresto: {
                        numero_table: session.ttableresto?.numero_table || '?'
                    }
                }
            });
            // Notifier le bar
            io.to('barman').emit('nouvelle_commande', {
                tsessiontable: {
                    ttableresto: {
                        numero_table: session.ttableresto?.numero_table || '?'
                    }
                }
            });
        } catch (err) {
            console.error('Erreur lors de l\'émission socket fireNextCourse:', err);
        }
    }

    return { count: result.count };
};

export default {
    getAllTables,
    fusionnerTables,
    defusionnerTables,
    updateTable,
    updateTablesBatch,
    createTable,
    deleteTable,
    fireNextCourse,
    getTableById
};
