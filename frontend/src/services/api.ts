import BACKEND_URL from '../config';
import { addToQueue, cacheResponse, getCachedResponse } from './offlineStorage';
import toast from 'react-hot-toast';

interface Headers {
    [key: string]: string;
}

interface ApiResponse {
    [key: string]: any; 
}

interface GetOptions {
    params?: Record<string, string | number | boolean | null | undefined>;
}

class ApiHttpError extends Error {
    status: number;
    code?: string;

    constructor(status: number, message: string, code?: string) {
        super(message);
        this.name = 'ApiHttpError';
        this.status = status;
        this.code = code;
    }
}

const STAFF_AUTH_REDIRECT_MESSAGE_KEY = 'staffAuthRedirectMessage';
let isRedirectingToStaffLogin = false;
// Vérifie si le serveur a une session active
const hasStaffSession = (): boolean => {
    return Boolean(
        sessionStorage.getItem('staffToken') ||
        sessionStorage.getItem('activeStaffId') ||
        localStorage.getItem('staffToken') ||
        localStorage.getItem('activeStaffId') ||
        localStorage.getItem('staffSessions')
    );
};
// Supprime la session active du serveur
const clearActiveStaffSession = (): void => {
    const activeStaffId = sessionStorage.getItem('activeStaffId') || localStorage.getItem('activeStaffId');

    sessionStorage.removeItem('staffToken');
    sessionStorage.removeItem('staffUser');
    sessionStorage.removeItem('activeStaffId');

    localStorage.removeItem('staffToken');
    localStorage.removeItem('activeStaffId');

    const sessionsStr = localStorage.getItem('staffSessions');
    if (!sessionsStr || !activeStaffId) {
        return;
    }

    try {
        const sessions = JSON.parse(sessionsStr);
        if (sessions?.[activeStaffId]) {
            delete sessions[activeStaffId];
            if (Object.keys(sessions).length === 0) {
                localStorage.removeItem('staffSessions');
            } else {
                localStorage.setItem('staffSessions', JSON.stringify(sessions));
            }
        }
    } catch (e) {
        console.error('Error parsing staffSessions', e);
    }
};
// Vérifie si le serveur doit gérer l'expiration de la session
const shouldHandleStaffAuthExpiry = (status: number, message: string): boolean => {
    if (status !== 401) {
        return false;
    }

    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes('session expir') ||
        normalizedMessage.includes('token invalide') ||
        normalizedMessage.includes('token manquant') ||
        normalizedMessage.includes('non authentifi') ||
        normalizedMessage.includes('personnel non trouv');
};

// Redirige vers la page de connexion du serveur
const redirectToStaffLogin = (message: string): void => {
    if (isRedirectingToStaffLogin || window.location.pathname === '/login-staff') {
        return;
    }

    isRedirectingToStaffLogin = true;
    sessionStorage.setItem(STAFF_AUTH_REDIRECT_MESSAGE_KEY, message);
    window.location.assign('/login-staff');
};

const isCacheableEndpoint = (endpoint: string): boolean => {
    return !endpoint.startsWith('/pointage');
};

const getHeaders = (isMultipart: boolean = false): Headers => {
    const headers: Headers = {};
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    // Essai de sessionStorage
    let staffToken = sessionStorage.getItem('staffToken');
    const activeStaffId = sessionStorage.getItem('activeStaffId');

    // Essai de sessionStorage avec activeStaffId
    if (!staffToken) {
        // Vérfier si activeStaffId est présent dans sessionStorage, sinon fallback à localStorage
        const effectiveActiveId = activeStaffId || localStorage.getItem('activeStaffId');
        const staffSessionsStr = localStorage.getItem('staffSessions'); 

        if (effectiveActiveId && staffSessionsStr) {
            try {
                const sessions = JSON.parse(staffSessionsStr);
                if (sessions[effectiveActiveId]) {
                    staffToken = sessions[effectiveActiveId].token;
                }
            } catch (e) {
                console.error("Error parsing staffSessions", e);
            }
        }
    }

    // Fallback à localStorage
    if (!staffToken) {
        staffToken = localStorage.getItem('staffToken');
    }

    const clientToken = localStorage.getItem('token');

    if (staffToken) {
        headers['Authorization'] = `Bearer ${staffToken}`;
    } else if (clientToken) {
        headers['Authorization'] = `Bearer ${clientToken}`;
    }

    return headers;
};

