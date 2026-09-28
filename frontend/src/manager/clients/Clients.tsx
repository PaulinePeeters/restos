import React, { useState, useEffect } from 'react';
import styles from './Clients.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaStar, FaEnvelope, FaPhone, FaTrash } from 'react-icons/fa';

interface Client {
    id_client: number;
    nom_client: string;
    email_client: string;
    tel_client: string | null;
    points_fidelite: number;
    date_creation_client: string;
    est_vip: boolean;
}

function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const data: any = await api.get('/clients');
            if (data) {
                setClients(data);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des clients", error);
            toast.error("Impossible de charger les clients");
        } finally {
            setLoading(false);
        }
    };

    const toggleVip = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/fidelite/clients/${id}/vip`, { est_vip: !currentStatus });
            toast.success(!currentStatus ? "Client passé VIP" : "Statut VIP retiré");

            setClients(clients.map(c =>
                c.id_client === id ? { ...c, est_vip: !currentStatus } : c
            ));
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du changement de statut");
        }
    };
    const deleteClient = async (id: number) => {
        if (!window.confirm("Voulez-vous vraiment désactiver ce client ?")) return;

        try {
            await api.delete(`/clients/${id}`);
            toast.success("Client désactivé avec succès");
            setClients(clients.filter(c => c.id_client !== id));
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la suppression du client");
        }
    };

    const filteredClients = clients.filter(c =>
        c.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tel_client && c.tel_client.includes(searchTerm))
    );

    if (loading) return <p>Chargement du CRM...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Clients</h2>
                <p className="page-subtitle">Gérez votre base de données clients et les statuts VIP.</p>
            </div>

            <div className={styles.container}>
                <input
                    type="text"
                    placeholder="Rechercher par nom, email ou téléphone..."
                    className={styles.searchBar}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Contact</th>
                                <th>Inscription</th>
                                <th>Fidélité</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length > 0 ? (
                                filteredClients.map(client => (
                                    <tr key={client.id_client}>
                                        <td>
                                            <div className={styles.clientName}>
                                                {client.nom_client}
                                            </div>
                                            {client.est_vip && (
                                                <span className={styles.vipBadge}>
                                                    <FaStar /> VIP
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.contactInfo}>
                                                <span><FaEnvelope /> {client.email_client}</span>
                                                {client.tel_client && <span><FaPhone /> {client.tel_client}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {new Date(client.date_creation_client).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span className={styles.points}>{client.points_fidelite} pts</span>
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button
                                                    className={`${styles.btnVip} ${client.est_vip ? styles.btnVipActive : ''}`}
                                                    onClick={() => toggleVip(client.id_client, client.est_vip)}
                                                    title={client.est_vip ? "Retirer VIP" : "Définir VIP"}
                                                >
                                                    <FaStar />
                                                </button>
                                                <button
                                                    className={styles.btnDelete}
                                                    onClick={() => deleteClient(client.id_client)}
                                                    title="Supprimer"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={styles.emptyState}>
                                        Aucun client trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Clients;
