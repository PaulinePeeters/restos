// gestion du stockage hors-ligne

const STORAGE_KEYS = {
    OFFLINE_QUEUE: 'restos_offline_queue',
    API_CACHE: 'restos_api_cache'
};

export interface QueueItem {
    id: number;
    timestamp: string;
    method: string;
    endpoint: string;
    data?: any;
    [key: string]: any;
}

interface CacheItem {
    data: any;
    timestamp: number;
}

interface Cache {
    [url: string]: CacheItem;
}

// --- QUEUE MANAGEMENT (POST/PUT/DELETE) ---

export const addToQueue = (request: any): QueueItem => {
    const queue = getQueue();
    const newRequest: QueueItem = {
        ...request,
        id: Date.now(), 
        timestamp: new Date().toISOString()
    };
    queue.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    return newRequest;
};

export const getQueue = (): QueueItem[] => {
    try {
        const queue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
        return queue ? JSON.parse(queue) : [];
    } catch (error) {
        console.error('Error reading offline queue:', error);
        return [];
    }
};

export const clearQueue = (): void => {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
};

export const removeFromQueue = (id: number): void => {
    const queue = getQueue();
    const updatedQueue = queue.filter(req => req.id !== id);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
};

// --- CACHE MANAGEMENT (GET) ---

export const cacheResponse = (url: string, data: any): void => {
    try {
        const cache = getCache();
        cache[url] = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.API_CACHE, JSON.stringify(cache));
    } catch (error) {
        console.warn('Quota exceeded for local storage cache', error);
    }
};

export const getCachedResponse = (url: string): any | null => {
    try {
        const cache = getCache();
        const cachedItem = cache[url];

        if (!cachedItem) return null;

        return cachedItem.data;
    } catch (error) {
        return null;
    }
};

const getCache = (): Cache => {
    try {
        const cache = localStorage.getItem(STORAGE_KEYS.API_CACHE);
        return cache ? JSON.parse(cache) : {};
    } catch (error) {
        return {};
    }
};
