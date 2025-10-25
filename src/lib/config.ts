export const VAPI_CONFIG = {
  PUBLIC_API_KEY: import.meta.env.VITE_VAPI_PUBLIC_KEY || '',
  AGENT_ID: import.meta.env.VITE_VAPI_ASSISTANT_ID || '',
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
