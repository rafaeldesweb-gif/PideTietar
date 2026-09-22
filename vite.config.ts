import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
<<<<<<< HEAD
import { fileURLToPath } from 'node:url';
import path from 'path';
import {defineConfig} from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

=======
import path from 'path';
import {defineConfig} from 'vite';

>>>>>>> cbaee5399cdc1b042af67c040e87114779a8d9f4
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
<<<<<<< HEAD
        '@': path.resolve(rootDir, '.'),
=======
        '@': path.resolve(__dirname, '.'),
>>>>>>> cbaee5399cdc1b042af67c040e87114779a8d9f4
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
