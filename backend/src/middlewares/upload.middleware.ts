import multer from 'multer'; // multer est un middleware qui permet de gérer les fichiers uploadés
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const uploadDir = 'public/uploads';

// Vérifie et crée le dossier d'upload s'il n'existe pas
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// vérifie le MIME type du fichier
// important pour la sécurité car un pirate pourrait renommer virus.exe en "image.jpg"
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Type de fichier non supporté. Types acceptés : ${allowedMimeTypes.join(', ')}`));
    }
};

/**
 * Middleware Multer configuré pour l'upload d'images.
 * - Stockage local dans public/uploads
 * - Validation stricte du type MIME
 * - Limite de taille : 10MB
 */
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
