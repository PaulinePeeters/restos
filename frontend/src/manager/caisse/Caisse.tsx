import React, { useState, useEffect } from 'react';
import styles from './Caisse.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { FaMoneyBillWave, FaCreditCard, FaGift, FaPrint, FaEnvelope, FaTrash, FaCheck, FaTimes, FaPercentage, FaUtensils, FaTicketAlt, FaEdit } from 'react-icons/fa';
import EditCommandeModal from '../../components/common/EditCommandeModal';

import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';
import { tcommande, tlignecommande, tplat, tpaiement, tclient } from '../../types/prisma-types';

const formatEnum = (text: string | null | undefined) => {
    if (!text) return '';
    return text.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
};

type Plat = tplat;

interface LigneCommande extends Omit<tlignecommande, 'tplat'> {
    tplat: tplat;
}

interface Paiement extends Omit<tpaiement, 'montant_paiement'> {
    montant_paiement: number | string | any;
}

interface Client extends tclient {
    [key: string]: any;
}

interface Commande extends Omit<tcommande, 'tlignecommande' | 'tpaiement' | 'tclient' | 'total_estime_commande'> {
    tlignecommande: LigneCommande[];
    tpaiement?: Paiement[];
    tclient?: Client;
    total_estime_commande: number | string | any;
    [key: string]: any;
}

interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    onConfirm: (() => void) | null;
}

interface PromptModalState {
    isOpen: boolean;
    title: string;
    value: string;
    placeholder: string;
    onConfirm: ((value: string) => void) | null;
}

interface SelectionItems {
    [key: number]: number;
}

