import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import styles from './Membres.module.css';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { tpersonnel, Role } from '../../types/prisma-types';

const rolesDisponibles: Role[] = ['manager', 'serveur', 'cuisinier', 'livreur', 'barman'];

interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    onConfirm: (() => void) | null;
}

interface FormData {
    nom_personnel: string;
    prenom_personnel: string;
    email_personnel: string;
    mdp_personnel: string;
    role_personnel: Role;
    actif: boolean;
}

function Membres() {
    const { t } = useLanguage();
    const [membres, setMembres] = useState<tpersonnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const [formData, setFormData] = useState<FormData>({
        nom_personnel: '',
        prenom_personnel: '',
        email_personnel: '',
        mdp_personnel: '',
        role_personnel: rolesDisponibles[0],
        actif: true,
    });

    useEffect(() => {
        const fetchMembres = async () => {
            try {
                const data = await api.get('/personnels');
                setMembres(data || []);
                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Erreur chargement');
                setLoading(false);
            }
        };
        fetchMembres();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.mdp_personnel.length < 6) {
            toast.error(t('toast.members.password_length'));
            return;
        }

        try {
            const newMembre = await api.post('/personnels', formData);
            if (newMembre) {
                setMembres(prev => [...prev, newMembre]);
                setFormData({
                    nom_personnel: '',
                    prenom_personnel: '',
                    email_personnel: '',
                    mdp_personnel: '',
                    role_personnel: rolesDisponibles[0],
                    actif: true,
                });
                toast.success(t('toast.members.added'));
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t('toast.members.add_error'));
        }
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer ce membre ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/personnels/${id}`);
            setMembres(prev => prev.filter(m => m.id !== id));
            toast.success(t('toast.members.deleted'));
        } catch (err) {
            console.error(err);
            toast.error(t('toast.members.delete_error'));
        }
        closeModal();
    };

    if (loading) return <p>Chargement des membres...</p>;
    if (error) return <p>Erreur : {error}</p>;

    return (
        <div className={styles['membres-container']}>
            <h3>Liste des membres du personnel</h3>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Prénom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Actif</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {membres.map(m => (
                            <tr key={m.id}>
                                <td>{m.nom_personnel}</td>
                                <td>{m.prenom_personnel}</td>
                                <td>{m.email_personnel}</td>
                                <td>{m.role_personnel}</td>
                                <td>{m.actif ? <FaCheck /> : <FaTimes />}</td>
                                <td>
                                    <button onClick={() => handleDeleteClick(m.id)}><FaTrash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3>➕ Ajouter un membre</h3>
            <form onSubmit={handleAdd} className={styles.form}>
                <input
                    type="text"
                    name="nom_personnel"
                    placeholder="Nom"
                    value={formData.nom_personnel}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="prenom_personnel"
                    placeholder="Prénom"
                    value={formData.prenom_personnel}
                    onChange={handleChange}
                    required
                />
                <input
                    type="email"
                    name="email_personnel"
                    placeholder="Email"
                    value={formData.email_personnel}
                    onChange={handleChange}
                    required
                />
                <input
                    type="password"
                    name="mdp_personnel"
                    placeholder="Mot de passe"
                    value={formData.mdp_personnel}
                    onChange={handleChange}
                    required
                />

                <select
                    name="role_personnel"
                    value={formData.role_personnel}
                    onChange={(e) => setFormData({ ...formData, role_personnel: e.target.value as Role })}
                    required
                >
                    <option value="">--Choisir un rôle--</option>
                    {rolesDisponibles.map(role => (
                        <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                    ))}
                </select>

                <label>
                    Actif
                    <input
                        type="checkbox"
                        name="actif"
                        checked={formData.actif}
                        onChange={handleChange}
                    />
                </label>
                <button type="submit">Ajouter</button>
            </form>


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

export default Membres;
