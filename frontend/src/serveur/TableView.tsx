import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Group, Text, Line, Star } from "react-konva";
import { FaUtensils, FaInfoCircle, FaLink, FaLock, FaBell, FaStar, FaEdit } from 'react-icons/fa';
import styles from './TableView.module.css';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useLanguage } from '../context/LanguageContext';
import EditCommandeModal from '../components/common/EditCommandeModal';

import { ttableresto, tsessiontable, treservation } from '../types/prisma-types';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const DUREE_RESERVATION_MS = 2 * 60 * 60 * 1000;

interface Session extends tsessiontable {
    [key: string]: any;
}

interface Reservation extends treservation {
    tclient?: any;
    [key: string]: any;
}

interface TableElement extends Omit<ttableresto, 'tsessiontable' | 'treservation' | 'type_element' | 'orientation'> {
    type_element: 'table' | 'window' | 'door' | 'wall' | 'zone' | string;
    orientation?: 'rect' | 'round' | string | null;
    tsessiontable?: Session[];
    treservation?: Reservation[];
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
    onConfirm: ((val: string) => void) | null;
    placeholder: string;
}

function TableView() {
    const { t } = useLanguage();
    const [elements, setElements] = useState<TableElement[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rooms, setRooms] = useState<string[]>(["Principale"]);
    const [currentRoom, setCurrentRoom] = useState("Principale");
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [zoom] = useState(1);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [promptModal, setPromptModal] = useState<PromptModalState>({ isOpen: false, title: '', value: '', onConfirm: null, placeholder: '' });
    const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

    const closeModal = () => setModal({ ...modal, isOpen: false });
    const closePromptModal = () => setPromptModal({ ...promptModal, isOpen: false, value: '' });

    const stageRef = useRef<any>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const autoOpenedReservationIdsRef = useRef<Set<number>>(new Set());
    // On récupère les tables
    const fetchTables = async () => {
        try {
            const data: any = await api.get('/tables');
            if (data) {
                setElements(data);
                const uniqueRooms = Array.from(new Set(data.map((e: TableElement) => e.salle).filter(Boolean))) as string[];
                if (uniqueRooms.length > 0) {
                    setRooms(prev => Array.from(new Set([...prev, ...uniqueRooms])));
                }
            }
        } catch (err) {
            console.error('Erreur récupération tables :', err);
        }
    };

    useEffect(() => {
        fetchTables();
        const interval = setInterval(fetchTables, 5000); // 5 secondes
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!wrapperRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (wrapperRef.current) {
                setDimensions({
                    width: wrapperRef.current.offsetWidth,
                    height: wrapperRef.current.offsetHeight
                });
            }
        });
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // On ouvre une session pour une table
    const ouvrirSession = async (tableId: number, covers: number = 1) => {
        try {
            await api.post('/session', { table_id: tableId, nb_couverts: covers });
            fetchTables();
        } catch (err) { console.error(err); toast.error(t('toast.table.session_open_error')); }
    };

    const ouvrirSessionClick = (tableId: number) => {
        setPromptModal({
            isOpen: true,
            title: 'Ouvrir une session',
            placeholder: 'Nombre de couverts (ex: 2)',
            value: '',
            onConfirm: (val: string) => {
                const covers = parseInt(val, 10);
                if (!isNaN(covers) && covers > 0) {
                    ouvrirSession(tableId, covers);
                } else {
                    toast.error("Veuillez entrer un nombre valide");
                }
            }
        });
    };

    // On ferme une session
    const fermerSessionClick = (sessionId: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: "Clôturer la session ?",
            onConfirm: () => fermerSession(sessionId)
        });
    };

    const fermerSession = async (sessionId: number) => {
        try {
            await api.put('/session', { session_id: sessionId });
            fetchTables();
            toast.success(t('toast.table.session_closed'));
        } catch (err) { console.error(err); toast.error(t('toast.table.session_close_error')); }
        closeModal();
    };

    // On marque une table comme prete
    const marquerTablePrete = async (sessionId: number) => {
        try {
            await api.put('/session/ready', { session_id: sessionId });
            fetchTables();
            toast.success(t('toast.table.ready'));
        } catch (err) { console.error(err); toast.error(t('toast.table.update_error')); }
    };

    // On fusionne deux tables
    const fusionnerTablesClick = (tableId: number) => {
        setPromptModal({
            isOpen: true,
            title: 'Fusionner Tables',
            placeholder: 'Numéro de la table à fusionner',
            value: '',
            onConfirm: (autreTableNumero) => fusionnerTables(tableId, autreTableNumero)
        });
    };

    const fusionnerTables = async (tableId: number, autreTableNumero: string) => {
        if (!autreTableNumero) return;

        const tableTarget = elements.find(t => t.numero_table === autreTableNumero);
        if (!tableTarget) {
            toast.error(t('toast.table.not_found'));
            return;
        }

        if (tableTarget.id === tableId) {
            toast.error(t('toast.table.merge_self_error'));
            return;
        }

        try {
            await api.post('/tables/fusion', { mainTableId: tableId, tablesToMergeIds: [tableTarget.id] });
            toast.success(t('toast.table.merge_success'));
            fetchTables();
        } catch (err) { console.error(err); toast.error(t('toast.table.merge_error')); }
        closePromptModal();
    };

    // On défusionne une table
    const defusionnerTableClick = (tableId: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Défusionner ?',
            onConfirm: () => defusionnerTable(tableId)
        });
    };

    const defusionnerTable = async (tableId: number) => {
        try {
            await api.post('/tables/defusion', { mainTableId: tableId });
            toast.success(t('toast.table.unmerge_success'));
            fetchTables();
        } catch (err) { console.error(err); toast.error(t('toast.table.unmerge_error')); }
        closeModal();
    };

    // Envoie un signal à la cuisine
    const envoyerSuite = async (tableId: number) => {
        try {
            const data: any = await api.post(`/tables/${tableId}/fire`, {});
            if (data.count > 0) toast.success(<span>{t('toast.table.fire_sent', { count: data.count })} <FaUtensils /></span>);
            else toast(<span>{t('toast.table.fire_none')} <FaInfoCircle /></span>, { icon: 'ℹ️' });
        } catch (err) { console.error(err); toast.error(t('toast.table.fire_error')); }
    };

    // Helpers
    const getDerniereSession = (table: TableElement) => {
        if (!table.tsessiontable || table.tsessiontable.length === 0) return null;
        const activeSessions = table.tsessiontable.filter(s => ['ACTIVE', 'EN_ATTENTE_PAIEMENT', 'A_DEBARRASSER'].includes(s.statut_session));
        if (activeSessions.length > 0) return activeSessions[0];
        return null;
    };

    const getDateHeureReservation = (reservation: Reservation) => {
        const datePart = new Date(reservation.date_reservation);
        const timePart = new Date(reservation.heure_reservation);

        if (isNaN(datePart.getTime()) || isNaN(timePart.getTime())) {
            return null;
        }

        const combined = new Date(datePart);
        combined.setHours(
            timePart.getUTCHours(),
            timePart.getUTCMinutes(),
            timePart.getUTCSeconds(),
            0
        );

        return combined;
    };

    const getReservationEnCours = (table: TableElement) => {
        if (!table.treservation || table.treservation.length === 0) return null;

        const now = new Date();
        return table.treservation.find((reservation) => {
            const statut = reservation.statut_reservation;
            if (!['EN_ATTENTE', 'CONFIRMEE', 'ARRIVEE'].includes(statut)) return false;

            const debut = getDateHeureReservation(reservation);
            if (!debut) return false;

            const fin = new Date(debut.getTime() + DUREE_RESERVATION_MS);
            return now >= debut && now < fin;
        }) || null;
    };

    // Rendu des liens de fusion
    const renderFusionLinks = () => {
        const links: React.ReactNode[] = [];
        elements.forEach(el => {
            if (el.salle === currentRoom && el.est_fusionnee && el.tables_fusionnees) {
                const mergedIds = el.tables_fusionnees.split(',').map(Number);
                mergedIds.forEach(mergedId => {
                    const mergedTable = elements.find(t => t.id === mergedId);
                    if (mergedTable && mergedTable.salle === currentRoom) {
                        links.push(
                            <Line
                                key={`link-${el.id}-${mergedId}`}
                                points={[
                                    el.pos_x + el.largeur / 2,
                                    el.pos_y + el.hauteur / 2,
                                    mergedTable.pos_x + mergedTable.largeur / 2,
                                    mergedTable.pos_y + mergedTable.hauteur / 2
                                ]}
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dash={[10, 5]}
                                opacity={0.6}
                            />
                        );
                    }
                });
            }
        });
        return links;
    };

    const renderElement = (el: TableElement) => {
        if (el.salle !== currentRoom) return null;

        const isTable = el.type_element === 'table';
        const session = isTable ? getDerniereSession(el) : null;
        const reservation = isTable ? getReservationEnCours(el) : null;
        const isOccupied = !!session || !!reservation;
        const isSelected = selectedId === el.id;

        // Couleurs
        let fill = '#dcfce7'; 
        let stroke = '#22c55e';

        if (isTable) {
            if (isOccupied) {
                if (session) {
                    // A_DEBARRASSER, EN_ATTENTE_PAIEMENT, EN_COURS, TERMINEE
                    if (session.statut_session === 'A_DEBARRASSER') {
                        fill = '#fef3c7'; stroke = '#d97706';
                    } else if (session.statut_session === 'EN_ATTENTE_PAIEMENT') {
                        fill = '#ffedd5'; stroke = '#f97316';
                    } else {
                        fill = '#fee2e2'; stroke = '#ef4444';
                    }
                } else {
                    if (reservation?.statut_reservation === 'ARRIVEE') {
                        fill = '#d1fae5';
                        stroke = '#16a34a';
                    } else if (reservation?.statut_reservation === 'CONFIRMEE') {
                        fill = '#fde68a';
                        stroke = '#d97706';
                    } else {
                        // EN_ATTENTE
                        fill = '#fee2e2';
                        stroke = '#dc2626';
                    }
                }
            }
            if (el.est_occupee_par_fusion) {
                fill = '#e5e7eb'; // Gris (Bloqué par fusion)
                stroke = '#9ca3af';
            }
            if (isSelected) {
                stroke = '#3b82f6'; 
            }
        } else {
            if (el.type_element === 'window') { fill = '#e0f2fe'; stroke = '#bae6fd'; }
            if (el.type_element === 'door') { fill = '#ffedd5'; stroke = '#fed7aa'; }
            if (el.type_element === 'wall') { fill = '#4b5563'; stroke = '#374151'; }
            if (el.type_element === 'zone') { fill = 'rgba(200,200,200,0.1)'; stroke = '#e5e7eb'; }
        }

        const commonProps = {
            x: el.pos_x,
            y: el.pos_y,
            rotation: el.rotation || 0,
            onClick: () => {
                if (isTable) setSelectedId(el.id);
            },
            onTap: () => {
                if (isTable) setSelectedId(el.id);
            },
            listening: isTable
        };

        if ((el.orientation as string) === 'round') {
            return (
                <Group key={el.id} {...commonProps}>
                    <Circle
                        radius={el.largeur / 2}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 4 : 2}
                    />
                    {isTable && (
                        <>
                            <Text text={el.numero_table} fontSize={14} fontStyle="bold" fill={stroke} x={-el.largeur / 2} y={-7} width={el.largeur} align="center" />
                            <Text text={`${el.capacite_table}p`} fontSize={10} fill="#666" x={-el.largeur / 2} y={8} width={el.largeur} align="center" />
                            {(el.est_fusionnee || el.est_occupee_par_fusion) && (
                                <Text
                                    text="🔗"
                                    fontSize={18}
                                    fill="#8b5cf6"
                                    x={el.largeur / 2 - 15}
                                    y={-el.largeur / 2 + 5}
                                />
                            )}
                            {reservation?.tclient?.est_vip && (
                                <Star
                                    numPoints={5}
                                    innerRadius={4}
                                    outerRadius={8}
                                    fill="#f59e0b"
                                    x={-el.largeur / 2 + 10}
                                    y={-el.largeur / 2 + 10}
                                />
                            )}
                        </>
                    )}
                </Group>
            );
        }

        return (
            <Group key={el.id} {...commonProps}>
                <Rect
                    width={el.largeur}
                    height={el.hauteur}
                    cornerRadius={isTable ? 8 : 0}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 4 : 2}
                    dash={el.type_element === 'zone' ? [10, 5] : []}
                />
                {isTable && (
                    <>
                        <Text text={el.numero_table} fontSize={14} fontStyle="bold" fill={stroke} width={el.largeur} y={el.hauteur / 2 - 10} align="center" />
                        <Text text={`${el.capacite_table}p`} fontSize={10} fill="#666" width={el.largeur} y={el.hauteur / 2 + 5} align="center" />
                        {(el.est_fusionnee || el.est_occupee_par_fusion) && (
                            <Text
                                text="🔗"
                                fontSize={18}
                                fill="#8b5cf6"
                                x={el.largeur - 25}
                                y={5}
                            />
                        )}
                        {reservation?.tclient?.est_vip && (
                            <Star
                                numPoints={5}
                                innerRadius={4}
                                outerRadius={8}
                                fill="#f59e0b"
                                x={10}
                                y={10}
                            />
                        )}
                    </>
                )}
            </Group>
        );
    };

    const selectedTable = elements.find(t => t.id === selectedId);
    const selectedSession = selectedTable ? getDerniereSession(selectedTable) : null;
    const selectedReservation = selectedTable ? getReservationEnCours(selectedTable) : null;
    const stageWidth = Math.max(dimensions.width, CANVAS_WIDTH);
    const stageHeight = Math.max(dimensions.height, CANVAS_HEIGHT);
    const roomTables = elements.filter((el) => el.type_element === 'table' && el.salle === currentRoom);

    // Ouvrir automatiquement la session quand une réservation est arrivée 
    useEffect(() => {
        const reservationId = selectedReservation?.id;
        if (
            selectedTable &&
            !selectedSession &&
            selectedReservation?.statut_reservation === 'ARRIVEE' &&
            !selectedTable.est_occupee_par_fusion &&
            reservationId &&
            !autoOpenedReservationIdsRef.current.has(reservationId)
        ) {
            autoOpenedReservationIdsRef.current.add(reservationId);
            ouvrirSession(selectedTable.id);
        }
    }, [selectedTable, selectedSession, selectedReservation]);

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Plan de Salle</h2>
                <p className="page-subtitle">Visualisez les tables et gérez les sessions en cours.</p>
            </div>
            <div className={styles.container}>
            <div className={styles.sidebar}>
                <h3>Tables</h3>

                <div className={styles.roomTabs}>
                    {rooms.map(r => (
                        <button
                            key={r}
                            className={`${styles.roomTab} ${currentRoom === r ? styles.activeTab : ''}`}
                            onClick={() => { setCurrentRoom(r); setSelectedId(null); }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className={styles.details}>
                    {selectedTable ? (
                        <>
                            <h3>Table {selectedTable.numero_table}</h3>

                            {selectedReservation?.tclient?.est_vip && (
                                <div className={styles.vipBanner} style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #f59e0b' }}>
                                    <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}><FaStar /> CLIENT VIP</strong>
                                    <div style={{ fontSize: '0.9rem', color: '#92400e', marginTop: '5px' }}>
                                        {selectedReservation.tclient.nom_client} <br />
                                        Points: {selectedReservation.tclient.points_fidelite}
                                    </div>
                                </div>
                            )}

                            <div className={styles.infoRow}>
                                <span>Capacité:</span>
                                <strong>{selectedTable.capacite_table} pers.</strong>
                            </div>
                            <div className={styles.infoRow}>
                                <span>Statut:</span>
                                <span className={`${styles.status} ${selectedSession ? (selectedSession.statut_session === 'A_DEBARRASSER' ? styles.clearing : selectedSession.statut_session === 'EN_ATTENTE_PAIEMENT' ? styles.payment : styles.occupied) : selectedReservation ? (selectedReservation.statut_reservation === 'ARRIVEE' ? styles.arrived : selectedReservation.statut_reservation === 'CONFIRMEE' ? styles.confirmed : styles.pending) : styles.free}`}>
                                    {selectedSession
                                        ? (selectedSession.statut_session === 'A_DEBARRASSER' ? 'À débarrasser' : selectedSession.statut_session === 'EN_ATTENTE_PAIEMENT' ? 'Paiement' : 'Occupée')
                                        : selectedReservation ? (selectedReservation.statut_reservation === 'ARRIVEE' ? 'Arrivée confirmée' : selectedReservation.statut_reservation === 'CONFIRMEE' ? 'Confirmée' : 'En attente') : 'Libre'}
                                </span>
                            </div>

                            {selectedTable.est_fusionnee && (
                                <div className={`${styles.infoRow} ${styles.fusionInfo}`}>
                                    <FaLink /> Fusionnée avec: {selectedTable.tables_fusionnees}
                                </div>
                            )}

                            {selectedTable.est_occupee_par_fusion && (
                                <div className={`${styles.infoRow} ${styles.lockInfo}`}>
                                    <FaLock /> Verrouillée par fusion
                                </div>
                            )}

                            <div className={styles.actions}>
                                {!selectedSession && (!selectedReservation || selectedReservation.statut_reservation === 'ARRIVEE') ? (
                                    <button
                                        className={`${styles.btnAction} ${styles.btnSuccess} ${selectedTable.est_occupee_par_fusion ? styles.btnDisabled : ''}`}
                                        onClick={() => ouvrirSessionClick(selectedTable.id)}
                                        disabled={!!selectedTable.est_occupee_par_fusion}
                                    >
                                        Ouvrir Session
                                    </button>
                                ) : selectedSession?.statut_session === 'A_DEBARRASSER' ? (
                                    <button className={`${styles.btnAction} ${styles.btnSuccess}`} onClick={() => marquerTablePrete(selectedSession.id)}>
                                        Table Prête
                                    </button>
                                ) : selectedSession ? (
                                    <>
                                        <button className={`${styles.btnAction} ${styles.btnPrimary} ${styles.btnSuite}`} onClick={() => envoyerSuite(selectedTable.id)}>
                                            <FaBell /> Envoyer la Suite
                                        </button>
                                        <button className={`${styles.btnAction} ${styles.btnDanger}`} onClick={() => fermerSessionClick(selectedSession.id)}>
                                            Clôturer / Encaisser
                                        </button>
                                        {selectedSession.tcommande && selectedSession.tcommande.find((c: any) => ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE'].includes(c.statut_commande)) && (
                                            <button className={`${styles.btnAction} ${styles.btnSecondary}`} onClick={() => setEditOrderModalOpen(true)}>
                                                <FaEdit /> Modifier la Commande
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className={styles.infoRow}>
                                        <FaLock /> Table réservée, ouverture bloquée pendant le créneau.
                                    </div>
                                )}

                                {!selectedTable.est_occupee_par_fusion && !selectedTable.est_fusionnee && (
                                    <button className={`${styles.btnAction} ${styles.btnPrimary}`} onClick={() => fusionnerTablesClick(selectedTable.id)}>
                                        Fusionner
                                    </button>
                                )}

                                {selectedTable.est_fusionnee && (
                                    <button className={`${styles.btnAction} ${styles.btnWarning}`} onClick={() => defusionnerTableClick(selectedTable.id)}>
                                        Défusionner
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className={styles.empty}>Sélectionnez une table pour voir les actions.</p>
                    )}
                </div>
            </div>

            <div className={styles.canvasWrapper} ref={wrapperRef}>
                {isMobile ? (
                    <div className={styles.mobileTableList}>
                        {roomTables.length === 0 ? (
                            <p className={styles.empty}>Aucune table disponible dans cette salle.</p>
                        ) : roomTables.map((table) => {
                            const session = getDerniereSession(table);
                            const reservation = getReservationEnCours(table);
                            const statusClass = session
                                ? (session.statut_session === 'A_DEBARRASSER' ? styles.clearing : session.statut_session === 'EN_ATTENTE_PAIEMENT' ? styles.payment : styles.occupied)
                                : reservation
                                    ? (reservation.statut_reservation === 'ARRIVEE' ? styles.arrived : reservation.statut_reservation === 'CONFIRMEE' ? styles.confirmed : styles.pending)
                                    : styles.free;

                            const statusLabel = session
                                ? (session.statut_session === 'A_DEBARRASSER' ? 'À débarrasser' : session.statut_session === 'EN_ATTENTE_PAIEMENT' ? 'Paiement' : 'Occupée')
                                : reservation
                                    ? (reservation.statut_reservation === 'ARRIVEE' ? 'Arrivée confirmée' : reservation.statut_reservation === 'CONFIRMEE' ? 'Confirmée' : 'En attente')
                                    : 'Libre';

                            return (
                                <button
                                    key={table.id}
                                    className={`${styles.mobileTableCard} ${selectedId === table.id ? styles.mobileTableCardActive : ''}`}
                                    onClick={() => setSelectedId(table.id)}
                                >
                                    <div>
                                        <strong>Table {table.numero_table}</strong>
                                        <div className={styles.mobileMeta}>{table.nom_table || `Table ${table.numero_table}`}</div>
                                        <div className={styles.mobileMeta}>{table.capacite_table} pers.</div>
                                    </div>
                                    <span className={`${styles.status} ${statusClass}`}>{statusLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <Stage
                        width={stageWidth}
                        height={stageHeight}
                        scaleX={zoom}
                        scaleY={zoom}
                        ref={stageRef}
                        className={styles.canvasStage}
                    >
                        <Layer>
                            <Group>
                                {[...Array(Math.ceil(stageWidth / GRID_SIZE) + 1)].map((_, i) => (
                                    <React.Fragment key={i}>
                                        <Rect x={i * GRID_SIZE} y={0} width={1} height={stageHeight} fill="#e5e7eb" opacity={0.5} />
                                        <Rect x={0} y={i * GRID_SIZE} width={stageWidth} height={1} fill="#e5e7eb" opacity={0.5} />
                                    </React.Fragment>
                                ))}
                            </Group>
                            {renderFusionLinks()}
                            {elements.map(renderElement)}
                        </Layer>
                    </Stage>
                )}
            </div>


            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                footer={
                    <>
                        <Button variant="outline" onClick={closeModal}>Annuler</Button>
                        <Button variant="primary" onClick={modal.onConfirm!}>Confirmer</Button>
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
                        onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                        placeholder={promptModal.placeholder}
                    />
                    <div className={styles.promptActions}>
                        <Button variant="secondary" onClick={closePromptModal}>Annuler</Button>
                        <Button variant="primary" onClick={() => promptModal.onConfirm && promptModal.onConfirm(promptModal.value)}>Confirmer</Button>
                    </div>
                </div>
            </Modal>
            
            {editOrderModalOpen && selectedSession && selectedSession.tcommande && selectedSession.tcommande.find((c: any) => ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE'].includes(c.statut_commande)) && (
                <EditCommandeModal
                    commande={selectedSession.tcommande.find((c: any) => ['EN_ATTENTE', 'EN_PREPARATION', 'SERVIE'].includes(c.statut_commande))}
                    onClose={() => setEditOrderModalOpen(false)}
                    onSuccess={() => {
                        setEditOrderModalOpen(false);
                        fetchTables();
                    }}
                />
            )}
            </div>
        </div >
    );
}

export default TableView;