function Caisse() {
    const { t } = useLanguage();
    const [commandes, setCommandes] = useState<Commande[]>([]);
    const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
    const [loading, setLoading] = useState(true);
    const [justification, setJustification] = useState('');
    const [reductionValue, setReductionValue] = useState<number | string>(0);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<SelectionItems>({});
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [promptModal, setPromptModal] = useState<PromptModalState>({ isOpen: false, title: '', value: '', onConfirm: null, placeholder: '' });
    const [modificationModal, setModificationModal] = useState(false);
    const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
    const [pourboire, setPourboire] = useState(0);
    const [montantPaiement, setMontantPaiement] = useState<string>('');

    const socket = useSocket();

    const closeModal = () => setModal({ ...modal, isOpen: false });
    const closePromptModal = () => setPromptModal({ ...promptModal, isOpen: false, value: '' });

    useEffect(() => {
        fetchCommandes();
        const interval = setInterval(fetchCommandes, 60000);
        return () => clearInterval(interval);
    }, []);

    // Écoute Socket.io pour mises à jour temps réel
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            fetchCommandes();
        };

        socket.on('nouvelle_commande', handleUpdate);
        socket.on('commande_modifiee', handleUpdate);
        socket.on('paiement_valide', handleUpdate);
        socket.on('paiement_refuse', handleUpdate);

        return () => {
            socket.off('nouvelle_commande', handleUpdate);
            socket.off('commande_modifiee', handleUpdate);
            socket.off('paiement_valide', handleUpdate);
            socket.off('paiement_refuse', handleUpdate);
        };
    }, [socket]);

    const fetchCommandes = async () => {
        try {
            const data: any = await api.get('/commandes/actives');
            if (data) {
                setCommandes(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCommande = (cmd: Commande) => {
        setSelectedCommande(cmd); 
        setJustification('');
        setReductionValue(0);
        setIsSelectionMode(false);
        setSelectedItems({});
        setPourboire(0);
        const total = typeof cmd.total_estime_commande === 'string' ? parseFloat(cmd.total_estime_commande) : cmd.total_estime_commande;
        const dejaPaye = cmd.tpaiement ? cmd.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
        const reste = total - dejaPaye;
        setMontantPaiement(reste.toFixed(2));
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedItems({});
        if (!isSelectionMode) {
            setMontantPaiement('');
        }
    };

    const handleItemSelection = (ligne: LigneCommande) => {
        setSelectedItems(prev => {
            const newSelection = { ...prev };
            if (newSelection[ligne.id]) {
                delete newSelection[ligne.id];
            } else {
                newSelection[ligne.id] = ligne.quantite;
            }

            updatePaymentAmount(newSelection);
            return newSelection;
        });
    };
    // mise à jour du montant
    const updatePaymentAmount = (selection: SelectionItems) => {
        let total = 0;
        if (selectedCommande) {
            selectedCommande.tlignecommande.forEach(ligne => {
                if (selection[ligne.id]) {
                    const price = ligne.prix_unitaire != null ? Number(ligne.prix_unitaire) : Number(ligne.tplat.prix_plat);
                    total += price * selection[ligne.id];
                }
            });
        }
        setMontantPaiement(total.toFixed(2));
    };

    const handleAnnulerClick = () => {
        if (!justification) return toast.error(t('toast.caisse.justification_required'));
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Confirmer l\'annulation ?',
            onConfirm: handleAnnuler
        });
    };

    const handleAnnuler = async () => {
        if (!selectedCommande) return;
        try {
            await api.post(`/commandes/${selectedCommande.id}/annuler`, { justification });
            toast.success(t('toast.caisse.cancelled'));
            fetchCommandes();
            setSelectedCommande(null);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.cancel_error'));
        }
        closeModal();
    };

    const handleReductionClick = (type: string, valeur: number | string, isPourcentage: boolean) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: `Appliquer réduction ${type} ?`,
            onConfirm: () => handleReduction(type, valeur, isPourcentage)
        });
    };

    const handleReduction = async (type: string, valeur: number | string, isPourcentage: boolean) => {
        if (!selectedCommande) return;
        try {
            await api.post(`/commandes/${selectedCommande.id}/reduction`, { type, valeur, isPourcentage });
            toast.success(t('toast.caisse.reduction_applied'));
            fetchCommandes();
            setSelectedCommande(null);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.reduction_error'));
        }
        closeModal();
    };

    // validation du paiement
    const handleValiderPaiementWeb = async () => {
        if (!selectedCommande) return;
        try {
            await api.post(`/commandes/${selectedCommande.id}/valider-paiement`, {});
            toast.success(t('toast.caisse.payment_validated'));
            fetchCommandes();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.validation_error'));
        }
    };

    const handleRefuserPaiementWebClick = () => {
        setPromptModal({
            isOpen: true,
            title: 'Refuser Paiement',
            placeholder: 'Motif du refus / annulation (ex: No-Show, Bouteille bouchonnée...)',
            value: 'No-Show',
            onConfirm: handleRefuserPaiementWeb
        });
    };

    const handleRefuserPaiementWeb = async (motif: string) => {
        if (motif === null || !selectedCommande) return;

        try {
            await api.post(`/commandes/${selectedCommande.id}/refuser-paiement`, { justification: motif });
            toast.error(t('toast.caisse.payment_refused'));
            fetchCommandes();
            setSelectedCommande(null);
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.refuse_error'));
        }
        closePromptModal();
    };

    const handlePaiement = async (methode: string) => {
        if (!selectedCommande) return;
        const montant = montantPaiement;

        if (!montant || parseFloat(montant) <= 0) return toast.error(t('toast.caisse.invalid_amount'));

        try {
            const data: any = await api.post(`/paiements/${selectedCommande.id}`, { montant: parseFloat(montant), methode, pourboire });
            if (data) {
                toast.success(t('toast.caisse.payment_recorded', { status: data.statut }));
                fetchCommandes();
                if (data.statut === 'PAYE_COMPLET') setSelectedCommande(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('toast.caisse.payment_error'));
        }
    };


    const handlePaiementCheque = async () => {
        if (!selectedCommande) return;
        const input = document.getElementById('codeChequeInput') as HTMLInputElement;
        const code = input?.value;
        if (!code) return toast.error(t('toast.caisse.enter_code'));

        try {
            const data: any = await api.post(`/commandes/${selectedCommande.id}/paiement-cheque`, { code });
            if (data) {
                toast.success(t('toast.caisse.cheque_applied', { amount: data.totalPaye }));
                fetchCommandes();
                input.value = '';
                if (data.statut === 'PAYE_COMPLET') setSelectedCommande(null);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('toast.caisse.cheque_error'));
        }
    };

    const handlePrint = async () => {
        if (!selectedCommande) return;
        try {
            const blob: any = await api.getBlob(`/paiements/${selectedCommande.id}/recu`);
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.print_error'));
        }
    };

    const handleEmailClick = () => {
        if (!selectedCommande) return;
        setPromptModal({
            isOpen: true,
            title: 'Envoyer Ticket',
            placeholder: 'Email du client',
            value: selectedCommande.tclient?.email_client || "",
            onConfirm: handleEmail
        });
    };

    const handleEmail = (email: string) => {
        if (email) {
            toast.success(t('toast.caisse.email_sent', { email }));
        }
        closePromptModal();
    };

    const handleDownloadReport = async (type: string) => {
        const date = new Date().toISOString().split('T')[0]; // Aujourd'hui
        try {
            const blob: any = await api.getBlob(`/exports/${type}?date=${date}`);
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_${date}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (error) {
            console.error(error);
            toast.error(t('toast.caisse.download_error'));
        }
    };

    const getStyle = (className: string) => (styles as any)[className] || '';

    if (loading) return <p>Chargement...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Caisse & Encaissement</h2>
                <p className="page-subtitle">Gérez les paiements, réductions et tickets.</p>
            </div>
            <div className={styles.container}>
                <div className={styles.columnLeft}>
                    <h3>Commandes en cours</h3>
                    <div className={styles.grid}>
                        {commandes.map(cmd => (
                            <div
                                key={cmd.id}
                                className={`${styles.card} ${selectedCommande?.id === cmd.id ? styles.cardSelected : ''} ${cmd.statut_commande === 'ANNULEE' ? styles.cardCancelled : ''}`}
                                onClick={() => handleSelectCommande(cmd)}
                            >
                                <div className={styles.cardHeader}>
                                    <span className={styles.cardTitle}>#{cmd.id}</span>
                                    <span className={styles.cardTime}>{new Date(cmd.date_heure_commande).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className={styles.cardType}>{formatEnum(cmd.type_commande)}</div>
                                <div className={styles.cardPrice}>{cmd.total_estime_commande} €</div>
                                <span className={`${styles.statusBadge} ${getStyle('status' + cmd.statut_commande.replace('_', ''))}`}>
                                    {formatEnum(cmd.statut_commande)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.reportsSection}>
                        <h3 className={styles.reportsHeader}>Rapports Journaliers</h3>
                        <div className={styles.buttonsGrid}>
                            <button onClick={() => handleDownloadReport('transactions')} className={`${styles.btn} ${styles.btnSecondary} ${styles.reportBtn}`}>Transactions (CSV)</button>
                            <button onClick={() => handleDownloadReport('details')} className={`${styles.btn} ${styles.btnSecondary} ${styles.reportBtn}`}>Détails Lignes (CSV)</button>
                        </div>
                    </div>
                </div>

                <div className={styles.columnRight}>
                    {selectedCommande ? (
                        <>
                            <div className={styles.orderDetailHeader}>
                                <h2>Commande #{selectedCommande.id}</h2>
                                <span className={styles.cardTime}>{new Date(selectedCommande.date_heure_commande).toLocaleString()}</span>
                            </div>


                            <div className={styles.itemsList}>
                                {selectedCommande.tlignecommande.map(ligne => (
                                    <div key={ligne.id} className={`${styles.lineItem} ${selectedItems[ligne.id] ? styles.itemSelected : ''}`} onClick={() => isSelectionMode && handleItemSelection(ligne)}>
                                        <div className={styles.itemInfo}>
                                            {isSelectionMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedItems[ligne.id]}
                                                    readOnly
                                                    className={styles.itemCheckbox}
                                                />
                                            )}
                                            <span className={styles.itemName}>{ligne.quantite}x {ligne.tplat.nom_plat} {ligne.format ? `(${ligne.format})` : ''}</span>
                                        </div>
                                        <span className={styles.itemPrice}>{((ligne.prix_unitaire != null ? Number(ligne.prix_unitaire) : Number(ligne.tplat.prix_plat)) * ligne.quantite).toFixed(2)} €</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.totalSection}>
                                <div className={styles.totalRow}>
                                    <span className={styles.totalLabel}>Total Commande</span>
                                    <span className={styles.totalValue}>{parseFloat(selectedCommande.total_estime_commande.toString()).toFixed(2)} €</span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span className={styles.totalLabel}>Déjà payé</span>
                                    <span className={styles.totalValue}>{
                                        selectedCommande.tpaiement
                                            ? selectedCommande.tpaiement
                                                .filter(p => p.etat_paiement === 'PAYE')
                                                .reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0).toFixed(2)
                                            : '0.00'
                                    } €</span>
                                </div>
                                <div className={`${styles.totalRow} ${styles.totalReste}`}>
                                    <span className={styles.totalLabel}>Reste à payer</span>
                                    <span className={styles.totalAmount}>
                                        {(parseFloat(selectedCommande.total_estime_commande.toString()) - (selectedCommande.tpaiement
                                            ? selectedCommande.tpaiement
                                                .filter(p => p.etat_paiement === 'PAYE')
                                                .reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0)
                                            : 0) + pourboire).toFixed(2)} €
                                    </span>
                                </div>
                            </div>

                            <div className={styles.actionsContainer}>

                                <div className={styles.actionGroup}>
                                    <div className={styles.actionGroupTitle}>Paiement</div>

                                    {/* split l'addition*/}
                                    <div className={styles.splitBillContainer}>
                                        <div className={styles.splitHeader}>
                                            <span className={styles.splitLabel}>Partage de l'addition :</span>
                                            <button
                                                className={`${styles.btnSplitAction} ${isSelectionMode ? styles.btnSplitActive : ''}`}
                                                onClick={toggleSelectionMode}
                                            >
                                                {isSelectionMode ? 'Annuler Sélection' : 'Sélectionner Articles'}
                                            </button>
                                        </div>

                                        {!isSelectionMode && (
                                            <div className={styles.splitButtons}>
                                                <button
                                                    className={styles.btnSplit}
                                                    onClick={() => {
                                                        const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                        const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                        const reste = total - paye;
                                                        setMontantPaiement((reste / 2).toFixed(2));
                                                    }}
                                                >
                                                    / 2
                                                </button>
                                                <button
                                                    className={styles.btnSplit}
                                                    onClick={() => {
                                                        const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                        const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                        const reste = total - paye;
                                                        setMontantPaiement((reste / 3).toFixed(2));
                                                    }}
                                                >
                                                    / 3
                                                </button>
                                                <button
                                                    className={styles.btnSplit}
                                                    onClick={() => {
                                                        const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                        const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                        const reste = total - paye;
                                                        setMontantPaiement((reste / 4).toFixed(2));
                                                    }}
                                                >
                                                    / 4
                                                </button>
                                                <button
                                                    className={styles.btnSplit}
                                                    onClick={() => {
                                                        const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                        const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                        const reste = total - paye;
                                                        setMontantPaiement(reste.toFixed(2));
                                                    }}
                                                >
                                                    Tout
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <input
                                            type="text"
                                            placeholder="Code Chèque Cadeau"
                                            id="codeChequeInput"
                                            className={`${styles.input} ${styles.flex1}`}
                                        />
                                        <button onClick={handlePaiementCheque} className={`${styles.btn} ${styles.btnSecondary}`}>Appliquer</button>
                                    </div>



                                    <div className={styles.paymentInputRow}>
                                        <div className={styles.tipContainer}>
                                            <span className={styles.tipLabel}>Pourboire :</span>
                                            <div className={styles.tipButtons}>
                                                {[5, 10, 15].map(pct => (
                                                    <button
                                                        key={pct}
                                                        onClick={() => {
                                                            const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                            const tip = (total * pct) / 100;
                                                            setPourboire(tip);
                                                            const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                            const reste = total - paye;
                                                            setMontantPaiement((reste + tip).toFixed(2));
                                                        }}
                                                        className={`${styles.btnSecondary} ${styles.tipButton}`}
                                                        style={{ backgroundColor: pourboire === (parseFloat(selectedCommande.total_estime_commande.toString()) * pct) / 100 ? '#eab308' : '', color: pourboire === (parseFloat(selectedCommande.total_estime_commande.toString()) * pct) / 100 ? 'white' : '' }}
                                                    >
                                                        {pct}%
                                                    </button>
                                                ))}
                                                <input
                                                    type="number"
                                                    placeholder="€"
                                                    value={pourboire > 0 ? pourboire.toFixed(2) : ''}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setPourboire(val);
                                                        const total = parseFloat(selectedCommande.total_estime_commande.toString());
                                                        const paye = selectedCommande.tpaiement ? selectedCommande.tpaiement.filter(p => p.etat_paiement === 'PAYE').reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0) : 0;
                                                        const reste = total - paye;
                                                        setMontantPaiement((reste + val).toFixed(2));
                                                    }}
                                                    className={`${styles.input} ${styles.tipInput}`}
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            id="montantPaiementInput"
                                            className={styles.input}
                                            placeholder="Montant à encaisser"
                                            value={montantPaiement}
                                            onChange={e => setMontantPaiement(e.target.value)}
                                        />
                                    </div>

                                    <div className={styles.buttonsGrid}>
                                        <button onClick={() => handlePaiement('ESPECES')} className={`${styles.btn} ${styles.btnPrimary}`}><FaMoneyBillWave /> Espèces</button>
                                        <button onClick={() => handlePaiement('CB')} className={`${styles.btn} ${styles.btnPrimary}`}><FaCreditCard /> Carte</button>
                                        <button onClick={() => handlePaiement('TICKET_RESTO')} className={`${styles.btn} ${styles.btnPrimary}`}><FaTicketAlt /> Ticket Resto</button>
                                    </div>
                                </div>

                                <div className={styles.actionGroup}>
                                    <div className={styles.actionGroupTitle}>Actions Manager</div>
                                    <div className={styles.buttonsGrid}>
                                        <button
                                            onClick={handleValiderPaiementWeb}
                                            className={`${styles.btn} ${styles.btnSuccess}`}
                                        >
                                            <FaCheck /> Valider Web
                                            {selectedCommande.tpaiement && selectedCommande.tpaiement.some(p => p.methode_paiement === 'EN_LIGNE' && p.etat_paiement === 'EN_ATTENTE') && (
                                                <span className={styles.pendingPaymentInfo}>
                                                    ({selectedCommande.tpaiement
                                                        .filter(p => p.methode_paiement === 'EN_LIGNE' && p.etat_paiement === 'EN_ATTENTE')
                                                        .reduce((acc, p) => acc + parseFloat(p.montant_paiement.toString()), 0).toFixed(2)}€)
                                                </span>
                                            )}
                                        </button>
                                        <button onClick={handleRefuserPaiementWebClick} className={`${styles.btn} ${styles.btnWarning}`}><FaTimes /> Refuser</button>
                                        <button onClick={() => setModificationModal(true)} className={`${styles.btn} ${styles.btnSecondary}`}><FaPercentage /> Réductions</button>
                                    </div>
                                    <div className={`${styles.buttonsGrid} ${styles.marginTopSmall}`}>
                                        <button onClick={() => setEditOrderModalOpen(true)} className={`${styles.btn} ${styles.btnSecondary}`}><FaEdit /> Modif. Plats</button>
                                        <button onClick={handlePrint} className={`${styles.btn} ${styles.btnSecondary}`}><FaPrint /> Ticket</button>
                                        <button onClick={handleEmailClick} className={`${styles.btn} ${styles.btnSecondary}`}><FaEnvelope /> Email</button>
                                    </div>
                                </div>

                                <div className={styles.actionGroup}>
                                    <div className={`${styles.actionGroupTitle} ${styles.dangerTitle}`}>Zone Danger</div>
                                    <textarea
                                        placeholder="Motif de l'annulation..."
                                        value={justification}
                                        onChange={e => setJustification(e.target.value)}
                                        className={styles.textarea}
                                    />
                                    <button onClick={handleAnnulerClick} className={`${styles.btn} ${styles.btnDanger} ${styles.fullWidth}`}><FaTrash /> Annuler la commande</button>
                                </div>

                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Sélectionnez une commande pour afficher les détails</p>
                        </div>
                    )}
                </div>


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

                <Modal
                    isOpen={promptModal.isOpen}
                    onClose={closePromptModal}
                    title={promptModal.title}
                >
                    <div className={styles.promptModalContent}>
                        <p>{promptModal.placeholder}</p>
                        <Input
                            type="text"
                            value={promptModal.value}
                            onChange={(e: any) => setPromptModal({ ...promptModal, value: e.target.value })}
                            placeholder={promptModal.placeholder}
                        />
                        <div className={styles.promptActions} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <Button variant="secondary" onClick={closePromptModal}>Annuler</Button>
                            <Button variant="primary" onClick={() => promptModal.onConfirm && promptModal.onConfirm(promptModal.value)}>Confirmer</Button>
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={modificationModal}
                    onClose={() => setModificationModal(false)}
                    title="Réductions rapides"
                    footer={
                        <Button variant="outline" onClick={() => setModificationModal(false)}>Fermer</Button>
                    }
                >
                    <div className={styles.reductionGrid}>
                        <div className={styles.reductionCard}>
                            <h3>Offres prédéfinies</h3>
                            <button onClick={() => { handleReductionClick('PERSONNEL', 100, true); setModificationModal(false); }} className={`${styles.btn} ${styles.btnSecondary}`}><FaUtensils /> Personnel</button>
                            <button onClick={() => { handleReductionClick('VIP', 20, true); setModificationModal(false); }} className={`${styles.btn} ${styles.btnSecondary}`}><FaPercentage /> VIP -20%</button>
                        </div>
                        <div className={styles.reductionCard}>
                            <h3>Remise manuelle</h3>
                            <div className={styles.flexRow}>
                                <Input
                                    type="number"
                                    value={reductionValue}
                                    onChange={(e: any) => setReductionValue(e.target.value)}
                                    placeholder="Montant"
                                />
                                <button onClick={() => { handleReductionClick('OFFERT', reductionValue, false); setModificationModal(false); }} className={`${styles.btn} ${styles.btnSecondary} ${styles.flex1}`}><FaGift /> Offrir</button>
                            </div>
                        </div>
                    </div>
                </Modal>

                {editOrderModalOpen && selectedCommande && (
                    <EditCommandeModal
                        commande={selectedCommande}
                        onClose={() => setEditOrderModalOpen(false)}
                        onSuccess={() => {
                            setEditOrderModalOpen(false);
                            fetchCommandes();
                        }}
                    />
                )}
            </div>
        </div >
    );
}

export default Caisse;