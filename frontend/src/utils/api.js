import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || 'https://kelolain-be-kgf4.onrender.com';

export const api = axios.create({
  baseURL: `${API_BASE}`,
});

