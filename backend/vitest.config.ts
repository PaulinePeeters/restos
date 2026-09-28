import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // describe/it/expect/vi disponibles globalement, sans import
        globals: true,
        environment: 'node',
        // Charge les variables d'env nécessaires avant le code applicatif
        // (ex: JWT_SECRET, requis par utils/config.ts au moment de l'import)
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.{test,spec}.ts'],
        clearMocks: true,
    },
});
