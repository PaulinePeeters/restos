import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaCcPaypal, FaCreditCard } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi';
import styles from './Paiement.module.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

import { TypeCommande, MethodePaiement, tcommande, tlignecommande } from '../types/prisma-types';

interface CommandeItem extends Partial<tlignecommande> {
    prix_plat: number;
    quantite: number;
    [key: string]: any;
}

interface CommandeInfo extends Partial<tcommande> {
    items: CommandeItem[];
    type_commande: TypeCommande;
    adresse?: {
        ville: string;
        [key: string]: any;
    };
    heure_retrait?: string;
    [key: string]: any;
}

export default function Paiement() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [commande, setCommande] = useState<CommandeInfo | null>(null);
    const [modePaiement, setModePaiement] = useState<MethodePaiement | 'SUR_PLACE'>('BANCONTACT');
    const [codeCheque, setCodeCheque] = useState('');
    const [reductionCheque, setReductionCheque] = useState(0);
    const [messageCheque, setMessageCheque] = useState('');
    const [splitMode, setSplitMode] = useState(false);
    const [nbPersonnes, setNbPersonnes] = useState(2);
    const [tipAmount, setTipAmount] = useState(0);

    // Facture
    const [askInvoice, setAskInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                let defaultAddress = '';
                if (user.tadresselivraison && user.tadresselivraison.length > 0) {
                    const addr = user.tadresselivraison.find((a: any) => a.est_par_defaut) || user.tadresselivraison[0];
                    defaultAddress = `${addr.numero_adresse} ${addr.rue_adresse}, ${addr.cp_adresse} ${addr.ville_adresse}`;
                }
                return {
                    company: user.entreprise || '',
                    vat: user.tva || '',
                    address: defaultAddress
                };
            } catch (e) {
            }
        }
        return {
            company: '',
            vat: '',
            address: ''
        };
    });

    useEffect(() => {
        console.log("Paiement component mounted");
        const cmdStr = localStorage.getItem('commande_en_cours');
        if (!cmdStr) {
            console.log("No command found, redirecting to panier");
            navigate('/panier');
            return;
        }

        const cmd: CommandeInfo = JSON.parse(cmdStr);
        console.log("Command found:", cmd);
        setCommande(cmd);
        if (cmd.type_commande === 'SUR_PLACE') {
            setModePaiement('SUR_PLACE');
        }
    }, [navigate]);

    if (!commande) return <p className={styles['loading']}>Chargement...</p>;

    const totalInitial = commande.items.reduce((acc, item) => {
        return acc + (item.prix_plat || 0) * item.quantite;
    }, 0);
    // Calcul du total après réduction
    const totalApresCheque = Math.max(0, totalInitial - reductionCheque);
    // Calcul du montant par personne (diviser le total par le nombre de personnes si le mode split est activé)
    const montantPart = splitMode ? (totalApresCheque / nbPersonnes) : totalApresCheque;

    const surPlace = commande.type_commande === 'SUR_PLACE';
    // Vérifie si le chèque est valide
    const verifierCheque = async () => {
        try {
            const data: any = await api.post('/cheques/validate', { code: codeCheque });
            if (data) {
                const montantUtilisable = Math.min(Number(data.solde_actuel), totalInitial);
                setReductionCheque(montantUtilisable);
                setMessageCheque(`Chèque valide ! Réduction de ${montantUtilisable} € appliquée.`);
            }
        } catch (error: any) {
            console.error(error);
            setReductionCheque(0);
            setMessageCheque(error.message || 'Code invalide');
        }
    };
    // Gestion du pourboire
    const handleTipClick = (percentage: number) => {
        const tip = (totalApresCheque * percentage) / 100;
        setTipAmount(tip);
    };

    const lancerPaiement = async () => {
        const montantAPayer = (splitMode ? montantPart : totalApresCheque) + (splitMode ? 0 : tipAmount);

        // S'assurer que les restrictions alimentaires sont au bon format
        const formattedItems = commande?.items.map((item: any) => ({
            ...item,
            restrictions_alimentaires: Array.isArray(item.restrictions_alimentaires)
                ? item.restrictions_alimentaires
                : (typeof item.restrictions_alimentaires === 'string' && item.restrictions_alimentaires.trim() !== ''
                    ? [item.restrictions_alimentaires]
                    : [])
        })) || [];

        if (!formattedItems || formattedItems.length === 0) {
            toast.error(t('toast.pay.empty'));
            return;
        }

        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        let clientId = user?.id_client || user?.id;

        clientId = clientId ? Number(clientId) : null;

        const basePayload = {
            ...commande,
            client_id: clientId,
            items: formattedItems,
            code_cheque: reductionCheque > 0 ? codeCheque : null,
            montant_cheque: reductionCheque,
            pourboire: tipAmount,
            invoiceData: askInvoice ? invoiceData : null
        };

        console.log("Payload de commande préparé:", basePayload);

        if (modePaiement === 'SUR_PLACE') {
            toast.loading(t('toast.pay.loading'));

            await envoyerCommande({
                ...basePayload,
                mode_paiement: 'SUR_PLACE',
                paiement_sur_place: true,
            });

        } else {
            toast.success(t('toast.pay.accepted', { amount: montantAPayer.toFixed(2) }));

            await envoyerCommande({
                ...basePayload,
                mode_paiement: modePaiement,
                paiement_sur_place: false,
            });
        }
    };

    const envoyerCommande = async (payload: any) => {
        try {
            await api.post('/commandes', payload);

            if (reductionCheque > 0) {
                await api.post('/cheques/use', { code: codeCheque, montant: reductionCheque });
            }

            toast.dismiss();
            toast.success(t('toast.pay.sent'));
            localStorage.removeItem('commande_en_cours');
            localStorage.removeItem('panier');
            navigate('/confirmation');
        } catch (err: any) {
            toast.dismiss();
            console.error(err);
            toast.error(err.message || t('toast.pay.error'));
        }
    };

    return (
        <div className={styles['container']}>
            <h2>{t('pay.title')}</h2>

            <div className={styles['summarySection']}>
                <div className={styles['summaryRow']}>
                    <span>{t('pay.mode')}</span>
                    <strong>{
                        commande.type_commande === 'SUR_PLACE' ? t('cart.mode.onsite') :
                        commande.type_commande === 'LIVRAISON' ? t('cart.mode.delivery') :
                        t('cart.mode.takeaway')
                    }</strong>
                </div>
                {commande.adresse && (
                    <div className={styles['summaryRow']}>
                        <span>{t('pay.delivery_to')}</span>
                        <span>{commande.adresse.ville}</span>
                    </div>
                )}
                {commande.heure_retrait && (
                    <div className={styles['summaryRow']}>
                        <span>{t('pay.pickup')}</span>
                        <span>{commande.heure_retrait}</span>
                    </div>
                )}
                <div className={`${styles['summaryRow']} ${styles['total']}`}>
                    <span>{t('pay.total_cmd')}</span>
                    <span>{totalApresCheque.toFixed(2)} €</span>
                </div>
                {reductionCheque > 0 && (
                    <div className={`${styles['summaryRow']} ${styles.discountRow}`}>
                        <span>{t('pay.discount')}</span>
                        <span>-{reductionCheque.toFixed(2)} €</span>
                    </div>
                )}
                {tipAmount > 0 && (
                    <div className={`${styles['summaryRow']} ${styles.tipRow}`}>
                        <span>{t('pay.tip')}</span>
                        <span>+{tipAmount.toFixed(2)} €</span>
                    </div>
                )}
                <div className={`${styles['summaryRow']} ${styles['total']} ${styles.totalPayRow}`}>
                    <span>{t('pay.total_pay')}</span>
                    <span>{(totalApresCheque + tipAmount).toFixed(2)} €</span>
                </div>
            </div>

            <div className={styles['chequeSection']}>
                <h3>{t('pay.giftcard.title')}</h3>
                <div className={styles['inputGroup']}>
                    <input
                        className={styles['input']}
                        type="text"
                        placeholder={t('pay.giftcard.placeholder')}
                        value={codeCheque}
                        onChange={(e) => setCodeCheque(e.target.value)}
                    />
                    <button className={styles['btnApply']} onClick={verifierCheque}>{t('pay.giftcard.apply')}</button>
                </div>
                {messageCheque && <p className={`${styles.tipMessage} ${reductionCheque > 0 ? styles.tipMessageSuccess : styles.tipMessageError}`}>{messageCheque}</p>}
            </div>

            {/* Section Pourboire */}
            <div className={`${styles['chequeSection']} ${styles.tipSelectionContainer}`}>
                <h3>{t('pay.tip.title')}</h3>
                <div className={styles.tipButtons}>
                    {[5, 10, 15].map(pct => (
                        <button
                            key={pct}
                            onClick={() => handleTipClick(pct)}
                            className={`${styles['btnApply']} ${styles.tipBtn} ${tipAmount === (totalApresCheque * pct) / 100 ? styles.tipBtnSelected : styles.tipBtnUnselected}`}
                        >
                            {pct}%
                        </button>
                    ))}
                    <button
                        onClick={() => setTipAmount(0)}
                        className={`${styles['btnApply']} ${styles.tipBtn} ${tipAmount === 0 ? styles.tipBtnNoneSelected : styles.tipBtnUnselected}`}
                    >
                        {t('pay.tip.no')}
                    </button>
                </div>
                <input
                    className={styles['input']}
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder={t('pay.tip.custom_placeholder')}
                    value={tipAmount > 0 ? tipAmount : ''}
                    onChange={(e) => setTipAmount(Number(e.target.value))}
                />
            </div>

            {/* Section Facture */}
            <div className={`${styles['chequeSection']} ${styles.invoiceSection}`}>
                <div className={`${styles.invoiceToggle} ${askInvoice ? styles.invoiceToggleActive : ''}`}>
                    <input
                        type="checkbox"
                        id="askInvoice"
                        checked={askInvoice}
                        onChange={(e) => setAskInvoice(e.target.checked)}
                        className={styles.invoiceCheckbox}
                    />
                    <label htmlFor="askInvoice" className={styles.invoiceLabel}>Demander une facture TVA</label>
                </div>

                {askInvoice && (
                    <div className={styles.invoiceForm}>
                        <input
                            className={styles['input']}
                            type="text"
                            placeholder="Nom de l'entreprise (ex: TechSolutions)"
                            value={invoiceData.company}
                            onChange={(e) => setInvoiceData({ ...invoiceData, company: e.target.value })}
                        />
                        <input
                            className={styles['input']}
                            type="text"
                            placeholder="Numéro de TVA (ex: BE0123456789)"
                            value={invoiceData.vat}
                            onChange={(e) => setInvoiceData({ ...invoiceData, vat: e.target.value })}
                        />
                        <input
                            className={styles['input']}
                            type="text"
                            placeholder="Adresse de facturation"
                            value={invoiceData.address}
                            onChange={(e) => setInvoiceData({ ...invoiceData, address: e.target.value })}
                        />
                    </div>
                )}
            </div>

            {totalApresCheque > 0 && (
                <div className={styles['splitSection']}>
                    <div className={styles['splitHeader']} onClick={() => setSplitMode(!splitMode)}>
                        <div className={styles['splitTitle']}>
                            {t('pay.split.title')}
                        </div>
                        <label className={styles['toggleSwitch']} onClick={e => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={splitMode}
                                onChange={e => setSplitMode(e.target.checked)}
                            />
                            <span className={styles['slider']}></span>
                        </label>
                    </div>

                    {splitMode && (
                        <div className={styles['splitDetails']}>
                            <div className={styles['personCount']}>
                                <span>{t('pay.split.count')}</span>
                                <div className={styles['counterControl']}>
                                    <button
                                        className={styles['btnCounter']}
                                        onClick={() => setNbPersonnes(Math.max(2, nbPersonnes - 1))}
                                    >
                                        -
                                    </button>
                                    <span className={styles['countDisplay']}>{nbPersonnes}</span>
                                    <button
                                        className={styles['btnCounter']}
                                        onClick={() => setNbPersonnes(Math.min(10, nbPersonnes + 1))}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className={styles['amountPerPerson']}>
                                {t('pay.split.per_person')}
                                <span className={styles['amountHighlight']}>{montantPart.toFixed(2)} €</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {totalApresCheque > 0 && (
                <>
                    <h3>{t('pay.method.title')}</h3>
                    <div className={styles['optionsPaiement']}>
                        {surPlace && (
                            <label className={styles['option']}>
                                <input
                                    type="radio"
                                    value="SUR_PLACE"
                                    checked={modePaiement === 'SUR_PLACE'}
                                    onChange={() => setModePaiement('SUR_PLACE')}
                                />
                                <div className={styles['optionContent']}>
                                    <span>{t('pay.method.counter')}</span>
                                </div>
                            </label>
                        )}
                        <label className={styles['option']}>
                            <input
                                type="radio"
                                value="BANCONTACT"
                                checked={modePaiement === 'BANCONTACT'}
                                onChange={() => setModePaiement('BANCONTACT')}
                            />
                            <div className={styles['optionContent']}>
                                <GiMoneyStack className={styles['icon']} />
                                <span>Bancontact</span>
                            </div>
                        </label>
                        <label className={styles['option']}>
                            <input
                                type="radio"
                                value="PAYCONIQ"
                                checked={modePaiement === 'PAYCONIQ'}
                                onChange={() => setModePaiement('PAYCONIQ')}
                            />
                            <div className={styles['optionContent']}>
                                <FaCreditCard className={styles['icon']} />
                                <span>Payconiq</span>
                            </div>
                        </label>
                        <label className={styles['option']}>
                            <input
                                type="radio"
                                value="PAYPAL"
                                checked={modePaiement === 'PAYPAL'}
                                onChange={() => setModePaiement('PAYPAL')}
                            />
                            <div className={styles['optionContent']}>
                                <FaCcPaypal className={styles['icon']} />
                                <span>PayPal</span>
                            </div>
                        </label>
                    </div>
                </>
            )}

            <button className={styles['btnPayer']} onClick={lancerPaiement}>
                {totalApresCheque === 0 ? t('pay.submit.confirm_check') : (surPlace && modePaiement === 'SUR_PLACE' ? t('pay.submit.confirm_order') : `${t('pay.submit.pay')} ${(splitMode ? montantPart : (totalApresCheque + tipAmount)).toFixed(2)} €`)}
            </button>
        </div>
    );
}
