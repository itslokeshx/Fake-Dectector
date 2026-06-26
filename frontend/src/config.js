// API Base URL - uses environment variable in production, empty string for dev proxy
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;
