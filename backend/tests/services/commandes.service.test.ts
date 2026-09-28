import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (hoisted car vi.mock est remonté en haut du fichier) ---
const { prismaMock, stockMock, fideliteMock, chequesMock } = vi.hoisted(() => ({
    prismaMock: {
        tplat: { findMany: vi.fn() },
        tcommande: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        tpaiement: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
        tsessiontable: { findUnique: vi.fn(), update: vi.fn() },
        tlignecommande: { update: vi.fn() },
        $transaction: vi.fn(),
    },
    stockMock: {
        checkDishAvailability: vi.fn(),
        deductIngredients: vi.fn(),
        restoreIngredients: vi.fn(),
    },
    fideliteMock: {
        ajouterPoints: vi.fn(),
        getOffresActives: vi.fn(),
    },
    chequesMock: { useCheque: vi.fn() },
}));

vi.mock('../../src/db.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/services/stock.service.js', () => stockMock);
vi.mock('../../src/services/fidelite.service.js', () => fideliteMock);
vi.mock('../../src/services/cheques.service.js', () => chequesMock);
vi.mock('../../src/utils/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/utils/emailTemplates.js', () => ({
    orderConfirmationEmail: vi.fn(() => '<html></html>'),
    reviewRequestEmail: vi.fn(() => '<html></html>'),
}));
vi.mock('../../src/services/sessions.service.js', () => ({ getOrCreateSessionForTable: vi.fn() }));
vi.mock('../../src/socket.js', () => ({ getIo: vi.fn(() => { throw new Error('no socket in test'); }) }));
vi.mock('../../src/services/notifications.service.js', () => ({
    notificationsService: { createNotification: vi.fn() },
}));
vi.mock('../../src/utils/logger.js', () => ({
    logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
    creerCommandeService,
    addPaiement,
    appliquerReduction,
    annulerCommande,
    payerParChequeCadeau,
} from '../../src/services/commandes.service.js';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('appliquerReduction', () => {
    it('applique une réduction en pourcentage', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue({ id: 1, total_estime_commande: 100, commentaire_global: '' });
        await appliquerReduction(1, 'COMMERCIALE', 10, true);
        expect(prismaMock.tcommande.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ total_estime_commande: 90 }) }),
        );
    });

    it('applique une réduction fixe', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue({ id: 1, total_estime_commande: 100, commentaire_global: '' });
        await appliquerReduction(1, 'COMMERCIALE', 30, false);
        expect(prismaMock.tcommande.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ total_estime_commande: 70 }) }),
        );
    });

    it('ne descend jamais sous 0', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue({ id: 1, total_estime_commande: 20, commentaire_global: '' });
        await appliquerReduction(1, 'GESTE', 50, false);
        expect(prismaMock.tcommande.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ total_estime_commande: 0 }) }),
        );
    });

    it('rejette si la commande est introuvable', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue(null);
        await expect(appliquerReduction(99, 'X', 10)).rejects.toThrow(/non trouvée/i);
    });
});

describe('addPaiement', () => {
    it('renvoie PAYE_PARTIEL quand le total payé est insuffisant', async () => {
        prismaMock.tpaiement.findMany.mockResolvedValue([{ montant_paiement: 30 }]);
        prismaMock.tcommande.findUnique.mockResolvedValue({ id: 1, total_estime_commande: 100, client_id: null, tclient: null });

        const res = await addPaiement(1, 30, 'CB');

        expect(prismaMock.tpaiement.create).toHaveBeenCalled();
        expect(res).toEqual({ statut: 'PAYE_PARTIEL', totalPaye: 30, reste: 70 });
    });

    it('déclenche la finalisation (PAYE_COMPLET) quand le solde est couvert', async () => {
        prismaMock.tpaiement.findMany.mockResolvedValue([{ montant_paiement: 100 }]);
        prismaMock.tcommande.findUnique.mockResolvedValue({
            id: 1, total_estime_commande: 100, statut_commande: 'EN_ATTENTE',
            client_id: 5, session_table_id: null, tclient: null,
        });

        const res = await addPaiement(1, 100, 'CB');

        // statut EN_ATTENTE -> EN_PREPARATION lors du paiement complet
        expect(prismaMock.tcommande.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { statut_commande: 'EN_PREPARATION' },
        });
        // points fidélité crédités au client
        expect(fideliteMock.ajouterPoints).toHaveBeenCalledWith(5, 100);
        expect(res).toMatchObject({ statut: 'PAYE_COMPLET', totalPaye: 100 });
    });

    it('rejette si la commande est introuvable', async () => {
        prismaMock.tpaiement.findMany.mockResolvedValue([]);
        prismaMock.tcommande.findUnique.mockResolvedValue(null);
        await expect(addPaiement(99, 10, 'CB')).rejects.toThrow(/non trouvée/i);
    });
});

