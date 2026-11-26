import { defineConfig } from 'vite';

// BASE_PATH lets the GitHub Pages build serve from /<repo>/.
export default defineConfig({ base: process.env.BASE_PATH || '/', build: { target: 'es2022' } });
