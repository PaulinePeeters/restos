import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaClock, FaPlay, FaStop } from 'react-icons/fa';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import styles from './PointageView.module.css';

import { tpointage, tpersonnel } from '../types/prisma-types';
type Pointage = tpointage;
type User = tpersonnel;

function resolvePointageStart(pointage: Pointage): Date | null {
    // Vérifie si l'heure de début est valide
    if (!pointage?.heure_debut) return null;

    const rawStart = new Date(pointage.heure_debut as any);
    if (Number.isNaN(rawStart.getTime())) return null;

    if (rawStart.getFullYear() === 1970) {
        const baseDate = pointage.date ? new Date(pointage.date as any) : new Date();
        if (Number.isNaN(baseDate.getTime())) return null;

        const now = Date.now();
        const buildCandidate = (useUTC: boolean) => {
            const rebuilt = new Date(baseDate);
            const h = useUTC ? rawStart.getUTCHours() : rawStart.getHours();
            const m = useUTC ? rawStart.getUTCMinutes() : rawStart.getMinutes();
            const s = useUTC ? rawStart.getUTCSeconds() : rawStart.getSeconds();

            rebuilt.setHours(h, m, s, 0);

            if (rebuilt.getTime() > now + 2 * 60 * 1000) {
                rebuilt.setDate(rebuilt.getDate() - 1);
            }
            return rebuilt;
        };

        const localCandidate = buildCandidate(false);
        const utcCandidate = buildCandidate(true);

        const localDelta = Math.abs(now - localCandidate.getTime());
        const utcDelta = Math.abs(now - utcCandidate.getTime());
        return localDelta <= utcDelta ? localCandidate : utcCandidate;
    }

    return rawStart;
}

