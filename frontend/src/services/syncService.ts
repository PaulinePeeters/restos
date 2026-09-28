import api from './api';
import { getQueue, removeFromQueue, QueueItem } from './offlineStorage';
import toast from 'react-hot-toast';

// On utilise cette fonction pour traiter la file d'attente
export const processQueue = async () => {
    const queue: QueueItem[] = getQueue();
    if (queue.length === 0) return;

    const toastId = toast.loading(`Synchronisation de ${queue.length} actions...`);
    let successCount = 0;
    let errorCount = 0;

    for (const request of queue) {
        try {
            await new Promise(r => setTimeout(r, 500));

            switch (request.method) {
                case 'POST':
                    await api.post(request.endpoint, request.data);
                    break;
                case 'PUT':
                    await api.put(request.endpoint, request.data);
                    break;
                case 'DELETE':
                    await api.delete(request.endpoint);
                    break;
                case 'PATCH':
                    await api.patch(request.endpoint, request.data);
                    break;
                default:
                    console.warn('Unknown method in queue', request.method);
            }

            removeFromQueue(request.id);
            successCount++;
        } catch (error) {
            console.error('Sync error for request:', request, error);
            errorCount++;
        }
    }

    toast.dismiss(toastId);
    if (errorCount === 0) {
        toast.success(`${successCount} actions synchronisées avec succès !`);
    } else {
        toast.error(`${successCount} succès, ${errorCount} échecs lors de la synchro.`);
    }
};
