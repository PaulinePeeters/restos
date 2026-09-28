import React, { useEffect, useState } from 'react';
import { FaLeaf, FaCarrot } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from './Menu.module.css';
import api from '../services/api';
import BACKEND_URL from '../config';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { ThemeContext } from '../components/ThemeManager';

import { tplat, tallergene, tplat_allergene, tplat_format } from '../types/prisma-types';

interface PlatFormat extends Omit<tplat_format, 'prix'> {
    prix: string | number;
    [key: string]: any;
}

interface Allergene extends tallergene {
    [key: string]: any;
}

interface Plat extends Omit<tplat, 'prix_plat' | 'nom_plat_en' | 'nom_plat_nl' | 'description_plat_en' | 'description_plat_nl' | 'categorie_id' | 'disponible' | 'description_plat' | 'tplat_format' | 'nom_plat'> {
    nom_plat: string;
    prix: string | number; 
    prix_plat?: number; 
    categorieService: 'CUISINE' | 'BAR';
    nom_plat_en?: string | null;
    nom_plat_nl?: string | null;
    description?: string;
    description_plat?: string | null;
    description_plat_en?: string | null;
    description_plat_nl?: string | null;
    categorie_id?: number;
    disponible?: boolean; 
    allergenes?: Allergene[];
    tplat_allergene?: tplat_allergene[];
    tplat_format?: PlatFormat[];
    [key: string]: any;
}

interface MenuSection {
    items: Plat[];
    subcats: Record<string, Plat[]>;
}

interface MenuData {
    [key: string]: Plat[] | MenuSection;
}

interface CartItem {
    cartId: string;
    id: number | string;
    nom_plat: string;
    prix_plat: number;
    quantite: number;
    cuisson: string | null;
    format: string | null;
    categorieService: string;
}

const staticMenu: any = {
    'Mise en bouche offerte': [
        {
            id: 'mise-en-bouche',
            nom: 'Velouté froid de petit pois, crème citronnée & tuile de parmesan',
            prix: 'Offert',
            prix_plat: 0,
            categorieService: 'CUISINE'
        },
    ],
};

const ALLERGEN_ICONS: Record<string, string> = {
    'Gluten': 'gluten.png',
    'Crustacés': 'crustaces.png',
    'Œufs': 'oeufs.png',
    'Poisson': 'poissons.png',
    'Poissons': 'poissons.png',
    'Arachides': 'arachides.png',
    'Soja': 'soja.png',
    'Lait': 'lait.png',
    'Fruits à coque': 'coque.png',
    'Céleri': 'celeri.png',
    'Moutarde': 'moutarde.png',
    'Sésame': 'sesame.png',
    'Sulfites': 'sulfites.png',
    'Lupin': 'lupin.png',
    'Mollusques': 'mollusques.png'
};

