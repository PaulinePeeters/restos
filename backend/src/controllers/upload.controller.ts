import { Request, Response } from 'express';
import { updateConfig } from '../services/configuration.service.js';
import { unlink } from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Upload le logo du restaurant et met à jour la configuration.
 */
export const uploadLogoController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new ValidationError('Aucun fichier fourni.');
    }

    // Utiliser BASE_URL configuré 
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    try {
        await updateConfig('RESTAURANT_LOGO', fileUrl);
        res.json({ url: fileUrl });
    } catch (error) {
        // Supprimer le fichier uploadé si l'update DB a échoué
        if (req.file?.path) {
            try {
                await unlink(req.file.path);
                logger.info('Fichier orphelin supprimé:', req.file.path);
            } catch (unlinkError) {
                logger.error('Erreur suppression fichier orphelin:', unlinkError);
            }
        }
        throw error;
    }
});
