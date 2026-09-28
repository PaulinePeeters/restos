import React, { useState, useEffect } from 'react';
import { FaTimes, FaArrowRight, FaClock, FaUtensils, FaConciergeBell, FaMoneyBillWave, FaCheckCircle, FaExclamationCircle, FaPercent, FaGift, FaEdit } from 'react-icons/fa';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import EditCommandeModal from '../../components/common/EditCommandeModal';
import styles from './Commandes.module.css';

import { tcommande, tlignecommande, StatutCommande, tpaiement } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

const STATUTS: StatutCommande[] = ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE', 'TERMINEE', 'ANNULEE'];

const STATUS_LABELS: Record<string, string> = {
    'EN_ATTENTE': 'En attente',
    'EN_PREPARATION': 'En préparation',
    'SERVIE': 'Servie',
    'TERMINEE': 'Terminée',
    'ANNULEE': 'Annulée',
    'LIVREE': 'Livrée'
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    'EN_ATTENTE': styles.enAttenteBadge,
    'EN_PREPARATION': styles.enPreparationBadge,
    'SERVIE': styles.servieBadge,
    'TERMINEE': styles.termineeBadge,
    'ANNULEE': styles.annuleeBadge
};

interface LigneRaw {
    id: number;
    plat_id: number;
    quantite: number;
    statut_service: string | null;
    tplat: { nom_plat: string };
}

interface CommandeRaw extends Omit<tcommande, 'tlignecommande' | 'tsessiontable' | 'tpaiement'> {
    tsessiontable?: {
        ttableresto?: {
            numero_table: string | number;
        };
    };
    tlignecommande: (tlignecommande & { tplat: { nom_plat: string } })[];
    tpaiement: tpaiement[];
    date_heure_commande: any;
    total_estime_commande: any;
}

interface CommandeFormatted {
    id: number;
    table: string | number;
    plats: string[];
    lignes: LigneRaw[];
    statut: StatutCommande;
    heureCommande: string;
    total: number;
    estPaye: boolean;
}

