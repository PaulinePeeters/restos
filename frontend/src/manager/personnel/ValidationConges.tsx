import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { tabsencepersonnel, tpointage, ttypeconge } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';
import styles from './ValidationConges.module.css';

interface TypeConge extends ttypeconge {
    [key: string]: any;
}

interface DemandeAbsence extends Omit<tabsencepersonnel, 'date_debut' | 'date_fin' | 'statut' | 'ttypeconge'> {
    date_debut: string;
    date_fin: string;
    valide: boolean | null;
    ttypeconge?: TypeConge;
    [key: string]: any;
}

interface Pointage extends Omit<tpointage, 'date'> {
    date: string;
    [key: string]: any;
}
// Validation des conges et pointages
function ValidationConges() {
    const { t } = useLanguage();
    const [absences, setAbsences] = useState<DemandeAbsence[]>([]);
    const [pointages, setPointages] = useState<Pointage[]>([]);

    const loadData = async () => {
        try {
            const absData = await api.get('/absences?valide=null');
            setAbsences((absData as DemandeAbsence[]) || []);
            const ptsData = await api.get('/pointage?statut=EN_ATTENTE');
            setPointages((ptsData as Pointage[]) || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadData();
    }, []);
    // Validation des absences
    const handleValidateAbsence = async (id: number, valide: boolean) => {
        try {
            await api.patch(`/absences/${id}`, { valide });
            toast.success(valide ? t('toast.absences.approved') : t('toast.absences.refused'));
            loadData();
        } catch (e) { toast.error(t('toast.absences.validation_error')); }
    };
    // Validation des pointages
    const handleValidatePointage = async (id: number, validated: boolean) => {
        try {
            await api.post(`/pointage/${id}/validate`, { validated });
            toast.success(validated ? t('toast.absences.overtime_validated') : t('toast.absences.overtime_refused'));
            loadData();
        } catch (e) { toast.error(t('toast.absences.validation_error')); }
    };

    const formatHoursMinutes = (value: number) => {
        const totalMinutes = Math.max(0, Math.round((Number(value) || 0) * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) return `${minutes} min`;
        if (minutes === 0) return `${hours} h`;
        return `${hours} h ${String(minutes).padStart(2, '0')}`;
    };

    return (
        <div className={styles.container}>
            <h3>Validations en attente</h3>

            <div className={styles.grid}>
                <div className={styles.column}>
                    <h4>Absences / Congés</h4>
                    {absences.length === 0 && <p>Aucune demande en attente.</p>}
                    <ul className={styles.list}>
                        {absences.map(a => (
                            <li key={a.id} className={styles.card}>
                                <div><strong>{a.tpersonnel?.prenom_personnel} {a.tpersonnel?.nom_personnel}</strong></div>
                                <div>{a.ttypeconge?.nom || 'Absence'}</div>
                                <div>Du {new Date(a.date_debut).toLocaleDateString()} au {new Date(a.date_fin).toLocaleDateString()}</div>
                                <div className={styles.motif}>{a.motif_absence}</div>
                                <div className={styles.actions}>
                                    <button onClick={() => handleValidateAbsence(a.id, true)} className={styles.buttonApprove}>Valider</button>
                                    <button onClick={() => handleValidateAbsence(a.id, false)} className={styles.buttonReject}>Refuser</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.column}>
                    <h4>Heures Supplémentaires</h4>
                    {pointages.length === 0 && <p>Aucun pointage à valider.</p>}
                    <ul className={styles.list}>
                        {pointages.map(p => (
                            <li key={p.id} className={styles.card}>
                                <div><strong>{p.tpersonnel?.prenom_personnel} {p.tpersonnel?.nom_personnel}</strong></div>
                                <div>Date: {new Date(p.date).toLocaleDateString()}</div>
                                <div>Heures prestées: {formatHoursMinutes(p.heures_prestees)}</div>
                                <div className={styles.overtime}>Sup: +{formatHoursMinutes(p.heures_supp)}</div>
                                <div className={styles.actions}>
                                    <button onClick={() => handleValidatePointage(p.id, true)} className={styles.buttonApprove}>Valider</button>
                                    <button onClick={() => handleValidatePointage(p.id, false)} className={styles.buttonReject}>Refuser</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ValidationConges;
