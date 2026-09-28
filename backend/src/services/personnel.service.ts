import { prisma } from '../db.js';
import bcrypt from 'bcrypt';
import { hashPassword } from "../utils/helpers.js";
import jwt from 'jsonwebtoken';
import { Prisma, type tpersonnel, Role } from '@prisma/client';
import { JWT_SECRET } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Champs retournés pour le personnel.
 */
const PERSONNEL_SELECT = {
    id: true,
    nom_personnel: true,
    prenom_personnel: true,
    email_personnel: true,
    role_personnel: true,
    actif: true,
    solde_conges: true,
    solde_recuperation: true,
} as const;

/**
 * Interface pour la création d'un membre du personnel
 */
interface CreatePersonnelData {
    nom_personnel: string;
    prenom_personnel: string;
    email_personnel: string;
    mdp_personnel: string;
    role_personnel: string;
    actif: boolean;
}

/**
 * Interface pour la mise à jour d'un membre du personnel
 */
interface UpdatePersonnelData {
    nom_personnel?: string;
    prenom_personnel?: string;
    email_personnel?: string;
    mdp_personnel?: string;
    role_personnel?: string;
    actif?: boolean;
}

/**
 * Récupère tous les membres du personnel.
 */
export const getAllPersonnels = async () => {
    return prisma.tpersonnel.findMany({
        select: PERSONNEL_SELECT
    });
};

/**
 * Récupère les membres actifs du personnel.
 */
export const getPersonnelsActifs = async () => {
    return prisma.tpersonnel.findMany({
        where: { actif: true },
        select: PERSONNEL_SELECT
    });
};

/**
 * Trouve un membre du personnel par son ID.
 */
export const getPersonnelById = async (id: number | string) => {
    return prisma.tpersonnel.findUnique({
        where: { id: Number(id) },
        select: PERSONNEL_SELECT
    });
};

/**
 * Crée un nouveau membre du personnel.
 * Hash le mot de passe avant insertion.
 * Vérifie d'abord si l'email existe déjà.
 */
export async function createPersonnel(data: CreatePersonnelData) {
    // Vérification doublon email
    const existing = await prisma.tpersonnel.findUnique({
        where: { email_personnel: data.email_personnel }
    });

    if (existing) {
        throw new Error("Cet email est déjà utilisé par un autre membre du personnel.");
    }

    const hashedPassword = await hashPassword(data.mdp_personnel);

    return prisma.tpersonnel.create({
        data: {
            nom_personnel: data.nom_personnel,
            prenom_personnel: data.prenom_personnel,
            email_personnel: data.email_personnel,
            mdp_personnel: hashedPassword,
            role_personnel: data.role_personnel as Role,
            actif: data.actif,
        },
        select: PERSONNEL_SELECT
    });
}

/**
 * Met à jour un membre du personnel.
 * Ne met à jour le mot de passe que s'il est fourni.
 */
export const updatePersonnel = async (id: number | string, data: UpdatePersonnelData) => {
    // Vérifie si le membre du personnel existe
    const existingPersonnel = await prisma.tpersonnel.findUnique({ where: { id: Number(id) } });
    if (!existingPersonnel) {
        throw new Error("Personnel introuvable.");
    }

    // Vérification doublon email si l'email change
    if (data.email_personnel && data.email_personnel !== existingPersonnel.email_personnel) {
        const emailExists = await prisma.tpersonnel.findUnique({
            where: { email_personnel: data.email_personnel }
        });
        if (emailExists) {
            throw new Error("Cet email est déjà utilisé par un autre membre du personnel.");
        }
    }

    const updateData: Prisma.tpersonnelUpdateInput = {};

    if (data.nom_personnel) updateData.nom_personnel = data.nom_personnel;
    if (data.prenom_personnel) updateData.prenom_personnel = data.prenom_personnel;
    if (data.email_personnel) updateData.email_personnel = data.email_personnel;
    if (data.role_personnel) updateData.role_personnel = data.role_personnel as Role;
    if (data.actif !== undefined) updateData.actif = data.actif;

    if (data.mdp_personnel && data.mdp_personnel.trim() !== '') {
        updateData.mdp_personnel = await hashPassword(data.mdp_personnel);
    }

    return prisma.tpersonnel.update({
        where: { id: Number(id) },
        data: updateData,
        select: PERSONNEL_SELECT
    });
};

/**
 * Désactive un membre du personnel.
 * Les données sont conservées pour l'historique RH, la paie et les obligations légales.
 */
export const deletePersonnel = async (id: number | string) => {
    const personnel = await prisma.tpersonnel.findUnique({ where: { id: Number(id) } });
    if (!personnel) throw new Error("Personnel introuvable.");
    if (!personnel.actif) throw new Error("Ce membre du personnel est déjà désactivé.");

    return prisma.tpersonnel.update({
        where: { id: Number(id) },
        data: { actif: false },
        select: PERSONNEL_SELECT
    });
};

/**
 * Authentifie un membre du personnel.
 * Vérifie l'email et le mot de passe, puis génère un token JWT.
 */
export async function loginPersonnel(email_personnel: string, mdp_personnel: string) {
    logger.debug("Tentative de connexion pour :", email_personnel);

    const personnel = await prisma.tpersonnel.findFirst({
        where: { email_personnel }
    });

    if (!personnel) {
        logger.debug("Aucun personnel trouvé avec cet email.");
        throw new Error("Email ou mot de passe incorrect");
    }

    const isMatch = await bcrypt.compare(mdp_personnel, personnel.mdp_personnel);

    if (!isMatch) {
        throw new Error("Email ou mot de passe incorrect");
    }

    if (!personnel.actif) {
        throw new Error("Ce compte est désactivé. Contactez votre manager.");
    }

    // Génération du token JWT
    const token = jwt.sign(
        {
            id: personnel.id,
            role: personnel.role_personnel,
            nom: personnel.nom_personnel,
            prenom: personnel.prenom_personnel
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    return {
        token,
        personnel: {
            id: personnel.id,
            nom_personnel: personnel.nom_personnel,
            prenom_personnel: personnel.prenom_personnel,
            email_personnel: personnel.email_personnel,
            role_personnel: personnel.role_personnel
        }
    };
}
