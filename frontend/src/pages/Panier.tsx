import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaTrash, FaShoppingCart, FaUtensils, FaMotorcycle, FaShoppingBag, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import styles from './Panier.module.css';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

import { tplat } from '../types/prisma-types';

interface CartItem extends Omit<Partial<tplat>, 'id' | 'prix_plat'> {
    cartId: string;
    id: number | string;
    nom_plat: string;
    prix_plat: number;
    quantite: number;
    cuisson?: string | null;
    format?: string | null;
    categorieService?: string;
    restrictions_alimentaires?: string;
    [key: string]: any;
}

interface AddressData {
    rue: string;
    ville: string;
    codePostal: string;
}

export default function Panier() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('panier') || '[]');
        } catch {
            return [];
        }
    });

    const [typeCommande, setTypeCommande] = useState<'SUR_PLACE' | 'LIVRAISON' | 'A_EMPORTER'>('SUR_PLACE');

    const [adresse, setAdresse] = useState<AddressData>({ rue: '', ville: '', codePostal: '' });
    const [telLivraison, setTelLivraison] = useState('');
    const [heureRetrait, setHeureRetrait] = useState('');

    useEffect(() => {
        localStorage.setItem('panier', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        const updatePanier = () => {
            try {
                const nouveauPanier = JSON.parse(localStorage.getItem('panier') || '[]');
                setItems(nouveauPanier);
            } catch {
                setItems([]);
            }
        };
        window.addEventListener('panierMisAJour', updatePanier);
        updatePanier();
        return () => window.removeEventListener('panierMisAJour', updatePanier);
    }, []);

    // Gestion du total
    const total = items.reduce((acc, item) => acc + item.prix_plat * item.quantite, 0);

    const modifierQuantite = (cartId: string, quantite: number) => {
        if (quantite < 1) return;
        setItems((prev) => prev.map((item) => (item.cartId === cartId ? { ...item, quantite } : item)));
    };

    const supprimerPlat = (cartId: string) => {
        setItems((prev) => prev.filter((item) => item.cartId !== cartId));
    };

    const handleChangeAdresse = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAdresse((prev) => ({ ...prev, [name]: value }));
    };

    const validerCommande = async () => {
        if (items.length === 0) {
            toast.error(t('cart.error.empty'));
            return;
        }
        if (typeCommande === 'LIVRAISON' && (!adresse.rue || !adresse.ville || !adresse.codePostal || !telLivraison)) {
            toast.error(t('cart.error.address'));
            return;
        }
        if (typeCommande === 'A_EMPORTER' && !heureRetrait) {
            toast.error(t('cart.error.time'));
            return;
        }

        // Sécurise le lien table/session avant le paiement pour les commandes SUR_PLACE.
        const storedTableId = localStorage.getItem('table_id');
        if (typeCommande === 'SUR_PLACE' && storedTableId) {
            try {
                const sessionData: any = await api.get(`/session/menu-access?table_id=${storedTableId}`);
                if (sessionData?.session_id) {
                    localStorage.setItem('session_id', String(sessionData.session_id));
                }
            } catch (err: any) {
                toast.error(err.message || t('toast.cart.session_error'));
                return;
            }
        }

        // On prépare la commande et on la stocke temporairement
        const commande = {
            type_commande: typeCommande,
            items: items.map(({ id, quantite, cuisson, prix_plat, nom_plat, format, categorieService, restrictions_alimentaires }) => ({
                id,
                quantite,
                cuisson,
                prix_plat,
                nom_plat,
                format,
                categorieService,
                restrictions_alimentaires: restrictions_alimentaires ? [restrictions_alimentaires] : []
            })),
            adresse: typeCommande === 'LIVRAISON' ? adresse : null,
            tel_livraison: typeCommande === 'LIVRAISON' ? telLivraison : null,
            heure_retrait: typeCommande === 'A_EMPORTER' ? heureRetrait : null,
            paiement_sur_place: typeCommande === 'SUR_PLACE',
            transaction_id: null,
            total,
            table_id: storedTableId ? Number(storedTableId) : null,
            session_table_id: localStorage.getItem('session_id') ? Number(localStorage.getItem('session_id')) : null,
        };

        localStorage.setItem('commande_en_cours', JSON.stringify(commande));
        console.log("Navigation vers /paiement");
        navigate('/paiement');
    };

    return (
        <div className={styles['panierContainer']}>
            <div className="page-header">
                <h2 className="page-title">{t('cart.title')}</h2>
                {items.length > 0 && <p className="page-subtitle">{t('cart.subtitle') || 'Finalisez votre sélection gourmande'}</p>}
            </div>

            {items.length === 0 ? (
                <div className={styles['emptyCart']}>
                    <span className={styles['emptyIcon']}><FaShoppingCart /></span>
                    <p>{t('cart.empty')}</p>
                    <button 
                        className={styles.btnContinue} 
                        onClick={() => navigate('/menu')}
                        style={{ marginTop: '2rem', background: 'var(--color-secondary)' }}
                    >
                        {t('cart.return_to_menu') || 'Retourner au menu'}
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles['itemList']}>
                        {items.map(({ cartId, id, nom_plat, prix_plat, quantite, cuisson, format }) => (
                            <div key={cartId || id} className={styles['itemCard']}>
                                <div className={styles['itemInfo']}>
                                    <div className={styles['itemName']}>
                                        {nom_plat}
                                        {format && <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', marginLeft: '8px' }}>({format})</span>}
                                    </div>
                                    {cuisson && <div className={styles['itemDetails']}>{t('menu.cooking')} : {cuisson}</div>}
                                </div>

                                <div className={styles['itemControls']}>
                                    <div className={styles['quantityControl']}>
                                        <button
                                            className={styles['btnQty']}
                                            onClick={() => modifierQuantite(cartId, quantite - 1)}
                                            title="Diminuer"
                                        >
                                            -
                                        </button>
                                        <span className={styles['qtyDisplay']}>{quantite}</span>
                                        <button
                                            className={styles['btnQty']}
                                            onClick={() => modifierQuantite(cartId, quantite + 1)}
                                            title="Augmenter"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className={styles['itemPrice']}>
                                        {(prix_plat * quantite).toFixed(2)} €
                                    </div>

                                    <button
                                        className={styles['btnDelete']}
                                        onClick={() => supprimerPlat(cartId)}
                                        aria-label={`Supprimer ${nom_plat}`}
                                    >
                                        <FaTrash /> <span>{t('cart.remove')}</span>
                                    </button>
                                </div>
                                <div className={styles.itemOptions}>
                                    <input
                                        type="text"
                                        placeholder={t('cart.notes')}
                                        value={items.find(i => i.cartId === cartId)?.restrictions_alimentaires || ''}
                                        onChange={(e) => {
                                            setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, restrictions_alimentaires: e.target.value } : i));
                                        }}
                                        className={styles.itemNotesInput}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles['modeSection']}>
                        <h3>{t('cart.mode.title')}</h3>
                        <div className={styles['modeGrid']}>
                            <label className={styles['modeCard']}>
                                <input
                                    type="radio"
                                    name="type_commande"
                                    value="SUR_PLACE"
                                    checked={typeCommande === 'SUR_PLACE'}
                                    onChange={() => setTypeCommande('SUR_PLACE')}
                                />
                                <span className={styles['modeIcon']}><FaUtensils /></span>
                                <span className={styles['modeLabel']}>{t('cart.mode.onsite')}</span>
                            </label>
                            <label className={styles['modeCard']}>
                                <input
                                    type="radio"
                                    name="type_commande"
                                    value="LIVRAISON"
                                    checked={typeCommande === 'LIVRAISON'}
                                    onChange={() => setTypeCommande('LIVRAISON')}
                                />
                                <span className={styles['modeIcon']}><FaMotorcycle /></span>
                                <span className={styles['modeLabel']}>{t('cart.mode.delivery')}</span>
                            </label>
                            <label className={styles['modeCard']}>
                                <input
                                    type="radio"
                                    name="type_commande"
                                    value="A_EMPORTER"
                                    checked={typeCommande === 'A_EMPORTER'}
                                    onChange={() => setTypeCommande('A_EMPORTER')}
                                />
                                <span className={styles['modeIcon']}><FaShoppingBag /></span>
                                <span className={styles['modeLabel']}>{t('cart.mode.takeaway')}</span>
                            </label>
                        </div>
                    </div>

                    {typeCommande === 'LIVRAISON' && (
                        <div className={styles['formSection']}>
                            <h3><FaMapMarkerAlt /> {t('cart.address.title')}</h3>
                            <div className={styles['formGrid']}>
                                <input className="input" type="text" name="rue" placeholder="Rue et numéro" value={adresse.rue} onChange={handleChangeAdresse} required />
                                <div className={styles.addressGrid}>
                                    <input className="input" type="text" name="codePostal" placeholder="Code postal" value={adresse.codePostal} onChange={handleChangeAdresse} required />
                                    <input className="input" type="text" name="ville" placeholder="Ville" value={adresse.ville} onChange={handleChangeAdresse} required />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        className="input" 
                                        type="tel" 
                                        placeholder="Numéro de téléphone" 
                                        value={telLivraison} 
                                        onChange={(e) => setTelLivraison(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {typeCommande === 'A_EMPORTER' && (
                        <div className={styles['formSection']}>
                            <h3><FaClock /> {t('cart.time.title')}</h3>
                            <input className="input" type="time" value={heureRetrait} onChange={(e) => setHeureRetrait(e.target.value)} required />
                        </div>
                    )}

                    <div className={styles['footer']}>
                        <div className={styles['totalRow']}>
                            <span className={styles['totalLabel']}>{t('cart.total')}</span>
                            <span className={styles['totalAmount']}>{total.toFixed(2)} €</span>
                        </div>

                        <button className={styles['btnValider']} onClick={validerCommande}>
                            <FaShoppingCart /> {t('cart.validate')}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