const Commandes: React.FC = () => {
    const { t } = useLanguage();
    const [commandesRaw, setCommandesRaw] = useState<CommandeRaw[]>([]);
    const [commandes, setCommandes] = useState<CommandeFormatted[]>([]);
    const [filtreStatut, setFiltreStatut] = useState('Tous');
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
    const [commandeToEdit, setCommandeToEdit] = useState<any>(null);

    const socket = useSocket();

    const fetchCommandes = async () => {
        try {
            const data: CommandeRaw[] = await api.get('/commandes/actives');
            if (data) {
                setCommandesRaw(data);
                const formatted: CommandeFormatted[] = data.map(cmd => ({
                    id: cmd.id,
                    table: cmd.tsessiontable?.ttableresto?.numero_table || '?',
                    plats: cmd.tlignecommande.map(l => `${l.quantite}x ${l.tplat.nom_plat}`),
                    lignes: cmd.tlignecommande.map(l => ({
                        id: l.id,
                        plat_id: l.plat_id,
                        quantite: l.quantite,
                        statut_service: l.statut_service as string | null,
                        tplat: { nom_plat: l.tplat.nom_plat }
                    })),
                    statut: cmd.statut_commande as StatutCommande,
                    heureCommande: new Date(cmd.date_heure_commande).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    total: Number(cmd.total_estime_commande),
                    estPaye: cmd.tpaiement.some(p => p.etat_paiement === 'PAYE')
                }));
                setCommandes(formatted);
            }
        } catch (err) {
            console.error(err);
            toast.error(t('toast.orders.load_error'));
        }
    };

    const closeModal = () => setModal({ ...modal, isOpen: false });
    // application des réductions
    const appliquerReduction = async (id: number, type: string, valeur: number, isPourcentage: boolean) => {
        try {
            await api.post(`/commandes/${id}/reduction`, { type, valeur, isPourcentage });
            toast.success(t('toast.orders.discount_applied', { type }));
            fetchCommandes();
            closeModal();
        } catch (err: any) {
            console.error(err);
            toast.error(t('toast.orders.discount_error'));
        }
    };

    const openReductionModal = (id: number) => setModal({
        isOpen: true,
        title: `Réduction / Geste Commercial #${id}`,
        content: (
            <div className={styles.reductionContainer}>
                <p>Sélectionnez une remise exceptionnelle pour cette commande.</p>
                <div className={styles.reductionGrid}>
                    <button
                        onClick={() => appliquerReduction(id, 'VIP', 10, true)}
                        className={styles.btnReductionVip}
                    >
                        <FaPercent /> 10% VIP
                    </button>
                    <button
                        onClick={() => appliquerReduction(id, 'OFFERT', 100, true)}
                        className={styles.btnReductionOffert}
                    >
                        <FaGift /> Offert (100%)
                    </button>
                </div>
            </div>
        ),
        onConfirm: null
    });

    const changerStatutClick = (id: number, nouveauStatut: StatutCommande) => {
        if (nouveauStatut === 'ANNULEE') {
            // Annulation via la route dédiée pour restaurer le stock
            setModal({
                isOpen: true,
                title: `Annuler la commande #${id}`,
                content: 'Confirmer l\'annulation ? Le stock des ingrédients sera restauré.',
                onConfirm: () => annulerCommande(id)
            });
        } else {
            setModal({
                isOpen: true,
                title: 'Confirmation de statut',
                content: `Voulez-vous passer la commande #${id} en statut "${STATUS_LABELS[nouveauStatut]}" ?`,
                onConfirm: () => changerStatut(id, nouveauStatut)
            });
        }
    };

    const annulerCommande = async (id: number) => {
        try {
            await api.post(`/commandes/${id}/annuler`, { justification: 'Annulation manuelle par le manager' });
            toast.success('Commande annulée, stock restauré.');
            fetchCommandes();
        } catch (err) {
            console.error(err);
            toast.error('Erreur lors de l\'annulation.');
        }
        closeModal();
    };

    const changerStatut = async (id: number, nouveauStatut: StatutCommande) => {
        try {
            await api.put(`/commandes/${id}/statut`, { statut: nouveauStatut });
            toast.success(t('toast.orders.status_updated', { status: STATUS_LABELS[nouveauStatut] }));
            fetchCommandes();
        } catch (err) {
            console.error(err);
            toast.error(t('toast.orders.status_update_error'));
        }
        closeModal();
    };

    const annulerLigne = async (ligneId: number, nomPlat: string) => {
        try {
            await api.put(`/lignecommande/${ligneId}`, { est_annule: true, raison_annulation: 'Annulation manuelle par le manager' });
            toast.success(`"${nomPlat}" annulé, stock restauré.`);
            fetchCommandes();
        } catch (err) {
            console.error(err);
            toast.error('Erreur lors de l\'annulation de la ligne.');
        }
        closeModal();
    };

    const openAnnulerLigneModal = (cmdId: number, lignes: LigneRaw[]) => {
        const lignesActives = lignes.filter(l => l.statut_service !== 'ANNULEE');
        setModal({
            isOpen: true,
            title: `Annuler un article — Commande #${cmdId}`,
            content: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {lignesActives.length === 0 ? (
                        <p style={{ color: 'var(--color-muted)' }}>Toutes les lignes sont déjà annulées.</p>
                    ) : lignesActives.map(l => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border)' }}>
                            <span>{l.quantite}× {l.tplat.nom_plat}</span>
                            <button
                                onClick={() => annulerLigne(l.id, l.tplat.nom_plat)}
                                style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Annuler
                            </button>
                        </div>
                    ))}
                </div>
            ),
            onConfirm: null
        });
    };

    useEffect(() => {
        fetchCommandes();
    }, []);

    useEffect(() => {
        if (!socket) return;
        
        const handleUpdate = () => {
            fetchCommandes();
        };

        socket.on('nouvelle_commande', handleUpdate);
        socket.on('commande_modifiee', handleUpdate);
        socket.on('statut_ligne_updated', handleUpdate);

        return () => {
            socket.off('nouvelle_commande', handleUpdate);
            socket.off('commande_modifiee', handleUpdate);
            socket.off('statut_ligne_updated', handleUpdate);
        };
    }, [socket]);

    const commandesAffichees =
        filtreStatut === 'Tous'
            ? commandes
            : commandes.filter((c) => c.statut === filtreStatut);

    const statutToClass = (statut: string) =>
        statut.toLowerCase().replace(/[^a-z0-9]/g, '_');

    return (
        <div className={styles.commandesContainer}>
            <div className="page-header">
                <h2 className="page-title">Suivi des Commandes</h2>
                <p className="page-subtitle">Gestion en temps réel du flux de service.</p>
            </div>

            <div className={styles.filtreStatuts}>
                <label>Filtrer par état :</label>
                <select
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value)}
                >
                    <option value="Tous">Tous les états</option>
                    {STATUTS.map((s) => (
                        <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                        </option>
                    ))}
                </select>
            </div>

            {commandesAffichees.length === 0 ? (
                <div className={styles.emptyState}>
                    <FaConciergeBell size={48} />
                    <p>Aucune commande active enregistrée.</p>
                </div>
            ) : (
                <div className={styles.gridCommandes}>
                    {commandesAffichees.map(({ id, table, plats, statut, heureCommande, total, estPaye }) => (
                        <div
                            key={id}
                            className={`${styles.cardCommande} ${styles[statutToClass(statut)]}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.tableInfo}>
                                    <span className={styles.tableLabel}>Table</span>
                                    <span className={styles.tableNumber}>{table}</span>
                                </div>
                                <div className={styles.metaInfo}>
                                    <span className={styles.heure}><FaClock /> {heureCommande}</span>
                                    <span className={styles.total}>{total.toFixed(2)} €</span>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.statutContainer}>
                                    <div className={`${styles.statutBadge} ${STATUS_BADGE_CLASSES[statut]}`}>
                                        {STATUS_LABELS[statut]}
                                    </div>
                                    <div className={`${styles.paiementBadge} ${estPaye ? styles.paye : styles.a_regler}`}>
                                        {estPaye ? <FaCheckCircle /> : <FaExclamationCircle />}
                                        {estPaye ? 'Payé' : 'À régler'}
                                    </div>
                                </div>
                                <ul className={styles.platsList}>
                                    {plats.map((plat, i) => (
                                        <li key={i}><FaUtensils size={14} /> {plat}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className={styles.cardFooter}>
                                {STATUTS.filter((s) => s !== statut).map((s) => {
                                    let Icon = FaArrowRight;
                                    if (s === 'SERVIE') Icon = FaConciergeBell;
                                    if (s === 'TERMINEE') Icon = FaMoneyBillWave;
                                    if (s === 'ANNULEE') Icon = FaTimes;

                                    return (
                                        <button
                                            key={s}
                                            onClick={() => changerStatutClick(id, s as StatutCommande)}
                                            className={styles.btnAction}
                                        >
                                            <Icon /> {STATUS_LABELS[s]}
                                        </button>
                                    );
                                })}

                                {statut !== 'TERMINEE' && statut !== 'ANNULEE' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const rawCmd = commandesRaw.find(c => c.id === id);
                                                if (rawCmd) {
                                                    setCommandeToEdit(rawCmd);
                                                    setEditOrderModalOpen(true);
                                                }
                                            }}
                                            className={`${styles.btnAction} ${styles.btnSecondary}`}
                                            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                                        >
                                            <FaEdit /> Modifier la Commande
                                        </button>
                                        <button
                                            onClick={() => openReductionModal(id)}
                                            className={`${styles.btnAction} ${styles.btnGesteCommercial}`}
                                        >
                                            <FaPercent /> Geste Co.
                                        </button>
                                        <button
                                            onClick={() => openAnnulerLigneModal(id, commandes.find(c => c.id === id)?.lignes || [])}
                                            className={`${styles.btnAction}`}
                                            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                        >
                                            <FaTimes /> Annuler article
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal}>Annuler</Button>
                        <Button variant="primary" onClick={modal.onConfirm || (() => { })}>Confirmer</Button>
                    </>
                }
            >
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '1.1rem' }}>
                    {modal.content}
                </div>
            </Modal>

            {editOrderModalOpen && commandeToEdit && (
                <EditCommandeModal
                    commande={commandeToEdit}
                    onClose={() => {
                        setEditOrderModalOpen(false);
                        setCommandeToEdit(null);
                    }}
                    onSuccess={() => {
                        setEditOrderModalOpen(false);
                        setCommandeToEdit(null);
                        fetchCommandes();
                    }}
                />
            )}
        </div>
    );
};

export default Commandes;
