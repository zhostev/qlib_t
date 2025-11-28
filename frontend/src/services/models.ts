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

export const getModels = async (): Promise<ModelVersion[]> => {
  const token = getToken()
  const response = await axios.get(API_URL, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getModel = async (id: number): Promise<ModelVersion> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getModelVersions = async (experimentId?: number): Promise<ModelVersion[]> => {
  const url = experimentId ? `${API_URL}experiment/${experimentId}` : API_URL
  const token = getToken()
  const response = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const deleteModel = async (id: number): Promise<any> => {
  const token = getToken()
  const response = await axios.delete(`${API_URL}${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}
