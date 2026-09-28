import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import api from '../services/api';
import styles from './PrintQRCard.module.css';
import logo from '../assets/logo.png';

interface Plat {
    id: number | string;
    nom: string;
    description?: string;
    prix: string | number;
    categorie_id: number | string;
}

interface MenuSection {
    items: Plat[];
}

export const PrintQRCard: React.FC = () => {
    const [menuData, setMenuData] = useState<Record<string, MenuSection>>({
        Entrées: { items: [] },
        Plats: { items: [] },
        Desserts: { items: [] }
    });
    const [loading, setLoading] = useState(true);

    // Récupération dynamique depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const tableNumber = params.get('table') || '1';
    const tableId = params.get('id') || '1';

    const menuUrl = `${window.location.origin}/menu?table_id=${tableId}`;

    const tableData = {
        number: tableNumber,
        url: menuUrl
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [platsData, catsData] = await Promise.all([
                    api.get('/plats'),
                    api.get('/categories')
                ]);

                const catMap: Record<number, any> = {};
                (catsData as any[]).forEach(c => catMap[c.id] = c);

                const dynamicMenu: Record<string, MenuSection> = {
                    Entrées: { items: [] },
                    Plats: { items: [] },
                    Desserts: { items: [] }
                };

                (platsData as any[]).forEach((plat) => {
                    const catId = plat.categorie_id;
                    let currentCat = catMap[catId];
                    let section = '';
                    let depth = 0;

                    while (currentCat && depth < 10) {
                        const name = currentCat.nom_categorie.toLowerCase();
                        if (name.includes('entrée')) { section = 'Entrées'; break; }
                        if (name.includes('plat')) { section = 'Plats'; break; }
                        if (name.includes('dessert')) { section = 'Desserts'; break; }

                        if (currentCat.parent_id) {
                            currentCat = catMap[currentCat.parent_id];
                        } else {
                            break;
                        }
                        depth++;
                    }

                    if (section && dynamicMenu[section]) {
                        dynamicMenu[section].items.push({
                            id: plat.id,
                            nom: plat.nom_plat,
                            description: plat.description_plat,
                            prix: parseFloat(plat.prix_plat).toFixed(2),
                            categorie_id: plat.categorie_id
                        });
                    }
                });

                setMenuData(dynamicMenu);
                setLoading(false);
            } catch (err) {
                console.error("Error loading menu for print card", err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className={styles.pageContainer}>Chargement du menu...</div>;

    return (
        <div className={styles.pageContainer}>

            {/* Instructions */}
            <div className={styles.instructions}>
                <h2>Mode Impression</h2>
                <p>Utilisez la fonction d'impression de votre navigateur (Cmd+P ou Ctrl+P).</p>
                <p>Format suggéré : A6 (105x148mm) ou A5.</p>
            </div>

            <div className={styles.printContainer}>

                {/* RECTO - QR CODE */}
                <div className={`${styles.cardFace} ${styles.rectoFace}`}>
                    <div className={`${styles.corner} ${styles.topLeft}`}></div>
                    <div className={`${styles.corner} ${styles.topRight}`}></div>
                    <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
                    <div className={`${styles.corner} ${styles.bottomRight}`}></div>

                    <div className={styles.brandHeader}>
                        <img src={logo} alt="Déclinaison" style={{ width: '180px', objectFit: 'contain', marginBottom: '10px' }} />
                    </div>

                    <div className={styles.qrWrapper}>
                        <div className={styles.qrBox}>
                            <QRCode
                                value={tableData.url}
                                size={140}
                                fgColor="#2d3436"
                                bgColor="#ffffff"
                            />
                        </div>
                        <p className={styles.scanText}>Scannez pour le Menu</p>
                    </div>

                    <div className={styles.tableInfo}>
                        <span className={styles.tableLabel}>Table</span>
                        <span className={styles.tableNumber}>{tableData.number}</span>
                    </div>
                </div>

                {/* VERSO - MENU */}
                <div className={`${styles.cardFace} ${styles.versoFace}`}>

                    <div className={styles.menuHeader}>
                        <h2 className={styles.menuTitle}>La Carte</h2>
                        <p className={styles.menuSubtitle}>Sélection du Chef</p>
                    </div>

                    <div className={styles.menuContent}>
                        {Object.entries(menuData).map(([sectionName, section]) => {
                            if (section.items.length === 0) return null;
                            const itemsToShow = section.items.slice(0, 3);

                            return (
                                <div key={sectionName} className={styles.menuSection}>
                                    <h3 className={styles.sectionTitle}>{sectionName}</h3>
                                    <ul className={styles.itemList}>
                                        {itemsToShow.map((item) => (
                                            <li key={item.id} className={styles.itemDetail}>
                                                <span className={styles.itemName}>{item.nom}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.menuFooter}>
                        <p className={styles.footerText}>Pour plus de choix, scannez le QR code</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PrintQRCard;