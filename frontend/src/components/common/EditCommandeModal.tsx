import React, { useState, useEffect } from 'react';
import styles from './EditCommandeModal.module.css';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaTrash, FaPlus, FaMinus, FaSave, FaTimes } from 'react-icons/fa';
import Button from '../ui/Button';

interface EditCommandeModalProps {
    commande: any;
    onClose: () => void;
    onSuccess: () => void;
}

const EditCommandeModal: React.FC<EditCommandeModalProps> = ({ commande, onClose, onSuccess }) => {
    const [lignes, setLignes] = useState<any[]>([]);
    const [menu, setMenu] = useState<any[]>([]);
    const [selectedPlat, setSelectedPlat] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const lignesActives = commande.tlignecommande
            .filter((l: any) => l.statut_service !== 'ANNULEE')
            .map((l: any) => ({ ...l }));
        setLignes(lignesActives);

        api.get('/plats').then((res: any) => {
            setMenu(res.filter((p: any) => p.disponible));
        }).catch(err => console.error(err));
    }, [commande]);

    const handleQuantityChange = (index: number, delta: number) => {
        const newLignes = [...lignes];
        const ligne = newLignes[index];
        
        if (ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)) {
            toast.error("Ce plat est déjà prêt ou servi, sa quantité ne peut être modifiée.");
            return;
        }

        const newQ = ligne.quantite + delta;
        if (newQ > 0) {
            ligne.quantite = newQ;
            setLignes(newLignes);
        }
    };

    const handleFormatChange = (index: number, newFormat: string) => {
        const newLignes = [...lignes];
        const ligne = newLignes[index];
        if (ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)) {
            toast.error("Ce plat est déjà prêt ou servi, son format ne peut être modifié.");
            return;
        }
        ligne.format = newFormat || null;
        setLignes(newLignes);
    };

    const handleRemoveLigne = (index: number) => {
        const newLignes = [...lignes];
        const ligne = newLignes[index];

        if (ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)) {
            toast.error("Ce plat est déjà prêt ou servi, il ne peut pas être retiré.");
            return;
        }

        newLignes.splice(index, 1);
        setLignes(newLignes);
    };

    const handleAddPlat = () => {
        if (!selectedPlat) return;
        const platInfo = menu.find(p => p.id === Number(selectedPlat));
        if (!platInfo) return;

        setLignes([
            ...lignes,
            {
                plat_id: platInfo.id,
                quantite: 1,
                tplat: platInfo,
                categorie_service: platInfo.tcategorieplat?.nom_categorie === 'Boissons' ? 'BAR' : 'CUISINE',
                statut_service: 'EN_ATTENTE',
                format: selectedFormat || null
            }
        ]);
        setSelectedPlat('');
        setSelectedFormat('');
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                items: lignes.map(l => ({
                    id: l.id,
                    plat_id: l.plat_id,
                    quantite: l.quantite,
                    commentaire: l.commentaire,
                    cuisson: l.cuisson,
                    format: l.format,
                    restrictions_alimentaires: l.restrictions_alimentaires,
                    categorie_service: l.categorie_service
                }))
            };
            await api.put(`/commandes/${commande.id}/lignes`, payload);
            toast.success("Commande modifiée avec succès");
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la modification");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>Modifier Commande #{commande.id}</h2>
                    <button className={styles.closeBtn} onClick={onClose}><FaTimes /></button>
                </div>
                
                <div className={styles.modalBody}>
                    <div className={styles.lignesList}>
                        {lignes.map((ligne, index) => (
                            <div key={index} className={styles.ligneItem}>
                                <div className={styles.ligneInfo}>
                                    <span className={styles.platNom}>{ligne.tplat?.nom_plat}</span>
                                    {ligne.tplat?.tplat_format && ligne.tplat.tplat_format.length > 0 && (
                                        <select
                                            value={ligne.format || ''}
                                            onChange={(e) => handleFormatChange(index, e.target.value)}
                                            disabled={ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)}
                                            style={{ marginLeft: '10px', padding: '2px 5px', borderRadius: '4px' }}
                                        >
                                            <option value="">-- Format --</option>
                                            {ligne.tplat.tplat_format.map((f: any) => (
                                                <option key={f.id} value={f.nom_format}>{f.nom_format}</option>
                                            ))}
                                        </select>
                                    )}
                                    {ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service) && (
                                        <span className={styles.badgeReadonly}>({ligne.statut_service})</span>
                                    )}
                                </div>
                                <div className={styles.ligneActions}>
                                    <button 
                                        className={styles.qtyBtn} 
                                        onClick={() => handleQuantityChange(index, -1)}
                                        disabled={ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)}
                                    ><b>-</b></button>
                                    <span className={styles.qty}>{ligne.quantite}</span>
                                    <button 
                                        className={styles.qtyBtn} 
                                        onClick={() => handleQuantityChange(index, 1)}
                                        disabled={ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)}
                                    ><b>+</b></button>
                                    
                                    <button 
                                        className={styles.deleteBtn} 
                                        onClick={() => handleRemoveLigne(index)}
                                        disabled={ligne.id && ['PRET', 'SERVIE'].includes(ligne.statut_service)}
                                    ><b>X</b></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.addSection}>
                        <select 
                            value={selectedPlat} 
                            onChange={(e) => {
                                setSelectedPlat(e.target.value);
                                setSelectedFormat(''); // Reset format on plat change
                            }}
                            className={styles.select}
                        >
                            <option value="">-- Ajouter un plat --</option>
                            {menu.map(p => (
                                <option key={p.id} value={p.id}>{p.nom_plat} ({p.prix_plat}€)</option>
                            ))}
                        </select>

                        {selectedPlat && menu.find(p => p.id === Number(selectedPlat))?.tplat_format?.length > 0 && (
                            <select 
                                value={selectedFormat} 
                                onChange={(e) => setSelectedFormat(e.target.value)}
                                className={styles.select}
                                style={{ marginLeft: '10px' }}
                            >
                                <option value="">-- Format --</option>
                                {menu.find(p => p.id === Number(selectedPlat))?.tplat_format.map((f: any) => (
                                    <option key={f.id} value={f.nom_format}>{f.nom_format} ({Number(f.prix)}€)</option>
                                ))}
                            </select>
                        )}
                        <Button onClick={handleAddPlat} disabled={!selectedPlat} variant="secondary">Ajouter</Button>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <Button onClick={onClose} variant="secondary" disabled={isSaving}>Annuler</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Sauvegarde..." : <><FaSave /> Enregistrer</>}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditCommandeModal;
