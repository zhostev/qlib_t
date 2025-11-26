import axios from 'axios'
import { getToken } from './auth'

const API_URL = '/api/configs/'

interface Config {
  id: number
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
}

interface ConfigCreate {
  name: string
  description: string
  content: string
}

const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to request headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const getConfigs = async (): Promise<Config[]> => {
  const response = await axiosInstance.get(API_URL)
  return response.data
}

export const getConfig = async (id: number): Promise<Config> => {
  const response = await axiosInstance.get(`${API_URL}${id}`)
  return response.data
}

export const createConfig = async (config: ConfigCreate): Promise<Config> => {
  const response = await axiosInstance.post(API_URL, config)
  return response.data
}

export const updateConfig = async (id: number, config: Partial<Config>): Promise<Config> => {
  const response = await axiosInstance.put(`${API_URL}${id}`, config)
  return response.data
}

export const deleteConfig = async (id: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_URL}${id}`)
  return response.data
}
