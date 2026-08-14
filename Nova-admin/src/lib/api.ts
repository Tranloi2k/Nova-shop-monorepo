import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let end = rawUrl.length;
while (end > 0 && rawUrl[end - 1] === '/') end -= 1;
const baseURL = rawUrl.slice(0, end);

const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      // If we are not already on the login page, redirect to login
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
