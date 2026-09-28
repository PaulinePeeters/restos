import { Request, Response } from 'express';
import * as statsService from '../services/stats.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Récupère les statistiques pour le dashboard principal.
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const { date, range } = req.query;
    const filterStr = (range as string) || (date as string) || 'today';

    const [
        couverts,
        platsPlusVendus,
        heuresAffluence,
        historiqueCommandes,
        finances
    ] = await Promise.all([
        statsService.countCouverts(filterStr),
        statsService.getPlatsPlusVendus(filterStr),
        statsService.getHeuresAffluence(filterStr),
        statsService.getHistoriqueCommandes(filterStr),
        statsService.getChiffreAffaires(filterStr)
    ]);

    res.json({
        periode: filterStr,
        couvertsJour: couverts,
        platsPlusVendus,
        heuresAffluence,
        historiqueCommandes,
        finances // { chiffreAffaires, totalCouverts, panierMoyen }
    });
});
