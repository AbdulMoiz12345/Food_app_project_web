import axios from 'axios';

// Add JWT to every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
