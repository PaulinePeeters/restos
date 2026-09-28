import React, { useState, useEffect } from 'react';
import styles from './FideliteGestion.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';

import { tevenement } from '../../types/prisma-types';

interface OffreSpeciale extends Omit<tevenement, 'date_debut' | 'date_fin' | 'pourcentage_reduction'> {
    date_debut: string;
    date_fin: string;
    pourcentage_reduction: number | string;
    description: string;
    [key: string]: any;
}

interface OffreFormState {
    titre: string;
    date_debut: string;
    date_fin: string;
    pourcentage_reduction: string | number;
    description: string;
}
// Gère la création des offres spéciales et l'envoi des campagnes marketing
function FideliteGestion() {
    const { t } = useLanguage();
    const [offres, setOffres] = useState<OffreSpeciale[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<OffreFormState>({
        titre: '',
        date_debut: '',
        date_fin: '',
        pourcentage_reduction: '',
        description: ''
    });
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    useEffect(() => {
        fetchOffres();
    }, []);

    const fetchOffres = async () => {
        try {
            const data = await api.get('/fidelite/all-offres');
            if (data) {
                setOffres(data as OffreSpeciale[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    // Gère la soumission du formulaire pour créer une offre
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fidelite/offres', formData);
            toast.success(t('toast.loyalty.offer_created'));
            setFormData({
                titre: '',
                date_debut: '',
                date_fin: '',
                pourcentage_reduction: '',
                description: ''
            });
            fetchOffres();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.loyalty.create_error'));
        }
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer cette offre ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/fidelite/offres/${id}`);
            toast.success(t('toast.loyalty.offer_deleted'));
            fetchOffres();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.loyalty.delete_error'));
        }
        closeModal();
    };
    // Gère l'envoi des emails marketing pour une offre
    const handleNotifyClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation Marketing',
            content: 'Envoyer un email marketing à tous les clients pour cet événement ?',
            onConfirm: () => handleNotify(id)
        });
    };
    // Envoie un email marketing pour une offre 
    const handleNotify = async (id: number) => {
        try {
            const data: any = await api.post(`/fidelite/offres/${id}/notify`, {});
            if (data) toast.success(data.message);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.loyalty.send_error'));
        }
        closeModal();
    };

    if (loading) return <p>Chargement...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Gestion de la Fidélité & Offres</h2>
                <p className="page-subtitle">Créez des offres spéciales et envoyez des campagnes marketing.</p>
            </div>

            <div className={styles.card}>
                <h2>Créer une Offre Spéciale</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input type="text" name="titre" placeholder="Titre de l'événement (ex: Noël)" value={formData.titre} onChange={handleChange} required />
                    <div className={styles.row}>
                        <label>
                            <span>Début</span>
                            <input className={styles.dateInput} type="date" name="date_debut" value={formData.date_debut} onChange={handleChange} required />
                        </label>
                        <label>
                            <span>Fin</span>
                            <input className={styles.dateInput} type="date" name="date_fin" value={formData.date_fin} onChange={handleChange} required />
                        </label>
                    </div>
                    <input type="number" name="pourcentage_reduction" placeholder="% Réduction (ex: 10)" value={formData.pourcentage_reduction} onChange={handleChange} required />
                    <textarea name="description" placeholder="Description (optionnel)" value={formData.description} onChange={handleChange} />
                    <button type="submit" className={styles.btnPrimary}>Créer l'offre</button>
                </form>
            </div>

            <div className={styles.card}>
                <h2>Offres Existantes</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Dates</th>
                                <th>Réduction</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offres.map(offre => (
                                <tr key={offre.id}>
                                    <td>{offre.titre}</td>
                                    <td>{new Date(offre.date_debut).toLocaleDateString()} - {new Date(offre.date_fin).toLocaleDateString()}</td>
                                    <td>-{offre.pourcentage_reduction}%</td>
                                    <td>
                                        <div className={styles.cardActions}>
                                            <button onClick={() => handleNotifyClick(offre.id)} className={styles.btnNotify} title="Envoyer Email Marketing">
                                                Envoyer
                                            </button>
                                            <button onClick={() => handleDeleteClick(offre.id)} className={styles.btnDelete}>
                                                Supprimer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

export default FideliteGestion;
