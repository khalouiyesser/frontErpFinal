// import axios from 'axios';
// import toast from 'react-hot-toast';
//
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
//
// const api = axios.create({
//     baseURL: API_URL,
//     headers: { 'Content-Type': 'application/json' },
//     timeout: 10000,
// });
//
// api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('erp_token');
//     if (token) config.headers.Authorization = `Bearer ${token}`;
//     return config;
// });
//
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (!error.response) {
//             toast.error('Serveur inaccessible. Vérifiez votre connexion.');
//             return Promise.reject(error);
//         }
//         const message = error.response?.data?.message || 'Une erreur est survenue';
//         if (error.response?.status === 401) {
//             localStorage.removeItem('erp_token');
//             localStorage.removeItem('erp_user');
//             window.location.href = '/login';
//         } else if (error.response?.status !== 422) {
//             toast.error(Array.isArray(message) ? message.join(', ') : message);
//         }
//         return Promise.reject(error);
//     }
// );
//
// export default api;

import axios from 'axios';
import toast from 'react-hot-toast';


// ✅ Après
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
// const API_URL = 'http://192.168.1.176:3001';
// const API_URL = 'http://localhost:3001';
const API_URL = 'https://kypro-backend.onrender.com';


const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 100000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('erp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            toast.error('Serveur inaccessible. Vérifiez votre connexion.');
            return Promise.reject(error);
        }
        const message = error.response?.data?.message || 'Une erreur est survenue';
        if (error.response?.status === 401) {
            localStorage.removeItem('erp_token');
            localStorage.removeItem('erp_user');
            window.location.href = '/login';
        } else if (error.response?.status !== 422) {
            toast.error(Array.isArray(message) ? message.join(', ') : message);
        }
        return Promise.reject(error);
    }
);

export default api;