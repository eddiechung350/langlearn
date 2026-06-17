/**
 * LangLearn API Client
 * Connects to Flask backend
 * In production: VITE_API_URL = full backend URL (e.g. https://langlearn-backend.onrender.com)
 * API calls append /api prefix
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

// Store token in localStorage
const getToken = () => localStorage.getItem('langlearn_token');
const setToken = (token) => localStorage.setItem('langlearn_token', token);
const removeToken = () => localStorage.removeItem('langlearn_token');

// Get user from localStorage
const getUser = () => {
  const user = localStorage.getItem('langlearn_user');
  return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem('langlearn_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('langlearn_user');

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export const api = {
  register: async (name, password, language = 'ja') => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, password, language }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  login: async (name, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  logout: () => {
    removeToken();
    removeUser();
  },

  getCurrentUser: async () => {
    const data = await request('/user');
    setUser(data.user);
    return data;
  },

  isLoggedIn: () => !!getToken(),
  getUser: getUser,

  // Lessons
  getLessons: async () => request('/lessons'),
  getLesson: async (day) => request(`/lessons/${day}`),

  // Progress
  getProgress: async () => request('/progress'),
  updateProgress: async (phraseId, rating) =>
    request('/progress', {
      method: 'POST',
      body: JSON.stringify({ phrase_id: phraseId, rating }),
    }),

  // Review
  getReview: async (limit = 10) => request(`/review?limit=${limit}`),

  // TTS
  generateTTS: async (text, voice = 'ja-JP-NanamiNeural') =>
    request('/tts', {
      method: 'POST',
      body: JSON.stringify({ text, voice }),
    }),

  // Settings
  updateSettings: async (settings) =>
    request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Health
  health: async () => request('/health'),
};

// Groq Whisper
export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export async function recordAudio(duration = 3000) {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());
          resolve(blob);
        };
        mediaRecorder.onerror = reject;
        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), duration);
      })
      .catch(reject);
  });
}

export async function audioToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(audioBlob, apiKey = GROQ_API_KEY) {
  if (!apiKey) throw new Error('Groq API key not configured.');
  const base64 = await audioToBase64(audioBlob);
  const res = await fetch('https://api.groq.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'whisper-large-v3-turbo', audio: base64, language: 'ja' }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Transcription failed');
  }
  return (await res.json()).text;
}

export { API_BASE };
