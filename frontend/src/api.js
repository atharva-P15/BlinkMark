import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 180000, // 3 minutes — InsightFace can be slow on first load
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject auth token for teacher endpoints
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('teacher_token');
  if (token && config.url.startsWith('/teacher')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Student APIs ─────────────────────────────────────────
export const registerStudent = (data) => API.post('/register-student', data);
export const verifyFace = (data) => API.post('/verify-face', data);
export const getStudents = () => API.get('/students');
export const getAttendance = () => API.get('/attendance');
export const getDefaulters = () => API.get('/defaulters');

// ─── Teacher APIs ─────────────────────────────────────────
export const teacherRegister = (data) => API.post('/teacher/register', data);
export const teacherLogin = (data) => API.post('/teacher/login', data);

export default API;
