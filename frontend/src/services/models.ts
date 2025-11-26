import axios from 'axios'
import { getToken } from './auth'

const API_URL = '/api/models/'

interface ModelVersion {
  id: number
  name: string
  experiment_id: number
  version: number
  metrics: any
  path: string
  created_at: string
  performance?: any
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

export const getModels = async (): Promise<ModelVersion[]> => {
  const response = await axiosInstance.get(API_URL)
  return response.data
}

export const getModel = async (id: number): Promise<ModelVersion> => {
  const response = await axiosInstance.get(`${API_URL}${id}`)
  return response.data
}

export const getModelVersions = async (experimentId?: number): Promise<ModelVersion[]> => {
  const url = experimentId ? `${API_URL}experiment/${experimentId}` : API_URL
  const response = await axiosInstance.get(url)
  return response.data
}

export const deleteModel = async (id: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_URL}${id}`)
  return response.data
}
