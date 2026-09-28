import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaFileInvoice, FaMapMarkerAlt, FaPhoneAlt, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import styles from './ListeLivraisons.module.css';

import { tcommande, tclient, tadresselivraison } from '../types/prisma-types';

const STATUS_LABELS: Record<string, string> = {
    'EN_ATTENTE': 'À préparer',
    'EN_PREPARATION': 'En préparation',
    'SERVIE': 'Prête / En livraison',
    'LIVREE': 'Livrée',
    'ANNULEE': 'Annulée',
    'TERMINEE': 'Clôturée'
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    'EN_ATTENTE': styles.badgeEnAttente,
    'EN_PREPARATION': styles.badgeEnAttente,
    'SERVIE': styles.badgeEnAttente,
    'LIVREE': styles.badgeLivree,
    'ANNULEE': styles.badgeAnnulee,
    'TERMINEE': styles.badgeLivree
};

interface Addresses extends tadresselivraison {
    [key: string]: any;
}

interface Client extends Omit<tclient, 'tadresselivraison'> {
    tadresselivraison?: Addresses[];
    [key: string]: any;
}

type Livraison = Omit<tcommande, 'tclient' | 'total_estime_commande' | 'adresse_livraison' | 'tel_livraison'> & {
    tclient?: Client;
    total_estime_commande: number | string; 
    adresse_livraison: string | null;
    tel_livraison: string | null;
    [key: string]: any;
};

function ListeLivraisons() {
    const { t } = useLanguage();
    const [livraisons, setLivraisons] = useState<Livraison[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLivraisons = async () => {
        try {
            const data: any = await api.get('/commandes/livraisons');
            if (data) {
                setLivraisons(data);
            }
        } catch (err) {
            console.error("[LIVREUR] Erreur fetch:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLivraisons();
        const interval = setInterval(fetchLivraisons, 15000);
        return () => clearInterval(interval);
    }, []);

    const changerStatut = async (id: number, nouveauStatut: string) => {
        console.log(`[LIVREUR] Tentative de mise à jour commande #${id} vers ${nouveauStatut}`);
        const toastId = toast.loading(t('toast.livreur.updating'));
        try {
            const res = await api.put(`/commandes/${id}/statut`, { statut: nouveauStatut });
            console.log("[LIVREUR] Réponse API:", res.data);
            toast.success(t('toast.delivery.status_update', { status: STATUS_LABELS[nouveauStatut] || nouveauStatut }), { id: toastId });
            fetchLivraisons();
        } catch (err: any) {
            console.error("[LIVREUR] Erreur update:", err);
            const msg = err.response?.data?.error || "Erreur lors de la mise à jour";
            toast.error(msg || t('toast.delivery.update_error'), { id: toastId });
        }
    };

    const telechargerBon = (nomClient: string) => {
        toast.success(t('toast.livreur.receipt', { name: nomClient }), { icon: '📄' });
    };

    if (loading) return <div className={styles.loading}>Chargement des livraisons...</div>;

    return (
        <div className={styles.container}>
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 className="page-title">Mes Livraisons</h2>
                <p className="page-subtitle">Suivi du flux logistique RestOS.</p>
            </header>

            <div className={styles.grid}>
                {livraisons.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Aucune livraison active pour le moment.</p>
                    </div>
                ) : livraisons.map(l => {
                    const client = l.tclient;
                
                    const adresseRaw = l.adresse_livraison || (client?.tadresselivraison && client.tadresselivraison[0]
                        ? `${client.tadresselivraison[0].rue_adresse} ${client.tadresselivraison[0].numero_adresse}, ${client.tadresselivraison[0].cp_adresse} ${client.tadresselivraison[0].ville_adresse}`
                        : "Adresse non renseignée");

                    const telRaw = l.tel_livraison || client?.tel_client;

                    return (
                        <div key={l.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.clientInfo}>
                                    <FaUser size={16} color="var(--color-primary)" />
                                    <span className={styles.clientName}>{client?.nom_client || "Client Passager"}</span>
                                </div>
                                <span className={styles.orderId}>#CMD-{l.id}</span>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <div className={styles.iconWrapper}><FaMapMarkerAlt /></div>
                                    <div className={styles.infoContent}>
                                        <span className={styles.label}>Adresse de livraison</span>
                                        <span className={styles.value}>{adresseRaw}</span>
                                    </div>
                                </div>

                                <div className={styles.infoRow}>
                                    <div className={styles.iconWrapper}><FaPhoneAlt /></div>
                                    <div className={styles.infoContent}>
                                        <span className={styles.label}>Numéro de contact</span>
                                        {telRaw ? (
                                            <a href={`tel:${telRaw}`} className={styles.phoneLink}>
                                                <FaPhoneAlt size={12} /> {telRaw}
                                            </a>
                                        ) : (
                                            <span className={styles.value} style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>Non renseigné</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.statutContainer}>
                                    <div className={`${styles.statutBadge} ${STATUS_BADGE_CLASSES[l.statut_commande]}`}>
                                        {STATUS_LABELS[l.statut_commande] || l.statut_commande}
                                    </div>
                                    <span className={styles.totalAmount}>{Number(l.total_estime_commande).toFixed(2)} €</span>
                                </div>
                            </div>

                            <div className={styles.actions}>
                                {l.statut_commande !== 'LIVREE' && l.statut_commande !== 'ANNULEE' && (
                                    <>
                                        <button onClick={() => changerStatut(l.id, 'LIVREE')} className={styles.btnPrimary}>
                                            <FaCheckCircle /> Valider la livraison
                                        </button>
                                        <button onClick={() => changerStatut(l.id, 'ANNULEE')} className={styles.btnSecondary} style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                                             Annuler / Échec
                                        </button>
                                    </>
                                )}
                                <button onClick={() => telechargerBon(client?.nom_client || 'Client')} className={styles.btnSecondary}>
                                    <FaFileInvoice /> Bon de livraison
                                </button>
                                <button className={styles.btnSecondary}>
                                    Historique
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ListeLivraisons;
