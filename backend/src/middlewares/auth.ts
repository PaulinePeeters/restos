import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { JWT_SECRET } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        role: string;
        type: 'personnel' | 'client';
        [key: string]: any;
    };
    client?: any;
}

/**
 * Middleware d'authentification.
 * Vérifie l'authentification et ajoute l'utilisateur au request.
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ code: 'UNAUTHORIZED', error: "Token manquant" });

    const token = authHeader.split(' ')[1];

    try {
        const payload: any = jwt.verify(token, JWT_SECRET);

        // Détection du type d'utilisateur basé sur le payload
        if (payload.role && payload.role !== 'client') {
            // membre du personnel
            const personnel = await prisma.tpersonnel.findUnique({
                where: { id: payload.id },
                select: {
                    id: true,
                    role_personnel: true,
                    nom_personnel: true,
                    prenom_personnel: true,
                    actif: true
                }
            });

            if (!personnel) return res.status(401).json({ code: 'UNAUTHORIZED', error: "Personnel non trouvé" });
            if (!personnel.actif) return res.status(403).json({ code: 'FORBIDDEN', error: "Compte désactivé" });

            req.user = {
                id: personnel.id,
                role: personnel.role_personnel,
                type: 'personnel',
                nom: personnel.nom_personnel,
                prenom: personnel.prenom_personnel
            };
        } else {
            // client — NE PAS charger les commandes ici
            const client = await prisma.tclient.findUnique({
                where: { id_client: payload.id },
                select: {
                    id_client: true,
                    nom_client: true,
                    email_client: true,
                    tel_client: true,
                    points_fidelite: true,
                }
            });

            if (!client) return res.status(401).json({ code: 'UNAUTHORIZED', error: "Client non trouvé" });

            req.user = {
                id: client.id_client,
                role: 'client',
                type: 'client',
                nom: client.nom_client,
                email: client.email_client
            };
            req.client = client;
        }

        next();
    } catch (error) {
        logger.debug("Token invalide ou expiré:", error);
        return res.status(401).json({ code: 'UNAUTHORIZED', error: "Session expirée. Veuillez vous reconnecter." });
    }
};

/**
 * Middleware d'authentification OPTIONNEL.
 * Ajoute l'utilisateur au request s'il est présent et valide, sinon laisse passer.
 */
export const optionalAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    try {
        const payload: any = jwt.verify(token, JWT_SECRET);
        if (payload.id) {
            if (payload.role && payload.role !== 'client') {
                const personnel = await prisma.tpersonnel.findUnique({
                    where: { id: payload.id },
                    select: { id: true, role_personnel: true, nom_personnel: true, prenom_personnel: true, actif: true }
                });
                if (personnel && personnel.actif) {
                    req.user = { id: personnel.id, role: personnel.role_personnel, type: 'personnel', nom: personnel.nom_personnel, prenom: personnel.prenom_personnel };
                }
            } else {
                const client = await prisma.tclient.findUnique({
                    where: { id_client: payload.id },
                    select: { id_client: true, nom_client: true, email_client: true }
                });
                if (client) {
                    req.user = { id: client.id_client, role: 'client', type: 'client', nom: client.nom_client, email: client.email_client };
                    req.client = client;
                }
            }
        }
        next();
    } catch (error) {
        next();
    }
};

/**
 * Middleware pour vérifier les rôles (RBAC).
 * @param {string[]} allowedRoles - Liste des rôles autorisés 
 */
export const authorize = (allowedRoles: string[] = []) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ code: 'UNAUTHORIZED', error: "Non authentifié" });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ code: 'FORBIDDEN', error: "Accès interdit : droits insuffisants" });
        }

        next();
    };
};
