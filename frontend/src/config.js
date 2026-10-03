// Frontend config: the ONLY place that reads import.meta.env.
// VITE_* values are baked into the bundle at build time and are PUBLIC —
// never put secrets here. Changing one requires a redeploy.
const env = import.meta.env || {};

export const API_URL = (env.VITE_API_URL || '').replace(/\/$/, '');
export const APP_NAME = env.VITE_APP_NAME || 'Inventory Tracker';

// How many upcoming recurring expenses to preview. Single constant so the
// backend `count` param and any UI slicing stay in sync.
export const UPCOMING_COUNT = 5;

if (!API_URL && env.PROD) {
  console.error('VITE_API_URL is not set — API calls will fail. Set it in Cloudflare Pages and redeploy.');
}

const config = Object.freeze({ API_URL, APP_NAME, UPCOMING_COUNT });
export default config;
