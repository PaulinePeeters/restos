/**
 * Dictionnaire d'erreurs multilingue pour RestOS.
 * 
 * Le backend renvoie désormais un champ `code` machine (ex: 'NOT_FOUND', 'CONFLICT')
 * en plus du champ `error` (texte FR par défaut). Ce dictionnaire permet au frontend
 * de traduire ces codes dans la langue de l'utilisateur.
 *
 * Usage :
 *   import { getErrorMessage } from './errorMessages';
 *   const msg = getErrorMessage(apiError, language);
 */

type Language = 'fr' | 'en' | 'nl';

const errorMessages: Record<Language, Record<string, string>> = {
    fr: {
        // Erreurs génériques
        'NOT_FOUND': 'Ressource non trouvée.',
        'VALIDATION_ERROR': 'Données invalides.',
        'CONFLICT': 'Cette ressource existe déjà.',
        'FK_CONSTRAINT': 'Suppression impossible : données liées existantes.',
        'UNAUTHORIZED': 'Session expirée ou identifiants incorrects.',
        'FORBIDDEN': 'Accès interdit.',
        'INTERNAL_ERROR': 'Une erreur est survenue. Veuillez réessayer.',
        'UPLOAD_ERROR': 'Erreur lors de l\'envoi du fichier.',
        'CORS_ERROR': 'Origine non autorisée.',

        // Erreurs métier
        'STOCK_INSUFFICIENT': 'Stock insuffisant pour ce plat.',
        'ORDER_NOT_PAID': 'La commande n\'est pas encore réglée.',
        'SESSION_ALREADY_ACTIVE': 'Une session est déjà ouverte pour cette table.',
        'TABLE_RESERVED': 'Cette table est réservée.',
        'CHEQUE_EXPIRED': 'Ce chèque cadeau a expiré.',
        'CHEQUE_EMPTY': 'Ce chèque cadeau est épuisé.',
    },
    en: {
        // Generic errors
        'NOT_FOUND': 'Resource not found.',
        'VALIDATION_ERROR': 'Invalid data.',
        'CONFLICT': 'This resource already exists.',
        'FK_CONSTRAINT': 'Cannot delete: linked data exists.',
        'UNAUTHORIZED': 'Session expired or invalid credentials.',
        'FORBIDDEN': 'Access denied.',
        'INTERNAL_ERROR': 'An error occurred. Please try again.',
        'UPLOAD_ERROR': 'File upload error.',
        'CORS_ERROR': 'Origin not allowed.',

        // Business errors
        'STOCK_INSUFFICIENT': 'Insufficient stock for this dish.',
        'ORDER_NOT_PAID': 'The order has not been paid yet.',
        'SESSION_ALREADY_ACTIVE': 'A session is already open for this table.',
        'TABLE_RESERVED': 'This table is reserved.',
        'CHEQUE_EXPIRED': 'This gift card has expired.',
        'CHEQUE_EMPTY': 'This gift card has no balance.',
    },
    nl: {
        // Generieke fouten
        'NOT_FOUND': 'Bron niet gevonden.',
        'VALIDATION_ERROR': 'Ongeldige gegevens.',
        'CONFLICT': 'Deze bron bestaat al.',
        'FK_CONSTRAINT': 'Kan niet verwijderen: gekoppelde gegevens bestaan.',
        'UNAUTHORIZED': 'Sessie verlopen of ongeldige inloggegevens.',
        'FORBIDDEN': 'Toegang geweigerd.',
        'INTERNAL_ERROR': 'Er is een fout opgetreden. Probeer het opnieuw.',
        'UPLOAD_ERROR': 'Fout bij het uploaden van bestand.',
        'CORS_ERROR': 'Oorsprong niet toegestaan.',

        // Bedrijfsfouten
        'STOCK_INSUFFICIENT': 'Onvoldoende voorraad voor dit gerecht.',
        'ORDER_NOT_PAID': 'De bestelling is nog niet betaald.',
        'SESSION_ALREADY_ACTIVE': 'Er is al een sessie geopend voor deze tafel.',
        'TABLE_RESERVED': 'Deze tafel is gereserveerd.',
        'CHEQUE_EXPIRED': 'Deze cadeaubon is verlopen.',
        'CHEQUE_EMPTY': 'Deze cadeaubon heeft geen saldo.',
    }
};

/**
 * Traduit un code d'erreur API dans la langue courante.
 * Si le code n'est pas trouvé, utilise le message texte du backend comme fallback.
 *
 * @param apiError - Objet d'erreur renvoyé par l'API { code?: string, error?: string }
 * @param lang - Langue courante ('fr', 'en', 'nl')
 * @returns Message d'erreur traduit
 */
export function getErrorMessage(
    apiError: { code?: string; error?: string; message?: string },
    lang: Language = 'fr'
): string {
    // 1. Tenter la traduction via le code machine
    if (apiError.code && errorMessages[lang]?.[apiError.code]) {
        return errorMessages[lang][apiError.code];
    }

    // 2. Fallback : message texte du backend
    return apiError.error || apiError.message || errorMessages[lang]['INTERNAL_ERROR'];
}

export default errorMessages;
