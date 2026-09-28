import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Circle, Group, Text, Transformer } from "react-konva";
import Konva from "konva";
import styles from './PlanSalle.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ttableresto } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

const GRID_SIZE = 18;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 2000;

interface SalleElement extends Omit<ttableresto, 'orientation'> {
    orientation: string; 
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

export default function PlanSalle() {
    const { t } = useLanguage();
    const [elements, setElements] = useState<SalleElement[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const zoom = 1;
    const showGrid = true;
    const [currentRoom, setCurrentRoom] = useState("Principale");
    const [rooms, setRooms] = useState<string[]>(["Principale", "Terrasse"]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [promptModal, setPromptModal] = useState<PromptModalState>({ isOpen: false, title: '', value: '', onConfirm: null, placeholder: '' });
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
    const [mobileSearch, setMobileSearch] = useState('');
    const [mobileFilter, setMobileFilter] = useState<'all' | 'table' | 'decoration'>('all');

    const closeModal = () => setModal({ ...modal, isOpen: false });
    const closePromptModal = () => setPromptModal({ ...promptModal, isOpen: false, value: '' });

    const stageRef = useRef<Konva.Stage>(null); // pour les animations
    const layerRef = useRef<Konva.Layer>(null); // pour manipuler les éléments
    const trRef = useRef<Konva.Transformer>(null); // pour les transformations
    const wrapperRef = useRef<HTMLDivElement>(null); // pour redimensionner le plan de salle

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

    const fetchElements = async () => {
        try {
            const data = await api.get('/tables');
            if (data && Array.isArray(data)) {
                setElements(data);
                const uniqueRooms: string[] = Array.from(new Set(data.map((e: SalleElement) => e.salle).filter(Boolean)));
                if (uniqueRooms.length > 0) {
                    setRooms(prev => Array.from(new Set([...prev, ...uniqueRooms])));
                }
            }
        } catch (error) {
            console.error("Erreur chargement", error);
        }
    };

    useEffect(() => {
        fetchElements();
    }, []);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const addElement = async (type: string, category: string = 'table') => {

        let width = 60, height = 60, capacity = 0, name = '';
        // On ajoute les éléments dans le plan de salle
        if (category === 'table') {
            capacity = type === 'round' ? 4 : (type === 'rect' ? 6 : 2);
            width = type === 'round' ? 80 : (type === 'rect' ? 120 : 60);
            height = type === 'round' ? 80 : (type === 'rect' ? 80 : 60);
            name = `T${elements.filter(e => e.type_element === 'table').length + 1}`;
        } else {
            if (type === 'window') { width = 100; height = 15; name = 'Fenêtre'; }
            if (type === 'door') { width = 80; height = 80; name = 'Porte'; }
            if (type === 'wall') { width = 200; height = 10; name = 'Mur'; }
            if (type === 'zone') { width = 200; height = 200; name = 'Zone'; }
        }

        const newElement = {
            numero_table: name,
            capacite_table: capacity,
            pos_x: 100,
            pos_y: 100,
            largeur: width,
            hauteur: height,
            orientation: type,
            salle: currentRoom,
            type_element: category === 'table' ? 'table' : type,
            rotation: 0
        };

        try {
            const created: any = await api.post('/tables', newElement);
            if (created) {
                setElements([...elements, created]);
                setSelectedId(created.id);
            }
        } catch (error) {
            console.error("Erreur création", error);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedId) return;
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer cet élément ?',
            onConfirm: deleteElement
        });
    };

    const deleteElement = async () => {
        try {
            await api.delete(`/tables/${selectedId}`);
            setElements(elements.filter(t => t.id !== selectedId));
            setSelectedId(null);
            toast.success(t('toast.plansalle.deleted'));
        } catch (error) {
            console.error("Erreur suppression", error);
            toast.error(t('toast.plansalle.delete_error'));
        }
        closeModal();
    };

    const saveChanges = async () => {
        try {
            const updates = elements.map(t => ({
                id: t.id,
                pos_x: t.pos_x,
                pos_y: t.pos_y,
                largeur: t.largeur,
                hauteur: t.hauteur,
                orientation: t.orientation,
                capacite_table: t.capacite_table,
                numero_table: t.numero_table,
                salle: t.salle,
                type_element: t.type_element,
                rotation: t.rotation
            }));

            await api.post('/tables/batch', updates);
            toast.success(t('toast.plansalle.saved'));
        } catch (error) {
            console.error(error);
            toast.error(t('toast.plansalle.save_error'));
        }
    };

    const selectedElement = elements.find(t => t.id === selectedId);
    const roomElements = elements.filter((el) => el.salle === currentRoom);
    const filteredMobileElements = roomElements.filter((el) => {
        const matchesType =
            mobileFilter === 'all' ||
            (mobileFilter === 'table' && el.type_element === 'table') ||
            (mobileFilter === 'decoration' && el.type_element !== 'table');

        const needle = mobileSearch.trim().toLowerCase();
        if (!needle) return matchesType;

        const label = `${el.numero_table || ''} ${el.nom_table || ''} ${el.type_element || ''}`.toLowerCase();
        return matchesType && label.includes(needle);
    });
    const stageWidth = Math.max(dimensions.width, CANVAS_WIDTH);
    const stageHeight = Math.max(dimensions.height, CANVAS_HEIGHT);

    const renderPropertiesForm = (element: SalleElement) => (
        <div className={styles.form}>
            <label>Nom / Numéro
                <input value={element.numero_table} onChange={e => setElements(prev => prev.map(t => t.id === selectedId ? { ...t, numero_table: e.target.value } : t))} />
            </label>

            <label>Nom affiché
                <input value={element.nom_table || ''} onChange={e => setElements(prev => prev.map(t => t.id === selectedId ? { ...t, nom_table: e.target.value } : t))} placeholder="Ex: Terrasse 1" />
            </label>

            {element.type_element === 'table' && (
                <label>Capacité
                    <input type="number" value={element.capacite_table} onChange={e => setElements(prev => prev.map(t => t.id === selectedId ? { ...t, capacite_table: Number(e.target.value) } : t))} />
                </label>
            )}

            <label>Salle
                <select value={element.salle} onChange={e => setElements(prev => prev.map(t => t.id === selectedId ? { ...t, salle: e.target.value } : t))}>
                    {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </label>

            <label>Rotation (°)
                <input type="number" value={Math.round(element.rotation || 0)} onChange={e => setElements(prev => prev.map(t => t.id === selectedId ? { ...t, rotation: Number(e.target.value) } : t))} />
            </label>

            <button onClick={handleDeleteClick} className={styles.btnDelete}>Supprimer</button>
            {element.type_element === 'table' && (
                <button onClick={printQRCode} className={`${styles.btnPrimary} ${styles.btnFullWidth}`}>Imprimer QR Code</button>
            )}
        </div>
    );

    const printQRCode = () => {
        if (!selectedId || !selectedElement) return;
        window.open(`/print-qr-card?table=${encodeURIComponent(selectedElement.numero_table)}&id=${selectedId}`, '_blank');
    };

    const handleAddRoomClick = () => {
        setPromptModal({
            isOpen: true,
            title: 'Nouvelle salle',
            placeholder: 'Nom de la nouvelle salle ?',
            value: '',
            onConfirm: addRoom
        });
    };

    const addRoom = (name: string) => {
        if (name && !rooms.includes(name)) {
            setRooms([...rooms, name]);
            setCurrentRoom(name);
            toast.success(t('toast.plansalle.room_added', { name }));
        }
        closePromptModal();
    };

    const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
            setSelectedId(null);
            return;
        }
        const clickedOn = (e.target as any).findAncestor((node: any) => node.getAttr && node.getAttr("data-id"));
        if (clickedOn) {
            setSelectedId(parseInt(clickedOn.getAttr("data-id")));
        } else {
            setSelectedId(null);
        }
    };

