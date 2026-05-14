const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE = configuredApiUrl
    ? stripTrailingSlash(configuredApiUrl)
    : '';

export const buildApiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