function PointageView() {
    const { t } = useLanguage();
    const [status, setStatus] = useState<'offline' | 'working' | 'stopping'>('offline');
    const [currentPointage, setCurrentPointage] = useState<Pointage | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [pauseMinutes, setPauseMinutes] = useState(0);
    const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
    const getPointageStartStorageKey = (userId: number | string) => `pointage_start_ts_${userId}`;

    useEffect(() => {
        const load = async () => {
            const storedUser = sessionStorage.getItem('staffUser') || localStorage.getItem('staffUser');
            if (storedUser) {
                const u = JSON.parse(storedUser);
                setUser(u);

                const userId = u.id || (u as any).id_personnel;
                if (userId) {
                    try {
                        const res: any = await api.get(`/pointage?personnel_id=${userId}`);

                        if (Array.isArray(res) && res.length > 0) {
                            const pointages = [...res].sort((a: Pointage, b: Pointage) => {
                                const dateDiff = new Date(b.date as any).getTime() - new Date(a.date as any).getTime();
                                if (dateDiff !== 0) return dateDiff;
                                return Number(b.id) - Number(a.id);
                            });

                            const latestPointage = pointages[0];
                            const isLatestActive = latestPointage && !latestPointage.heure_fin;
                            if (isLatestActive) {
                                const p = latestPointage;
                                setCurrentPointage(p);
                                setStatus('working');

                                const storageKey = getPointageStartStorageKey(userId);
                                const persistedStart = localStorage.getItem(storageKey);
                                const parsedPersistedStart = persistedStart ? Number(persistedStart) : NaN;

                                if (Number.isFinite(parsedPersistedStart) && parsedPersistedStart > 0) {
                                    setStartTimestamp(parsedPersistedStart);
                                } else {
                                    const resolvedStart = resolvePointageStart(p);
                                    if (resolvedStart) {
                                        const startMs = resolvedStart.getTime();
                                        setStartTimestamp(startMs);
                                        localStorage.setItem(storageKey, String(startMs));
                                    }
                                }
                            } else {
                                localStorage.removeItem(getPointageStartStorageKey(userId));
                                setStatus('offline');
                                setCurrentPointage(null);
                                setStartTimestamp(null);
                            }
                        } else {
                            localStorage.removeItem(getPointageStartStorageKey(userId));
                            setStatus('offline');
                            setCurrentPointage(null);
                            setStartTimestamp(null);
                        }
                    } catch (apiError) {
                        console.error("Erreur fetching pointage:", apiError);
                    }
                }
            }
        };
        load();
    }, []);

    // Gestion du temps écoulé
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'working' && startTimestamp) {
            if (!Number.isFinite(startTimestamp)) {
                setElapsedTime('00:00:00');
                return;
            }

            interval = setInterval(() => {
                const diff = Date.now() - startTimestamp;

                if (diff >= 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setElapsedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
                } else {
                    setElapsedTime('00:00:00');
                }
            }, 1000);
        } else {
            setElapsedTime('00:00:00');
        }
        return () => clearInterval(interval);
    }, [status, startTimestamp]);

    // Gérer le démarrage
    const handleStart = async () => {
        const userId = user?.id || (user as any)?.id_personnel;
        if (!user || !userId) {
            toast.error(t('toast.pointage.user_error'));
            return;
        }
        try {
            const now = Date.now();
            const res: any = await api.post('/pointage', {
                personnel_id: userId,
                date: new Date().toISOString(),
                heure_debut: new Date(now).toISOString()
            });
            setCurrentPointage(res);
            setStatus('working');
            setStartTimestamp(now);
            setElapsedTime('00:00:00');
            localStorage.setItem(getPointageStartStorageKey(userId), String(now));
            toast.success(t('toast.pointage.start'));
        } catch (e) {
            toast.error(t('toast.pointage.start_error'));
        }
    };

    const handleStopClick = () => {
        setStatus('stopping');
    };

    const handleConfirmStop = async () => {
        if (!currentPointage) return;

        try {
            await api.patch(`/pointage/${currentPointage.id}`, {
                heure_fin: new Date().toISOString(),
                pause_minutes: Number(pauseMinutes) || 0
            });
            const userId = user?.id || (user as any)?.id_personnel;
            if (userId) {
                localStorage.removeItem(getPointageStartStorageKey(userId));
            }
            setStatus('offline');
            setCurrentPointage(null);
            setStartTimestamp(null);
            setElapsedTime('00:00:00');
            setPauseMinutes(0);
            toast.success(t('toast.pointage.end'));
        } catch (e) {
            toast.error(t('toast.pointage.end_error'));
            setStatus('working');
        }
    };

    const handleCancelStop = () => {
        setStatus('working');
    };


    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Pointage</h2>
                <p className="page-subtitle">Enregistrez vos heures de travail.</p>
            </div>

            {status === 'working' && (
                <div className={styles.timer}>
                    {elapsedTime}
                </div>
            )}
            {status !== 'working' && (
                <div className={styles.iconPlaceholder}>
                    <FaClock />
                </div>
            )}

            {status === 'offline' && (
                <button onClick={handleStart} className={`${styles.btn} ${styles.btnGreen}`}>
                    <FaPlay /> Commencer la journée
                </button>
            )}

            {status === 'working' && (
                <button onClick={handleStopClick} className={`${styles.btn} ${styles.btnRed}`}>
                    <FaStop /> Terminer la journée
                </button>
            )}

            {status === 'stopping' && (
                <div className={styles.stoppingContainer}>
                    <p className={styles.pauseLabel}>Temps de pause (minutes) :</p>
                    <input
                        type="number"
                        min="0"
                        value={pauseMinutes}
                        onChange={(e) => setPauseMinutes(Number(e.target.value))}
                        className={styles.pauseInput}
                    />
                    <div className={styles.actionButtons}>
                        <button onClick={handleCancelStop} className={`${styles.btn} ${styles.btnGray} ${styles.btnSmall}`}>
                            Annuler
                        </button>
                        <button onClick={handleConfirmStop} className={`${styles.btn} ${styles.btnRed} ${styles.btnSmall}`}>
                            Confirmer Fin
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PointageView;
