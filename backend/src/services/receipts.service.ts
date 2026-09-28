import { prisma } from '../db.js';
import PDFDocument from 'pdfkit';
import { getTvaRate, getConfig } from './configuration.service.js';

/**
 * Formatteur de monnaie locale
 */
const currencyFormatter = new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
});

/**
 * Formatteur de date
 */
const dateFormatter = new Intl.DateTimeFormat('fr-BE', {
    dateStyle: 'short',
    timeStyle: 'short'
});

/**
 * Génère un reçu PDF.
 */
export async function generateReceipt(commandeId: number | string, invoiceData: any = null): Promise<Buffer> {
    const commande = await prisma.tcommande.findUnique({
        where: { id: Number(commandeId) },
        include: {
            tlignecommande: { include: { tplat: true } },
            tpaiement: true,
            tclient: true
        }
    });

    if (!commande) throw new Error("Commande non trouvée");

    const tvaRate = await getTvaRate();
    const restaurantName = await getConfig('RESTAURANT_NAME') || 'RestOS Restaurant';
    const restaurantAddress = await getConfig('RESTAURANT_ADDRESS') || '15 Place du Grand Sablon, Bruxelles';
    const restaurantPhone = await getConfig('RESTAURANT_PHONE') || '';

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- EN-TÊTE ---
        doc.fontSize(20).font('Helvetica-Bold').text(invoiceData ? 'FACTURE' : 'REÇU DE COMMANDE', { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        if (invoiceData) {
            // Bloc Client Pro
            doc.text(`Client: ${invoiceData.company}`);
            doc.text(`TVA: ${invoiceData.vat}`);
            doc.text(`Adresse: ${invoiceData.address}`);
        } else if (commande.tclient) {
            // Bloc Client Particulier
            doc.text(`Client: ${commande.tclient.nom_client}`);
            if (commande.tclient.email_client) doc.text(`Email: ${commande.tclient.email_client}`);
        } else {
            doc.text('Client: Passage / Comptoir');
        }

        // Bloc Restaurant (Aligné à droite)
        const rightX = 400;
        const topY = 80;
        doc.text(restaurantName, rightX, topY, { align: 'right' });
        doc.text(restaurantAddress, rightX, topY + 15, { align: 'right' });
        if (restaurantPhone) doc.text(restaurantPhone, rightX, topY + 30, { align: 'right' });

        doc.moveDown(4);

        // --- INFO COMMANDE ---
        doc.font('Helvetica-Bold').text(`Commande #${commande.id}`, 40, doc.y);
        doc.font('Helvetica').text(`Date: ${dateFormatter.format(new Date(commande.date_heure_commande))}`, 200, doc.y - 12);

        doc.moveDown(2);

        // --- TABLEAU LIGNES ---
        let y = doc.y;
        const col1 = 40;  // Article
        const col2 = 280; // Qté
        const col3 = 350; // PU
        const col4 = 450; // Total

        // Headers
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Article', col1, y);
        doc.text('Qté', col2, y, { width: 40, align: 'center' });
        doc.text('P.U.', col3, y, { width: 70, align: 'right' });
        doc.text('Total', col4, y, { width: 70, align: 'right' });

        // Ligne séparatrice
        y += 15;
        doc.moveTo(40, y).lineTo(550, y).stroke();
        y += 10;

        // Items
        doc.font('Helvetica').fontSize(10);
        let totalHT = 0;

        commande.tlignecommande.forEach(ligne => {
            const prixUnit = Number(ligne.prix_unitaire || ligne.tplat.prix_plat);
            const totalLigne = prixUnit * ligne.quantite;
            totalHT += (totalLigne / (1 + tvaRate / 100));

            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            doc.text(ligne.tplat.nom_plat, col1, y, { width: 230 });
            doc.text(ligne.quantite.toString(), col2, y, { width: 40, align: 'center' });
            doc.text(currencyFormatter.format(prixUnit), col3, y, { width: 70, align: 'right' });
            doc.text(currencyFormatter.format(totalLigne), col4, y, { width: 70, align: 'right' });

            const lineHeight = doc.heightOfString(ligne.tplat.nom_plat, { width: 230 });
            y += lineHeight + 5;
        });

        doc.moveTo(40, y).lineTo(550, y).stroke();
        y += 15;

        // --- TOTAUX ---
        const totalTTC = Number(commande.total_estime_commande);
        const montantTVA = totalTTC - (totalTTC / (1 + tvaRate / 100));
        const montantHT = totalTTC - montantTVA;

        const xLabel = 350;
        const xValue = 450;

        doc.text(`Total HT:`, xLabel, y, { align: 'right', width: 80 });
        doc.text(currencyFormatter.format(montantHT), xValue, y, { align: 'right', width: 70 });
        y += 15;

        doc.text(`TVA (${tvaRate}%):`, xLabel, y, { align: 'right', width: 80 });
        doc.text(currencyFormatter.format(montantTVA), xValue, y, { align: 'right', width: 70 });
        y += 15;

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(`TOTAL TTC:`, xLabel, y, { align: 'right', width: 80 });
        doc.text(currencyFormatter.format(totalTTC), xValue, y, { align: 'right', width: 70 });

        // --- PAIEMENTS ---
        doc.moveDown(3);
        doc.x = 40;

        doc.font('Helvetica-Bold').fontSize(11).text('Paiements reçus', { underline: true });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10);

        commande.tpaiement.forEach(p => {
            if (p.etat_paiement === 'PAYE') {
                doc.text(
                    `- ${dateFormatter.format(new Date(p.date_paiement))} : ${p.methode_paiement} (${currencyFormatter.format(Number(p.montant_paiement))})`
                );
            }
        });

        // --- FOOTER ---
        const footerY = 780;
        doc.fontSize(8).text('Merci de votre confiance !', 40, footerY, { align: 'center', width: 500 });
        doc.text('Document généré automatiquement par RestOS', 40, footerY + 12, { align: 'center', width: 500 });

        doc.end();
    });
}
