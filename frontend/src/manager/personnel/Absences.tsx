import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaHourglassHalf, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../services/api';
import styles from './Absences.module.css';
import { tabsencepersonnel, tpointage } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

interface DemandeAbsence extends Omit<tabsencepersonnel, 'date_debut' | 'date_fin' | 'statut'> {
    date_debut: string;
    date_fin: string;
    statut: string; 
    [key: string]: any;
}

interface Pointage extends Omit<tpointage, 'date' | 'statut'> {
    date: string;
    statut: string;
    [key: string]: any;
}

function Absences() {
    const { t } = useLanguage();
    const [demandes, setDemandes] = useState<DemandeAbsence[]>([]);
    const [pointages, setPointages] = useState<Pointage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'conges' | 'heures_sup'>('conges');

    const fetchData = async () => {
        try {
            setLoading(true);
            const absData = await api.get('/absences');
            const ptsData = await api.get('/pointage?statut=EN_ATTENTE');
            setDemandes((absData as DemandeAbsence[]) || []);
            setPointages((ptsData as Pointage[]) || []);
        } catch (err) {
            console.error(err);
            toast.error(t('toast.absences.load_error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const obtenirStatut = (statut: string) => {
        if (statut === 'EN_ATTENTE') return t('manager.absences.status_pending');
        if (statut === 'VALIDEE') return t('manager.absences.status_approved');
        if (statut === 'REFUSEE') return t('manager.absences.status_rejected');
        if (statut === 'ANNULEE') return 'Annulée';
        return statut;
    };
    // Formatage des heures et minutes
    const formatHoursMinutes = (value: number) => {
        const totalMinutes = Math.max(0, Math.round((Number(value) || 0) * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) return `${minutes} min`;
        if (minutes === 0) return `${hours} h`;
        return `${hours} h ${String(minutes).padStart(2, '0')}`;
    };
    // Mise à jour du statut des absences
    const mettreAJourStatutAbsence = async (id: number, nouveauStatut: string) => {
        try {
            const updated = await api.patch(`/absences/${id}`, { statut: nouveauStatut });
            if (updated) {
                setDemandes(prev => prev.map(d => d.id === id ? updated : d));
                toast.success(nouveauStatut === 'VALIDEE' ? t('toast.absences.approved') : t('toast.absences.refused'));
            }
        } catch (err) {
            toast.error(t('toast.absences.update_error'));
        }
    };
    // Validation des pointages
    const validerPointage = async (id: number, validated: boolean) => {
        try {
            await api.post(`/pointage/${id}/validate`, { validated });
            toast.success(validated ? t('toast.absences.overtime_validated') : t('toast.absences.overtime_refused'));
            setPointages(prev => prev.filter(p => p.id !== id));
        } catch (e) { toast.error(t('toast.absences.validation_error')); }
    };

    if (loading) return <p>Chargement...</p>;

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                <button
                    onClick={() => setActiveTab('conges')}
                    className={`${styles.tabButton} ${activeTab === 'conges' ? styles.tabActive : styles.tabInactive}`}
                >
                    <FaCalendarAlt /> Absences / Congés
                </button>
                <button
                    onClick={() => setActiveTab('heures_sup')}
                    className={`${styles.tabButton} ${activeTab === 'heures_sup' ? styles.tabActive : styles.tabInactive}`}
                >
                    <FaHourglassHalf /> Validation Heures Sup.
                    {pointages.length > 0 && <span className={styles.badge}>{pointages.length}</span>}
                </button>
            </div>

            {activeTab === 'conges' && (
                <>
                    <h3>Historique et Demandes de Congé</h3>
                    {demandes.length === 0 ? <p>Aucune demande.</p> : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Employé</th>
                                        <th>Type</th>
                                        <th>Période</th>
                                        <th>Motif</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demandes.map(demande => (
                                        <tr key={demande.id}>
                                            <td>{demande.tpersonnel?.prenom_personnel} {demande.tpersonnel?.nom_personnel}</td>
                                            <td>{demande.ttypeconge?.nom || 'Autre'}</td>
                                            <td>{new Date(demande.date_debut).toLocaleDateString('fr-BE', { timeZone: 'UTC' })} - {new Date(demande.date_fin).toLocaleDateString('fr-BE', { timeZone: 'UTC' })}</td>
                                            <td>{demande.motif_absence}</td>
                                            <td>{obtenirStatut(demande.statut)}</td>
                                            <td>
                                                {demande.statut === 'EN_ATTENTE' && (
                                                    <div className={styles.actions}>
                                                        <button className={styles.btnApprove} onClick={() => mettreAJourStatutAbsence(demande.id, 'VALIDEE')}><FaCheck /></button>
                                                        <button className={styles.btnRefuse} onClick={() => mettreAJourStatutAbsence(demande.id, 'REFUSEE')}><FaTimes /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'heures_sup' && (
                <>
                    <h3>Validation des Heures Supplémentaires</h3>
                    {pointages.length === 0 ? <p>Aucune heure supplémentaire en attente.</p> : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Employé</th>
                                        <th>Date</th>
                                        <th>Prestations</th>
                                        <th>Heures Sup.</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointages.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.tpersonnel?.prenom_personnel} {p.tpersonnel?.nom_personnel}</td>
                                            <td>{new Date(p.date).toLocaleDateString('fr-BE', { timeZone: 'UTC' })}</td>
                                            <td>{formatHoursMinutes(p.heures_prestees)}</td>
                                            <td className={styles.overtime}>+{formatHoursMinutes(p.heures_supp)}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button className={styles.btnApprove} onClick={() => validerPointage(p.id, true)}><FaCheck /></button>
                                                    <button className={styles.btnRefuse} onClick={() => validerPointage(p.id, false)}><FaTimes /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Absences;
