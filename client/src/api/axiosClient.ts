import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle ApiResponse structure and 401 errors
axiosClient.interceptors.response.use(
  (response) => {
    // If the response follows our ApiResponse structure, unwrap the nested data
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const apiResponse = response.data;
      return {
        ...response,
        data: apiResponse.data,
        meta: apiResponse.meta, // Attach meta to the response object just in case
      } as any;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
