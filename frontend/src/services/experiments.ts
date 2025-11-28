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

export const getExperiments = async (): Promise<Experiment[]> => {
  const token = getToken()
  const response = await axios.get(API_URL, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getExperiment = async (id: number): Promise<Experiment> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const createExperiment = async (experiment: ExperimentCreate): Promise<Experiment> => {
  const token = getToken()
  const response = await axios.post(API_URL, experiment, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const runExperiment = async (id: number): Promise<any> => {
  const token = getToken()
  const response = await axios.post(`${API_URL}${id}/run`, {}, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const updateExperiment = async (id: number, experiment: Partial<Experiment>): Promise<Experiment> => {
  const token = getToken()
  const response = await axios.put(`${API_URL}${id}`, experiment, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const deleteExperiment = async (id: number): Promise<any> => {
  const token = getToken()
  const response = await axios.delete(`${API_URL}${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getProfitLoss = async (): Promise<any[]> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}profit-loss`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getExperimentLogs = async (id: number): Promise<string> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}${id}/logs`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data.logs || ''
}
