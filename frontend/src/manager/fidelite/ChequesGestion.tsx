import React, { useState, useEffect } from 'react';
import { FaEnvelope } from 'react-icons/fa';
import styles from './ChequesGestion.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';

import { tchequecadeau } from '../../types/prisma-types';

interface ChequeCadeau extends Omit<tchequecadeau, 'montant_initial' | 'solde_actuel' | 'date_expiration'> {
    montant_initial: number | string;
    solde_actuel: number;
    date_expiration: string;
    [key: string]: any;
}

interface ChequeFormState {
    montant: string;
    date_expiration: string;
}

interface EmailModalState {
    isOpen: boolean;
    chequeId: number | null;
    email: string;
}

function ChequesGestion() {
    const { t } = useLanguage();
    const [cheques, setCheques] = useState<ChequeCadeau[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<ChequeFormState>({
        montant: '',
        date_expiration: ''
    });
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [emailModal, setEmailModal] = useState<EmailModalState>({ isOpen: false, chequeId: null, email: '' });

    const closeModal = () => setModal({ ...modal, isOpen: false });
    const closeEmailModal = () => setEmailModal({ isOpen: false, chequeId: null, email: '' });

    useEffect(() => {
        fetchCheques();
    }, []);

    const fetchCheques = async () => {
        try {
            const data = await api.get('/cheques');
            if (data) {
                setCheques(data as ChequeCadeau[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/cheques', formData);
            toast.success(t('toast.cheques.created'));
            setFormData({ montant: '', date_expiration: '' });
            fetchCheques();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.cheques.create_error'));
        }
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer ce chèque ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/cheques/${id}`);
            toast.success(t('toast.cheques.deleted'));
            fetchCheques();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.cheques.delete_error'));
        }
        closeModal();
    };

    const handleSendEmailClick = (id: number) => {
        setEmailModal({ isOpen: true, chequeId: id, email: '' });
    };

    const handleSendEmail = async () => {
        const { chequeId, email } = emailModal;
        if (!email) return;

        try {
            const data: any = await api.post(`/cheques/${chequeId}/send`, { email });
            if (data) toast.success(data.message);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.cheques.send_error'));
        }
        closeEmailModal();
    };

    if (loading) return <p>Chargement...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Gestion des Chèques Cadeaux</h2>
                <p className="page-subtitle">Émettez et suivez les chèques cadeaux de votre établissement.</p>
            </div>

            <div className={styles.card}>
                <h2>Émettre un Chèque Cadeau</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input type="number" name="montant" placeholder="Montant (€)" value={formData.montant} onChange={handleChange} required />
                    <label>
                        <span>Date d'expiration</span>
                        <input className={styles.dateInput} type="date" name="date_expiration" value={formData.date_expiration} onChange={handleChange} required />
                    </label>
                    <button type="submit" className={styles.btnPrimary}>Générer le chèque</button>
                </form>
            </div>

            <div className={styles.card}>
                <h2>Chèques Actifs</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Montant Initial</th>
                                <th>Solde Actuel</th>
                                <th>Expiration</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cheques.map(cheque => (
                                <tr key={cheque.id}>
                                    <td className={styles.code}>{cheque.code}</td>
                                    <td>{cheque.montant_initial} €</td>
                                    <td className={cheque.solde_actuel > 0 ? styles.soldePositif : styles.soldeNegatif}>{cheque.solde_actuel} €</td>
                                    <td>{new Date(cheque.date_expiration).toLocaleDateString()}</td>
                                    <td>
                                        <button onClick={() => handleSendEmailClick(cheque.id)} className={styles.btnNotify} title="Envoyer par Email">
                                            <FaEnvelope />
                                        </button>
                                        <button onClick={() => handleDeleteClick(cheque.id)} className={styles.btnDelete}>Supprimer</button>
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

            <Modal
                isOpen={emailModal.isOpen}
                onClose={closeEmailModal}
                title="Envoyer le chèque par email"
                footer={
                    <>
                        <Button variant="outline" onClick={closeEmailModal}>Annuler</Button>
                        <Button variant="primary" onClick={handleSendEmail}>Envoyer</Button>
                    </>
                }
            >
                <label className={styles.emailLabel}>Email du bénéficiaire :</label>
                <input
                    type="email"
                    value={emailModal.email}
                    onChange={(e) => setEmailModal({ ...emailModal, email: e.target.value })}
                    className={styles.emailInput}
                    placeholder="exemple@email.com"
                />
            </Modal>
        </div >
    );
}

export default ChequesGestion;
