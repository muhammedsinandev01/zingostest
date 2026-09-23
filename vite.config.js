import { defineConfig } from 'vite';
import { CONFIG, isPlaceholder } from './src/config.js';

/**
 * Social link previews need ABSOLUTE urls.
 *
 * WhatsApp, Facebook and X fetch the page from their own servers and resolve
 * nothing: `/og-image.jpg` means "og-image.jpg on facebook.com" to them, so a
 * relative path quietly produces a preview with no picture. The usual fix is
 * to paste the live domain into index.html, which then goes stale the moment
 * the site moves.
 *
 * Instead index.html carries `%SITE_URL%` and this fills it in from
 * `CONFIG.siteUrl` at build time, so the domain is written down once. While
 * that is still blank the placeholders collapse to relative paths - correct
 * for local development, and no invented domain ever ships.
 */
const siteUrl = () => {
  if (isPlaceholder(CONFIG.siteUrl)) return '';
  return CONFIG.siteUrl.replace(/\/+$/, '');
};

const injectSiteUrl = () => ({
  name: 'zingos-site-url',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replaceAll('%SITE_URL%', siteUrl()),
  },
});

export default defineConfig({
  plugins: [injectSiteUrl()],
});
