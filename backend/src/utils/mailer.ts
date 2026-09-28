import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'RestOS - Declinaison';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || SMTP_USER || 'no-reply@restos.com';

// Initialisation SMTP réel
const initMailer = async () => {
    try {
        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            console.warn('[MAILER] SMTP non configuré (SMTP_HOST/SMTP_USER/SMTP_PASS). Les emails réels sont désactivés.');
            return;
        }

        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        await transporter.verify();

        console.log(`[MAILER] SMTP prêt (${SMTP_HOST}:${SMTP_PORT}) avec l'utilisateur ${SMTP_USER}`);
    } catch (err) {
        console.error('[MAILER] Erreur init SMTP:', err);
    }
};

// Initialiser au démarrage
initMailer();

export async function sendEmail(to: string, subject: string, html: string) {
    if (!transporter) {
        console.warn('[MAILER] Transporteur non initialisé, tentative de réinitialisation...');
        await initMailer();
    }

    if (!transporter) {
        console.warn('[MAILER] Email non envoyé: SMTP indisponible.');
        return null;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`,
            to,
            subject,
            html,
        });

        console.log(`[MAILER] Email envoyé à ${to}. MessageId: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[MAILER] Erreur envoi email:', error);
        return null;
    }
}
