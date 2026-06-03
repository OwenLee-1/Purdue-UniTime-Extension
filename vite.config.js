import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

// Vite is the "build tool" that packages our source files into a folder Chrome
// can load. The crx() plugin reads manifest.json and figures out how to bundle
// the content script, background worker, popup, and options pages for us.
//
// Useful commands (defined in package.json):
//   npm run dev    -> rebuilds automatically while you work
//   npm run build  -> makes a final "dist/" folder to load into Chrome
export default defineConfig({
  plugins: [crx({ manifest })],
});
