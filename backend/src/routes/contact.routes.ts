import express from 'express';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();
router.post('/', async (req, res) => {
    const { nom, email, sujet, message } = req.body || {};

    if (!nom || !email || !sujet || !message) {
        return res.status(400).json({ error: 'Tous les champs du formulaire contact sont requis.' });
    }

    const recipient = process.env.CONTACT_RECIPIENT_EMAIL || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
    if (!recipient) {
        return res.status(500).json({ error: 'Destinataire du formulaire contact non configuré.' });
    }

    const html = `
      <h2>Nouveau message de contact</h2>
      <p><strong>Nom:</strong> ${nom}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Sujet:</strong> ${sujet}</p>
      <p><strong>Message:</strong></p>
      <p>${String(message).replace(/\n/g, '<br/>')}</p>
    `;

    const sent = await sendEmail(recipient, `[Contact] ${sujet}`, html);
    if (!sent) {
        return res.status(500).json({ error: 'Échec envoi email contact.' });
    }

    res.json({ message: 'Message envoyé avec succès.' });
});

export default router;
