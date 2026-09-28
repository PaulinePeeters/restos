import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks des dépendances externes ---
// vi.hoisted : nécessaire car vi.mock est remonté en haut du fichier.
const { prismaMock, getConfigNumberMock } = vi.hoisted(() => ({
    prismaMock: {
        tclient: { update: vi.fn() },
        trecompense: { findUnique: vi.fn() },
        tevenement: { findUnique: vi.fn(), update: vi.fn() },
        tclient_recompense: { create: vi.fn() },
        $transaction: vi.fn(),
    },
    getConfigNumberMock: vi.fn(),
}));
vi.mock('../../src/db.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/utils/logger.js', () => ({
    logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../src/utils/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/utils/emailTemplates.js', () => ({ eventEmail: vi.fn(() => '<html></html>') }));

vi.mock('../../src/services/configuration.service.js', () => ({
    CONFIG_KEYS: { POINTS_PER_EURO: 'POINTS_PER_EURO' },
    getConfigNumber: getConfigNumberMock,
}));

import {
    ajouterPoints,
    utiliserPoints,
    toggleVipStatus,
    deleteOffre,
} from '../../src/services/fidelite.service.js';

beforeEach(() => {
    vi.clearAllMocks();
    getConfigNumberMock.mockResolvedValue(1); // 1€ = 1 point par défaut
});

describe('ajouterPoints', () => {
    it('crédite floor(montant * ratio) points au client', async () => {
        await ajouterPoints(5, 12.9);
        expect(prismaMock.tclient.update).toHaveBeenCalledWith({
            where: { id_client: 5 },
            data: { points_fidelite: { increment: 12 } },
        });
    });

    it('applique le ratio points/euro configuré', async () => {
        getConfigNumberMock.mockResolvedValue(2);
        await ajouterPoints(5, 10);
        expect(prismaMock.tclient.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { points_fidelite: { increment: 20 } } }),
        );
    });

    it('gère un montant de type Decimal (objet avec toNumber)', async () => {
        await ajouterPoints(5, { toNumber: () => 7.5 });
        expect(prismaMock.tclient.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { points_fidelite: { increment: 7 } } }),
        );
    });

    it('ne fait rien si clientId est absent', async () => {
        await ajouterPoints(0 as any, 50);
        expect(prismaMock.tclient.update).not.toHaveBeenCalled();
    });

    it('ne fait rien pour un montant nul ou négatif', async () => {
        await ajouterPoints(5, 0);
        await ajouterPoints(5, -10);
        expect(prismaMock.tclient.update).not.toHaveBeenCalled();
    });

    it('ne crédite rien si le montant arrondi donne 0 point', async () => {
        await ajouterPoints(5, 0.4); // floor(0.4) = 0
        expect(prismaMock.tclient.update).not.toHaveBeenCalled();
    });

    it('avale les erreurs Prisma sans rejeter', async () => {
        prismaMock.tclient.update.mockRejectedValueOnce(new Error('DB down'));
        await expect(ajouterPoints(5, 10)).resolves.toBeUndefined();
    });
});

describe('utiliserPoints', () => {
    // $transaction reçoit un callback et lui passe un client transactionnel
    function mockTransaction(tx: any) {
        prismaMock.$transaction.mockImplementation((cb: any) => cb(tx));
    }

    it('déduit les points et enregistre la récompense quand le solde suffit', async () => {
        const tx = {
            tclient: { findUnique: vi.fn().mockResolvedValue({ id_client: 1, points_fidelite: 100 }), update: vi.fn() },
            trecompense: { findUnique: vi.fn().mockResolvedValue({ id: 9, cout_points: 30, nom: 'Café offert' }) },
            tclient_recompense: { create: vi.fn() },
        };
        mockTransaction(tx);

        const result = await utiliserPoints(1, 9);

        expect(tx.tclient.update).toHaveBeenCalledWith({
            where: { id_client: 1 },
            data: { points_fidelite: { decrement: 30 } },
        });
        expect(tx.tclient_recompense.create).toHaveBeenCalled();
        expect(result).toMatchObject({ success: true, pointsRestants: 70 });
    });

    it('rejette si le solde est insuffisant', async () => {
        const tx = {
            tclient: { findUnique: vi.fn().mockResolvedValue({ id_client: 1, points_fidelite: 10 }), update: vi.fn() },
            trecompense: { findUnique: vi.fn().mockResolvedValue({ id: 9, cout_points: 50, nom: 'X' }) },
            tclient_recompense: { create: vi.fn() },
        };
        mockTransaction(tx);

        await expect(utiliserPoints(1, 9)).rejects.toThrow(/insuffisant/i);
        expect(tx.tclient.update).not.toHaveBeenCalled();
    });

    it('rejette si client ou récompense introuvable', async () => {
        const tx = {
            tclient: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
            trecompense: { findUnique: vi.fn().mockResolvedValue({ id: 9, cout_points: 5 }) },
            tclient_recompense: { create: vi.fn() },
        };
        mockTransaction(tx);

        await expect(utiliserPoints(1, 9)).rejects.toThrow(/introuvable/i);
    });
});

describe('toggleVipStatus', () => {
    it('met à jour le statut VIP', async () => {
        await toggleVipStatus(4, true);
        expect(prismaMock.tclient.update).toHaveBeenCalledWith({
            where: { id_client: 4 },
            data: { est_vip: true },
        });
    });

    it('rejette si l’ID client est manquant', async () => {
        await expect(toggleVipStatus(0 as any, true)).rejects.toThrow(/ID Client/i);
    });
});

describe('deleteOffre', () => {
    it('désactive (soft delete) une offre existante', async () => {
        prismaMock.tevenement.findUnique.mockResolvedValue({ id: 2, actif: true });
        await deleteOffre('2');
        expect(prismaMock.tevenement.update).toHaveBeenCalledWith({
            where: { id: 2 },
            data: { actif: false },
        });
    });

    it('rejette si l’offre est introuvable', async () => {
        prismaMock.tevenement.findUnique.mockResolvedValue(null);
        await expect(deleteOffre(123)).rejects.toThrow(/introuvable/i);
    });
});
