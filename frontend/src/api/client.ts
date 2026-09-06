import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zfit_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not logging in, clear token
      if (!error.config.url?.includes('/auth/login')) {
        localStorage.removeItem('zfit_token');
        localStorage.removeItem('zfit_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
