// src/api/index.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': sessionStorage.getItem('csrf_token') || '',
  },
});

let isValidating = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Nếu đang trong quá trình validate → bỏ qua
      if (isValidating) {
        console.warn('401 handled silently for validation (skip re‑validate)');
        return Promise.reject(error);
      }

      // Bắt đầu validate
      isValidating = true;
      try {
        await store.dispatch(validateUser()).unwrap();
      } catch (e) {
        // Validate thất bại → logout ngay
        await store.dispatch(logoutUser()).unwrap();
      } finally {
        isValidating = false;
      }
    }
    return Promise.reject(error);
  }
);
// === Optional: Interceptors để tự động cập nhật CSRF token ===
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('csrf_token') || 
                document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (token) config.headers['X-CSRF-Token'] = token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi chung (401, 403, v.v.)
    if (error.response?.status === 401) {
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');
      if (process.env.NODE_ENV === 'development') {
        console.warn('401 handled silently for validation');  // Reduce red errors
      }
    }
    return Promise.reject(error);
  }
);

export default api;