import React, { useState, useEffect } from 'react';
import { FaPen } from 'react-icons/fa';
import styles from './MenuGestion.module.css';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../services/api';
import BACKEND_URL from '../../config';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';

import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { tplat, tingredient, tallergene, tcategorieplat, tplat_ingredient, tplat_allergene, tplat_format } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

registerPlugin(FilePondPluginImagePreview);

interface Ingredient extends tingredient {
    cout_unitaire: any;
    seuil_alerte: any;
    stock_actuel: any;
    [key: string]: any;
}

interface Allergene extends tallergene {}

interface Categorie extends tcategorieplat {}

interface PlatIngredient extends tplat_ingredient {
    tingredient?: Ingredient;
}

interface PlatAllergene extends tplat_allergene {
    tallergene: Allergene;
}

interface PlatFormat extends tplat_format {}

interface Plat extends tplat {
    tplat_ingredient: PlatIngredient[];
    tplat_allergene: PlatAllergene[];
    tplat_format?: PlatFormat[];
    cout_revient?: number;
    marge_brute?: number;
    ratio_food_cost?: number;
    prix_suggere?: number;
    [key: string]: any;
}

interface PlatFormState {
    nom_plat: string;
    nom_plat_en: string;
    nom_plat_nl: string;
    description_plat: string;
    description_plat_en: string;
    description_plat_nl: string;
    prix: string | number;
    categorie_id: string | number;
    image_url: string;
    ingredients: { ingredient_id: number; qt_utilisee: number | string }[];
    allergenes: number[];
    cuisson_possible: boolean;
    vegan: boolean;
    vegetarien: boolean;
    formats: { nom: string; prix: number | string }[];
}

interface IngredientFormState {
    nom_ingredient: string;
    stock_actuel: number;
    unite_ingredient: string;
    seuil_alerte: number;
    cout_unitaire: number;
}

