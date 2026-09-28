import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaUser, FaMapMarkerAlt, FaHistory, FaStar, FaGift, FaEdit, FaSave, FaTimes, FaCalendar } from 'react-icons/fa';
import styles from './MonCompte.module.css';
import api from '../../services/api';

import { tabsencepersonnel, thoraire, ttypeconge, tadresselivraison as Address, tcommande as Order, treservation } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

interface Utilisateur {
    prenom: string;
    nom: string;
    email: string;
    role: string;
    id: number | string;
    type: 'staff' | 'client';
    points?: number;
    entreprise?: string;
    tva?: string;
    adresses?: Address[];
    commandes?: Order[];
}

interface Demande extends Omit<Partial<tabsencepersonnel>, 'type_conge_id'> {
    debut: string;
    fin: string;
    motif: string;
    type_conge_id: string;
    [key: string]: any;
}

interface TypeConge extends ttypeconge {
    [key: string]: any;
}

interface Horaire extends Omit<thoraire, 'heure_debut' | 'heure_fin'> {
    heure_debut: string | Date; 
    heure_fin: string | Date;
    [key: string]: any;
}

interface Absence extends Omit<tabsencepersonnel, 'statut' | 'date_debut' | 'date_fin'> {
    statut: string; 
    date_debut: string | Date; 
    date_fin: string | Date;
    [key: string]: any;
}

interface Offer {
    id: number;
    nom_event: string;
    pourcentage_reduction: number;
    description?: string;
}

interface Reservation extends treservation {
    [key: string]: any;
}

interface MonCompteProps {
    role?: string;
}