const Menu: React.FC = () => {
    const { t, language } = useLanguage();
    const [menuData, setMenuData] = useState<MenuData>(staticMenu);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [tableId, setTableId] = useState<string | null>(null);
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [allPlats, setAllPlats] = useState<Plat[]>([]);
    const [showCoversPrompt, setShowCoversPrompt] = useState(false);
    const [coversInput, setCoversInput] = useState('2');

    const themeContext = React.useContext(ThemeContext);
    const activeEvent = themeContext?.activeEvent;

    const toggleAllergen = (nom: string) => {
        setSelectedAllergens(prev =>
            prev.includes(nom) ? prev.filter(a => a !== nom) : [...prev, nom]
        );
    };

    // Récupération session et table
    useEffect(() => {
        // Lecture de l'URL pour le QR Code
        const params = new URLSearchParams(window.location.search);
        const urlTableId = params.get('table_id') || params.get('id');
        const storedTableId = localStorage.getItem('table_id');

        const tableIdToUse = urlTableId || storedTableId;

        if (tableIdToUse) {
            // Utiliser l'ID de l'URL ou celui stocké
            localStorage.setItem('table_id', tableIdToUse);
            setTableId(tableIdToUse);

            // Initialiser ou vérifier la session
            api.get(`/session/menu-access?table_id=${tableIdToUse}`)
                .then((res: any) => {
                    if (res.session_id) {
                        localStorage.setItem('session_id', res.session_id);
                        setSessionId(res.session_id);
                        if (res.numero_table) {
                            setTableId(res.numero_table);
                        }
                        if (res.isNew) {
                            setShowCoversPrompt(true);
                        }
                    } else {
                        toast.error(t('toast.menu.session_error'));
                    }
                })
                .catch(err => {
                    toast.error(t('toast.menu.table_access_error', { error: err.message }));
                });
        } else {
            // Pas de QR code et aucune session active en mémoire : nettoyer
            localStorage.removeItem('table_id');
            localStorage.removeItem('session_id');
            setTableId(null);
            setSessionId(null);
        }
    }, []);

    const socket = useSocket();

    const fetchData = React.useCallback(async () => {
        try {
            const [platsData, catsData] = await Promise.all([
                api.get('/plats'),
                api.get('/categories')
            ]);

            const catMap: Record<number, any> = {};
            (catsData as any[]).forEach(c => catMap[c.id] = c);

            const dynamicMenu: Record<string, MenuSection> = {
                Entrées: { items: [], subcats: {} },
                Plats: { items: [], subcats: {} },
                Desserts: { items: [], subcats: {} },
                'Menu Enfants': { items: [], subcats: {} },
                Boissons: { items: [], subcats: {} },
            };

            const formattedPlats: Plat[] = [];

            (platsData as any[]).forEach((plat) => {

                const catId = plat.categorie_id;
                let fullCat = catMap[catId];
                if (!fullCat) return;
                let currentCat = fullCat;
                let section = '';

                let depth = 0;
                while (currentCat && depth < 10) {
                    const name = currentCat.nom_categorie.toLowerCase();
                    if (name.includes('entrée')) { section = 'Entrées'; break; }
                    if (name.includes('plat')) { section = 'Plats'; break; }
                    if (name.includes('dessert')) { section = 'Desserts'; break; }
                    if (name.includes('enfant')) { section = 'Menu Enfants'; break; }
                    if (name.includes('boisson')) { section = 'Boissons'; break; }

                    if (currentCat.parent_id) {
                        currentCat = catMap[currentCat.parent_id];
                    } else {
                        break;
                    }
                    depth++;
                }

                const item: Plat = {
                    id: plat.id,
                    nom: plat.nom_plat,
                    nom_plat: plat.nom_plat,
                    description_plat: plat.description_plat,
                    disponible: plat.disponible ?? true,
                    categorie_id: plat.categorie_id,
                    nom_plat_en: plat.nom_plat_en,
                    nom_plat_nl: plat.nom_plat_nl,
                    description: plat.description_plat,
                    description_plat_en: plat.description_plat_en,
                    description_plat_nl: plat.description_plat_nl,
                    prix: `${parseFloat(plat.prix_plat).toFixed(2)}€`,
                    prix_plat: parseFloat(plat.prix_plat),
                    peut_choisir_cuisson: plat.peut_choisir_cuisson,
                    max_servings: plat.max_servings,
                    vegan: plat.vegan,
                    vegetarien: plat.vegetarien,
                    image_url: plat.image_url,
                    allergenes: plat.tplat_allergene ? plat.tplat_allergene.map((a: any) => a.tallergene) : [],
                    tplat_format: plat.tplat_format || [],
                    categorieService: (section === 'Boissons' || section === 'Vins' || section === 'Cocktails') ? 'BAR' : 'CUISINE'
                };

                if (section && dynamicMenu[section]) {
                    if (fullCat.parent_id) {
                        const subName = fullCat.nom_categorie;
                        if (!dynamicMenu[section].subcats[subName]) {
                            dynamicMenu[section].subcats[subName] = [];
                        }
                        dynamicMenu[section].subcats[subName].push(item);
                    } else {
                        dynamicMenu[section].items.push(item);
                    }
                }
                formattedPlats.push(item);
            });

            setAllPlats(formattedPlats);

            setMenuData((prev) => ({
                ...prev,
                ...dynamicMenu,
            }));
            setLoading(false);
        } catch (err: any) {
            console.error('Erreur chargement :', err);
            setError(err.message);
            toast.error(t('toast.menu.load_error'));
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!socket) return;
        
        socket.on('menu_updated', () => {
            console.log('Menu mis à jour via Socket');
            fetchData();
        });

        return () => {
            socket.off('menu_updated');
        };
    }, [socket, fetchData]);

    const handleCoversSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const covers = parseInt(coversInput, 10);
        if (!isNaN(covers) && covers > 0) {
            try {
                await api.put('/session/couverts', { session_id: sessionId, nb_couverts: covers });
            } catch (err) {
                console.error('Erreur mise à jour couverts:', err);
            }
        }
        setShowCoversPrompt(false);
    };

    const [cuissonSelections, setCuissonSelections] = useState<Record<string, string>>({});

    const handleCuissonChange = (platId: number | string, value: string) => {
        setCuissonSelections(prev => ({
            ...prev,
            [platId]: value
        }));
    };

    //Fonction pour ajouter un plat au panier
    const addToCart = (plat: Plat, format: PlatFormat | null = null) => {
        if (plat.max_servings === 0) {
            toast.error(t('menu.not_available'));
            return;
        }

        try {
            let cuisson: string | null = null;
            if (plat.peut_choisir_cuisson) {
                cuisson = cuissonSelections[plat.id] || 'SAIGNANT';
            }

            const panier: CartItem[] = JSON.parse(localStorage.getItem('panier') || '[]');

            const price = format ? parseFloat(format.prix as string) : (plat.prix_plat || 0);
            const name = format ? `${plat.nom} (${format.nom_format})` : plat.nom;
            const formatName = format ? format.nom_format : null;

            const index = panier.findIndex((item) => item.id === plat.id && item.cuisson === cuisson && item.format === formatName);

            if (index !== -1) {
                panier[index].quantite += 1;
            } else {
                panier.push({
                    cartId: `${plat.id}-${Date.now()}`,
                    id: plat.id,
                    nom_plat: name,
                    prix_plat: price,
                    quantite: 1,
                    cuisson: cuisson,
                    format: formatName,
                    categorieService: plat.categorieService
                });
            }
            localStorage.setItem('panier', JSON.stringify(panier));
            console.log('Panier mis à jour : ', panier);
            window.dispatchEvent(new Event('panierMisAJour'));
            toast.success(t('toast.menu.item_added', { name }));
        } catch (error) {
            console.error('Erreur ajout panier', error);
        }
    };

    if (loading) return <p>Chargement du menu...</p>;
    if (error) return <p>Erreur : {error}</p>;

    return (
        <div className={styles['menu-container']}>
            <h1>{t('menu.title')}</h1>

            {tableId && sessionId && (
                <p className={styles['session-info']}>
                    {t('menu.table_info', { id: tableId })}
                </p>
            )}

            {/* Barre de filtres*/}
            <div className={styles.filterWrapper}>
                <button
                    onClick={() => {
                        const el = document.getElementById('allergen-bar');
                        if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
                    }}
                    className={styles.filterToggleBtn}
                >
                    {t('menu.filter_allergens') || 'Filtrer par Allergènes'}
                    {selectedAllergens.length > 0 && (
                        <span className={styles.filterCountBadge}>
                            {selectedAllergens.length}
                        </span>
                    )}
                </button>

                <div id="allergen-bar" className={styles.allergenBar}>
                    {Object.keys(ALLERGEN_ICONS).filter(k => k !== 'Poisson').map(nom => (
                        <button
                            key={nom}
                            onClick={() => toggleAllergen(nom)}
                            className={`${styles.allergenBtn} ${selectedAllergens.includes(nom) ? styles.allergenBtnSelected : ''}`}
                        >
                            {selectedAllergens.includes(nom) ? (
                                <span className={styles.closeIcon}>✕</span>
                            ) : (
                                <img src={`/assets/icons/${ALLERGEN_ICONS[nom]}`} alt="" className={styles.allergenIcon} />
                            )}
                            {nom}
                        </button>
                    ))}
                    <div className={styles.allergenNote}>
                        * Les plats contenant les allergènes sélectionnés seront grisés.
                    </div>
                </div>
            </div>

            {/* Section Evenement */}
            {activeEvent && (activeEvent.format === 'CARTE' || activeEvent.format === 'EVENEMENT' || activeEvent.type === 'EVENEMENT' || activeEvent.type === 'THEME') && activeEvent.tevenement_plat && activeEvent.tevenement_plat.length > 0 && (
                <section key="evenement-special" className={styles['menu-category']} style={{ backgroundColor: activeEvent.couleur_principale || '#fff', padding: '1.5rem', borderRadius: '15px', marginBottom: '2rem', border: `3px solid ${activeEvent.couleur_secondaire || '#e5e7eb'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h2 className={styles['category-title']} style={{ color: activeEvent.couleur_texte || '#000', textAlign: 'center', fontSize: '2.5rem', marginTop: 0 }}>{activeEvent.titre}</h2>
                    {activeEvent.description && <p style={{ color: activeEvent.couleur_texte || '#333', textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem', fontStyle: 'italic' }}>{activeEvent.description}</p>}
                    <ul className={styles['plats-list']}>
                        {allPlats
                            .filter(p => activeEvent.tevenement_plat.some((tp: any) => tp.plat_id === p.id))
                            .map(plat => (
                                <PlatItem key={`evt-${plat.id}`} plat={plat} addToCart={addToCart} cuissonSelections={cuissonSelections} handleCuissonChange={handleCuissonChange} section={activeEvent.titre} language={language} t={t} selectedAllergens={selectedAllergens} />
                            ))
                        }
                    </ul>
                </section>
            )}

            {Object.entries(menuData).map(([section, content]) => {
                if (Array.isArray(content)) {
                    return (
                        <section key={section} className={styles['menu-category']}>
                            <h2 className={styles['category-title']}>{section}</h2>
                            <ul className={styles['plats-list']}>
                                {content.map(plat => (
                                    <PlatItem key={plat.id || plat.nom} plat={plat} addToCart={addToCart} cuissonSelections={cuissonSelections} handleCuissonChange={handleCuissonChange} section={section} language={language} t={t} selectedAllergens={selectedAllergens} />
                                ))}
                            </ul>
                        </section>
                    );
                }
                const menuSection = content as MenuSection;
                return (
                    <section key={section} className={styles['menu-category']}>
                        <h2 className={styles['category-title']}>{section}</h2>

                        {menuSection.items && menuSection.items.length > 0 && (
                            <ul className={styles['plats-list']}>
                                {menuSection.items.map(plat => (
                                    <PlatItem key={plat.id} plat={plat} addToCart={addToCart} cuissonSelections={cuissonSelections} handleCuissonChange={handleCuissonChange} section={section} language={language} t={t} selectedAllergens={selectedAllergens} />
                                ))}
                            </ul>
                        )}

                        {menuSection.subcats && Object.entries(menuSection.subcats).map(([subName, subItems]) => (
                            <div key={subName} className={styles['sub-category']}>
                                <h3 className={styles['sub-category-title']}>{subName}</h3>
                                <ul className={styles['plats-list']}>
                                    {subItems.map(plat => (
                                        <PlatItem key={plat.id} plat={plat} addToCart={addToCart} cuissonSelections={cuissonSelections} handleCuissonChange={handleCuissonChange} section={section} language={language} t={t} selectedAllergens={selectedAllergens} />
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </section>
                );
            })}
            {/* Fenetre pour ajuster le nombre de couverts*/}
            {showCoversPrompt && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 10000
                }}>
                    <div style={{
                        background: '#1a1a1a', padding: '30px', borderRadius: '15px',
                        textAlign: 'center', color: '#fff', maxWidth: '90%', width: '350px',
                        border: '1px solid #c9a77c', position: 'relative'
                    }}>
                        <button 
                            onClick={() => setShowCoversPrompt(false)}
                            style={{
                                position: 'absolute', top: '10px', right: '15px',
                                background: 'transparent', border: 'none', color: '#888',
                                fontSize: '1.5rem', cursor: 'pointer'
                            }}
                            title="Fermer"
                        >
                            &times;
                        </button>
                        <h2 style={{ color: '#c9a77c', marginBottom: '20px' }}>Bienvenue !</h2>
                        <p style={{ marginBottom: '20px' }}>Combien de convives êtes-vous à cette table ?</p>
                        <form onSubmit={handleCoversSubmit}>
                            <input 
                                type="number" 
                                min="1" 
                                max="20"
                                value={coversInput}
                                onChange={(e) => setCoversInput(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', fontSize: '1.2rem',
                                    borderRadius: '8px', border: 'none', textAlign: 'center',
                                    marginBottom: '20px'
                                }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                <button type="submit" style={{
                                    width: '100%', padding: '12px', background: '#c9a77c',
                                    color: '#1a1a1a', border: 'none', borderRadius: '8px',
                                    fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
                                }}>
                                    Valider
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCoversPrompt(false)}
                                    style={{
                                        width: '100%', padding: '12px', background: 'transparent',
                                        color: '#c9a77c', border: '1px solid #c9a77c', borderRadius: '8px',
                                        fontSize: '1rem', cursor: 'pointer'
                                    }}>
                                    Juste consulter le menu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

interface PlatItemProps {
    plat: Plat;
    addToCart: (plat: Plat, format: PlatFormat | null) => void;
    cuissonSelections: Record<string, string>;
    handleCuissonChange: (id: number | string, val: string) => void;
    section: string;
    language: string;
    t: (key: string) => string;
    selectedAllergens?: string[];
}

const PlatItem: React.FC<PlatItemProps> = ({ plat, addToCart, cuissonSelections, handleCuissonChange, section, language, t, selectedAllergens = [] }) => {
    const [selectedFormat, setSelectedFormat] = useState<PlatFormat | null>(null);

    useEffect(() => {
        if (plat.tplat_format && plat.tplat_format.length > 0) {
            setSelectedFormat(plat.tplat_format[0]);
        }
    }, [plat]);

    let displayPrice;
    if (selectedFormat) {
        displayPrice = `${parseFloat(selectedFormat.prix as string).toFixed(2)}€`;
    } else if (plat.prix_plat !== undefined && plat.prix_plat !== null) {
        displayPrice = `${parseFloat(plat.prix_plat as unknown as string).toFixed(2)}€`;
    } else {
        displayPrice = plat.prix;
    }

    const handleFormatChange = (formatId: string) => {
        const format = plat.tplat_format?.find(f => f.id === parseInt(formatId)) || null;
        setSelectedFormat(format);
    };

    const handleAddToCart = () => {
        addToCart(plat, selectedFormat);
    };

    const isSoldOut = plat.max_servings === 0;

    // Check les allergènes
    const containedAllergens = plat.allergenes?.filter(a => selectedAllergens.includes(a.nom)) || [];
    const isRestricted = containedAllergens.length > 0;

    let displayNom = plat.nom;
    let displayDesc = plat.description;

    if (language === 'en') {
        if (plat.nom_plat_en) displayNom = plat.nom_plat_en;
        if (plat.description_plat_en) displayDesc = plat.description_plat_en;
    } else if (language === 'nl') {
        if (plat.nom_plat_nl) displayNom = plat.nom_plat_nl;
        if (plat.description_plat_nl) displayDesc = plat.description_plat_nl;
    }

    return (
        <li
            className={`${styles['plat-item']} ${isSoldOut ? styles['sold-out'] : ''} ${isRestricted ? styles['restricted-item'] : ''}`}
            style={isRestricted ? { filter: 'grayscale(100%)', opacity: 0.6, pointerEvents: 'none' } : {}}
        >
            {plat.image_url && (
                <div className={styles['plat-image-container']}>
                    <img src={`${BACKEND_URL}${plat.image_url}`} alt={displayNom} className={styles['plat-image']} />
                </div>
            )}
            <div className={styles['plat-details']}>
                <span className={styles['plat-nom']}>{displayNom}</span>
                {displayDesc && (
                    <p className={styles['plat-description']}>{displayDesc}</p>
                )}

                <div className={styles['plat-badges']}>
                    {plat.vegan && <span className={styles['badge-diet']} title="Vegan"><FaLeaf /> Vegan</span>}
                    {plat.vegetarien && !plat.vegan && <span className={styles['badge-diet']} title="Végétarien"><FaCarrot /> Végé</span>}

                    {plat.allergenes && plat.allergenes.length > 0 && (
                        <div className={styles['allergenes-container']}>
                            {plat.allergenes.map(a => {
                                const iconFile = ALLERGEN_ICONS[a.nom];
                                return (
                                    <span key={a.id} className={styles['allergene-icon']} title={a.nom}>
                                        {iconFile ? (
                                            <img
                                                src={`/assets/icons/${iconFile}`}
                                                alt={a.nom}
                                                className={styles['icon-img']}
                                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; ((e.target as HTMLElement).nextSibling as HTMLElement).style.display = 'inline' }}
                                            />
                                        ) : null}
                                        <span className={`${styles.allergenWarningIcon} ${iconFile ? styles.hidden : ''}`}>⚠️{a.nom}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {isSoldOut && (
                    <p className={styles.notAvailableMsg}>
                        {t('menu.not_available')}
                    </p>
                )}

                {plat.tplat_format && plat.tplat_format.length > 0 && (
                    <div className={styles.selectorContainer}>
                        <label className={styles.selectorLabel}>{t('menu.size')}</label>
                        <select
                            value={selectedFormat ? selectedFormat.id : ''}
                            onChange={(e) => handleFormatChange(e.target.value)}
                            className={styles.selectorSelect}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {plat.tplat_format.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.nom_format} ({parseFloat(f.prix as string).toFixed(2)}€)
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {plat.peut_choisir_cuisson && (
                    <div className={styles.selectorContainer}>
                        <label className={styles.selectorLabel}>{t('menu.cooking')}</label>
                        <select
                            value={cuissonSelections[plat.id] || 'SAIGNANT'}
                            onChange={(e) => handleCuissonChange(plat.id, e.target.value)}
                            className={styles.selectorSelect}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="BLEU">{t('cooking.bleu')}</option>
                            <option value="SAIGNANT">{t('cooking.saignant')}</option>
                            <option value="A_POINT">{t('cooking.apoint')}</option>
                            <option value="BIEN_CUIT">{t('cooking.biencuit')}</option>
                            <option value="ROSE">{t('cooking.rose')}</option>
                        </select>
                    </div>
                )}
            </div>
            <div className={styles['plat-price-button']}>
                <span className={styles['plat-prix']}>{displayPrice}</span>
                {section !== 'Mise en bouche offerte' && !isSoldOut && (
                    <button
                        className={`${styles['btn-menu']} ${isRestricted ? styles.btnDisabled : ''}`}
                        onClick={handleAddToCart}
                        disabled={isRestricted}
                    >
                        {isRestricted ? (
                            <span className={styles.allergenRestrictedMsg}>⚠️ {containedAllergens.map(a => a.nom).join(', ')}</span>
                        ) : (
                            t('menu.add')
                        )}
                    </button>
                )}
            </div>
        </li>
    );
};

export default Menu;
