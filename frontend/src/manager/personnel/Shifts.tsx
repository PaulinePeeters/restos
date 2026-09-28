import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import styles from './Shifts.module.css';
import { tpersonnel, thoraire } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

type EventClickArg = any;

interface ShiftEvent {
    id: string;
    title: string;
    start: Date | string;
    end: Date | string;
    backgroundColor: string;
    borderColor: string;
}

interface ShiftData extends Omit<thoraire, 'heure_debut' | 'heure_fin'> {
    heure_debut: string;
    heure_fin: string;
    [key: string]: any;
}

interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    onConfirm: (() => void) | null;
}

interface FormState {
    id: number | null;
    jour_horaire: string;
    heure_debut: string;
    heure_fin: string;
}

function Shifts() {
    const { t } = useLanguage();
    const [personnels, setPersonnels] = useState<tpersonnel[]>([]);
    const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | null>(null);
    const [events, setEvents] = useState<ShiftEvent[]>([]);
    const [loadingPersonnels, setLoadingPersonnels] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const [form, setForm] = useState<FormState>({
        id: null,
        jour_horaire: '',
        heure_debut: '',
        heure_fin: ''
    });
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchPersonnels = async () => {
            try {
                const data: tpersonnel[] = await api.get('/personnels?actif=true');
                if (data) {
                    setPersonnels(data);
                    if (data.length > 0) setSelectedPersonnelId(data[0].id);
                }
                setLoadingPersonnels(false);
            } catch (err: any) {
                setError(err.message);
                setLoadingPersonnels(false);
            }
        };
        fetchPersonnels();
    }, []);

    useEffect(() => {
        if (!selectedPersonnelId) return;
        setLoadingEvents(true);

        const fetchShifts = async () => {
            try {
                const data: ShiftData[] = await api.get(`/horaires/${selectedPersonnelId}`);
                if (data) {
                    const evts = data.map(shift => {
                        const [year, month, day] = shift.jour_horaire.split('-').map(Number);
                        const [hStart, mStart] = shift.heure_debut.split(':').map(Number);
                        const [hEnd, mEnd] = shift.heure_fin.split(':').map(Number);

                        const start = new Date(year, month - 1, day, hStart, mStart);
                        const end = new Date(year, month - 1, day, hEnd, mEnd);

                        return {
                            id: String(shift.id),
                            title: `${shift.heure_debut} - ${shift.heure_fin}`,
                            start,
                            end,
                            backgroundColor: '#2a9d8f',
                            borderColor: '#2a9d8f',
                        };
                    });
                    setEvents(evts);
                }
                setLoadingEvents(false);
            } catch (err: any) {
                setError(err.message);
                setLoadingEvents(false);
            }
        };
        fetchShifts();
    }, [selectedPersonnelId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.jour_horaire || !form.heure_debut || !form.heure_fin) {
            toast.error(t('toast.shifts.missing_fields'));
            return;
        }

        setSending(true);
        try {
            const endpoint = formMode === 'edit' ? `/horaires/${form.id}` : '/horaires';
            const body = {
                jour_horaire: form.jour_horaire,
                heure_debut: form.heure_debut,
                heure_fin: form.heure_fin,
                personnel_id: selectedPersonnelId,
            };

            let savedShift: ShiftData | null = null;
            if (formMode === 'edit') {
                savedShift = await api.put(endpoint, body);
            } else {
                savedShift = await api.post(endpoint, body);
            }

            if (savedShift) {
                if (formMode === 'add') {
                    setEvents(prev => [...prev, {
                        id: String(savedShift!.id),
                        title: `${savedShift!.heure_debut} - ${savedShift!.heure_fin}`,
                        start: `${savedShift!.jour_horaire}T${savedShift!.heure_debut}`,
                        end: `${savedShift!.jour_horaire}T${savedShift!.heure_fin}`,
                        backgroundColor: '#2a9d8f',
                        borderColor: '#2a9d8f',
                    }]);
                } else {
                    setEvents(prev => prev.map(ev => ev.id === String(savedShift!.id) ? {
                        id: String(savedShift!.id),
                        title: `${savedShift!.heure_debut} - ${savedShift!.heure_fin}`,
                        start: `${savedShift!.jour_horaire}T${savedShift!.heure_debut}`,
                        end: `${savedShift!.jour_horaire}T${savedShift!.heure_fin}`,
                        backgroundColor: '#2a9d8f',
                        borderColor: '#2a9d8f',
                    } : ev));
                }

                setForm({ id: null, jour_horaire: '', heure_debut: '', heure_fin: '' });
                setFormMode('add');
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer ce shift ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/horaires/${id}`);
            setEvents(prev => prev.filter(ev => ev.id !== String(id)));

            if (formMode === 'edit' && form.id === id) {
                setForm({ id: null, jour_horaire: '', heure_debut: '', heure_fin: '' });
                setFormMode('add');
            }
            toast.success(t('toast.shifts.deleted'));
        } catch (err: any) {
            toast.error(err.message);
        }
        closeModal();
    };

    // Cliquer sur un event pour modifier
    const handleEventClick = (clickInfo: EventClickArg) => {
        const ev = events.find(e => e.id === clickInfo.event.id);
        if (!ev) return;

        const start = new Date(ev.start);
        const end = new Date(ev.end);

        const jour_horaire = start.toISOString().slice(0, 10);
        const heure_debut = start.toTimeString().slice(0, 5);
        const heure_fin = end.toTimeString().slice(0, 5);

        setForm({
            id: Number(ev.id),
            jour_horaire,
            heure_debut,
            heure_fin
        });
        setFormMode('edit');
    };
    // Drag and drop pour les shifts
    const handleEventDrop = async (info: any) => {
        const { event } = info;
        const newStart = event.start;
        const newEnd = event.end;

        if (!newStart || !newEnd) {
            info.revert();
            return;
        }

        const jour_horaire = newStart.toISOString().slice(0, 10);
        const heure_debut = newStart.toTimeString().slice(0, 5);
        const heure_fin = newEnd.toTimeString().slice(0, 5);

        try {
            await api.put(`/horaires/${event.id}`, {
                jour_horaire,
                heure_debut,
                heure_fin,
                personnel_id: selectedPersonnelId
            });
        } catch (err: any) {
            toast.error(err.message);
            info.revert();
        }
    };
    // Resize des shifts
    const handleEventResize = async (info: any) => {
        const { event } = info;
        const newStart = event.start;
        const newEnd = event.end;

        if (!newStart || !newEnd) {
            info.revert();
            return;
        }

        const jour_horaire = newStart.toISOString().slice(0, 10);
        const heure_debut = newStart.toTimeString().slice(0, 5);
        const heure_fin = newEnd.toTimeString().slice(0, 5);

        try {
            await api.put(`/horaires/${event.id}`, {
                jour_horaire,
                heure_debut,
                heure_fin,
                personnel_id: selectedPersonnelId
            });
        } catch (err: any) {
            toast.error(err.message);
            info.revert();
        }
    };

    return (
        <div className={styles.shiftsContainer}>
            <h2>Gestion des Shifts</h2>

            {error && <p className={styles.error}>Erreur : {error}</p>}

            {loadingPersonnels ? (
                <p>Chargement des personnels...</p>
            ) : (
                <>
                    <label>
                        Sélectionner un membre :
                        <select
                            value={selectedPersonnelId || ''}
                            onChange={e => setSelectedPersonnelId(Number(e.target.value))}
                        >
                            {personnels.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.prenom_personnel} {p.nom_personnel}
                                </option>
                            ))}
                        </select>
                    </label>

                    {loadingEvents ? (
                        <p>Chargement des shifts...</p>
                    ) : (
                        <FullCalendar
                            plugins={[timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            timeZone="local"
                            events={events}
                            editable={true}
                            eventClick={handleEventClick}
                            eventDrop={handleEventDrop}
                            eventResize={handleEventResize}
                            height="auto"
                        />
                    )}

                    <h3>{formMode === 'add' ? 'Ajouter un shift' : 'Modifier un shift'}</h3>

                    <form onSubmit={handleSubmit} className={styles.shiftForm}>
                        <label>
                            Jour :
                            <input type="date" name="jour_horaire" value={form.jour_horaire} onChange={handleInputChange} required />
                        </label>

                        <label>
                            Heure début :
                            <input type="time" name="heure_debut" value={form.heure_debut} onChange={handleInputChange} required />
                        </label>

                        <label>
                            Heure fin :
                            <input type="time" name="heure_fin" value={form.heure_fin} onChange={handleInputChange} required />
                        </label>

                        <div className={styles.formGroup}>
                            <label className={styles.invisibleLabel}>&nbsp;</label>
                            <button type="submit" disabled={sending}>
                                {sending ? (formMode === 'add' ? 'Ajout...' : 'Modif...') : (formMode === 'add' ? 'Ajouter' : 'Modifier')}
                            </button>
                        </div>

                        {formMode === 'edit' && (
                            <button type="button" onClick={() => {
                                setForm({ id: null, jour_horaire: '', heure_debut: '', heure_fin: '' });
                                setFormMode('add');
                            }}>
                                Annuler
                            </button>
                        )}
                    </form>

                    {formMode === 'edit' && form.id !== null && (
                        (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const shiftDate = new Date(form.jour_horaire);
                            if (shiftDate < today) {
                                return <p style={{ color: '#d9534f', fontSize: '0.9em', marginTop: '10px' }}>Impossible de supprimer un shift passé.</p>;
                            }
                            return <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteClick(form.id!)}>Supprimer ce shift</button>;
                        })()
                    )}
                </>
            )}


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
        </div>
    );
}

export default Shifts;
