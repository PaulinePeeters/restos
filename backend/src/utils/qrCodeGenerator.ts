import QRCode from 'qrcode';

const getFrontendBaseUrl = (): string => {
    const fromEnv = process.env.FRONTEND_URL?.trim();
    if (fromEnv) {
        return fromEnv.replace(/\/$/, '');
    }

    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
        return 'https://restos.be';
    }

    return 'http://localhost:5173';
};

export const buildTableMenuUrl = (tableId: number): string => {
    const baseUrl = getFrontendBaseUrl();
    return `${baseUrl}/menu?table_id=${tableId}`;
};

export const generateQRCode = async (tableId: number): Promise<string> => {
    const targetUrl = buildTableMenuUrl(tableId);

    return QRCode.toDataURL(targetUrl, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M'
    });
};

export default {
    buildTableMenuUrl,
    generateQRCode
};
