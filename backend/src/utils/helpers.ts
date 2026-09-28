import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;


/**
 * Hash un mot de passe
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Valide et convertit un paramètre ID de requête Express.
 * Si l'ID est invalide (NaN), renvoie null.
 */
export function getIdParam(reqId: string): number | null {
    const id = Number(reqId);
    if (isNaN(id)) return null;
    return id;
}

/**
 * Construit un objet Date de manière sécurisée à partir d'une date (YYYY-MM-DD) et d'une heure (HH:MM).
 * La date est construite en heure locale du serveur.
 */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
    try {
        if (typeof dateStr !== 'string' || typeof timeStr !== 'string') return null;

        const [y, m, d] = dateStr.split('-').map(Number);
        const [h, min] = timeStr.split(':').map(Number);

        const date = new Date(y, m - 1, d, h, min, 0);

        if (isNaN(date.getTime())) return null;
        return date;
    } catch {
        return null;
    }
}
