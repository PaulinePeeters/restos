import React, { useState, useEffect } from 'react';
import styles from './Reservation.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FaTrashAlt, FaCheckCircle, FaStar } from 'react-icons/fa';

import { treservation, tclient, ttableresto, StatutReservation } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

interface Reservation extends Omit<treservation, 'tclient' | 'ttableresto'> {
    tclient?: Partial<tclient> | null;
    ttableresto?: Partial<ttableresto> | null;
    date_reservation: any;
    heure_reservation: any;
}

interface Table extends Omit<ttableresto, 'numero_table' | 'est_occupee_par_fusion' | 'type_element'> {
    numero_table?: string | number;
    est_occupee_par_fusion?: boolean;
    type_element?: 'table' | 'window' | 'door' | 'wall' | 'zone';
    [key: string]: any;
}

interface ReservationsProps {
    clientId: number | string | null;
}

interface FormState {
    nom: string;
    nb_personnes: number | string;
    date_reservation: string;
    heure_reservation: string;
    table_id: number | string;
    statut_reservation: StatutReservation;
    commentaire_reservation: string;
}

const isArrivalBlockedStatus = (status: StatutReservation) => ['ARRIVEE', 'TERMINEE', 'ANNULEE', 'NON_PRESENT'].includes(status);

export default function ReservationManager({ clientId }: ReservationsProps) {
    const { t } = useLanguage();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [form, setForm] = useState<FormState>({
        nom: '',
        nb_personnes: 1,
        date_reservation: '',
        heure_reservation: '',
        table_id: '',
        statut_reservation: 'EN_ATTENTE',
        commentaire_reservation: '',
    });
    const [message, setMessage] = useState<string | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const data: any = await api.get('/reservations');
                if (data) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const filtres = data.filter(
                        (r: Reservation) => {
                            if (r.statut_reservation === 'TERMINEE' || r.statut_reservation === 'ANNULEE') return false;
                            // Les no-shows restent visibles le jour même, mais sont masqués le lendemain
                            if (r.statut_reservation === 'NON_PRESENT') {
                                const dateRes = new Date(r.date_reservation);
                                dateRes.setHours(0, 0, 0, 0);
                                return dateRes >= today;
                            }
                            return true;
                        }
                    );
                    setReservations(filtres);
                }
            } catch (err) {
                setErreur('Erreur chargement des réservations');
            }
        };
        fetchReservations();
    }, []);

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const data: any = await api.get('/tables');
                if (data) setTables(data);
            } catch (err) {
                setErreur('Erreur chargement des tables');
            }
        };
        fetchTables();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setMessage(null);
        setErreur(null);
    };

    const ajouterReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.date_reservation || !form.heure_reservation || !form.nb_personnes || !form.table_id) {
            setErreur("Veuillez remplir tous les champs obligatoires.");
            return;
        }
        if (!clientId) {
            setErreur("Vous devez être connecté pour faire une réservation.");
            return;
        }

        const nouvelleResa = {
            ...form,
            client_id: clientId,
            nb_personnes: Number(form.nb_personnes),
            table_id: Number(form.table_id),
        };

        try {
            const data: any = await api.post('/reservations', nouvelleResa);
            if (data) {
                if (data.statut_reservation !== 'TERMINEE' && data.statut_reservation !== 'ANNULEE') {
                    setReservations(prev => [...prev, data]);
                }

                setMessage("Réservation ajoutée avec succès !");
                setForm({
                    nom: '',
                    nb_personnes: 1,
                    date_reservation: '',
                    heure_reservation: '',
                    table_id: '',
                    statut_reservation: 'EN_ATTENTE',
                    commentaire_reservation: '',
                });
            }
        } catch (err: any) {
            setErreur(err.message || "Erreur lors de la création de la réservation.");
        }
    };

    const supprimerReservationClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: "Confirmez-vous la suppression de cette réservation ?",
            onConfirm: () => supprimerReservation(id)
        });
    };

    const supprimerReservation = async (id: number) => {
        try {
            await api.delete(`/reservations/${id}`);
            setReservations(prev => prev.filter(r => r.id !== id));
            toast.success(t('toast.reservations.deleted'));
        } catch {
            toast.error(t('toast.reservations.delete_error'));
        }
        closeModal();
    };

    const confirmerReservation = async (id: number) => {
        try {
            const updated: any = await api.put(`/reservations/${id}`, { statut_reservation: 'CONFIRMEE' });
            setReservations(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
            toast.success(t('toast.reservations.confirmed'));
        } catch (error: any) {
            toast.error(error.message || t('toast.reservations.confirm_error'));
        }
    };

    const confirmerArrivee = async (id: number) => {
        try {
            const updated: any = await api.put(`/reservations/${id}`, { statut_reservation: 'ARRIVEE' });
            setReservations(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
            toast.success(t('toast.reservations.arrival_confirmed'));
        } catch (error: any) {
            toast.error(error.message || t('toast.reservations.arrival_error'));
        }
    };

    const annulerReservation = async (id: number) => {
        try {
            const updated: any = await api.put(`/reservations/${id}`, { statut_reservation: 'ANNULEE' });
            setReservations(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
            toast.success(t('toast.reservations.cancelled'));
        } catch (error: any) {
            toast.error(error.message || t('toast.reservations.cancel_error'));
        }
    };

    const toggleVipStatus = async (clientId: number, est_vip: boolean) => {
        try {
            await api.put(`/fidelite/clients/${clientId}/vip`, { est_vip });
            setReservations(prev => prev.map(r => {
                if (r.client_id === clientId && r.tclient) {
                    return { ...r, tclient: { ...r.tclient, est_vip } };
                }
                return r;
            }));
            toast.success(`Statut VIP ${est_vip ? 'activé' : 'désactivé'}`);
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la modification du statut VIP');
        }
    };

    // Format date en jj/mm/aaaa
    const formatDate = (dateStr: string | Date) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR');
    };

    // Format heure hh:mm
    const formatHeureUTC = (heureStr: string | Date) => {
        if (!heureStr) return '—';
        const d = new Date(heureStr);
        if (isNaN(d.getTime())) return '—';

        const hours = d.getUTCHours().toString().padStart(2, '0');
        const minutes = d.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    // Tables occupées
    const tablesOccupees = () => {
        if (!form.date_reservation || !form.heure_reservation) return [];
        return reservations
            .filter(
                r =>
                    r.date_reservation.startsWith(form.date_reservation) &&
                    r.heure_reservation.startsWith(form.heure_reservation)
            )
            .map(r => r.table_id);
    };
    // Class pour le statut
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'CONFIRMEE': return 'statusConfirmed';
            case 'ARRIVEE': return 'statusArrived';
            case 'EN_ATTENTE': return 'statusPending';
            case 'ANNULEE': return 'statusCancelled';
            case 'TERMINEE': return 'statusCompleted';
            default: return 'statusDefault';
        }
    };

    const formatStatus = (status: StatutReservation) => {
        switch (status) {
            case 'EN_ATTENTE': return 'En attente';
            case 'CONFIRMEE': return 'Confirmée';
            case 'ARRIVEE': return 'Arrivée';
            case 'ANNULEE': return 'Annulée';
            case 'TERMINEE': return 'Terminée';
            case 'NON_PRESENT': return 'No-show';
            default: return status;
        }
    };

    const getStyle = (className: string) => (styles as any)[className] || className;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Gestion des Réservations</h2>
                <p className="page-subtitle">Gérez les réservations et visualisez l'occupation des tables.</p>
            </div>

            {/* Liste des réservations */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nom client</th>
                            <th>Personnes</th>
                            <th>Date</th>
                            <th>Heure</th>
                            <th>Table</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.length === 0 && (
                            <tr>
                                <td colSpan={7} className={styles.emptyState}>Aucune réservation en cours.</td>
                            </tr>
                        )}
                        {reservations.map(r => (
                            <tr key={r.id}>
                                <td>
                                    {r.tclient?.nom_client || form.nom || '—'}
                                    {r.client_id && r.tclient && (
                                        <button 
                                            onClick={() => toggleVipStatus(r.client_id as number, !r.tclient!.est_vip)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '5px', color: r.tclient.est_vip ? '#f59e0b' : '#d1d5db' }}
                                            title={r.tclient.est_vip ? "Retirer statut VIP" : "Promouvoir VIP"}
                                        >
                                            <FaStar />
                                        </button>
                                    )}
                                </td>
                                <td>{r.nb_personnes}</td>
                                <td>{formatDate(r.date_reservation)}</td>
                                <td>{formatHeureUTC(r.heure_reservation)}</td>
                                <td>{r.ttableresto?.numero_table || `Table ${r.table_id}`}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${getStyle(getStatusClass(r.statut_reservation))}`}>
                                        {formatStatus(r.statut_reservation)}
                                    </span>
                                </td>
                                <td>
                                    {r.statut_reservation === 'EN_ATTENTE' && (
                                        <>
                                            <button
                                                onClick={() => confirmerReservation(r.id)}
                                                className={`${styles.btnAction} ${styles.btnConfirm}`}
                                                title="Confirmer la réservation"
                                            >
                                                Confirmer
                                            </button>
                                            <button
                                                onClick={() => setModal({
                                                    isOpen: true,
                                                    title: 'Confirmation',
                                                    content: 'Annuler cette réservation ?',
                                                    onConfirm: () => { annulerReservation(r.id); closeModal(); }
                                                })}
                                                className={`${styles.btnAction} ${styles.btnCancel}`}
                                                title="Annuler la réservation"
                                            >
                                                Annuler
                                            </button>
                                        </>
                                    )}
                                    {r.statut_reservation === 'CONFIRMEE' && (
                                        <>
                                            <button
                                                onClick={() => confirmerArrivee(r.id)}
                                                className={`${styles.btnAction} ${styles.btnConfirmArrival}`}
                                                title="Confirmer l'arrivée du client"
                                            >
                                                <FaCheckCircle /> Arrivée
                                            </button>
                                            <button
                                                onClick={() => setModal({
                                                    isOpen: true,
                                                    title: 'Confirmation',
                                                    content: 'Annuler cette réservation ?',
                                                    onConfirm: () => { annulerReservation(r.id); closeModal(); }
                                                })}
                                                className={`${styles.btnAction} ${styles.btnCancel}`}
                                                title="Annuler la réservation"
                                            >
                                                Annuler
                                            </button>
                                        </>
                                    )}
                                    {r.statut_reservation === 'ARRIVEE' && (
                                        <span className={styles.infoText}>Session active</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Tables occupées */}
            <div className={styles.tablesOccupees}>
                {(form.date_reservation && form.heure_reservation) ? (
                    <>
                        <p>
                            <strong>
                                Tables occupées à {form.heure_reservation} le {form.date_reservation} :
                            </strong>
                        </p>
                        <ul>
                            {tablesOccupees().length > 0 ? (
                                tablesOccupees().map((id, i) => {
                                    const t = tables.find(table => table.id === id);
                                    return <li key={i}>{t?.nom_table || `Table ${id}`}</li>;
                                })
                            ) : (
                                <li>Aucune</li>
                            )}
                        </ul>
                    </>
                ) : (
                    <p>Veuillez sélectionner une date et une heure pour voir les tables occupées.</p>
                )}
            </div>

            {/* Formulaire ajout réservation */}
            <div className={styles.formAjout}>
                <h3>➕ Ajouter une réservation</h3>
                {message && <p className={styles.successMessage}>{message}</p>}
                {erreur && <p className={styles.errorMessage}>{erreur}</p>}

                <form onSubmit={ajouterReservation} className={styles.form}>
                    <input
                        type="text"
                        name="nom"
                        placeholder="Nom (optionnel)"
                        value={form.nom}
                        onChange={handleChange}
                    />
                    <input
                        type="number"
                        name="nb_personnes"
                        placeholder="Nombre de personnes"
                        min="1"
                        value={form.nb_personnes}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="date"
                        name="date_reservation"
                        value={form.date_reservation}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="time"
                        name="heure_reservation"
                        value={form.heure_reservation}
                        onChange={handleChange}
                        required
                    />
                    <select
                        name="table_id"
                        value={form.table_id}
                        onChange={handleChange}
                        required
                    >
                        <option value="">-- Choisissez une table --</option>
                        {tables
                            .filter(t => !t.est_occupee_par_fusion && t.type_element === 'table')
                            .map(table => (
                                <option key={table.id} value={table.id}>
                                    {table.numero_table || `Table ${table.id}`}
                                </option>
                            ))}
                    </select>

                    <textarea
                        name="commentaire_reservation"
                        placeholder="Commentaires, demandes spéciales"
                        value={form.commentaire_reservation}
                        onChange={handleChange}
                        rows={3}
                    />

                    <Button type="submit" variant="primary" className={styles.btnSubmit}>
                        Envoyer la réservation
                    </Button>
                </form>
            </div>


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
                <p>{modal.content}</p>
            </Modal>
        </div >
    );
}
