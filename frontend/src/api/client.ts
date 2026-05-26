import axios from 'axios'

// In dev: VITE_API_URL is not set → uses '/api' (proxied by Vite to localhost:8000)
// In production: VITE_API_URL=https://your-backend.railway.app/api
const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login if we get a 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
