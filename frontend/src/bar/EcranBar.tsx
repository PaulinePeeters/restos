import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { playSound, unlockAudio } from '../utils/SoundManager';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../cuisine/CuisineDashboard.css';
import styles from './EcranBar.module.css';

import { tlignecommande } from '../types/prisma-types';
import { FaGlassMartiniAlt, FaClock, FaBox } from 'react-icons/fa';

interface BarItem extends Omit<Partial<tlignecommande>, 'statut_service'> {
    id: number;
    commandeId: number;
    table: string;
    plat: string;
    type: string;
    statut: string;
    statut_service?: any; 
    commentaire?: string | null;
    format?: string | null;
    heure: Date;
    dateHeureSouhaitee?: Date | null;
    typeCommande?: string;
    dateEnvoi: Date;
    categorieService: string;
}

interface GroupedItem extends BarItem {
    key: string;
    count: number;
    ids: number[];
}

function EcranBar() {
    const { t } = useLanguage();
    const [commandes, setCommandes] = useState<BarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter] = useState('BAR');
    const prevCommandesRef = useRef<BarItem[]>([]);
    const socket = useSocket();

    const fetchCommandes = async () => {
        try {
            const data: any = await api.get('/commandes/bar');
            console.log("Données bar reçues:", data);

            const items: BarItem[] = [];
            data.forEach((cmd: any) => {
                const tableNom = cmd.tsessiontable?.ttableresto?.numero_table || `Client ${cmd.client_id || '?'}`;

                cmd.tlignecommande.forEach((ligne: any) => {
                    if (['EN_ATTENTE', 'EN_CUISINE', 'PRET'].includes(ligne.statut_service)) {
                        items.push({
                            id: ligne.id,
                            commandeId: cmd.id,
                            table: tableNom,
                            plat: ligne.tplat.nom_plat,
                            type: ligne.tplat.tcategorieplat?.nom_categorie || 'Boisson',
                            statut: ligne.statut_service,
                            commentaire: ligne.commentaire,
                            format: ligne.tformatplat ? ligne.tformatplat.nom_format : null,
                            heure: new Date(cmd.date_heure_commande),
                            dateHeureSouhaitee: cmd.date_heure_souhaitee ? new Date(cmd.date_heure_souhaitee) : null,
                            typeCommande: cmd.type_commande,
                            dateEnvoi: ligne.date_envoi_cuisine ? new Date(ligne.date_envoi_cuisine) : new Date(cmd.date_heure_commande),
                            categorieService: ligne.categorie_service || 'BAR'
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

        socket.on('nouvelle_commande', (nouvelleCmd: any) => {
            console.log("Nouvelle commande BAR reçue via socket:", nouvelleCmd);
            toast.success(t('toast.bar.new_order', { table: nouvelleCmd.tsessiontable?.ttableresto?.numero_table || '?' }), {
                duration: 5000,
                icon: <FaGlassMartiniAlt style={{ color: '#2a9d8f' }} />
            });
            playSound('new_order');
            fetchCommandes();
        });

        return () => {
            socket.off('nouvelle_commande');
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

    const filteredItems = commandes.filter(item => {
        if (filter === 'TOUT') return true;
        const cat = item.categorieService ? item.categorieService.toUpperCase() : 'CUISINE';
        return cat === filter;
    });

    const groupedItems: GroupedItem[] = [];
    filteredItems.forEach(item => {
        const key = `${item.plat}-${item.format || ''}-${item.commentaire || ''}-${item.table}-${item.statut}`;
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

    groupedItems.sort((a, b) => {
        const statusOrder: Record<string, number> = { 'EN_CUISINE': 1, 'EN_ATTENTE': 2, 'PRET': 3 };
        if (statusOrder[a.statut] !== statusOrder[b.statut]) {
            return statusOrder[a.statut] - statusOrder[b.statut];
        }
        return a.dateEnvoi.getTime() - b.dateEnvoi.getTime();
    });

    const getDelayClass = (dateEnvoi: Date, statut: string) => {
        if (statut === 'PRET') return 'pret';
        const now = new Date();
        const diffMinutes = (now.getTime() - dateEnvoi.getTime()) / 1000 / 60;

        if (diffMinutes > 20) return 'retard-critique';
        if (diffMinutes > 10) return 'retard-moyen';
        return 'normal';
    };

    if (loading) return <p>Chargement Bar...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Écran Bar</h2>
                <p className="page-subtitle">Préparez et suivez les commandes de boissons.</p>
            </div>

            <div className="preparation-list">
                {groupedItems.length === 0 && <p>Aucune commande de boissons.</p>}
                {groupedItems.map(group => {
                    const delayClass = getDelayClass(group.dateEnvoi, group.statut);

                    return (
                        <div
                            key={group.key}
                            className={`commande-card ${group.statut.toLowerCase().replace('_', '-')} ${delayClass}`}
                        >
                            <div className="card-header">
                                <span className="qty-badge">{group.count}x</span>
                                <h3 className="plat-name">{group.plat} {group.format ? `(${group.format})` : ''}</h3>
                            </div>

                            <div className="card-meta">
                                <span className="heure">{group.dateEnvoi.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="table-info">Table {group.table}</span>
                                {group.dateHeureSouhaitee && (
                                    <div className={`heure-souhaitee ${styles.heureSouhaitee}`}>
                                        <FaClock style={{ marginRight: '5px' }} /> Pour : {group.dateHeureSouhaitee.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                                {(group.typeCommande === 'A_EMPORTER' || group.typeCommande === 'LIVRAISON') && (
                                    <div className={`packaging-info ${styles.packagingInfo}`}>
                                        <FaBox style={{ marginRight: '5px' }} /> CANETTE / BOUTEILLE
                                    </div>
                                )}
                            </div>

                            {group.commentaire && (
                                <p className="commentaire">Note : {group.commentaire}</p>
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

export default EcranBar;
