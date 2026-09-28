import React, { useState, useEffect } from 'react';
import styles from './EventsGestion.module.css';
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { tevenement, tplat, tcategorieplat } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

registerPlugin(FilePondPluginImagePreview);

type Plat = tplat;
type Categorie = tcategorieplat;

interface Evenement extends Omit<tevenement, 'id' | 'date_debut' | 'date_fin' | 'opacity' | 'type' | 'description' | 'image_url' | 'couleur_principale' | 'couleur_secondaire' | 'couleur_texte' | 'motif' | 'font' | 'pourcentage_reduction'> {
    id?: number | null;
    date_debut: string;
    date_fin: string;
    type: string;
    opacity: number;
    pourcentage_reduction: number | null;
    description: string;
    image_url: string;
    couleur_principale: string;
    couleur_secondaire: string;
    couleur_texte: string;
    motif: string;
    font: string;
    plats_ids: number[];

    [key: string]: any;
}

interface Pattern {
    label: string;
    style: React.CSSProperties;
}

const patterns: Record<string, Pattern> = {
    none: { label: 'Uni', style: {} },
    subtle_dots: {
        label: 'Pois',
        style: { backgroundImage: 'radial-gradient(#00000010 1px, transparent 1px)', backgroundSize: '20px 20px' }
    },
    diagonal_lines: {
        label: 'Lignes',
        style: { backgroundImage: 'repeating-linear-gradient(45deg, #00000005 0, #00000005 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }
    },
    luxury_diamond: {
        label: 'Luxe',
        style: {
            backgroundImage: 'linear-gradient(45deg, #00000008 25%, transparent 25%, transparent 75%, #00000008 75%, #00000008), linear-gradient(45deg, #00000008 25%, transparent 25%, transparent 75%, #00000008 75%, #00000008)',
            backgroundPosition: '0 0, 10px 10px',
            backgroundSize: '20px 20px'
        }
    },
    noise: {
        label: 'Grain',
        style: { backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")' }
    }
};

interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    onConfirm: (() => void) | null;
}

const EventsGestion = () => {
    const { t } = useLanguage();
    const [events, setEvents] = useState<Evenement[]>([]);
    const [plats, setPlats] = useState<Plat[]>([]);
    const [categories, setCategories] = useState<Categorie[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingEvent, setEditingEvent] = useState<Evenement | null>(null);
    const [activeTab, setActiveTab] = useState('contenu'); 
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const defaultForm: Evenement = {
        titre: '',
        description: '',
        image_url: '',
        date_debut: '',
        date_fin: '',
        type: 'EVENEMENT',
        actif: true,
        plats_ids: [],
        couleur_principale: '#ffffff',
        couleur_secondaire: '#1a1a1a',
        couleur_texte: '#1a1a1a',
        motif: 'none',
        font: 'Inter, sans-serif',
        format: 'CARTE',
        text_align: 'center',
        button_style: 'filled',
        opacity: 0.0,
        pourcentage_reduction: null
    };

    const [formData, setFormData] = useState<Evenement>(defaultForm);
    const [files, setFiles] = useState<any[]>([]);

    const fonts = [
        { id: 'Inter, sans-serif', label: 'Moderne (Inter)' },
        { id: 'Playfair Display, serif', label: 'Élégant (Playfair)' },
        { id: 'Lato, sans-serif', label: 'Minimaliste (Lato)' },
        { id: 'Courier New, monospace', label: 'Technique' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dataEvents, dataPlats, dataCats] = await Promise.all([
                api.get('/events'),
                api.get('/plats'),
                api.get('/categories')
            ]);

            setEvents((dataEvents as Evenement[]) || []);
            setPlats((dataPlats as Plat[]) || []);
            setCategories((dataCats as Categorie[]) || []);
        } catch (error) {
            console.error('Erreur chargement events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (event: Evenement) => {
        setEditingEvent(event);
        setFiles([]);
        setActiveTab('contenu');
        setFormData({
            titre: event.titre,
            description: event.description || '',
            image_url: event.image_url || '',
            date_debut: event.date_debut.split('T')[0],
            date_fin: event.date_fin.split('T')[0],
            type: event.type,
            actif: event.actif,
            plats_ids: event.tevenement_plat ? event.tevenement_plat.map((tp: any) => tp.plat_id) : [],
            couleur_principale: event.couleur_principale || '#ffffff',
            couleur_secondaire: event.couleur_secondaire || '#1a1a1a',
            couleur_texte: event.couleur_texte || '#1a1a1a',
            motif: event.motif || 'none',
            font: event.font || 'Inter, sans-serif',
            format: event.format || 'CARTE',
            text_align: event.text_align || 'center',
            button_style: event.button_style || 'filled',
            opacity: event.opacity !== undefined ? Number(event.opacity) : 0.0,
            pourcentage_reduction: event.pourcentage_reduction ? Number(event.pourcentage_reduction) : null
        });
    };

    const handleCreate = () => {
        setEditingEvent({ ...defaultForm, id: null });
        setActiveTab('contenu');
        setFormData(defaultForm);
        setFiles([]);
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer cet événement ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/events/${id}`);
            toast.success(t('toast.events.deleted'));
            loadData();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.events.delete_error'));
        }
        closeModal();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;


        try {
            const data = new FormData();
            data.append('titre', formData.titre);
            data.append('description', formData.description);
            data.append('date_debut', formData.date_debut);
            data.append('date_fin', formData.date_fin);
            data.append('type', formData.type);
            data.append('actif', String(formData.actif));
            data.append('plats_ids', JSON.stringify(formData.plats_ids));
            data.append('couleur_principale', formData.couleur_principale);
            data.append('couleur_secondaire', formData.couleur_secondaire);
            data.append('couleur_texte', formData.couleur_texte);
            data.append('motif', formData.motif);
            data.append('font', formData.font);
            data.append('format', formData.format);
            data.append('text_align', formData.text_align);
            data.append('button_style', formData.button_style);
            data.append('opacity', String(formData.opacity));

            if (files.length > 0) {
                data.append('image', files[0].file);
            }

            const url = editingEvent.id ? `/events/${editingEvent.id}` : '/events';
            const method = editingEvent.id ? 'PUT' : 'POST';

            const res = await api.upload(url, data, method);
            if (res) {
                setEditingEvent(null);
                setFiles([]);
                loadData();
            }
        } catch (error) {
            console.error(error);
            toast.error(t('toast.events.save_error'));
        }
    };

    const togglePlat = (platId: number) => {
        setFormData(prev => {
            const ids = prev.plats_ids.includes(platId)
                ? prev.plats_ids.filter(id => id !== platId)
                : [...prev.plats_ids, platId];
            return { ...prev, plats_ids: ids };
        });
    };

    const getPlatsByCategory = () => {
        const grouped: Record<string, Plat[]> = {};
        const sortedCats = [...categories].sort((a, b) => a.id - b.id);

        sortedCats.forEach(cat => {
            grouped[cat.nom_categorie] = plats.filter(p => p.categorie_id === cat.id);
        });

        const knownCatIds = sortedCats.map(c => c.id);
        const others = plats.filter(p => !knownCatIds.includes(p.categorie_id));
        if (others.length > 0) grouped['Autres'] = others;

        return grouped;
    };

    const groupedPlats = getPlatsByCategory();

    const getSelectedPlatsGrouped = () => {
        const selected = plats.filter(p => formData.plats_ids.includes(p.id));
        const grouped: Record<string, Plat[]> = {};
        const sortedCats = [...categories].sort((a, b) => a.id - b.id);

        sortedCats.forEach(cat => {
            const inCat = selected.filter(p => p.categorie_id === cat.id);
            if (inCat.length > 0) grouped[cat.nom_categorie] = inCat;
        });

        const knownCatIds = sortedCats.map(c => c.id); 
        const others = selected.filter(p => !knownCatIds.includes(p.categorie_id));
        if (others.length > 0) grouped['Autres'] = others;

        return grouped;
    }

    const selectedPlatsGrouped = getSelectedPlatsGrouped();


    if (loading) return <p>Chargement...</p>;

    if (editingEvent) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3>{editingEvent.id ? 'Modifier l\'événement' : 'Créer un événement'}</h3>
                    <button type="button" onClick={() => setEditingEvent(null)} className={styles.cancelBtn}>Retour</button>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tabBtn} ${activeTab === 'contenu' ? styles.activeTab : ''}`} onClick={() => setActiveTab('contenu')}>Contenu</button>
                    <button className={`${styles.tabBtn} ${activeTab === 'apparence' ? styles.activeTab : ''}`} onClick={() => setActiveTab('apparence')}>Apparence</button>
                    <button className={`${styles.tabBtn} ${activeTab === 'disposition' ? styles.activeTab : ''}`} onClick={() => setActiveTab('disposition')}>Disposition</button>
                </div>

                <div className={styles.editorLayout}>
                    <div className={styles.formColumn}>
                        <form onSubmit={handleSubmit} className={styles.form}>

                            {activeTab === 'contenu' && (
                                <>
                                    <label>
                                        Titre
                                        <input type="text" value={formData.titre} onChange={e => setFormData({ ...formData, titre: e.target.value })} required placeholder="Ex: Menu de Noël" />
                                    </label>

                                    <div className={styles.row}>
                                        <label>
                                            Type
                                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                                <option value="EVENEMENT">Événement</option>
                                                <option value="MENU_SPECIAL">Menu Spécial</option>
                                                <option value="PROMOTION">Promotion</option>
                                            </select>
                                        </label>
                                        <label>
                                            Actif
                                            <select value={String(formData.actif)} onChange={e => setFormData({ ...formData, actif: e.target.value === 'true' })}>
                                                <option value="true">Oui</option>
                                                <option value="false">Non</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className={styles.row}>
                                        <label>
                                            Début
                                            <input type="date" value={formData.date_debut} onChange={e => setFormData({ ...formData, date_debut: e.target.value })} required />
                                        </label>
                                        <label>
                                            Fin
                                            <input type="date" value={formData.date_fin} onChange={e => setFormData({ ...formData, date_fin: e.target.value })} required />
                                        </label>
                                    </div>

                                    <label>
                                        Description
                                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Détails de l'événement..." />
                                    </label>

                                    <label>
                                        Image de l'événement
                                        <FilePond
                                            files={files}
                                            onupdatefiles={setFiles}
                                            allowMultiple={false}
                                            maxFiles={1}
                                            name="image"
                                            labelIdle='Glissez & déposez votre image ou <span class="filepond--label-action">Parcourir</span>'
                                        />
                                    </label>

                                    <label className={styles.labelTopMargin}>Sélection des Plats</label>
                                    <div className={styles.platsContainer}>
                                        {Object.entries(groupedPlats).map(([category, items]) => (
                                            <div key={category} className={styles.categoryGroup}>
                                                <h5 className={styles.categoryTitle}>{category}</h5>
                                                <div className={styles.platsList}>
                                                    {items.map(plat => (
                                                        <label key={plat.id} className={styles.platItem}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.plats_ids.includes(plat.id)}
                                                                onChange={() => togglePlat(plat.id)}
                                                            />
                                                            {plat.nom_plat}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {activeTab === 'apparence' && (
                                <>
                                    <div className={styles.colorPickers}>
                                        <div className={styles.colorField}>
                                            <span>Fond</span>
                                            <input type="color" value={formData.couleur_principale} onChange={e => setFormData({ ...formData, couleur_principale: e.target.value })} />
                                        </div>
                                        <div className={styles.colorField}>
                                            <span>Accents</span>
                                            <input type="color" value={formData.couleur_secondaire} onChange={e => setFormData({ ...formData, couleur_secondaire: e.target.value })} />
                                        </div>
                                        <div className={styles.colorField}>
                                            <span>Texte</span>
                                            <input type="color" value={formData.couleur_texte} onChange={e => setFormData({ ...formData, couleur_texte: e.target.value })} />
                                        </div>
                                    </div>

                                    <label className={styles.labelTopMargin}>Police</label>
                                    <select value={formData.font} onChange={e => setFormData({ ...formData, font: e.target.value })}>
                                        {fonts.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>

                                    <label className={styles.labelTopMargin}>Motif de fond</label>
                                    <div className={styles.patternGrid}>
                                        {Object.entries(patterns).map(([key, p]) => (
                                            <div
                                                key={key}
                                                className={`${styles.patternOption} ${formData.motif === key ? styles.selected : ''}`}
                                                onClick={() => setFormData({ ...formData, motif: key })}
                                                style={p.style}
                                            >
                                                <span className={styles.patternLabel}>{p.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <label className={styles.labelTopMargin}>Opacité du fond (Overlay)</label>
                                    <input
                                        type="range"
                                        min="0" max="0.9" step="0.1"
                                        value={formData.opacity}
                                        onChange={e => setFormData({ ...formData, opacity: parseFloat(e.target.value) })}
                                        className={styles.rangeInput}
                                    />
                                </>
                            )}

                            {activeTab === 'disposition' && (
                                <>
                                    <label>Format d'affichage</label>
                                    <div className={styles.controlGroup}>
                                        <button type="button" className={`${styles.controlBtn} ${formData.format === 'CARTE' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, format: 'CARTE' })}>Carte</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.format === 'BANNIERE' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, format: 'BANNIERE' })}>Bannière</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.format === 'PLEINE_PAGE' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, format: 'PLEINE_PAGE' })}>Pleine Page</button>
                                    </div>

                                    <label className={styles.labelTopMargin}>Alignement du texte</label>
                                    <div className={styles.controlGroup}>
                                        <button type="button" className={`${styles.controlBtn} ${formData.text_align === 'left' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, text_align: 'left' })}>Gauche</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.text_align === 'center' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, text_align: 'center' })}>Centre</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.text_align === 'right' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, text_align: 'right' })}>Droite</button>
                                    </div>

                                    <label className={styles.labelTopMargin}>Style du bouton</label>
                                    <div className={styles.controlGroup}>
                                        <button type="button" className={`${styles.controlBtn} ${formData.button_style === 'filled' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, button_style: 'filled' })}>Plein</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.button_style === 'outline' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, button_style: 'outline' })}>Contour</button>
                                        <button type="button" className={`${styles.controlBtn} ${formData.button_style === 'text' ? styles.selected : ''}`} onClick={() => setFormData({ ...formData, button_style: 'text' })}>Texte</button>
                                    </div>
                                </>
                            )}

                            <button type="submit" className={styles.saveBtn}>Enregistrer</button>
                        </form>
                    </div>

                    {/* Colonne du preview*/}
                    <div className={styles.previewColumn}>
                        <div className={styles.stickyPreview}>
                            <h4>Aperçu en direct</h4>
                            <div className={styles.previewWrapper}>
                                <div className={styles.previewCard} style={{
                                    backgroundColor: formData.couleur_principale,
                                    color: formData.couleur_texte,
                                    fontFamily: formData.font,
                                    textAlign: formData.text_align as any,
                                    ...patterns[formData.motif]?.style,
                                    height: formData.format === 'PLEINE_PAGE' ? '600px' : 'auto'
                                }}>
                                    {/* Opacité */}
                                    <div className={styles.previewOverlay} style={{
                                        backgroundColor: `rgba(255,255,255,${formData.opacity})`,
                                    }}></div>

                                    {/* Bannière */}
                                    <div className={styles.previewBanner} style={{
                                        backgroundImage: formData.image_url ? `url(${formData.image_url})` : 'none',
                                        backgroundColor: formData.couleur_secondaire,
                                        height: formData.format === 'BANNIERE' ? '100%' : (formData.format === 'PLEINE_PAGE' ? '200px' : '150px'),
                                        minHeight: formData.format === 'BANNIERE' ? '300px' : '150px',
                                        zIndex: 1
                                    }}>
                                        {!formData.image_url && <span className={styles.placeholderText}>Votre Image</span>}
                                    </div>

                                    {/* Contenu */}
                                    {formData.format !== 'BANNIERE' && (
                                        <div className={styles.previewContent}>
                                            <h2 className={styles.previewTitle} style={{ color: formData.couleur_secondaire }}>
                                                {formData.titre || 'Titre de l\'événement'}
                                            </h2>
                                            <p className={styles.previewDesc}>
                                                {formData.description || 'Description de votre événement...'}
                                            </p>

                                            {formData.plats_ids.length > 0 && (
                                                <div className={styles.previewMenu} style={{ borderColor: `${formData.couleur_texte}20` }}>
                                                    {Object.entries(selectedPlatsGrouped).map(([category, items]) => (
                                                        <div key={category} className={styles.previewMenuSection}>
                                                            <h5 style={{ color: formData.couleur_secondaire }}>{category}</h5>
                                                            <ul>
                                                                {items.map(p => (
                                                                    <li key={p.id}>{p.nom_plat}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <button className={styles.previewButton} style={{
                                                backgroundColor: formData.button_style === 'filled' ? formData.couleur_secondaire : 'transparent',
                                                color: formData.button_style === 'filled' ? '#fff' : formData.couleur_secondaire,
                                                border: formData.button_style === 'outline' ? `2px solid ${formData.couleur_secondaire}` : 'none',
                                                textDecoration: formData.button_style === 'text' ? 'underline' : 'none',
                                                alignSelf: formData.text_align === 'center' ? 'center' : (formData.text_align === 'right' ? 'flex-end' : 'flex-start')
                                            }}>
                                                Réserver
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Vos Événements</h3>
                <button onClick={handleCreate} className={styles.addBtn}>+ Nouvel Événement</button>
            </div>

            <div className={styles.grid}>
                {events.map(event => (
                    <div key={event.id} className={`${styles.card} ${!event.actif ? styles.inactive : ''}`}>
                        <div className={styles.cardImage} style={{
                            backgroundImage: event.image_url ? `url(${event.image_url})` : 'none',
                            backgroundColor: event.couleur_secondaire || '#ddd'
                        }} />
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <span className={styles.badge} style={{ backgroundColor: event.couleur_secondaire || '#f4a261' }}>
                                    {event.type}
                                </span>
                                <span className={`${styles.statusDot} ${event.actif ? styles.statusDotActive : ''}`}></span>
                            </div>
                            <h4>{event.titre}</h4>
                            <p className={styles.date}>
                                {new Date(event.date_debut).toLocaleDateString()} - {new Date(event.date_fin).toLocaleDateString()}
                            </p>
                            <div className={styles.cardActions}>
                                <button onClick={() => handleEdit(event)} className={styles.editBtn}>Modifier</button>
                                <button onClick={() => event.id !== null && event.id !== undefined ? handleDeleteClick(event.id) : null} className={styles.deleteBtn}>Supprimer</button>
                            </div>
                        </div>
                    </div>
                ))}
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
        </div >
    );
};

export default EventsGestion;