const handleResponse = async (response: Response): Promise<ApiResponse | null> => {
    if (!response.ok) {
        let errorMessage = 'Une erreur est survenue';
        let errorCode: string | undefined;
        try {
            const errorData = await response.json();
            errorCode = errorData.code;
            errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
            errorMessage = response.statusText;
        }

        if (hasStaffSession() && shouldHandleStaffAuthExpiry(response.status, errorMessage)) {
            const professionalMessage = 'Votre session a expiré. Veuillez vous reconnecter pour continuer.';
            clearActiveStaffSession();
            redirectToStaffLogin(professionalMessage);
            throw new ApiHttpError(response.status, professionalMessage, 'UNAUTHORIZED');
        }

        throw new ApiHttpError(response.status, errorMessage, errorCode);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return null;
};
// Vérifie si l'appareil est hors ligne
const isOffline = (): boolean => !navigator.onLine;
const api = {
    get: async (endpoint: string, options?: GetOptions): Promise<any> => {
        const queryParams = options?.params || {};
        const searchParams = new URLSearchParams();

        Object.entries(queryParams).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            searchParams.append(key, String(value));
        });

        const endpointWithQuery = searchParams.toString()
            ? `${endpoint}?${searchParams.toString()}`
            : endpoint;

        const cacheAllowed = isCacheableEndpoint(endpoint);

        if (isOffline()) {
            if (cacheAllowed) {
                const cached = getCachedResponse(endpointWithQuery);
                if (cached) {
                    console.log(`[Offline] Serving cached response for ${endpointWithQuery}`);
                    return cached;
                }
            }
            throw new Error('Pas de connexion internet et aucune donnée en cache.');
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api${endpointWithQuery}`, {
                method: 'GET',
                headers: getHeaders(),
            });
            const data = await handleResponse(response);
            if (cacheAllowed) {
                cacheResponse(endpointWithQuery, data);
            }
            return data;
        } catch (error: any) {
            if (error instanceof ApiHttpError) {
                throw error;
            }

            // En cas d'erreur réseau, essayer de servir la réponse en cache si autorisé
            if (cacheAllowed) {
                const cached = getCachedResponse(endpointWithQuery);
                if (cached) {
                    console.warn(`[Network Error] Serving cached response for ${endpointWithQuery}`);
                    return cached;
                }
            }
            throw error;
        }
    },

    // Pour poster des données, on ajoute les données au corps de la requête et on envoie une requête POST
    post: async (endpoint: string, data: any): Promise<any> => {
        if (isOffline()) {
            addToQueue({ method: 'POST', endpoint, data }); // On ajoute les données à la file d'attente
            toast('Action sauvegardée hors-ligne', { icon: '💾' }); // On affiche un message de confirmation
            return { offline: true, message: 'Sauvegardé hors-ligne' }; // On retourne un objet avec un message de confirmation
        }
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Pour modifier des données, on ajoute les données au corps de la requête et on envoie une requête PUT
    put: async (endpoint: string, data: any): Promise<any> => {
        if (isOffline()) {
            addToQueue({ method: 'PUT', endpoint, data }); // On ajoute les données à la file d'attente
            toast('Action sauvegardée hors-ligne', { icon: '💾' }); // On affiche un message de confirmation
            return { offline: true, message: 'Sauvegardé hors-ligne' };
        }
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async (endpoint: string): Promise<any> => {
        if (isOffline()) {
            addToQueue({ method: 'DELETE', endpoint });
            toast('Action sauvegardée hors-ligne', { icon: '💾' });
            return { offline: true, message: 'Sauvegardé hors-ligne' };
        }
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    patch: async (endpoint: string, data: any): Promise<any> => {
        if (isOffline()) {
            addToQueue({ method: 'PATCH', endpoint, data });
            toast('Action sauvegardée hors-ligne', { icon: '💾' });
            return { offline: true, message: 'Sauvegardé hors-ligne' };
        }
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    // Pour obtenir des données brutes (comme des images), on utilise cette méthode
    getBlob: async (endpoint: string): Promise<Blob> => {
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.blob();
    },

    // Helper pour les uploads de fichiers
    upload: async (endpoint: string, formData: FormData, method: string = 'POST'): Promise<any> => {
        if (isOffline()) {
            throw new Error('Upload impossible en mode hors-ligne');
        }
        const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
            method: method,
            headers: getHeaders(true), 
            body: formData,
        });
        return handleResponse(response);
    }
};

export default api;
