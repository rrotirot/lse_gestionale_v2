// API Configuration
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_RSI_API_URL || 'http://localhost:5000',
    ENDPOINTS: {
        HEALTH: '/api/v1/health',
        MEMBERS: '/api/v1/members',
        PROMOTED_MEMBERS: '/api/v1/promoted-members',
        EVENTS: '/api/v1/events',
        AUTH: {
            LOGIN: '/api/v1/auth/login',
            REGISTER: '/api/v1/auth/register',
            VERIFY: '/api/v1/auth/verify',
            VERIFICATION_CODE: '/api/v1/auth/verification-code'
        }
    }
};

// Helper function to build full API URLs
export const getApiUrl = (endpoint) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for API requests
export const apiRequest = async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    return response;
};