import axios from 'axios'

/** Public API base URL. Configure NEXT_PUBLIC_API_URL in .env.local/.env.production. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')).replace(/\/$/, '')

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

export function backendUrl(path = ''): string {
  return `${BACKEND_URL}/${path.replace(/^\//, '')}`
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') return message
    const validationErrors = error.response?.data?.errors
    if (validationErrors && typeof validationErrors === 'object') {
      const firstError = Object.values(validationErrors as Record<string, unknown>).flat()[0]
      if (typeof firstError === 'string') return firstError
    }
    if (error.message && error.message !== 'Request failed with status code 422') return error.message
  }
  return fallback
}

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('drive_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config;
}, (error) => Promise.reject(error))

// Response interceptor to handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('drive_token')
        localStorage.removeItem('drive_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    if (error.response?.status === 503 && error.response.data?.maintenance_mode === true) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/maintenance') {
        localStorage.setItem('maintenance_message', error.response.data.message || 'Cloud NL is temporarily under maintenance.')
        window.location.href = '/maintenance'
      }
    }
    return Promise.reject(error)
  }
)
