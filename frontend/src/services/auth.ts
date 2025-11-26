import axios from 'axios'

const API_URL = '/api/auth/'

interface LoginResponse {
  access_token: string
  token_type: string
}

interface UserInfo {
  username: string
  email?: string
  full_name?: string
  disabled?: boolean
}

export const login = async (username: string, password: string): Promise<void> => {
  // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  
  const response = await axios.post<LoginResponse>(`${API_URL}token`, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('username', username) // 存储用户名到localStorage
  }
}

export const logout = (): void => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}

export const getToken = (): string | null => {
  return localStorage.getItem('token')
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}

export const getUserInfo = async (): Promise<UserInfo | null> => {
  const token = getToken()
  if (!token) {
    return null
  }
  
  try {
    const response = await axios.get<UserInfo>(`${API_URL}users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  } catch (error) {
    console.error('Failed to get user info:', error)
    return null
  }
}