interface CategorySectionProps {
    category: Categorie;
    allCategories: Categorie[];
    allPlats: Plat[];
    onDelete: (id: number) => void;
    onEdit: (plat: Plat) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, allCategories, allPlats, onDelete, onEdit }) => {
    const categoryPlats = allPlats.filter(p => Number(p.categorie_id) === category.id);
    const subCategories = allCategories.filter(c => c.parent_id === category.id);

    if (categoryPlats.length === 0 && subCategories.length === 0) return null;

    const getImageUrl = (url: string | null | undefined) => {
        if (!url) return '/placeholder-food.jpg';
        if (url.startsWith('http')) return url;
        return `${BACKEND_URL}${url}`;
    };

    return (
        <div className={styles.categorySection}>
            <h3 className={styles.categoryTitle}>{category.nom_categorie}</h3>

            {categoryPlats.length > 0 && (
                <div className={styles.gridPlats}>
                    {categoryPlats.map(plat => (
                        <div key={plat.id} className={styles.cardPlat}>
                            <div className={styles.platImage} style={{ backgroundImage: `url(${getImageUrl(plat.image_url)})` }} />
                            <div className={styles.platInfo}>
                                <h4>{plat.nom_plat}</h4>
                                <p className={styles.prix}>{Number(plat.prix_plat)} €</p>
                                {plat.tplat_format && plat.tplat_format.length > 0 && (
                                    <div className={styles.ingredientsListSmall} style={{ marginTop: '-5px', marginBottom: '10px' }}>
                                        <small style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Formats: {plat.tplat_format.map(f => `${f.nom_format} (${Number(f.prix)}€)`).join(' | ')}</small>
                                    </div>
                                )}
                                <p className={styles.desc}>{plat.description_plat}</p>

                                {plat.ratio_food_cost !== undefined && (
                                    <div className={styles.kpiContainer}>
                                        <div className={styles.kpiItem}>
                                            <span className={styles.kpiLabel}>Food Cost</span>
                                            <span className={plat.ratio_food_cost && Number(plat.ratio_food_cost) > 35 ? styles.textRed : styles.textGreen}>
                                                {Number(plat.ratio_food_cost)}%
                                            </span>
                                        </div>
                                        {plat.prix_suggere && (
                                            <div className={styles.kpiItem}>
                                                <span className={styles.kpiLabel}>Prix Suggéré</span>
                                                <span className={styles.suggestedPrice} title="Prix pour 30% de Food Cost">
                                                    {plat.prix_suggere} €
                                                </span>
                                            </div>
                                        )}
                                        {plat.marge_brute !== undefined && (
                                            <div className={styles.kpiItem}>
                                                <span className={styles.kpiLabel}>Marge</span>
                                                <span>{plat.marge_brute} €</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {plat.tplat_ingredient && plat.tplat_ingredient.length > 0 && (
                                    <div className={styles.ingredientsListSmall}>
                                        <small>Ingrédients: {plat.tplat_ingredient.map(pi => pi.tingredient?.nom_ingredient).join(', ')}</small>
                                    </div>
                                )}

                                <div className={styles.badges}>
                                    {plat.tplat_allergene && plat.tplat_allergene.map(ap => (
                                        <span key={ap.tallergene.id} className={styles.badgeAllergene}>{ap.tallergene.nom}</span>
                                    ))}
                                </div>
                                <div className={styles.cardActions}>
                                    <Button onClick={() => onEdit(plat)} variant="secondary" className={styles.flex1}>Modifier</Button>
                                    <Button onClick={() => onDelete(plat.id)} variant="danger" className={styles.flex1}>Supprimer</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {subCategories.length > 0 && (
                <div className={styles.subCategories}>
                    {subCategories.map(sub => (
                        <CategorySection
                            key={sub.id}
                            category={sub}
                            allCategories={allCategories}
                            allPlats={allPlats}
                            onDelete={onDelete}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const MenuGestion: React.FC = () => {
    const { t } = useLanguage();
    const [plats, setPlats] = useState<Plat[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [allergenes, setAllergenes] = useState<Allergene[]>([]);
    const [categories, setCategories] = useState<Categorie[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('liste');

    const [editingPlatId, setEditingPlatId] = useState<number | null>(null);

    // États pour le formulaire d'ajout de plat
    const [nouveauPlat, setNouveauPlat] = useState<PlatFormState>({
        nom_plat: '',
        nom_plat_en: '',
        nom_plat_nl: '',
        description_plat: '',
        description_plat_en: '',
        description_plat_nl: '',
        prix: '',
        categorie_id: '',
        image_url: '',
        ingredients: [],
        allergenes: [],
        cuisson_possible: false,
        vegan: false,
        vegetarien: false,
        formats: []
    });
    const [files, setFiles] = useState<any[]>([]);

    const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);

    const [nouvelIngredient, setNouvelIngredient] = useState<IngredientFormState>({
        nom_ingredient: '',
        stock_actuel: 0,
        unite_ingredient: 'kg',
        seuil_alerte: 5,
        cout_unitaire: 0
    });

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });
    const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; value: string; onConfirm: ((val: string) => void) | null; placeholder: string }>({ isOpen: false, title: '', value: '', onConfirm: null, placeholder: '' });

    const closeModal = () => setModal({ ...modal, isOpen: false });
    const closePromptModal = () => setPromptModal({ ...promptModal, isOpen: false, value: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [platsData, ingData, allData, catData] = await Promise.all([
                api.get('/plats'),
                api.get('/ingredients'),
                api.get('/allergenes'),
                api.get('/categories')
            ]);

            setPlats((platsData as Plat[]) || []);
            setIngredients((ingData as Ingredient[]) || []);
            setAllergenes((allData as Allergene[]) || []);
            setCategories((catData as Categorie[]) || []);
        } catch (error) {
            console.error("Erreur chargement données", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlatChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setNouveauPlat(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleIngredient = (id: number) => {
        setNouveauPlat(prev => {
            const exists = prev.ingredients.find(i => i.ingredient_id === id);
            let newIngs;
            if (exists) {
                newIngs = prev.ingredients.filter(i => i.ingredient_id !== id);
            } else {
                newIngs = [...prev.ingredients, { ingredient_id: id, qt_utilisee: 0 }];
            }
            return { ...prev, ingredients: newIngs };
        });
    };

    const toggleAllergene = (id: number) => {
        setNouveauPlat(prev => {
            const newAlls = prev.allergenes.includes(id)
                ? prev.allergenes.filter(a => a !== id)
                : [...prev.allergenes, id];
            return { ...prev, allergenes: newAlls };
        });
    };

    const handleAutoTranslate = async () => {
        if (!nouveauPlat.nom_plat && !nouveauPlat.description_plat) {
            toast.error(t('toast.menu.fill_fr'));
            return;
        }

        const toastId = toast.loading(t('toast.menu.translating'));

        try {
            let nomEn = nouveauPlat.nom_plat_en;
            let descEn = nouveauPlat.description_plat_en;
            let nomNl = nouveauPlat.nom_plat_nl;
            let descNl = nouveauPlat.description_plat_nl;
            // Traduction en
            if (nouveauPlat.nom_plat && !nomEn) {
                const res = await api.post('/translate', { text: nouveauPlat.nom_plat, source: 'fr', target: 'en' });
                if (res && res.translation) nomEn = res.translation;
            }

            if (nouveauPlat.description_plat && !descEn) {
                const res = await api.post('/translate', { text: nouveauPlat.description_plat, source: 'fr', target: 'en' });
                if (res && res.translation) descEn = res.translation;
            }

            // Traduction NL
            if (nouveauPlat.nom_plat && !nomNl) {
                const res = await api.post('/translate', { text: nouveauPlat.nom_plat, source: 'fr', target: 'nl' });
                if (res && res.translation) nomNl = res.translation;
            }

            if (nouveauPlat.description_plat && !descNl) {
                const res = await api.post('/translate', { text: nouveauPlat.description_plat, source: 'fr', target: 'nl' });
                if (res && res.translation) descNl = res.translation;
            }

            setNouveauPlat(prev => ({
                ...prev,
                nom_plat_en: nomEn,
                description_plat_en: descEn,
                nom_plat_nl: nomNl,
                description_plat_nl: descNl
            }));

            toast.success(t('toast.menu.translate_success'), { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(t('toast.menu.translate_error'), { id: toastId });
        }
    };

    const submitPlat = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = editingPlatId
                ? `/plats/${editingPlatId}`
                : '/plats';

            const method = editingPlatId ? 'PUT' : 'POST';

            const formData = new FormData();
            formData.append('nom', nouveauPlat.nom_plat);
            formData.append('nom_plat_en', nouveauPlat.nom_plat_en);
            formData.append('nom_plat_nl', nouveauPlat.nom_plat_nl);
            formData.append('description', nouveauPlat.description_plat);
            formData.append('description_plat_en', nouveauPlat.description_plat_en);
            formData.append('description_plat_nl', nouveauPlat.description_plat_nl);
            formData.append('prix', String(nouveauPlat.prix));
            formData.append('categorie_id', String(nouveauPlat.categorie_id));
            formData.append('disponible', 'true');
            formData.append('cuisson_possible', String(nouveauPlat.cuisson_possible));
            formData.append('vegan', String(nouveauPlat.vegan));
            formData.append('vegetarien', String(nouveauPlat.vegetarien));
            formData.append('ingredients', JSON.stringify(nouveauPlat.ingredients));
            formData.append('allergenes', JSON.stringify(nouveauPlat.allergenes));
            formData.append('formats', JSON.stringify(nouveauPlat.formats));

            if (files.length > 0) {
                formData.append('image', files[0].file);
            }

            await api.upload(endpoint, formData, method);

            toast.success(editingPlatId ? t('toast.menu.dish_updated') : t('toast.menu.dish_added'));
            setNouveauPlat({
                nom_plat: '', nom_plat_en: '', nom_plat_nl: '', description_plat: '', description_plat_en: '', description_plat_nl: '', prix: '', categorie_id: '',
                image_url: '', ingredients: [], allergenes: [], cuisson_possible: false,
                vegan: false, vegetarien: false, formats: []
            });
            setFiles([]);
            setEditingPlatId(null);
            fetchData();
            setActiveTab('liste');

        } catch (error) {
            console.error(error);
            toast.error(t('toast.menu.operation_error'));
        }
    };

    const submitIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = editingIngredientId
                ? `/ingredients/${editingIngredientId}`
                : '/ingredients';

            if (editingIngredientId) {
                await api.put(endpoint, nouvelIngredient);
            } else {
                await api.post(endpoint, nouvelIngredient);
            }

            toast.success(editingIngredientId ? t('toast.menu.ingredient_updated') : t('toast.menu.ingredient_added'));
            setNouvelIngredient({ nom_ingredient: '', stock_actuel: 0, unite_ingredient: 'kg', seuil_alerte: 5, cout_unitaire: 0 });
            setEditingIngredientId(null);
            fetchData();

        } catch (error) {
            console.error(error);
        }
    };

    const deletePlatClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Supprimer ce plat ?',
            onConfirm: () => deletePlat(id)
        });
    };

    const deletePlat = async (id: number) => {
        try {
            await api.delete(`/plats/${id}`);
            toast.success(t('toast.menu.dish_deleted'));
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(t('toast.menu.delete_error'));
        }
        closeModal();
    };

    const handleAddCategory = () => {
        setPromptModal({
            isOpen: true,
            title: 'Nouvelle catégorie',
            placeholder: 'Nom de la catégorie',
            value: '',
            onConfirm: (nom) => {
                if (!nom) return;
                closePromptModal();
                setTimeout(() => {
                    setPromptModal({
                        isOpen: true,
                        title: 'Catégorie parente (optionnel)',
                        placeholder: 'Nom de la catégorie parente (laisser vide si aucune)',
                        value: '',
                        onConfirm: (parentName) => createCategory(nom, parentName)
                    });
                }, 100);
            }
        });
    };

    const createCategory = async (nom: string, parentName: string) => {
        closePromptModal();
        let parentId: number | null = null;

        if (parentName) {
            const parent = categories.find(c => c.nom_categorie.toLowerCase() === parentName.toLowerCase());
            if (parent) {
                parentId = parent.id;
            } else {
                toast.error(t('toast.menu.parent_category_not_found', { parentName }));
            }
        }

        try {
            const newCat = await api.post('/categories', { nom_categorie: nom, parent_id: parentId });
            if (newCat) {
                setCategories([...categories, newCat]);
                setNouveauPlat(prev => ({ ...prev, categorie_id: newCat.id }));
                toast.success(t('toast.menu.category_created'));
            }
        } catch (err) {
            console.error(err);
            toast.error(t('toast.menu.category_create_error'));
        }
    };

    if (loading) return <p>Chargement du menu...</p>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Gestion du Menu</h2>
                <p className="page-subtitle">Créez et modifiez les plats de votre carte.</p>
            </div>

            <div className={styles.tabs}>
                <Button
                    onClick={() => setActiveTab('liste')}
                    variant={activeTab === 'liste' ? 'primary' : 'outline'}
                >
                    Liste des plats
                </Button>
                <Button
                    onClick={() => setActiveTab('ajout')}
                    variant={activeTab === 'ajout' ? 'primary' : 'outline'}
                >
                    Ajouter un plat
                </Button>
                <Button
                    onClick={() => setActiveTab('ingredients')}
                    variant={activeTab === 'ingredients' ? 'primary' : 'outline'}
                >
                    Ingrédients & Stocks
                </Button>
            </div>

            <div className={styles.content}>
                {activeTab === 'liste' && (
                    <div className={styles.menuHierarchy}>
                        {/* Affiche les catégories et les plats */}
                        {categories
                            .filter(c => !c.parent_id) // Filtre les catégories sans parent
                            // Trie les catégories par défaut (Entrées, Plats, Desserts, Boissons)
                            .sort((a, b) => {
                                const order = ['Entrées', 'Plats', 'Desserts', 'Boissons'];
                                // Trouve l'index de la catégorie dans l'ordre défini
                                const indexA = order.indexOf(a.nom_categorie);
                                const indexB = order.indexOf(b.nom_categorie);
                                if (indexA !== -1 && indexB !== -1) return indexA - indexB; 
                                if (indexA !== -1) return -1;
                                if (indexB !== -1) return 1;
                                return a.nom_categorie.localeCompare(b.nom_categorie);
                            })
                            .map(category => (
                                <CategorySection
                                    key={category.id}
                                    category={category}
                                    allCategories={categories}
                                    allPlats={plats}
                                    onDelete={deletePlatClick}
                                    onEdit={(plat) => {
                                        setNouveauPlat({
                                            nom_plat: plat.nom_plat,
                                            nom_plat_en: plat.nom_plat_en || '',
                                            nom_plat_nl: plat.nom_plat_nl || '',
                                            description_plat: plat.description_plat || '',
                                            description_plat_en: plat.description_plat_en || '',
                                            description_plat_nl: plat.description_plat_nl || '',
                                            prix: Number(plat.prix_plat),
                                            categorie_id: plat.categorie_id,
                                            image_url: plat.image_url || '',
                                            ingredients: plat.tplat_ingredient.map(pi => ({
                                                ingredient_id: pi.ingredient_id,
                                                qt_utilisee: Number(pi.qt_utilisee)
                                            })),
                                            allergenes: plat.tplat_allergene.map(pa => pa.allergene_id),
                                            cuisson_possible: plat.peut_choisir_cuisson || false,
                                            vegan: plat.vegan || false,
                                            vegetarien: plat.vegetarien || false,
                                            formats: plat.tplat_format ? plat.tplat_format.map(f => ({ nom: f.nom_format, prix: Number(f.prix) })) : []
                                        });
                                        setFiles([]);
                                        setEditingPlatId(plat.id);
                                        setActiveTab('ajout');
                                    }}
                                />
                            ))}
                    </div>
                )}

                {activeTab === 'ajout' && (
                    <form onSubmit={submitPlat} className={styles.formAjout}>
                        <h3>{editingPlatId ? 'Modifier le Plat' : 'Nouveau Plat'}</h3>

                        <Input
                            label="Nom du plat"
                            name="nom_plat"
                            value={nouveauPlat.nom_plat}
                            onChange={handlePlatChange}
                            required
                        />

                        <Input
                            label="Nom du plat (EN)"
                            name="nom_plat_en"
                            value={nouveauPlat.nom_plat_en}
                            onChange={handlePlatChange}
                            placeholder="Traduction anglaise"
                        />
                        <Input
                            label="Nom du plat (NL)"
                            name="nom_plat_nl"
                            value={nouveauPlat.nom_plat_nl}
                            onChange={handlePlatChange}
                            placeholder="Traduction néerlandaise"
                        />

                        <div className={styles.row}>
                            <Input
                                label="Prix (€)"
                                type="number"
                                step="0.01"
                                name="prix"
                                value={nouveauPlat.prix}
                                onChange={handlePlatChange}
                                required
                            />

                            <div className={styles.selectGroup}>
                                <label>Catégorie</label>
                                <div className={styles.selectWrapper}>
                                    <select
                                        name="categorie_id"
                                        value={nouveauPlat.categorie_id}
                                        onChange={handlePlatChange}
                                        required
                                        className={`${styles.select} ${styles.flex1}`}
                                    >
                                        <option value="">Choisir...</option>
                                        {categories
                                            .filter(c => !c.parent_id)
                                            .map(parent => (
                                                <React.Fragment key={parent.id}>
                                                    <option value={parent.id} className={styles.boldOption}>{parent.nom_categorie}</option>
                                                    {categories
                                                        .filter(child => child.parent_id === parent.id)
                                                        .map(child => (
                                                            <option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;↳ {child.nom_categorie}</option>
                                                        ))
                                                    }
                                                </React.Fragment>
                                            ))}
                                    </select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddCategory}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.section} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
                            <h4>Formats de prix (Optionnel)</h4>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                                Ajoutez des formats pour décliner ce plat (ex: "Entrée" à 12€, "Plat" à 18€). S'ils sont définis, le client devra choisir un format.
                            </p>
                            {nouveauPlat.formats.map((format, index) => (
                                <div key={index} className={styles.ingredientRow} style={{ marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Nom du format (ex: Entrée)"
                                        value={format.nom}
                                        onChange={(e) => {
                                            const newFormats = [...nouveauPlat.formats];
                                            newFormats[index].nom = e.target.value;
                                            setNouveauPlat(prev => ({ ...prev, formats: newFormats }));
                                        }}
                                        style={{ flex: 2 }}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Prix (€)"
                                        value={format.prix}
                                        onChange={(e) => {
                                            const newFormats = [...nouveauPlat.formats];
                                            newFormats[index].prix = e.target.value;
                                            setNouveauPlat(prev => ({ ...prev, formats: newFormats }));
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={() => {
                                            const newFormats = [...nouveauPlat.formats];
                                            newFormats.splice(index, 1);
                                            setNouveauPlat(prev => ({ ...prev, formats: newFormats }));
                                        }}
                                    >
                                        X
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setNouveauPlat(prev => ({ ...prev, formats: [...prev.formats, { nom: '', prix: '' }] }));
                                }}
                            >
                                + Ajouter un format
                            </Button>
                        </div>

                        <div className={styles.marginBottom}>
                            <label className={styles.label}>Image du plat</label>
                            <FilePond
                                files={files}
                                onupdatefiles={setFiles}
                                allowMultiple={false}
                                maxFiles={1}
                                name="image"
                                labelIdle='Glissez & déposez votre image ou <span class="filepond--label-action">Parcourir</span>'
                            />
                        </div>

                        <label className={styles.label}>Description</label>
                        <textarea
                            name="description_plat"
                            value={nouveauPlat.description_plat}
                            onChange={handlePlatChange}
                            className={styles.textarea}
                            rows={3}
                        />

                        <div className={styles.translationRow}>
                            <label className={`${styles.label} ${styles.noMarginBottom}`}>Description (EN)</label>
                            <Button type="button" variant="outline" onClick={handleAutoTranslate} className={styles.btnTranslate}>
                                ✨ Traduction Auto
                            </Button>
                        </div>
                        <textarea
                            name="description_plat_en"
                            value={nouveauPlat.description_plat_en}
                            onChange={handlePlatChange}
                            className={styles.textarea}
                            rows={3}
                            placeholder="English description"
                        />
                        <div className={styles.translationRow} style={{ marginTop: '10px' }}>
                            <label className={`${styles.label} ${styles.noMarginBottom}`}>Description (NL)</label>
                        </div>
                        <textarea
                            name="description_plat_nl"
                            value={nouveauPlat.description_plat_nl}
                            onChange={handlePlatChange}
                            className={styles.textarea}
                            rows={3}
                            placeholder="Nederlandse beschrijving"
                        />

                        <div className={`${styles.checkboxRow} ${styles.checkboxGroup}`}>
                            <label>
                                <input
                                    type="checkbox"
                                    name="cuisson_possible"
                                    checked={nouveauPlat.cuisson_possible}
                                    onChange={handlePlatChange}
                                />
                                Cuisson (Bleu, Saignant...)
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="vegan"
                                    checked={nouveauPlat.vegan}
                                    onChange={handlePlatChange}
                                />
                                Vegan
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="vegetarien"
                                    checked={nouveauPlat.vegetarien}
                                    onChange={handlePlatChange}
                                />
                                Végétarien
                            </label>
                        </div>

                        <div className={styles.section}>
                            <h4>Ingrédients & Quantités</h4>
                            <div className={`${styles.tagsGrid} ${styles.marginBottom}`}>
                                {ingredients.map(ing => {
                                    const isSelected = nouveauPlat.ingredients.some(i => i.ingredient_id === ing.id);
                                    return (
                                        <div
                                            key={ing.id}
                                            className={`${styles.tag} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => toggleIngredient(ing.id)}
                                        >
                                            {ing.nom_ingredient}
                                        </div>
                                    );
                                })}
                            </div>

                            {nouveauPlat.ingredients.length > 0 && (
                                <div className={styles.ingredientsList}>
                                    {nouveauPlat.ingredients.map((item, index) => {
                                        const ingDetails = ingredients.find(i => i.id === item.ingredient_id);
                                        return (
                                            <div key={item.ingredient_id} className={styles.ingredientRow}>
                                                <label>{ingDetails?.nom_ingredient} ({ingDetails?.unite_ingredient})</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.qt_utilisee}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNouveauPlat(prev => {
                                                            const newIngs = [...prev.ingredients];
                                                            newIngs[index] = { ...newIngs[index], qt_utilisee: val };
                                                            return { ...prev, ingredients: newIngs };
                                                        });
                                                    }}
                                                    placeholder="Qté"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className={styles.section}>
                            <h4>Allergènes</h4>
                            <div className={styles.tagsGrid}>
                                {allergenes.map(all => (
                                    <div
                                        key={all.id}
                                        className={`${styles.tag} ${nouveauPlat.allergenes.includes(all.id) ? styles.selected : ''}`}
                                        onClick={() => toggleAllergene(all.id)}
                                    >
                                        {all.nom}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.buttonsRow}>
                            <Button type="submit" variant="primary" className={styles.submitBtn}>
                                {editingPlatId ? 'Mettre à jour le plat' : 'Créer le plat'}
                            </Button>
                            {editingPlatId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={styles.submitBtn}
                                    onClick={() => {
                                        setEditingPlatId(null);
                                        setEditingPlatId(null);
                                        setNouveauPlat({
                                            nom_plat: '', nom_plat_en: '', nom_plat_nl: '', description_plat: '', description_plat_en: '', description_plat_nl: '', prix: '', categorie_id: '',
                                            image_url: '', ingredients: [], allergenes: [], cuisson_possible: false,
                                            vegan: false, vegetarien: false, formats: []
                                        });
                                        setFiles([]);
                                        setActiveTab('liste');
                                    }}
                                >
                                    Annuler
                                </Button>
                            )}
                        </div>
                    </form>
                )}

                {activeTab === 'ingredients' && (
                    <div className={styles.ingredientsManager}>
                        <div className={styles.listIngredients}>
                            <h3>Stock Ingrédients</h3>
                            <ul>
                                {ingredients.map(ing => (
                                    <li key={ing.id} className={Number(ing.stock_actuel) < Number(ing.seuil_alerte) ? styles.lowStock : ''}>
                                        <div className={styles.ingredientHeader}>
                                            <span>{ing.nom_ingredient}</span>
                                            <strong>{Number(ing.stock_actuel)} {ing.unite_ingredient}</strong>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setNouvelIngredient({
                                            nom_ingredient: ing.nom_ingredient,
                                            stock_actuel: Number(ing.stock_actuel),
                                            unite_ingredient: ing.unite_ingredient,
                                            seuil_alerte: Number(ing.seuil_alerte),
                                            cout_unitaire: Number(ing.cout_unitaire || 0)
                                        });
                                                setEditingIngredientId(ing.id);
                                            }}
                                        >
                                            <FaPen />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <form onSubmit={submitIngredient} className={styles.formIngredient}>
                            <h3>{editingIngredientId ? 'Modifier l\'ingrédient' : 'Ajouter un ingrédient'}</h3>
                            <Input
                                label="Nom"
                                name="nom_ingredient"
                                value={nouvelIngredient.nom_ingredient}
                                onChange={e => setNouvelIngredient({ ...nouvelIngredient, nom_ingredient: e.target.value })}
                                required
                            />

                            <div className={styles.row}>
                                <Input
                                    label="Stock initial"
                                    type="number"
                                    name="stock_actuel"
                                    value={nouvelIngredient.stock_actuel}
                                    onChange={(e) => setNouvelIngredient(prev => ({ ...prev, stock_actuel: parseFloat(e.target.value) }))}
                                    required
                                />

                                <Input
                                    label="Unité (kg, L, pièce...)"
                                    name="unite_ingredient"
                                    value={nouvelIngredient.unite_ingredient}
                                    onChange={(e) => setNouvelIngredient(prev => ({ ...prev, unite_ingredient: e.target.value }))}
                                    required
                                />
                            </div>

                            <Input
                                label="Seuil d'alerte"
                                type="number"
                                name="seuil_alerte"
                                value={nouvelIngredient.seuil_alerte}
                                onChange={e => setNouvelIngredient({ ...nouvelIngredient, seuil_alerte: Number(e.target.value) })}
                            />
                            
                            <Input
                                label="Coût unitaire (€)"
                                type="number"
                                step="0.001"
                                name="cout_unitaire"
                                value={nouvelIngredient.cout_unitaire}
                                onChange={e => setNouvelIngredient({ ...nouvelIngredient, cout_unitaire: Number(e.target.value) })}
                            />

                            <div className={styles.buttonsRow}>
                                <Button type="submit" variant="secondary" className={styles.flex1}>
                                    {editingIngredientId ? 'Mettre à jour' : 'Ajouter au stock'}
                                </Button>
                                {editingIngredientId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setEditingIngredientId(null);
                                            setNouvelIngredient({ nom_ingredient: '', stock_actuel: 0, unite_ingredient: 'kg', seuil_alerte: 5, cout_unitaire: 0 });
                                        }}
                                    >
                                        Annuler
                                    </Button>
                                )}
                            </div>
                        </form>
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
                footer={
                    <>
                        <Button variant="outline" onClick={closePromptModal}>Annuler</Button>
                        <Button variant="primary" onClick={() => promptModal.onConfirm && promptModal.onConfirm(promptModal.value)}>Valider</Button>
                    </>
                }
            >
                <Input
                    name="promptValue"
                    value={promptModal.value}
                    onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                    placeholder={promptModal.placeholder}
                />
            </Modal>
        </div >
    );
};

export default MenuGestion;
