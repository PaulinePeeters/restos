const header = `
<div style="background-color: #f4a261; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-family: 'Playfair Display', serif;">Déclinaison</h1>
    <p style="color: white; margin: 5px 0 0 0; font-style: italic;">Restaurant Gastronomique</p>
</div>
`;

const footer = `
<div style="background-color: #2d3436; padding: 20px; text-align: center; color: #b2bec3; font-size: 12px; margin-top: 30px;">
    <p>Place du Grand Sablon 15, 1000 Bruxelles</p>
    <p>Tél : +32 2 555 12 34 | Email : declinaisonrestos@gmail.com</p>
    <p><a href="#" style="color: #f4a261; text-decoration: none;">Se désabonner</a></p>
</div>
`;

const containerStyle = `
font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
color: #333;
line-height: 1.6;
max-width: 600px;
margin: 0 auto;
border: 1px solid #ddd;
border-radius: 8px;
overflow: hidden;
`;

const contentStyle = `padding: 30px; background-color: #ffffff;`;

// Fonction utilitaire pour obtenir l'URL de base
export const getBaseUrl = (): string => {
    const url = (process.env.FRONTEND_URL || 'http://51.210.8.227').trim();
    return url.replace(/\/+$/, '');
};

export const welcomeEmail = (nom: string, baseUrl: string = getBaseUrl()) => `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">Bienvenue chez Déclinaison${nom ? ', ' + nom : ''} !</h2>
        <p>Nous sommes ravis de vous compter parmi nos membres.</p>
        <p>Votre compte a été créé avec succès. Vous pouvez désormais réserver votre table en quelques clics, accéder à vos offres exclusives et consulter votre historique.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/connexion" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon compte</a>
        </div>
        <p>À très bientôt pour une expérience culinaire inoubliable.</p>
    </div>
    ${footer}
</div>
`;

export const reservationEmail = (nom: string, date: Date | string, heure: string, nbPersonnes: number, baseUrl: string = getBaseUrl()) => `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">Confirmation de Réservation</h2>
        <p>Bonjour ${nom || 'Cher Client'},</p>
        <p>Votre demande de réservation a bien été prise en compte.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #f4a261; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date(date).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Heure :</strong> ${heure}</p>
            <p style="margin: 5px 0;"><strong>Couverts :</strong> ${nbPersonnes} personnes</p>
        </div>
        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; color: #856404;">
            <p style="margin: 0; font-weight: bold;">Politique de Retard & Non présentation</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Votre table est réservée pendant <strong>20 minutes</strong> après l'heure prévue. Passé ce délai, sans nouvelles de votre part, la table sera libérée.</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Une indemnisation forfaitaire de <strong>20€ par couvert</strong> sera prélevée sur l'empreinte bancaire en cas de non-présentation.</p>
        </div>
        <p>En cas d'empêchement, vous pouvez annuler votre réservation via votre espace client :</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/compte" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accéder à mon compte</a>
        </div>
    </div>
    ${footer}
</div>
`;

interface OrderItem {
    quantite: number;
    tplat: {
        nom_plat: string;
        prix_plat: number;
    };
}

export const orderConfirmationEmail = (nom: string, commandeId: number, items: OrderItem[], total: number, baseUrl: string = getBaseUrl()) => {
    const itemsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${item.quantite}x ${item.tplat.nom_plat}</td>
            <td style="padding: 10px; text-align: right;">${(item.tplat.prix_plat * item.quantite).toFixed(2)}€</td>
        </tr>
    `).join('');

    return `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">Merci pour votre commande !</h2>
        <p>Bonjour ${nom || 'Cher Client'},</p>
        <p>Voici le récapitulatif de votre commande <strong>#${commandeId}</strong>.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background-color: #f9f9f9;">
                    <th style="padding: 10px; text-align: left;">Article</th>
                    <th style="padding: 10px; text-align: right;">Prix</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td style="padding: 15px 10px; font-weight: bold; text-align: right;">TOTAL</td>
                    <td style="padding: 15px 10px; font-weight: bold; text-align: right; color: #f4a261; font-size: 18px;">${parseFloat(total.toString()).toFixed(2)}€</td>
                </tr>
            </tfoot>
        </table>
        
        <p>Nous espérons que vous vous régalerez !</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/compte" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Consulter mon historique</a>
        </div>
    </div>
    ${footer}
</div>
`;
};

export const reviewRequestEmail = (nom: string, commandeId: number, baseUrl: string = getBaseUrl()) => `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">Votre avis compte pour nous</h2>
        <p>Bonjour ${nom || 'Cher Client'},</p>
        <p>Merci de votre visite chez Déclinaison. Nous espérons que vous avez passé un agréable moment.</p>
        <p>Pour nous aider à nous améliorer, pourriez-vous prendre quelques secondes pour noter votre expérience ?</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/avis/${commandeId}" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Laisser un avis ⭐</a>
        </div>
        
        <p>À très bientôt !</p>
    </div>
    ${footer}
</div>
`;

export const eventEmail = (titre: string, description: string, baseUrl: string = getBaseUrl()) => `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">${titre}</h2>
        <p>${description}</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/reservation" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réserver maintenant</a>
        </div>
    </div>
    ${footer}
</div>
`;

export const giftCardEmail = (code: string, montant: number, dateExpiration: Date, baseUrl: string = getBaseUrl()) => `
<div style="${containerStyle}">
    ${header}
    <div style="${contentStyle}">
        <h2 style="color: #f4a261;">Vous avez reçu un Chèque Cadeau ! 🎁</h2>
        <p>Félicitations ! Vous avez reçu un chèque cadeau valable chez Déclinaison.</p>
        
        <div style="background-color: #fdf2e9; padding: 20px; border: 2px dashed #f4a261; border-radius: 10px; text-align: center; margin: 30px 0;">
            <p style="margin: 0; color: #7f8c8d; font-size: 14px;">CODE CADEAU</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2d3436; letter-spacing: 2px;">${code}</p>
            <p style="margin: 0; font-size: 24px; color: #f4a261;">${montant}€</p>
            <p style="margin-top: 10px; font-size: 12px; color: #95a5a6;">Valable jusqu'au ${new Date(dateExpiration).toLocaleDateString()}</p>
        </div>

        <p>Pour l'utiliser, présentez ce code lors de votre réservation ou au restaurant.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/reservation" style="background-color: #f4a261; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réserver une table</a>
        </div>
    </div>
    ${footer}
</div>
`;
