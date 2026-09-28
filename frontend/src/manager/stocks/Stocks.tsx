import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import styles from './Stocks.module.css';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FaTrash } from 'react-icons/fa';

import { tingredient, Role } from '../../types/prisma-types';
import { useLanguage } from '../../context/LanguageContext';

interface StockItem extends tingredient {
    cout_unitaire: any;
    seuil_alerte: any;
    stock_actuel: any;
    [key: string]: any;
}

interface HistoryItem {
    id: number;
    nom: string;
    quantite: number;
    date: string;
}

interface ShoppingListItem {
    ingredient_id: number;
    nom: string;
    stock_actuel: number;
    seuil: number;
    quantite_a_commander: number;
    unite: string;
    cout_unitaire: number;
    [key: string]: any;
}

const Stocks: React.FC = () => {
    const { t } = useLanguage();
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [inputQuantities, setInputQuantities] = useState<Record<number, string>>({});
    const [inputCosts, setInputCosts] = useState<Record<number, string>>({});
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[] | null>(null);
    const [userRole, setUserRole] = useState<Role | ''>('');
    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; onConfirm: (() => void) | null }>({ isOpen: false, title: '', content: null, onConfirm: null });

    const closeModal = () => setModal({ ...modal, isOpen: false });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('staffUser') || '{}');
        setUserRole(user.role_personnel || user.role || '');
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const data: any = await api.get('/stock');
            if (data) {
                setStocks(data.map((s: any) => ({
                    ...s,
                    stock_actuel: parseFloat(s.stock_actuel) || 0,
                    seuil_alerte: parseFloat(s.seuil_alerte) || 0,
                    cout_unitaire: parseFloat(s.cout_unitaire) || 0
                })));
            }
        } catch (err) {
            console.error('Erreur chargement stock', err);
        }
    };

    const reapprovisionner = async (ingredient_id: number, quantiteAjoutee: number) => {
        const stock = stocks.find(s => s.id === ingredient_id);
        if (!stock) return;

        const nouvelleQuantite = Number(stock.stock_actuel) + quantiteAjoutee;

        try {
            await api.put(`/stock/${ingredient_id}?id=${ingredient_id}`, { stock_actuel: nouvelleQuantite });
            fetchStocks();
            setHistory(prev => [
                {
                    id: Date.now(),
                    nom: stock.nom_ingredient,
                    quantite: quantiteAjoutee,
                    date: new Date().toLocaleString()
                },
                ...prev
            ]);
            setInputQuantities(prev => ({ ...prev, [ingredient_id]: '' }));
        } catch (err) {
            console.error('Erreur réapprovisionnement', err);
        }
    };

    const updateCost = async (ingredient_id: number, cout: number) => {
        try {
            await api.put(`/stock/ingredient/${ingredient_id}/cost`, { cout });
            toast.success(t('toast.stocks.cost_updated'));
            fetchStocks();
            setInputCosts(prev => ({ ...prev, [ingredient_id]: '' }));
        } catch (err) {
            console.error('Erreur update cost', err);
        }
    };

    const generateShoppingList = async () => {
        try {
            const data = await api.get('/stock/shopping-list');
            setShoppingList(data as ShoppingListItem[]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteClick = (id: number) => {
        setModal({
            isOpen: true,
            title: 'Confirmation',
            content: 'Êtes-vous sûr de vouloir supprimer cet ingrédient ?',
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/ingredients/${id}`);
            toast.success(t('toast.stocks.deleted'));
            fetchStocks();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || t('toast.stocks.delete_error'));
        }
        closeModal();
    };

    const isManager = userRole === 'manager' || userRole === 'super_admin';

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">Gestion du Stock {isManager ? '& Fournisseurs' : '(Ajustement)'}</h2>
                    <p className="page-subtitle">Surveillez les inventaires et anticipez les ruptures.</p>
                </div>
                {isManager && (
                    <button onClick={generateShoppingList} className={styles.btnPrimary}>
                        Générer Liste de Courses
                    </button>
                )}
            </div>

            {shoppingList && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Liste de Courses Recommandée</h3>
                            <button onClick={() => setShoppingList(null)} className={styles.btnClose}>×</button>
                        </div>
                        <ul className={styles.shoppingList}>
                            {shoppingList.map(item => (
                                <li key={item.ingredient_id} className={styles.shoppingItem}>
                                    <div className={styles.shoppingItemInfo}>
                                        <strong>{item.nom}</strong>
                                        <span>Stock: {item.stock_actuel} / Seuil: {item.seuil}</span>
                                    </div>
                                    <div className={styles.shoppingItemAction}>
                                        <span>Commander {item.quantite_a_commander} {item.unite}</span>
                                        <small>~{(item.quantite_a_commander * item.cout_unitaire).toFixed(2)} €</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className={styles.modalFooter}>
                            <p className={styles.totalCost}>Total Estimé: <strong>{shoppingList.reduce((acc, item) => acc + (item.quantite_a_commander * item.cout_unitaire), 0).toFixed(2)} €</strong></p>
                            <button onClick={() => window.print()} className={styles.btnPrint}>Imprimer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Ingrédient / Produit</th>
                            <th>Quantité</th>
                            <th>Seuil minimum</th>
                            {isManager && <th>Coût Unitaire (€)</th>}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map(stock => {
                            const estEnAlerte = Number(stock.stock_actuel) <= Number(stock.seuil_alerte);
                            return (
                                <tr
                                    key={stock.id}
                                    className={estEnAlerte ? styles.rowAlert : styles.row}
                                >
                                    <td className={styles.cellName}>
                                        <div className={styles.cellNameWrapper}>
                                            {stock.nom_ingredient}
                                            {estEnAlerte && <span className={styles.badgeAlert}>Stock bas</span>}
                                        </div>
                                    </td>
                                    <td className={styles.cellQuantity}>
                                        <span className={estEnAlerte ? styles.textDanger : ''}>{Number(stock.stock_actuel)}</span> {stock.unite_ingredient}
                                    </td>
                                    <td className={styles.cellThreshold}>{Number(stock.seuil_alerte)} {stock.unite_ingredient}</td>
                                    {isManager && (
                                        <td className={styles.cellCost}>
                                            <div className={styles.costInputGroup}>
                                                <span>{Number(stock.cout_unitaire).toFixed(2)} €</span>
                                                <input
                                                    type="number"
                                                    className={styles.inputSmall}
                                                    placeholder="Nouv."
                                                    value={inputCosts[stock.id] || ''}
                                                    onChange={e => setInputCosts({ ...inputCosts, [stock.id]: e.target.value })}
                                                />
                                                <button
                                                    className={styles.btnIcon}
                                                    onClick={() => updateCost(stock.id, parseFloat(inputCosts[stock.id]))}
                                                    title="Valider le coût"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                    <td className={styles.cellActions}>
                                        <div className={styles.actionGroup}>
                                            <input
                                                type="number"
                                                placeholder="+/-"
                                                className={styles.inputAction}
                                                value={inputQuantities[stock.id] || ''}
                                                onChange={(e) =>
                                                    setInputQuantities({
                                                        ...inputQuantities,
                                                        [stock.id]: e.target.value
                                                    })
                                                }
                                            />
                                            <button
                                                className={styles.btnAction}
                                                onClick={() => {
                                                    const qte = parseFloat(inputQuantities[stock.id]);
                                                    if (!isNaN(qte)) reapprovisionner(stock.id, qte);
                                                }}
                                            >
                                                Ajuster
                                            </button>
                                            {isManager && (
                                                <button
                                                    className={styles.btnDelete}
                                                    onClick={() => handleDeleteClick(stock.id)}
                                                    title="Supprimer"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.historySection}>
                <h3>Historique des mouvements</h3>
                {history.length === 0 ? (
                    <p className={styles.emptyHistory}>Aucun mouvement enregistré récemment.</p>
                ) : (
                    <ul className={styles.historyList}>
                        {history.map(h => (
                            <li key={h.id} className={styles.historyItem}>
                                <span className={styles.historyDate}>{h.date}</span>
                                <span className={styles.historyDetail}>
                                    <strong>{h.nom}</strong>: <span className={h.quantite > 0 ? styles.textSuccess : styles.textDanger}>{h.quantite > 0 ? '+' : ''}{h.quantite}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
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
        </div>
    );
};

export default Stocks;
