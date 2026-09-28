import { prisma } from '../db.js';
import type { tclient, tadresselivraison } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config.js';
import { ConflictError, UnauthorizedError } from '../utils/AppError.js';

/** Données pour l'inscription d'un client */
interface RegisterClientData {
    nom_client: string;
    email_client: string;
    tel_client?: string;
    entreprise?: string;
    tva?: string;
    mot_de_passe: string;
    adresse?: {
        rue: string;
        numero: string;
        cp: string;
        ville: string;
        est_par_defaut?: boolean;
    };
}

/** Données pour la connexion d'un client */
interface LoginClientData {
    email_client: string;
    mot_de_passe: string;
}

/** Données pour une adresse */
interface AddressData {
    rue: string;
    numero: string;
    cp: string;
    ville: string;
}

/** Client sans mot de passe */
type ClientSafe = Omit<tclient, 'mdp_client'>;

/**
 * Trouve un client par son email.
 */
export async function findClientByEmail(email: string): Promise<tclient | null> {
    return prisma.tclient.findUnique({
        where: { email_client: email }
    });
}

/**
 * Inscrit un nouveau client.
 */
export async function registerClient(data: RegisterClientData): Promise<{ message: string; client: ClientSafe }> {
    const { nom_client, email_client, tel_client, entreprise, tva, mot_de_passe, adresse } = data;

    const existing = await findClientByEmail(email_client);
    if (existing) throw new ConflictError("Un compte existe déjà avec cet email.");

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const newClient = await prisma.$transaction(async (tx) => {
        const client = await tx.tclient.create({
            data: {
                nom_client,
                email_client,
                tel_client: tel_client ?? null,
                entreprise: entreprise ?? null,
                tva: tva ?? null,
                mdp_client: hashedPassword,
                date_creation_client: new Date()
            }
        });

        if (adresse) {
            await tx.tadresselivraison.create({
                data: {
                    rue_adresse: adresse.rue,
                    numero_adresse: adresse.numero,
                    cp_adresse: adresse.cp,
                    ville_adresse: adresse.ville,
                    est_par_defaut: adresse.est_par_defaut ?? true,
                    client_id: client.id_client
                }
            });
        }

        return client;
    });

    const { mdp_client, ...clientWithoutPass } = newClient;
    return { message: "Inscription réussie", client: clientWithoutPass };
}

/**
 * Connecte un client et génère un token JWT.
 */
export async function loginClient(data: LoginClientData): Promise<{ message: string; token: string; client: ClientSafe }> {
    const { email_client, mot_de_passe } = data;

    const client = await findClientByEmail(email_client);
    if (!client) throw new UnauthorizedError("Email ou mot de passe incorrect.");
    if (!client.mdp_client) throw new UnauthorizedError("Compte invalide.");

    const passwordOK = await bcrypt.compare(mot_de_passe, client.mdp_client);
    if (!passwordOK) throw new UnauthorizedError("Email ou mot de passe incorrect.");

    if (!client.actif) {
        throw new UnauthorizedError("Ce compte est désactivé.");
    }

    const token = jwt.sign(
        { id: client.id_client, role: 'client' },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    const { mdp_client, ...clientInfo } = client;
    return { message: "Connexion réussie", token, client: clientInfo };
}

/**
 * Récupère un client par son ID.
 */
export async function getClientById(id_client: number) {
    return prisma.tclient.findUnique({
        where: { id_client },
        select: {
            id_client: true,
            nom_client: true,
            email_client: true,
            tel_client: true,
            points_fidelite: true,
            tadresselivraison: {
                where: { est_par_defaut: true },
                take: 1
            }
        }
    });
}

/**
 * Récupère un client par son ID avec ses commandes et adresses.
 */
export async function getClientWithOrders(id_client: number) {
    return prisma.tclient.findUnique({
        where: { id_client },
        include: {
            tadresselivraison: true,
            tcommande: {
                orderBy: { date_heure_commande: 'desc' },
                include: {
                    tlignecommande: { include: { tplat: true } }
                }
            }
        }
    });
}

/**
 * Met à jour ou crée l'adresse par défaut d'un client.
 */
export async function updateClientAddress(
    clientId: number,
    addressData: AddressData
): Promise<tadresselivraison> {
    const existingAddress = await prisma.tadresselivraison.findFirst({
        where: { client_id: clientId, est_par_defaut: true }
    });

    if (existingAddress) {
        return prisma.tadresselivraison.update({
            where: { id: existingAddress.id },
            data: {
                rue_adresse: addressData.rue,
                numero_adresse: addressData.numero,
                cp_adresse: addressData.cp,
                ville_adresse: addressData.ville
            }
        });
    }

    return prisma.tadresselivraison.create({
        data: {
            client_id: clientId,
            rue_adresse: addressData.rue,
            numero_adresse: addressData.numero,
            cp_adresse: addressData.cp,
            ville_adresse: addressData.ville,
            est_par_defaut: true
        }
    });
}

/**
 * Récupère tous les clients.
 */
export async function getAllClients() {
    return prisma.tclient.findMany({
        where: { actif: true },
        select: {
            id_client: true,
            nom_client: true,
            email_client: true,
            tel_client: true,
            points_fidelite: true,
            date_creation_client: true,
            est_vip: true,
            actif: true
        },
        orderBy: {
            date_creation_client: 'desc'
        }
    });
}

/**
 * Met à jour le profil d'un client (nom, tél, entreprise, tva).
 */
export async function updateClientProfile(
    clientId: number,
    data: { nom_client?: string; tel_client?: string; entreprise?: string; tva?: string }
): Promise<ClientSafe> {
    const updated = await prisma.tclient.update({
        where: { id_client: clientId },
        data: {
            ...(data.nom_client !== undefined && { nom_client: data.nom_client }),
            ...(data.tel_client !== undefined && { tel_client: data.tel_client }),
            ...(data.entreprise !== undefined && { entreprise: data.entreprise }),
            ...(data.tva !== undefined && { tva: data.tva })
        }
    });
    
    const { mdp_client, ...safeClient } = updated;
    return safeClient;
}

/**
 * Supprime un client conformément au RGPD (art. 17 — droit à l'oubli).
 * Les données personnelles sont anonymisées, mais le compte et l'historique
 * des commandes sont conservés pour respecter les obligations comptables
 * belges (Code TVA art. 60 — conservation 7 ans).
 */
export async function deleteClient(clientId: number) {
    return prisma.$transaction(async (tx) => {
        // Anonymiser les adresses de livraison
        await tx.tadresselivraison.updateMany({
            where: { client_id: clientId },
            data: {
                rue_adresse: 'Anonymisé',
                numero_adresse: '0',
                cp_adresse: '0000',
                ville_adresse: 'Anonymisé'
            }
        });

        // Anonymiser les données personnelles du client
        return tx.tclient.update({
            where: { id_client: clientId },
            data: {
                actif: false,
                nom_client: 'Client supprimé',
                email_client: `deleted_${clientId}_${Date.now()}@anonymized.local`,
                tel_client: null,
                mdp_client: 'ANONYMIZED',
                entreprise: null,
                tva: null
            }
        });
    });
}
