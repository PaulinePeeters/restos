import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaStar } from 'react-icons/fa';
import { Stage, Layer, Rect, Circle, Group, Text } from "react-konva";
import styles from './Reservation.module.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

import { ttableresto } from '../types/prisma-types';

interface TableElement extends Omit<ttableresto, 'type_element'> {
    type_element: 'table' | 'window' | 'door' | 'wall' | 'zone';
    [key: string]: any;
}

interface ReservationFormData {
    nom: string;
    email: string;
    telephone: string;
    date: string;
    heure: string;
    personnes: number;
    message: string;
    table_id: string;
}

interface InviteFormData {
    nom_client: string;
    email_client: string;
    telephone_client: string;
    date_reservation: string;
    heure_reservation: string;
    nb_personnes: number;
    table_id: string;
    commentaire_reservation: string;
}

const Reservation: React.FC = () => {
    const { t } = useLanguage();
    const [isInvite, setIsInvite] = useState(false);
    const [tables, setTables] = useState<TableElement[]>([]);
    const [confirmation, setConfirmation] = useState('');
    const [erreur, setErreur] = useState('');
    const [clientId, setClientId] = useState<number | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [favoriteTableId, setFavoriteTableId] = useState<number | null>(null);

    // Multi-Salles
    const [rooms, setRooms] = useState<string[]>(["Principale"]);
    const [currentRoom, setCurrentRoom] = useState("Principale");

    const [formData, setFormData] = useState<ReservationFormData>({
        nom: '', email: '', telephone: '', date: '', heure: '', personnes: 1, message: '', table_id: ''
    });
    const [formInvite, setFormInvite] = useState<InviteFormData>({
        nom_client: '', email_client: '', telephone_client: '', date_reservation: '', heure_reservation: '', nb_personnes: 1, table_id: '', commentaire_reservation: ''
    });

    const [availableTables, setAvailableTables] = useState<Set<number>>(new Set());
    const [dimensions, setDimensions] = useState({ width: 500, height: 600 });
    const wrapperRef = useRef<HTMLDivElement>(null);

    const getStoredClient = () => {
        const userStr = localStorage.getItem('user');
        const legacyClientStr = localStorage.getItem('client');
        const source = userStr || legacyClientStr;

        if (!source) {
            return null;
        }

        try {
            const parsed = JSON.parse(source);
            const id = parsed?.id_client ?? parsed?.id;
            return id ? Number(id) : null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        if (!wrapperRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (wrapperRef.current) {
                const width = wrapperRef.current.offsetWidth - 40;
                setDimensions({
                    width: width,
                    height: 600
                });
            }
        });
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const syncClientId = () => {
            setClientId(getStoredClient());
        };

        syncClientId();
        window.addEventListener('clientConnecte', syncClientId);

        const fetchTables = async () => {
            try {
                const data: any = await api.get('/tables');
                if (data) {
                    setTables(data);
                    const uniqueRooms = Array.from(new Set((data as TableElement[]).map(e => e.salle).filter(Boolean)));
                    if (uniqueRooms.length > 0) {
                        setRooms(prev => Array.from(new Set([...prev, ...uniqueRooms])));
                    }

                    // Vérifier la table favorite
                    if (getStoredClient()) {
                        try {
                            const settings: any = await api.get('/fidelite/favorite-table');
                            if (settings && settings.table && settings.count >= 5) {
                                const favTableId = settings.table.id;
                                if (data.find((t: TableElement) => t.id === favTableId)) {
                                    setFavoriteTableId(favTableId);
                                    setSelectedTableId(favTableId);
                                    if (settings.table.salle) setCurrentRoom(settings.table.salle);
                                    toast.success(t('toast.book.favorite_preselected', { table: settings.table.numero_table }), {
                                        icon: <FaStar style={{ color: '#f59e0b' }} />,
                                        duration: 4000
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("Erreur récupération favoris", err);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTables();

        return () => {
            window.removeEventListener('clientConnecte', syncClientId);
        };
    }, []);

    useEffect(() => {
        setFormData(prev => ({ ...prev, table_id: selectedTableId ? String(selectedTableId) : '' }));
        setFormInvite(prev => ({ ...prev, table_id: selectedTableId ? String(selectedTableId) : '' }));
    }, [selectedTableId]);

    // Charger les tables disponibles quand date/heure/capacité changent
    useEffect(() => {
        const chargerTablesDisponibles = async () => {
            const { date, heure, personnes } = formData;
            
            if (!date || !heure || !personnes) {
                setAvailableTables(new Set());
                return;
            }

            try {
                const response: any = await api.get('/tables/available', {
                    params: {
                        date,
                        heure,
                        capacite: Number(personnes)
                    }
                });
                
                const ids = new Set<number>(response.map((t: any) => Number(t.id)));
                setAvailableTables(ids);
            } catch (err) {
                console.error('Erreur chargement tables disponibles:', err);
                setAvailableTables(new Set());
            }
        };

        chargerTablesDisponibles();
        // Polling automatique pour vérifier les tables disponibles en temps réel
        const interval = setInterval(chargerTablesDisponibles, 5000);
        return () => clearInterval(interval);
    }, [formData.date, formData.heure, formData.personnes]);

    // Idem pour le formulaire invite
    useEffect(() => {
        const chargerTablesDisponibles = async () => {
            const { date_reservation, heure_reservation, nb_personnes } = formInvite;
            
            if (!date_reservation || !heure_reservation || !nb_personnes) {
                setAvailableTables(new Set());
                return;
            }

            try {
                const response: any = await api.get('/tables/available', {
                    params: {
                        date: date_reservation,
                        heure: heure_reservation,
                        capacite: Number(nb_personnes)
                    }
                });
                
                const ids = new Set<number>(response.map((t: any) => Number(t.id)));
                setAvailableTables(ids);
            } catch (err) {
                console.error('Erreur chargement tables disponibles:', err);
                setAvailableTables(new Set());
            }
        };

        if (isInvite) {
            chargerTablesDisponibles();
        }
    }, [formInvite.date_reservation, formInvite.heure_reservation, formInvite.nb_personnes, isInvite]);

    const handleTableClick = (table: TableElement) => {
        if (table.est_occupee_par_fusion) return;
        // N'permettre de sélectionner que les tables disponibles
        if (!isInvite && availableTables.size > 0 && !availableTables.has(table.id)) return;
        if (isInvite && availableTables.size > 0 && !availableTables.has(table.id)) return;
        setSelectedTableId(prev => prev === table.id ? null : table.id);
    };

    const renderTableMap = (el: TableElement) => {
        if (el.salle !== currentRoom) return null;

        const isTable = el.type_element === 'table';
        const isSelected = selectedTableId === el.id;
        const isAvailable = availableTables.size === 0 || availableTables.has(el.id);

        let fill = '#dcfce7';
        let stroke = '#22c55e';

        if (isTable) {
            if (!isAvailable) {
                // Table non disponible
                fill = '#e5e7eb';
                stroke = '#9ca3af';
            } else if (isSelected) {
                fill = '#ffedd5';
                stroke = '#f97316';
            }
        } else {
            if (el.type_element === 'window') { fill = '#e0f2fe'; stroke = '#bae6fd'; }
            if (el.type_element === 'door') { fill = '#ffedd5'; stroke = '#fed7aa'; }
            if (el.type_element === 'wall') { fill = '#4b5563'; stroke = '#374151'; }
            if (el.type_element === 'zone') { fill = 'rgba(200,200,200,0.1)'; stroke = '#e5e7eb'; }
        }

        const scale = 0.6;
        const w = el.largeur * scale;
        const h = el.hauteur * scale;
        const x = el.pos_x * scale;
        const y = el.pos_y * scale;

        const commonProps = {
            x: x,
            y: y,
            rotation: el.rotation || 0,
            onClick: () => isTable && handleTableClick(el),
            onTap: () => isTable && handleTableClick(el),
        };

        const cursorStyle = isTable ? 'pointer' : 'default';

        if (el.orientation === 'round' || (isTable && el.orientation === 'round')) {
            return (
                <Group key={el.id} {...commonProps} onMouseEnter={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = cursorStyle; }} onMouseLeave={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = 'default'; }}>
                    <Circle radius={w / 2} fill={fill} stroke={stroke} strokeWidth={2} />
                    {isTable && <Text text={el.numero_table} fontSize={10} fill={stroke} x={-w / 2} y={-5} width={w} align="center" />}
                </Group>
            );
        }
        return (
            <Group key={el.id} {...commonProps} onMouseEnter={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = cursorStyle; }} onMouseLeave={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = 'default'; }}>
                <Rect
                    width={w}
                    height={h}
                    cornerRadius={isTable ? 4 : 0}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    dash={el.type_element === 'zone' ? [5, 3] : []}
                />
                {isTable && <Text text={el.numero_table} fontSize={10} fill={stroke} width={w} y={h / 2 - 5} align="center" />}
            </Group>
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleChangeInvite = (e: React.ChangeEvent<HTMLInputElement>) => setFormInvite({ ...formInvite, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) return setErreur(t('book.feedback.login_req'));
        try {
            await api.post('/reservations', {
                client_id: clientId,
                date_reservation: formData.date,
                heure_reservation: formData.heure,
                nb_personnes: Number(formData.personnes),
                commentaire_reservation: formData.message,
                table_id: Number(formData.table_id),
            });
            setConfirmation(t('book.feedback.confirm'));
        } catch { setErreur(t('book.feedback.error')); }
    };

    const handleSubmitInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/reservations', formInvite);
            setConfirmation(t('book.feedback.confirm'));
            toast.success(t('toast.book.sent'));
        } catch { toast.error(t('toast.book.error')); }
    };

    return (
        <div className={styles['reservation-container']}>
            <h1>{t('book.title')}</h1>

            <div className={styles.contentWrapper}>
                <div className={styles.formColumn}>
                    <div className={styles.toggleButtons}>
                        <button
                            type="button"
                            onClick={() => setIsInvite(false)}
                            className={`${styles.toggleButton} ${!isInvite ? styles.toggleButtonActive : ''}`}
                            aria-pressed={!isInvite}
                        >
                            {t('book.tabs.account')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsInvite(true)}
                            className={`${styles.toggleButton} ${isInvite ? styles.toggleButtonActive : ''}`}
                            aria-pressed={isInvite}
                        >
                            {t('book.tabs.guest')}
                        </button>
                    </div>

                    <form onSubmit={isInvite ? handleSubmitInvite : handleSubmit} className={styles['reservation-form']}>
                        {!isInvite ? (
                            <>
                                <label>{t('book.form.date')} <input type="date" name="date" value={formData.date} onChange={handleChange} required /></label>
                                <label>{t('book.form.time')} <input type="time" name="heure" value={formData.heure} onChange={handleChange} required /></label>
                                <label>{t('book.form.guests')} <input type="number" name="personnes" value={formData.personnes} min="1" onChange={handleChange} required /></label>
                                <label>{t('book.form.table')}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                        <input type="text" value={formData.table_id ? `Table ${tables.find(t => t.id === Number(formData.table_id))?.numero_table}` : ''} readOnly placeholder={t('book.form.table_ph')} style={{ marginBottom: 0, flex: 1 }} />
                                        {favoriteTableId === Number(formData.table_id) && (
                                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                                <FaStar /> (Votre préférée)
                                            </span>
                                        )}
                                    </div>
                                </label>
                                <button type="submit" className={styles['btn-submit']}>{t('book.submit')}</button>
                            </>
                        ) : (
                            <>
                                <label>{t('book.form.name')} <input type="text" name="nom_client" value={formInvite.nom_client} onChange={handleChangeInvite} required /></label>
                                <label>{t('book.form.email')} <input type="email" name="email_client" value={formInvite.email_client} onChange={handleChangeInvite} required /></label>
                                <label>{t('book.form.date')} <input type="date" name="date_reservation" value={formInvite.date_reservation} onChange={handleChangeInvite} required /></label>
                                <label>{t('book.form.time')} <input type="time" name="heure_reservation" value={formInvite.heure_reservation} onChange={handleChangeInvite} required /></label>
                                <label>{t('book.form.guests')} <input type="number" name="nb_personnes" value={formInvite.nb_personnes} min="1" onChange={handleChangeInvite} required /></label>
                                <label>{t('book.form.table')} <input type="text" value={formInvite.table_id ? `Table ${tables.find(t => t.id === Number(formInvite.table_id))?.numero_table}` : ''} readOnly placeholder={t('book.form.table_ph')} /></label>
                                <button type="submit" className={styles['btn-submit']}>{t('book.submit')}</button>
                            </>
                        )}
                    </form>
                    {confirmation && <p className={styles.confirmation}>{confirmation}</p>}
                    {erreur && <p className={styles.error}>{erreur}</p>}
                </div>

                <div ref={wrapperRef} className={styles.mapColumn}>
                    <h3 className={styles.mapTitle}>{t('book.map.title')}</h3>

                    {/* Onglets Salles */}
                    <div className={styles.roomTabs}>
                        {rooms.map(r => (
                            <button
                                key={r}
                                className={`${styles.roomTab} ${currentRoom === r ? styles.activeTab : ''}`}
                                onClick={() => setCurrentRoom(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <p className={styles.mapHint}>{t('book.map.hint')}</p>
                    <div className={styles.stageContainer}>
                        <Stage width={dimensions.width} height={600} scaleX={dimensions.width / 500} scaleY={dimensions.width / 500}>
                            <Layer>
                                {tables.map(renderTableMap)}
                            </Layer>
                        </Stage>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Reservation;
