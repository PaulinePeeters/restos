import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import api from '../../services/api';
import styles from './Planning.module.css';
import toast from 'react-hot-toast';
import { thoraire, tabsencepersonnel } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

type EventClickArg = any;

interface ShiftData extends Omit<thoraire, 'heure_debut' | 'heure_fin'> {
    heure_debut: string;
    heure_fin: string;
    [key: string]: any;
}

interface AbsenceData extends Omit<tabsencepersonnel, 'date_debut' | 'date_fin'> {
    date_debut: string;
    date_fin: string;
    [key: string]: any;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: Date | string;
    end?: Date | string;
    allDay?: boolean;
    backgroundColor: string;
    borderColor: string;
    extendedProps?: any;
}

interface SelectedEventState {
    id: string;
    type: string; // 'shift', 'absence'
    title: string;
    start: Date;
    end?: Date;
    allDay: boolean;
}

function Planning() {
    const { t } = useLanguage();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEventState | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);

        Promise.all([
            api.get('/horaires'),
            api.get('/absences?valide=true')
        ])
            .then(async ([horairesData, absencesData]) => {
                const horaires = (horairesData as ShiftData[]) || [];
                const absences = (absencesData as AbsenceData[]) || [];
                // Création des événements à partir des données
                const shiftEvents: CalendarEvent[] = horaires.map(h => {
                    const [year, month, day] = h.jour_horaire.split('-').map(Number);
                    const [hStart, mStart] = h.heure_debut.split(':').map(Number);
                    const [hEnd, mEnd] = h.heure_fin.split(':').map(Number);

                    const start = new Date(year, month - 1, day, hStart, mStart); // Début du shift
                    const end = new Date(year, month - 1, day, hEnd, mEnd); // Fin du shift

                    const personnelName = h.tpersonnel
                        ? `${h.tpersonnel.prenom_personnel} ${h.tpersonnel.nom_personnel}`
                        : 'tpersonnel inconnu'; 

                    return {
                        id: `shift-${h.id}`,
                        title: `${personnelName} – ${h.heure_debut} - ${h.heure_fin}`,
                        start,
                        end,
                        backgroundColor: '#2a9d8f',
                        borderColor: '#2a9d8f',
                    };
                });
                
                const absenceEvents: CalendarEvent[] = absences.map(a => {
                    const personnelName = a.tpersonnel
                        ? `${a.tpersonnel.prenom_personnel} ${a.tpersonnel.nom_personnel}`
                        : 'tpersonnel inconnu';


                    const startStr = new Date(a.date_debut).toISOString().split('T')[0]; // Début de l'absence

                    const endDateObj = new Date(a.date_fin); 
                    endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
                    const endStr = endDateObj.toISOString().split('T')[0]; // Fin de l'absence

                    return {
                        id: `absence-${a.id}`,
                        title: `ABSENCE – ${personnelName} (${a.motif_absence || 'Sans motif'})`,
                        start: startStr,
                        end: endStr,
                        allDay: true,
                        backgroundColor: '#e76f51',
                        borderColor: '#e76f51',
                    };
                });

                setEvents([...shiftEvents, ...absenceEvents]);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Erreur chargement');
                setLoading(false);
            });
    }, []);

    if (loading) return <p>Chargement du planning global...</p>;
    if (error) return <p>Erreur : {error}</p>;


    const handleEventClick = (info: EventClickArg) => {
        const { id, title, start, end, allDay } = info.event;
        const [type, actualId] = id.split('-');

        if (!start) return;

        setSelectedEvent({
            id: actualId,
            type, // 'shift' ou 'absence'
            title,
            start: start,
            end: end || start,
            allDay: allDay
        });
        setIsModalOpen(true);
    };

    const handleDelete = () => {
        if (!selectedEvent) return;

        toast((toastItem) => (
            <div>
                <p className={styles.toastMessage}>{t('toast.planning.confirm_delete')}</p>
                <div className={styles.toastActions}>
                    <button
                        onClick={() => {
                            toast.dismiss(toastItem.id);
                            performDelete();
                        }}
                        className={styles.toastButtonDelete}
                    >
                        {t('toast.planning.delete')}
                    </button>
                    <button
                        onClick={() => toast.dismiss(toastItem.id)}
                        className={styles.toastButtonCancel}
                    >
                        {t('toast.planning.cancel')}
                    </button>
                </div>
            </div>
        ), { duration: 5000, icon: '⚠️' } as any);
    };
    // Suppression des événements
    const performDelete = async () => {
        if (!selectedEvent) return;
        try {
            const endpoint = selectedEvent.type === 'shift'
                ? `/horaires/${selectedEvent.id}`
                : `/absences/${selectedEvent.id}`;

            await api.delete(endpoint);

            setEvents(prev => prev.filter(e => !e.id.endsWith(`-${selectedEvent.id}`)));
            setIsModalOpen(false);
            setSelectedEvent(null);
            toast.success(t('toast.planning.deleted'));
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(t('toast.planning.delete_error') + " : " + (err.message || "Erreur inconnue"));
        }
    };

    return (
        <div className={styles.container}>
            <h3>Planning global du personnel</h3>
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={events}
                locale="fr"
                height="auto"
                eventClick={handleEventClick}
                eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                }}
            />

            {isModalOpen && selectedEvent && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h4>Détails de l'événement</h4>
                        <p><strong>{selectedEvent.title}</strong></p>
                        <p>
                            Du : {selectedEvent.start.toLocaleString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            <br />
                            Au : {selectedEvent.end ? selectedEvent.end.toLocaleString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>

                        <div className={styles.modalActions}>
                            <button className={styles.deleteBtn} onClick={handleDelete}>Supprimer</button>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Planning;
