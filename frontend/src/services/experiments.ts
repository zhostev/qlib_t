import axios from 'axios'
import { getToken } from './auth'

const API_URL = '/api/experiments/'

interface Experiment {
  id: number
  name: string
  description: string
  config: any
  status: string
  created_at: string
  updated_at: string
  performance?: any
  error?: string
}

interface ExperimentCreate {
  name: string
  description: string
  config: any
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

export const getExperiments = async (): Promise<Experiment[]> => {
  const response = await axiosInstance.get(API_URL)
  return response.data
}

export const getExperiment = async (id: number): Promise<Experiment> => {
  const response = await axiosInstance.get(`${API_URL}${id}`)
  return response.data
}

export const createExperiment = async (experiment: ExperimentCreate): Promise<Experiment> => {
  const response = await axiosInstance.post(API_URL, experiment)
  return response.data
}

export const runExperiment = async (id: number): Promise<any> => {
  const response = await axiosInstance.post(`${API_URL}${id}/run`)
  return response.data
}

export const updateExperiment = async (id: number, experiment: Partial<Experiment>): Promise<Experiment> => {
  const response = await axiosInstance.put(`${API_URL}${id}`, experiment)
  return response.data
}

export const deleteExperiment = async (id: number): Promise<any> => {
  const response = await axiosInstance.delete(`${API_URL}${id}`)
  return response.data
}

export const getProfitLoss = async (): Promise<any[]> => {
  const response = await axiosInstance.get(`${API_URL}profit-loss`)
  return response.data
}