    useEffect(() => {
        const stage = stageRef.current;
        const layer = layerRef.current;
        const tr = trRef.current;
        if (!tr || !stage || !layer) return;
        // On sélectionne l'élément
        const selectedNode = layer.findOne(`[data-id="${selectedId}"]`);
        if (selectedNode) {
            tr.nodes([selectedNode as Konva.Node]); // on ajoute l'élément au transformer
            tr.getLayer()?.batchDraw();
        } else {
            tr.nodes([]); 
            tr.getLayer()?.batchDraw();
        }
    }, [selectedId, elements, currentRoom]);
    // Gère le déplacement des éléments
    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: number) => {
        const nx = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
        const ny = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
        // on met à jour la position de l'élément
        setElements(prev => prev.map(t => t.id === id ? { ...t, pos_x: nx, pos_y: ny } : t));
        e.target.position({ x: nx, y: ny });
    };
    // Gère les transformations des éléments
    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: number) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();

        node.scaleX(1);
        node.scaleY(1);

        const newW = Math.max(10, Math.round((node.width() * scaleX) / 5) * 5);
        const newH = Math.max(10, Math.round((node.height() * scaleY) / 5) * 5);

        setElements(prev => prev.map(t => t.id === id ? {
            ...t,
            largeur: newW,
            hauteur: newH,
            rotation: rotation
        } : t));
    };

    const renderElement = (el: SalleElement) => {
        if (el.salle !== currentRoom) return null;

        const isTable = el.type_element === 'table';
        const isOccupied = isTable && el.tsessiontable && el.tsessiontable.length > 0; // vérifie si la table est occupée


        let fill = '#dcfce7';
        let stroke = '#22c55e';
        if (isTable && isOccupied) { fill = '#fee2e2'; stroke = '#ef4444'; }

        if (el.type_element === 'window') { fill = '#bae6fd'; stroke = '#0ea5e9'; }
        if (el.type_element === 'door') { fill = '#fed7aa'; stroke = '#f97316'; }
        if (el.type_element === 'wall') { fill = '#374151'; stroke = '#1f2937'; }
        if (el.type_element === 'zone') { fill = 'rgba(200,200,200,0.2)'; stroke = '#9ca3af'; }
        

        const commonProps = {
            key: el.id,
            x: el.pos_x,
            y: el.pos_y,
            draggable: true, // permet de déplacer l'élément
            rotation: el.rotation || 0, // permet de faire pivoter l'élément
            onDragEnd: (e: any) => handleDragEnd(e, el.id),
            onTransformEnd: (e: any) => handleTransformEnd(e, el.id),
            onClick: () => setSelectedId(el.id),
            "data-id": el.id
        };

        if (el.orientation === 'round' || (isTable && el.orientation === 'round')) {

            return (
                <Group {...commonProps}>
                    <Circle
                        radius={el.largeur / 2}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                    />
                    {isTable && (
                        <>
                            <Text text={el.numero_table} fontSize={14} fontStyle="bold" fill={stroke} x={-el.largeur / 2} y={-7} width={el.largeur} align="center" />
                            <Text text={`${el.capacite_table}p`} fontSize={10} fill="#666" x={-el.largeur / 2} y={8} width={el.largeur} align="center" />
                        </>
                    )}
                </Group>
            );
        }

        return (
            <Group {...commonProps}>
                <Rect
                    width={el.largeur}
                    height={el.hauteur}
                    cornerRadius={isTable ? 8 : 0}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    dash={el.type_element === 'zone' ? [10, 5] : []}
                />
                {isTable ? (
                    <>
                        <Text text={el.numero_table} fontSize={14} fontStyle="bold" fill={stroke} width={el.largeur} y={el.hauteur / 2 - 10} align="center" />
                        <Text text={`${el.capacite_table}p`} fontSize={10} fill="#666" width={el.largeur} y={el.hauteur / 2 + 5} align="center" />
                    </>
                ) : (
                    <Text text={el.numero_table} fontSize={12} fill={stroke} width={el.largeur} y={-15} align="center" />
                )}
            </Group>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <h2>Plan de Salle</h2>

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
                    <button className={styles.addRoomBtn} onClick={handleAddRoomClick}>+</button>
                </div>

                <div className={styles.tools}>
                    <h3>Tables</h3>
                    <div className={styles.toolGrid}>
                        <button onClick={() => addElement('round', 'table')} className={styles.toolBtn}>Ronde</button>
                        <button onClick={() => addElement('rect', 'table')} className={styles.toolBtn}>Rectangle</button>
                        <button onClick={() => addElement('square', 'table')} className={styles.toolBtn}>Carrée</button>
                    </div>

                    <h3>Décoration</h3>
                    <div className={styles.toolGrid}>
                        <button onClick={() => addElement('window', 'decoration')} className={styles.toolBtn}>Fenêtre</button>
                        <button onClick={() => addElement('door', 'decoration')} className={styles.toolBtn}>Porte</button>
                        <button onClick={() => addElement('wall', 'decoration')} className={styles.toolBtn}>Mur</button>
                        <button onClick={() => addElement('zone', 'decoration')} className={styles.toolBtn}>Zone</button>
                    </div>
                </div>

                <div className={styles.controls}>
                    <button onClick={saveChanges} className={styles.btnPrimary}>Sauvegarder</button>
                    <button onClick={fetchElements} className={styles.btnSecondary}>Rafraîchir</button>
                </div>

                {!isMobile && (
                    <div className={styles.properties}>
                        <h3>Propriétés</h3>
                        {selectedElement ? renderPropertiesForm(selectedElement) : <p className={styles.empty}>Sélectionnez un élément</p>}
                    </div>
                )}
            </div>

            <div className={styles.canvasWrapper} ref={wrapperRef}>
                {isMobile ? (
                    <div className={styles.mobileElementsList}>
                        <div className={styles.mobileSearchBar}>
                            <Input
                                value={mobileSearch}
                                onChange={(e: any) => setMobileSearch(e.target.value)}
                                placeholder="Rechercher une table ou un élément"
                            />
                        </div>

                        <div className={styles.mobileFilters}>
                            <button className={`${styles.mobileFilterBtn} ${mobileFilter === 'all' ? styles.mobileFilterBtnActive : ''}`} onClick={() => setMobileFilter('all')}>Tout</button>
                            <button className={`${styles.mobileFilterBtn} ${mobileFilter === 'table' ? styles.mobileFilterBtnActive : ''}`} onClick={() => setMobileFilter('table')}>Tables</button>
                            <button className={`${styles.mobileFilterBtn} ${mobileFilter === 'decoration' ? styles.mobileFilterBtnActive : ''}`} onClick={() => setMobileFilter('decoration')}>Décor</button>
                        </div>

                        {filteredMobileElements.length === 0 ? (
                            <p className={styles.empty}>Aucun élément dans cette salle.</p>
                        ) : filteredMobileElements.map((el) => {
                            const isTable = el.type_element === 'table';
                            return (
                                <button
                                    key={el.id}
                                    className={`${styles.mobileElementCard} ${selectedId === el.id ? styles.mobileElementCardActive : ''}`}
                                    onClick={() => setSelectedId(el.id)}
                                >
                                    <div className={styles.mobileElementHeader}>
                                        <strong>{isTable ? `Table ${el.numero_table}` : el.numero_table || 'Élément'}</strong>
                                        <span className={styles.mobileElementType}>{isTable ? 'Table' : el.type_element}</span>
                                    </div>
                                    <div className={styles.mobileElementMeta}>
                                        {isTable ? `${el.nom_table || '-'} · ${el.capacite_table} pers.` : `${Math.round(el.largeur)} x ${Math.round(el.hauteur)}`}
                                    </div>
                                </button>
                            );
                        })}

                        <div className={styles.mobilePropertiesPanel}>
                            <h3>Édition rapide</h3>
                            {selectedElement ? renderPropertiesForm(selectedElement) : <p className={styles.empty}>Sélectionnez un élément pour le modifier.</p>}
                        </div>
                    </div>
                ) : ( // on affiche le plan
                    <Stage
                        width={stageWidth}
                        height={stageHeight}
                        scaleX={zoom}
                        scaleY={zoom}
                        ref={stageRef}
                        onMouseDown={handleStageMouseDown}
                        className={styles.canvasStage}
                    >
                        <Layer ref={layerRef}>
                            {showGrid && (
                                <Group>
                                    {[...Array(Math.ceil(stageWidth / GRID_SIZE) + 1)].map((_, i) => (
                                        <React.Fragment key={i}>
                                            <Rect x={i * GRID_SIZE} y={0} width={1} height={stageHeight} fill="#e5e7eb" />
                                            <Rect x={0} y={i * GRID_SIZE} width={stageWidth} height={1} fill="#e5e7eb" />
                                        </React.Fragment>
                                    ))}
                                </Group>
                            )}
                            {elements.map(renderElement)}
                            {/* permet de redimensionner et de faire pivoter les éléments */}
                            <Transformer ref={trRef} /> 
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
                footer={
                    <>
                        <Button variant="outline" onClick={closePromptModal}>Annuler</Button>
                        <Button variant="primary" onClick={() => promptModal.onConfirm && promptModal.onConfirm(promptModal.value)}>Valider</Button>
                    </>
                }
            >
                <Input
                    value={promptModal.value}
                    onChange={(e: any) => setPromptModal({ ...promptModal, value: e.target.value })}
                    placeholder={promptModal.placeholder}
                />
            </Modal>
        </div >
    );
}
