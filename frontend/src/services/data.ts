import axios from 'axios'
import { getToken } from './auth'

const API_URL = '/api/data/'

interface StockData {
  id: number
  stock_code: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  created_at: string
  updated_at: string
}

interface DataFilter {
  stock_code?: string
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

interface DataResponse {
  data: StockData[]
  total: number
  page: number
  per_page: number
}

export const getStockData = async (filter: DataFilter): Promise<DataResponse> => {
  const token = getToken()
  const response = await axios.get(API_URL, {
    params: filter,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getStockCodes = async (): Promise<string[]> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}stock-codes`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}

export const getDataById = async (id: number): Promise<StockData> => {
  const token = getToken()
  const response = await axios.get(`${API_URL}${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  return response.data
}
