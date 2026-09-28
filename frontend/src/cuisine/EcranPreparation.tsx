import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { playSound, unlockAudio } from '../utils/SoundManager';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import './CuisineDashboard.css';
import styles from './EcranPreparation.module.css';
import { FaClock } from 'react-icons/fa';

import { tlignecommande } from '../types/prisma-types';
import './CuisineDashboard.css';

interface PreparationItem extends Omit<Partial<tlignecommande>, 'statut_service' | 'cuisson'> {
    id: number;
    statut_service: string;
    commentaire: string | null;
    
    commandeId: number;
    table: string;
    plat: string;
    type: string;
    statut: string; 
    cuisson?: string | null; 
    format?: string | null;
    heure: Date;
    dateHeureSouhaitee?: Date | null;
    dateEnvoi: Date;
    categorieService: string;
    restrictions?: string | null;
}

interface GroupedItem extends PreparationItem {
    key: string;
    count: number;
    ids: number[];
}

type PriorityLevel = 'CRITIQUE' | 'HAUTE' | 'NORMALE';
const FINISHED_TICKET_TTL_MINUTES = 60; // 60 minutes pour afficher les tickets terminés

function EcranPreparation() {
    const { t } = useLanguage();
    const [commandes, setCommandes] = useState<PreparationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter] = useState('CUISINE');
    const [nowMs, setNowMs] = useState(() => Date.now());
    const prevCommandesRef = useRef<PreparationItem[]>([]);
    const socket = useSocket();

    const fetchCommandes = async () => {
        try {
            const data: any = await api.get('/commandes/cuisine');
            console.log("Données cuisine reçues:", data);

            const items: PreparationItem[] = [];
            data.forEach((cmd: any) => {
                const tableNom = cmd.tsessiontable?.ttableresto?.numero_table || `Client ${cmd.client_id || '?'}`;

                cmd.tlignecommande.forEach((ligne: any) => {
                    if (['EN_ATTENTE', 'EN_CUISINE', 'PRET'].includes(ligne.statut_service)) {
                        items.push({
                            id: ligne.id,
                            statut_service: ligne.statut_service, 
                            commandeId: cmd.id,
                            table: tableNom,
                            plat: ligne.tplat.nom_plat,
                            type: ligne.tplat.tcategorieplat?.nom_categorie || 'Plat',
                            statut: ligne.statut_service, // 'EN_ATTENTE', 'EN_CUISINE', 'PRET'
                            commentaire: ligne.commentaire,
                            cuisson: ligne.cuisson,
                            format: ligne.format,
                            heure: new Date(cmd.date_heure_commande),
                            dateHeureSouhaitee: cmd.date_heure_souhaitee ? new Date(cmd.date_heure_souhaitee) : null,
                            dateEnvoi: ligne.date_envoi_cuisine ? new Date(ligne.date_envoi_cuisine) : new Date(cmd.date_heure_commande),
                            categorieService: ligne.categorie_service || 'CUISINE',
                            restrictions: ligne.restrictions_alimentaires
                        });
                    }
                });
            });

            setCommandes(items);
            prevCommandesRef.current = items;
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommandes();
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleUnlock = () => {
            unlockAudio();
            document.removeEventListener('click', handleUnlock);
            document.removeEventListener('touchstart', handleUnlock);
        };
        document.addEventListener('click', handleUnlock);
        document.addEventListener('touchstart', handleUnlock);

        return () => {
            document.removeEventListener('click', handleUnlock);
            document.removeEventListener('touchstart', handleUnlock);
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const joinRoom = () => {
             console.log("Rejoindre la salle cuisinier...");
             socket.emit('join_room', 'cuisinier');
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on('connect', joinRoom);

        socket.on('nouvelle_commande', (nouvelleCmd: any) => {
            console.log("Nouvelle commande reçue via socket:", nouvelleCmd);
            toast.success(t('toast.cuisine.new_order', { table: nouvelleCmd.tsessiontable?.ttableresto?.numero_table || '?' }), {
                duration: 5000,
                icon: <FaClock />
            });
            playSound('new_order');
            fetchCommandes();
        });

        // Rafraîchir quand le statut d'une ligne change (SERVI, ANNULEE, etc.)
        socket.on('statut_ligne_updated', () => {
            fetchCommandes();
        });

        // Rafraîchir quand le statut global d'une commande change
        socket.on('commande_modifiee', () => {
            fetchCommandes();
        });

        return () => {
            socket.off('connect', joinRoom);
            socket.off('nouvelle_commande');
            socket.off('statut_ligne_updated');
            socket.off('commande_modifiee');
        };
    }, [socket]);

    const marquerPret = async (id: number) => {
        try {
            await api.post(`/commandes/ligne/${id}/statut`, { statut: 'PRET' });
            setCommandes(prev =>
                prev.map(cmd =>
                    cmd.id === id ? { ...cmd, statut: "PRET" } : cmd
                )
            );
        } catch (err) {
            console.error("Erreur update statut", err);
        }
    };
    // calcul des minutes écoulées
    const getElapsedMinutes = (dateEnvoi: Date, referenceMs = nowMs) => {
        return Math.max(0, Math.floor((referenceMs - dateEnvoi.getTime()) / 1000 / 60));
    };
    // vérifie si un ticket est expiré
    const isExpiredFinishedTicket = (item: PreparationItem) => {
        if (item.statut !== 'PRET') return false;
        return getElapsedMinutes(item.dateEnvoi) >= FINISHED_TICKET_TTL_MINUTES;
    };

    const filteredItems = commandes.filter(item => {
        if (filter === 'TOUT') return true;
        const cat = item.categorieService ? item.categorieService.toUpperCase() : 'CUISINE';
        return cat === filter;
    }).filter((item) => !isExpiredFinishedTicket(item));

    const groupedItems: GroupedItem[] = [];
    filteredItems.forEach(item => {
        const key = `${item.plat}-${item.cuisson || ''}-${item.commentaire || ''}-${item.table}-${item.statut}-${item.restrictions || ''}`;
        const existing = groupedItems.find(g => g.key === key);
        if (existing) {
            existing.count++;
            existing.ids.push(item.id);
        } else {
            groupedItems.push({
                ...item,
                key,
                count: 1,
                ids: [item.id]
            });
        }
    });
    // liste des allergènes courants pour détecter les allergies dans les commentaires
    const ALLERGENES_COURANTS = [
        'allergie', 'intolérance', 'intolerance',
        'noix', 'arachide', 'cacahuète', 'cacahuete',
        'gluten', 'lait', 'lactose', 'crustacé', 'crustace',
        'poisson', 'soja', 'oeuf', 'œuf', 'céleri', 'celeri',
        'moutarde', 'sésame', 'sesame', 'lupin', 'mollusque'
    ];
    // vérifie si un ticket a une allergie
    const hasAllergySignal = (item: GroupedItem) => {
        if (!item.restrictions) return false;
        const txt = item.restrictions.toLowerCase();
        return ALLERGENES_COURANTS.some(allergene => txt.includes(allergene));
    };

    const getPriority = (item: GroupedItem): PriorityLevel => {
        const minutes = getElapsedMinutes(item.dateEnvoi);
        const isAllergy = hasAllergySignal(item);

        if (isAllergy || minutes > 20) {
            return 'CRITIQUE';
        }

        if (minutes > 10 || item.statut === 'EN_ATTENTE') {
            return 'HAUTE';
        }

        return 'NORMALE';
    };

    const getPriorityRank = (priority: PriorityLevel) => {
        const map: Record<PriorityLevel, number> = {
            CRITIQUE: 1,
            HAUTE: 2,
            NORMALE: 3
        };
        return map[priority];
    };
    // ordre des plats
    const getCourseOrder = (item: PreparationItem) => {
        const txt = (item.type + ' ' + (item.format || '')).toUpperCase();
        if (txt.includes('ENTRÉE') || txt.includes('ENTREE')) return 1;
        if (txt.includes('PLAT')) return 2;
        if (txt.includes('DESSERT')) return 3;
        return 2;
    };

    groupedItems.sort((a, b) => {
        const statusOrder: Record<string, number> = { 'EN_ATTENTE': 1, 'EN_CUISINE': 2, 'PRET': 3 };
        if (statusOrder[a.statut] !== statusOrder[b.statut]) {
            return statusOrder[a.statut] - statusOrder[b.statut];
        }

        const courseA = getCourseOrder(a);
        const courseB = getCourseOrder(b);
        if (courseA !== courseB) return courseA - courseB;

        const priorityDiff = getPriorityRank(getPriority(a)) - getPriorityRank(getPriority(b));
        if (priorityDiff !== 0) return priorityDiff;

        return a.dateEnvoi.getTime() - b.dateEnvoi.getTime();
    });

    const getDelayClass = (dateEnvoi: Date, statut: string) => {
        if (statut === 'PRET') return 'pret';
        const diffMinutes = getElapsedMinutes(dateEnvoi);

        if (diffMinutes > 20) return 'retard-critique';
        if (diffMinutes > 10) return 'retard-moyen';
        return 'normal';
    };

    const enAttenteCount = groupedItems.filter((g) => g.statut === 'EN_ATTENTE').length;
    const critiquesCount = groupedItems.filter((g) => getPriority(g) === 'CRITIQUE').length;
    const allergiesCount = groupedItems.filter((g) => hasAllergySignal(g)).length;

    if (loading) return <p>Chargement KDS...</p>;

    return (
        <div className={styles.preparationScreen}>
            <div className="page-header">
                <h2 className="page-title">Écran Cuisine</h2>
                <p className="page-subtitle">Suivez et gérez les commandes en préparation.</p>
            </div>

            <div className={styles.kpiRow}>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Tickets actifs</span>
                    <strong className={styles.kpiValue}>{groupedItems.length}</strong>
                </div>
                <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>En attente</span>
                    <strong className={styles.kpiValue}>{enAttenteCount}</strong>
                </div>
                <div className={`${styles.kpiCard} ${styles.kpiAlert}`}>
                    <span className={styles.kpiLabel}>Priorité critique</span>
                    <strong className={styles.kpiValue}>{critiquesCount}</strong>
                </div>
                <div className={`${styles.kpiCard} ${styles.kpiAllergy}`}>
                    <span className={styles.kpiLabel}>Allergies signalées</span>
                    <strong className={styles.kpiValue}>{allergiesCount}</strong>
                </div>
            </div>

            <div className="preparation-list">
                {groupedItems.length === 0 && <p>Aucune commande en cours.</p>}
                {groupedItems.map((group, index) => {
                    const delayClass = getDelayClass(group.dateEnvoi, group.statut);
                    const hasAllergy = hasAllergySignal(group);
                    const priority = getPriority(group);
                    const elapsedMinutes = getElapsedMinutes(group.dateEnvoi);

                    return (
                        <div
                            key={group.key}
                            className={`commande-card ${group.statut.toLowerCase().replace('_', '-')} ${delayClass} ${styles.commandeCardShell} ${hasAllergy ? styles.hasAllergyBorder : ''}`}
                        >
                            <div className={styles.ticketTopRow}>
                                <span className={styles.ticketNumber}>#{index + 1}</span>
                                <span className={`${styles.priorityBadge} ${styles[`priority${priority}`]}`}>
                                    Priorité {priority.toLowerCase()}
                                </span>
                            </div>

                            {hasAllergy && (
                                <div className={styles.allergyHeader}>
                                    Allergie signalée: vérification obligatoire avant envoi
                                </div>
                            )}

                            <div className="card-header">
                                <span className="qty-badge">{group.count}x</span>
                                <h3 className="plat-name">{group.plat}</h3>
                            </div>

                            <div className="card-meta">
                                <span className="heure">{group.dateEnvoi.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="table-info">Table {group.table}</span>
                                <span className={styles.elapsedTime}>{elapsedMinutes} min</span>
                                {group.dateHeureSouhaitee && (
                                    <div className={`heure-souhaitee ${styles.heureSouhaitee}`}>
                                        🕒 Pour : {group.dateHeureSouhaitee.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            {group.cuisson && (
                                <div className="cuisson-badge">
                                    Cuisson : {group.cuisson}
                                </div>
                            )}

                            {(group.commentaire || group.restrictions) && (
                                <div className={styles.notesBlock}>
                                    <p className={styles.notesTitle}>Notes de service</p>
                                    {group.commentaire && (
                                        <p className="commentaire">{group.commentaire}</p>
                                    )}
                                    {group.restrictions && (
                                        <div className={`restrictions-badge ${styles.restrictionsBadge}`}>
                                            ⚠️ {group.restrictions}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="card-actions">
                                {(group.statut === 'EN_CUISINE' || group.statut === 'EN_ATTENTE') && (
                                    <button onClick={() => group.ids.forEach(id => marquerPret(id))} className="btn-pret">
                                        Prêt ({group.count})
                                    </button>
                                )}
                                {group.statut === 'PRET' && (
                                    <span className="status-text success">Terminé</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EcranPreparation;
