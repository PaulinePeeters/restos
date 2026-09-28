import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './ScanQR.module.css';

export default function ServeurAccess() {
    const [numeroTable, setNumeroTable] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!numeroTable.trim()) {
            setError('Veuillez entrer un numéro de table valide');
            return;
        }

        try {
            const data: any = await api.get(`/session/menu-access?numero_table=${numeroTable.trim()}`);

            localStorage.setItem('session_id', data.session_id);
            navigate(`/menu?table_id=${data.table_id}`);
        } catch (err) {
            setError('Impossible de démarrer la session pour cette table.');
            console.error(err);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Prendre une Commande</h2>
                <p className="page-subtitle">Saisissez le numéro de table pour accéder au menu.</p>
            </div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Numéro de table (ex: 12, T1)"
                    value={numeroTable}
                    onChange={e => setNumeroTable(e.target.value)}
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>Accéder au menu</button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
