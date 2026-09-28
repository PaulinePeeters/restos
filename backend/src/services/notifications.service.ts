import { logger } from '../utils/logger.js';
import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';
import { getIo } from '../socket.js';

/**
 * Rôles acceptés pour les notifications.
 * Correspond aux rooms Socket.io.
 */
type NotificationRole = 'manager' | 'serveur' | 'cuisinier' | 'barman' | 'livreur' | 'all';

export const notificationsService = {
    /**
     * Crée une nouvelle notification (ou plusieurs si broadcast).
     */
    async createNotification(
        type: string,
        message: string,
        role: NotificationRole,
        data: object = {}
    ) {
        if (role === 'all') {
            const roles: Exclude<NotificationRole, 'all'>[] = ['manager', 'serveur', 'cuisinier', 'barman', 'livreur'];

            await prisma.tnotification.createMany({
                data: roles.map(r => ({
                    type,
                    message,
                    role_destinataire: r,
                    data: data as Prisma.InputJsonValue,
                    lu: false,
                    date_creation: new Date()
                }))
            });

            try {
                const io = getIo();
                roles.forEach(r => {
                    io.to(r).emit('nouvelle_notification', { type, message, role: r, data });
                });
                io.emit('nouvelle_notification', { type, message, role: 'all', data });
            } catch (e) {
                logger.error("Socket emit error:", e);
            }

            return { count: roles.length, message: "Broadcast sent" };

        } else {
            const notif = await prisma.tnotification.create({
                data: {
                    type,
                    message,
                    role_destinataire: role,
                    data: data as Prisma.InputJsonValue,
                    lu: false,
                    date_creation: new Date()
                }
            });

            try {
                const io = getIo();
                // Émet uniquement vers la room du rôle concerné
                io.to(role).emit('nouvelle_notification', notif);
            } catch (e) {
                logger.error("Socket emit error:", e);
            }

            return notif;
        }
    },

    /**
     * Récupère les notifications non lues pour un rôle donné.
     */
    async getUnreadNotifications(role: string) {
        return prisma.tnotification.findMany({
            where: {
                role_destinataire: role,
                lu: false
            },
            orderBy: {
                date_creation: 'desc'
            }
        });
    },

    /**
     * Marque une notification comme lue.
     */
    async markAsRead(id: number | string) {
        return prisma.tnotification.update({
            where: { id: Number(id) },
            data: { lu: true }
        });
    },

    /**
     * Marque toutes les notifications d'un rôle comme lues.
     */
    async markAllAsRead(role: string) {
        return prisma.tnotification.updateMany({
            where: { role_destinataire: role, lu: false },
            data: { lu: true }
        });
    },

    /**
     * Supprime les notifications de plus d'un an.
     */
    async deleteOldNotifications(monthsToKeep = 12) {
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - monthsToKeep);

        const deleted = await prisma.tnotification.deleteMany({
            where: {
                date_creation: {
                    lt: thresholdDate
                }
            }
        });

        logger.debug(`[CLEANUP] ${deleted.count} anciennes notifications supprimées.`);
        return deleted;
    }
};