describe('annulerCommande', () => {
    it('restaure le stock des lignes actives puis passe la commande en ANNULEE', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue({
            id: 1,
            tlignecommande: [
                { plat_id: 10, quantite: 2, statut_service: 'EN_ATTENTE' },
                { plat_id: 20, quantite: 1, statut_service: 'ANNULEE' }, // déjà annulée -> ignorée
                { plat_id: 30, quantite: 3, statut_service: 'SERVIE' },
            ],
        });
        // $transaction exécute le callback avec un tx mocké
        const tx = { tcommande: { update: vi.fn().mockResolvedValue({ id: 1, statut_commande: 'ANNULEE' }) } };
        prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));

        await annulerCommande(1, 'Erreur cuisine');

        // Seules les 2 lignes non-ANNULEE doivent restituer du stock
        expect(stockMock.restoreIngredients).toHaveBeenCalledTimes(2);
        expect(stockMock.restoreIngredients).toHaveBeenCalledWith(10, 2, tx);
        expect(stockMock.restoreIngredients).toHaveBeenCalledWith(30, 3, tx);
        expect(stockMock.restoreIngredients).not.toHaveBeenCalledWith(20, 1, tx);
        expect(tx.tcommande.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ statut_commande: 'ANNULEE' }) }),
        );
    });

    it('rejette si la commande est introuvable', async () => {
        prismaMock.tcommande.findUnique.mockResolvedValue(null);
        await expect(annulerCommande(99, 'x')).rejects.toThrow(/introuvable/i);
    });
});

describe('payerParChequeCadeau', () => {
    it('rejette si la commande est déjà entièrement payée', async () => {
        prismaMock.tpaiement.findMany.mockResolvedValue([{ montant_paiement: 100 }]);
        prismaMock.tcommande.findUnique.mockResolvedValue({ id: 1, total_estime_commande: 100 });
        await expect(payerParChequeCadeau(1, 'CHQ123')).rejects.toThrow(/déjà payée/i);
        expect(chequesMock.useCheque).not.toHaveBeenCalled();
    });

    it('utilise le chèque pour le reste à payer', async () => {
        // 1er appel findMany : calcul du reste (40 déjà payés sur 100 -> reste 60)
        prismaMock.tpaiement.findMany
            .mockResolvedValueOnce([{ montant_paiement: 40 }])
            // 2e appel findMany : déclenché par addPaiement (chaîné)
            .mockResolvedValueOnce([{ montant_paiement: 40 }, { montant_paiement: 60 }]);
        prismaMock.tcommande.findUnique.mockResolvedValue({
            id: 1, total_estime_commande: 100, statut_commande: 'EN_ATTENTE', client_id: null, session_table_id: null, tclient: null,
        });
        chequesMock.useCheque.mockResolvedValue({ montantUtilise: 60 });

        await payerParChequeCadeau(1, 'CHQ123');

        expect(chequesMock.useCheque).toHaveBeenCalledWith('CHQ123', 60);
        // le paiement chèque cadeau est enregistré via addPaiement
        expect(prismaMock.tpaiement.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ methode_paiement: 'CHEQUE_CADEAU', montant_paiement: 60 }) }),
        );
    });

    it('rejette si la commande est introuvable', async () => {
        prismaMock.tpaiement.findMany.mockResolvedValue([]);
        prismaMock.tcommande.findUnique.mockResolvedValue(null);
        await expect(payerParChequeCadeau(99, 'CHQ')).rejects.toThrow(/non trouvée/i);
    });
});

describe('creerCommandeService — gardes de validation', () => {
    const baseItems = [{ id: 1, quantite: 1 }];

    it('rejette un type de commande invalide', async () => {
        await expect(creerCommandeService({ items: baseItems, type_commande: 'TELEPORTATION' as any }))
            .rejects.toThrow(/Type de commande invalide/i);
    });

    it('rejette un mode de paiement invalide', async () => {
        await expect(creerCommandeService({ items: baseItems, mode_paiement: 'BITCOIN' }))
            .rejects.toThrow(/Mode de paiement invalide/i);
    });

    it('rejette une commande sans articles', async () => {
        await expect(creerCommandeService({ items: [] }))
            .rejects.toThrow(/Aucun article/i);
    });

    it('rejette si le stock est insuffisant pour un plat', async () => {
        prismaMock.tplat.findMany.mockResolvedValue([{ id: 1, prix_plat: 10 }]);
        fideliteMock.getOffresActives.mockResolvedValue([]);
        // dans la transaction : stock dispo (0) < quantité demandée (2)
        stockMock.checkDishAvailability.mockResolvedValue(0);
        prismaMock.$transaction.mockImplementation((cb: any) => cb({ tcommande: { create: vi.fn() } }));

        await expect(creerCommandeService({ items: [{ id: 1, quantite: 2 }], table_id: null }))
            .rejects.toThrow(/Stock insuffisant/i);
    });
});