function MonCompte({ role }: MonCompteProps) {
    const { t } = useLanguage();
    const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Etats pour le personnel
    const [demande, setDemande] = useState<Demande>({ debut: '', fin: '', motif: '', type_conge_id: '' });
    const [demandesEnvoyees, setDemandesEnvoyees] = useState<Absence[]>([]);
    const [horaires, setHoraires] = useState<Horaire[]>([]);
    const [sending, setSending] = useState(false);
    const [types, setTypes] = useState<TypeConge[]>([]);
    const [balance, setBalance] = useState({ conges: 0, recuperation: 0 });
    const [customMotif, setCustomMotif] = useState('');
    const [selectedMotif, setSelectedMotif] = useState('');

    // Etats pour le client
    const [offres, setOffres] = useState<Offer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [editingAddress, setEditingAddress] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        entreprise: '',
        tva: ''
    });
    const [addressForm, setAddressForm] = useState({
        rue: '',
        numero: '',
        cp: '',
        ville: ''
    });

    const MOTIFS_BY_TYPE: { [key: string]: string[] } = {
        "Vacances annuelles": ["Vacances", "Repos", "Voyage", "Autre"],
        "Maladie": ["Maladie", "Rendez-vous médical", "Hospitalisation", "Autre"],
        "Petit chômage": ["Mariage", "Décès", "Naissance", "Déménagement", "Autre"],
        "Récupération": ["Récupération heures sup.", "Autre"],
        "Congé sans solde": ["Convenance personnelle", "Autre"],
        "Congé éducation": ["Cours", "Examen", "Etude", "Autre"],
        "Maternité/Ecartement": ["Maternité", "Paternité", "Ecartement"]
    };

    const [currentMotifs, setCurrentMotifs] = useState<string[]>([]);

    useEffect(() => {
        const staffStr = sessionStorage.getItem('staffUser') || localStorage.getItem('staffUser');
        const clientStr = localStorage.getItem('user');

        if (staffStr) {
            const user = JSON.parse(staffStr);
            setUtilisateur({
                prenom: user.prenom_personnel || user.prenom,
                nom: user.nom_personnel || user.nom,
                email: user.email_personnel || user.email,
                role: user.role_personnel || user.role,
                id: user.id_personnel || user.id,
                type: 'staff'
            });
        } else if (clientStr) {
            const user = JSON.parse(clientStr);
            setUtilisateur({
                prenom: '',
                nom: user.nom_client,
                email: user.email_client,
                role: 'Client',
                id: user.id_client || user.id,
                type: 'client',
                points: user.points_fidelite,
                entreprise: user.entreprise,
                tva: user.tva,
                adresses: user.tadresselivraison,
                commandes: user.tcommande
            });
        }
    }, []);

    useEffect(() => {
        if (!demande.type_conge_id || types.length === 0) {
            setCurrentMotifs([]);
            return;
        }

        const selectedType = types.find(t => t.id === parseInt(demande.type_conge_id));
        if (selectedType && MOTIFS_BY_TYPE[selectedType.nom]) {
            setCurrentMotifs(MOTIFS_BY_TYPE[selectedType.nom]);
        } else {
            setCurrentMotifs(["Autre"]);
        }
    }, [demande.type_conge_id, types]);

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setDemande({ ...demande, type_conge_id: e.target.value });
        setSelectedMotif('');
        setCustomMotif('');
    };

    useEffect(() => {
        if (!utilisateur) return;

        const chargerDonnees = async () => {
            if (!utilisateur.id) return;
            try {
                setLoading(true);
                if (utilisateur.type === 'staff') {
                    const dataHoraires: any = await api.get(`/horaires/${utilisateur.id}`);
                    const dataAbsences: any = await api.get(`/absences?personnel_id=${utilisateur.id}`);
                    const userDetails: any = await api.get(`/personnels/${utilisateur.id}`);
                    const typesRes: any = await api.get('/types-conge');

                    setHoraires(dataHoraires);
                    setDemandesEnvoyees(dataAbsences);
                    setTypes(typesRes);
                    if (userDetails) {
                        setBalance({
                            conges: userDetails.solde_conges || 0,
                            recuperation: userDetails.solde_recuperation || 0
                        });
                    }
                    if (typesRes.length > 0) {
                        setDemande(prev => ({ ...prev, type_conge_id: typesRes[0].id }));
                    }
                } else {
                    const responseData: any = await api.get('/clients/me');
                    const clientData = responseData.client || responseData;
                    setUtilisateur(prev => prev ? {
                        ...prev,
                        prenom: '',
                        nom: clientData.nom_client,
                        email: clientData.email_client,
                        points: clientData.points_fidelite,
                        entreprise: clientData.entreprise,
                        tva: clientData.tva,
                        adresses: clientData.tadresselivraison,
                        commandes: clientData.tcommande
                    } : null);

                    setProfileForm({
                        entreprise: clientData.entreprise || '',
                        tva: clientData.tva || ''
                    });

                    const defAddr = clientData.tadresselivraison?.find((a: Address) => a.est_par_defaut);
                    if (defAddr) {
                        setAddressForm({
                            rue: defAddr.rue_adresse,
                            numero: defAddr.numero_adresse,
                            cp: defAddr.cp_adresse,
                            ville: defAddr.ville_adresse
                        });
                    }

                    const offresData: any = await api.get('/fidelite/offres');
                    if (offresData) setOffres(offresData);

                    if (clientData.id_client) {
                        const reservationsData: any = await api.get(`/reservations/client/${clientData.id_client}`);
                        if (Array.isArray(reservationsData)) {
                            setReservations(reservationsData);
                        }
                    }
                }
                setLoading(false);
            } catch (err: any) {
                setError(err.message);
                setLoading(false);
            }
        };

        chargerDonnees();
    }, [utilisateur?.id, utilisateur?.type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDemande({ ...demande, [name]: value });
    };

    const envoyerDemande = () => {
        const finalMotif = selectedMotif === 'Autre' ? customMotif : selectedMotif;
        if (!demande.debut || !demande.fin || !finalMotif.trim()) {
            toast.error(t('toast.account.fill_info'));
            return;
        }
        setSending(true);
        api.post('/absences', {
            personnel_id: utilisateur?.id,
            date_debut: demande.debut,
            date_fin: demande.fin,
            type_conge_id: demande.type_conge_id || (types[0] ? types[0].id : null),
            motif_absence: finalMotif,
        })
            .then((nouvelleDemande: any) => {
                toast.success(t('toast.account.request_sent'));
                setDemandesEnvoyees(prev => [...prev, nouvelleDemande]);
                setDemande(prev => ({ ...prev, debut: '', fin: '' }));
                setSelectedMotif('');
                setCustomMotif('');
            })
            .catch((err: any) => {
                toast.error(err.message || t('toast.account.server_error'));
            })
            .finally(() => {
                setSending(false);
            });
    };

    const handleUpdateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updated: any = await api.put('/clients/me/address', addressForm);
            if (updated) {
                setUtilisateur(prev => prev ? {
                    ...prev,
                    adresses: updated.tadresselivraison || prev.adresses
                } : null);
                toast.success(t('toast.account.address_updated'));
                setEditingAddress(false);
            }
        } catch (err: any) {
            toast.error(t('toast.account.address_error'));
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updated: any = await api.put('/clients/me/profile', profileForm);
            if (updated) {
                setUtilisateur(prev => prev ? {
                    ...prev,
                    entreprise: updated.client.entreprise,
                    tva: updated.client.tva
                } : null);
                // Mettre à jour le localStorage
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.entreprise = updated.client.entreprise;
                    user.tva = updated.client.tva;
                    localStorage.setItem('user', JSON.stringify(user));
                }
                toast.success("Profil de facturation mis à jour");
                setEditingProfile(false);
            }
        } catch (err: any) {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const formatterDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-BE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'UTC'
        });
    };

    const formatRecoveryBalance = (hoursValue: number) => {
        const totalMinutes = Math.max(0, Math.round((Number(hoursValue) || 0) * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) {
            return `${minutes} min`;
        }

        if (minutes === 0) {
            return `${hours} h`;
        }

        return `${hours} h ${String(minutes).padStart(2, '0')}`;
    };

    const formatTime = (value: string | Date) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('fr-BE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
    };

    const getReservationStatusLabel = (status: string) => {
        switch (status) {
            case 'EN_ATTENTE': return 'En attente';
            case 'CONFIRMEE': return 'Confirmée';
            case 'ARRIVEE': return 'Arrivée';
            case 'ANNULEE': return 'Annulée';
            case 'TERMINEE': return 'Terminée';
            case 'NON_PRESENT': return 'Non présent';
            default: return status;
        }
    };

    const canCancelReservation = (status: string) => {
        return ['EN_ATTENTE', 'CONFIRMEE'].includes(status);
    };

    const annulerReservation = async (reservationId: number) => {
        try {
            setCancellingId(reservationId);
            const response: any = await api.patch(`/reservations/${reservationId}/cancel`, {});

            setReservations(prev => prev.map(r =>
                r.id === reservationId
                    ? { ...r, statut_reservation: 'ANNULEE' }
                    : r
            ));

            toast.success(response?.message || t('toast.account.reservation_cancelled'));
        } catch (err: any) {
            toast.error(err?.message || t('toast.account.reservation_cancel_error'));
        } finally {
            setCancellingId(null);
        }
    };

    const upcomingHoraires = horaires.filter(h => {
        const d = new Date(h.jour_horaire);
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
    }).sort((a, b) => new Date(a.jour_horaire).getTime() - new Date(b.jour_horaire).getTime());

    if (!utilisateur) return <div className={styles.container}><p>Veuillez vous connecter.</p></div>;
    if (loading) return <div className={styles.container}><div className="spinner">Chargement...</div></div>;
    if (error) return <div className={styles.container}><p className="error">Erreur : {error}</p></div>;

    return (
        <div className={styles.container}>
            <div className="page-header">
                <h2 className="page-title">Mon Compte</h2>
                <p className="page-subtitle">Bonjour {utilisateur.nom}</p>
            </div>

            {utilisateur.type === 'staff' ? (
                <div className={styles.grid}>
                    {/* Colonne Gauche : Planning */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}><FaHistory /> Mon Planning</h3>
                        <ul className={styles.planningList}>
                            {upcomingHoraires.length === 0 ? (
                                <li className={styles.emptyState}>Aucun horaire à venir prévu</li>
                            ) : (
                                upcomingHoraires.map((h) => (
                                    <li key={h.id} className={styles.planningItem}>
                                        <span className={styles.date}>{formatterDate(h.jour_horaire)}</span>
                                        <span className={styles.time}>
                                            {typeof h.heure_debut === 'string' ? h.heure_debut.slice(0, 5) : new Date(h.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {typeof h.heure_fin === 'string' ? h.heure_fin.slice(0, 5) : new Date(h.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    {/* Colonne Droite : Demande de congé */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}><FaHistory /> Demander un congé</h3>
                        <div className={styles.balancesContainer}>
                            <div className={styles.balanceItem}>
                                <div className={styles.balanceLabel}>Solde Congés</div>
                                <div className={styles.balanceValue}>{parseFloat(balance.conges.toString()).toFixed(1)} j</div>
                            </div>
                            <div className={`${styles.balanceItem} ${styles.balanceItemWithBorder}`}>
                                <div className={styles.balanceLabel}>Solde Récup.</div>
                                <div className={`${styles.balanceValue} ${styles.balanceValueGreen}`}>{formatRecoveryBalance(balance.recuperation)}</div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Type</label>
                                <select name="type_conge_id" className={styles.input} value={demande.type_conge_id} onChange={handleTypeChange}>
                                    {types.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Dates</label>
                                <div className={styles.datesContainer}>
                                    <input type="date" name="debut" className={`${styles.input} ${styles.dateInput}`} value={demande.debut} onChange={handleChange} />
                                    <input type="date" name="fin" className={`${styles.input} ${styles.dateInput}`} value={demande.fin} onChange={handleChange} />
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Motif</label>
                                <select value={selectedMotif} onChange={(e) => setSelectedMotif(e.target.value)} className={`${styles.input} ${styles.motifSelect}`}>
                                    <option value="">Sélectionnez un motif...</option>
                                    {currentMotifs.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                {selectedMotif === 'Autre' && (
                                    <input type="text" className={styles.input} placeholder="Précisez la raison..." value={customMotif} onChange={(e) => setCustomMotif(e.target.value)} />
                                )}
                            </div>
                            <button className={styles.button} onClick={envoyerDemande} disabled={sending}>
                                {sending ? "Envoi en cours..." : "Envoyer la demande"}
                            </button>
                        </div>
                    </div>

                    <div className={`${styles.card} ${styles.fullWidthColumn}`}>
                        <h3 className={styles.cardTitle}><FaHistory /> Historique des demandes</h3>
                        <ul className={styles.historyList}>
                            {demandesEnvoyees.length === 0 && <li className={styles.emptyState}>Aucune demande récente</li>}
                            {demandesEnvoyees.map(d => {
                                let statusClass = styles.attente;
                                let statusLabel = "En attente";
                                if (d.statut === 'VALIDEE') { statusClass = styles.validee; statusLabel = "Validée"; }
                                else if (d.statut === 'REFUSEE') { statusClass = styles.refusee; statusLabel = "Refusée"; }
                                return (
                                    <li key={d.id} className={`${styles.historyItem} ${statusClass}`}>
                                        <div className={styles.historyHeader}>
                                            <span>Du {formatterDate(typeof d.date_debut === 'string' ? d.date_debut : d.date_debut.toISOString())} au {formatterDate(typeof d.date_fin === 'string' ? d.date_fin : d.date_fin.toISOString())}</span>
                                            <span className={styles.statusBadge}>{statusLabel}</span>
                                        </div>
                                        <div className={styles.historyMotif}>{d.motif_absence}</div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {/* Carte Fidélité */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}><FaStar /> Fidélité</h3>
                        <div className={styles.fideliteHighlight}>
                            <span className={styles.pointsValue}>{utilisateur.points || 0}</span>
                            <span className={styles.pointsLabel}>Points cumulés</span>
                        </div>
                        <p className={styles.loyaltyDescription}>Gagnez 1 point pour chaque euro dépensé !</p>

                        {offres.length > 0 && (
                            <div className={styles.offersContainer}>
                                <h4 className={styles.offersTitle}>Offres du moment</h4>
                                {offres.map(offre => (
                                    <div key={offre.id} className={styles.offerCard}>
                                        <FaGift className={styles.offerIcon} />
                                        <div className={styles.offerText}>
                                            <strong>{offre.nom_event}</strong> : -{offre.pourcentage_reduction}%
                                            {offre.description && <span className={styles.offerDescription}>{offre.description}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Carte Informations & Adresse */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}><FaUser /> Mes Informations</h3>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Nom</span>
                            <span className={styles.infoValue}>{utilisateur.prenom} {utilisateur.nom}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Email</span>
                            <span className={styles.infoValue}>{utilisateur.email}</span>
                        </div>

                        <div className={styles.addressSection} style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                            <div className={styles.addressHeader}>
                                <h4 className={styles.addressTitle}>Facturation (Pro)</h4>
                                {!editingProfile && (
                                    <button onClick={() => setEditingProfile(true)} className={styles.btnSmall}><FaEdit /> Modifier</button>
                                )}
                            </div>
                            
                            {editingProfile ? (
                                <form onSubmit={handleUpdateProfile} className={styles.formMini}>
                                    <input type="text" placeholder="Nom de l'entreprise (Optionnel)" value={profileForm.entreprise} onChange={e => setProfileForm({ ...profileForm, entreprise: e.target.value })} className={styles.input} />
                                    <input type="text" placeholder="Numéro de TVA (Optionnel)" value={profileForm.tva} onChange={e => setProfileForm({ ...profileForm, tva: e.target.value })} className={styles.input} />
                                    <div className={styles.btnGroup}>
                                        <button type="submit" className={styles.button}><FaSave /> Enregistrer</button>
                                        <button type="button" onClick={() => setEditingProfile(false)} className={styles.btnSecondary}><FaTimes /> Annuler</button>
                                    </div>
                                </form>
                            ) : (
                                <div className={styles.addressDisplay}>
                                    {utilisateur.entreprise ? (
                                        <>
                                            <strong>{utilisateur.entreprise}</strong><br />
                                            {utilisateur.tva && <span>TVA: {utilisateur.tva}</span>}
                                        </>
                                    ) : "Aucune entreprise renseignée."}
                                </div>
                            )}
                        </div>

                        <div className={styles.addressSection}>
                            <div className={styles.addressHeader}>
                                <h4 className={styles.addressTitle}><FaMapMarkerAlt /> Adresse de livraison</h4>
                                {!editingAddress && (
                                    <button onClick={() => setEditingAddress(true)} className={styles.btnSmall}><FaEdit /> Modifier</button>
                                )}
                            </div>

                            {editingAddress ? (
                                <form onSubmit={handleUpdateAddress} className={styles.formMini}>
                                    <div className={styles.inputRow}>
                                        <input type="text" placeholder="Rue" value={addressForm.rue} onChange={e => setAddressForm({ ...addressForm, rue: e.target.value })} className={styles.input} required />
                                        <input type="text" placeholder="N°" value={addressForm.numero} onChange={e => setAddressForm({ ...addressForm, numero: e.target.value })} className={`${styles.input} ${styles.inputSmall}`} required />
                                    </div>
                                    <div className={styles.inputRow}>
                                        <input type="text" placeholder="CP" value={addressForm.cp} onChange={e => setAddressForm({ ...addressForm, cp: e.target.value })} className={`${styles.input} ${styles.inputSmall}`} required />
                                        <input type="text" placeholder="Ville" value={addressForm.ville} onChange={e => setAddressForm({ ...addressForm, ville: e.target.value })} className={styles.input} required />
                                    </div>
                                    <div className={styles.btnGroup}>
                                        <button type="submit" className={styles.button}><FaSave /> Enregistrer</button>
                                        <button type="button" onClick={() => setEditingAddress(false)} className={styles.btnSecondary}><FaTimes /> Annuler</button>
                                    </div>
                                </form>
                            ) : (
                                <div className={styles.addressDisplay}>
                                    {utilisateur.adresses && utilisateur.adresses.length > 0 ? (
                                        <>
                                            {utilisateur.adresses[0].numero_adresse} {utilisateur.adresses[0].rue_adresse}<br />
                                            {utilisateur.adresses[0].cp_adresse} {utilisateur.adresses[0].ville_adresse}
                                        </>
                                    ) : "Aucune adresse enregistrée."}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Historique commandes */}
                    <div className={`${styles.card} ${styles.fullWidthColumn}`}>
                        <h3 className={styles.cardTitle}><FaHistory /> Historique des commandes</h3>
                        {utilisateur.commandes && utilisateur.commandes.length > 0 ? (
                            <ul className={styles.orderList}>
                                {utilisateur.commandes.map(cmd => (
                                    <li key={cmd.id} className={styles.orderItem}>
                                        <span className={styles.orderId}># {cmd.id}</span>
                                        <span className={styles.orderDate}>{formatterDate(typeof cmd.date_heure_commande === 'string' ? cmd.date_heure_commande : (cmd.date_heure_commande as any).toISOString())}</span>
                                        <span className={styles.orderPrice}>{Number(cmd.total_estime_commande).toFixed(2)} €</span>
                                        <span className={styles.orderStatus}>{cmd.statut_commande}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className={styles.emptyState}>Vous n'avez pas encore passé de commande.</p>}
                    </div>

                    {/* Historique réservations */}
                    <div className={`${styles.card} ${styles.fullWidthColumn}`}>
                        <h3 className={styles.cardTitle}><FaCalendar /> Mes réservations</h3>
                        {reservations.length > 0 ? (
                            <ul className={styles.reservationList}>
                                {reservations.map((reservation) => (
                                    <li key={reservation.id} className={styles.reservationItem}>
                                        <div className={styles.reservationMain}>
                                            <span className={styles.reservationId}># {reservation.id}</span>
                                            <span className={styles.reservationMeta}>
                                                {formatterDate(typeof reservation.date_reservation === 'string' ? reservation.date_reservation : (reservation.date_reservation as any).toISOString())}
                                                {' a '}
                                                {formatTime(reservation.heure_reservation as any)}
                                                {' - '}
                                                {reservation.nb_personnes} pers.
                                            </span>
                                        </div>

                                        <div className={styles.reservationActions}>
                                            <span className={`${styles.reservationStatus} ${styles[`status_${reservation.statut_reservation}`] || ''}`}>
                                                {getReservationStatusLabel(reservation.statut_reservation)}
                                            </span>

                                            {canCancelReservation(reservation.statut_reservation) && (
                                                <button
                                                    className={styles.cancelBtn}
                                                    onClick={() => annulerReservation(reservation.id)}
                                                    disabled={cancellingId === reservation.id}
                                                >
                                                    {cancellingId === reservation.id ? 'Annulation...' : 'Annuler'}
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.emptyState}>Vous n'avez pas encore de réservation.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MonCompte;