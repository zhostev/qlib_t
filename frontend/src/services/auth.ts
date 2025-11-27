import axios from 'axios'

const API_URL = '/api/auth/'

interface LoginResponse {
  access_token: string
  token_type: string
}

interface UserInfo {
  id: number
  username: string
  email?: string
  full_name?: string
  role: string
  disabled: boolean
  created_at: string
  updated_at?: string
  last_login?: string
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
  localStorage.removeItem('userInfo')
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
    // Store user info in localStorage for quick access
    localStorage.setItem('userInfo', JSON.stringify(response.data))
    return response.data
  } catch (error) {
    console.error('Failed to get user info:', error)
    return null
  }
}

// User management functions (admin only)
export const getUsers = async (): Promise<UserInfo[]> => {
  const token = getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  try {
    const response = await axios.get<UserInfo[]>(`${API_URL}users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  } catch (error) {
    console.error('Failed to get users:', error)
    throw error
  }
}

export const createUser = async (userData: {
  username: string
  email: string
  full_name: string
  password: string
  role: string
  disabled: boolean
}): Promise<void> => {
  const token = getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  try {
    await axios.post(`${API_URL}users`, userData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    throw error
  }
}

export const updateUser = async (
  userId: number,
  userData: {
    username: string
    email: string
    full_name: string
    password: string
    role: string
    disabled: boolean
  }
): Promise<void> => {
  const token = getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  try {
    // Remove password if empty
    const updateData = { ...userData }
    if (!updateData.password) {
      delete updateData.password
    }
    
    await axios.put(`${API_URL}users/${userId}`, updateData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    throw error
  }
}

export const deleteUser = async (userId: number): Promise<void> => {
  const token = getToken()
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  try {
    await axios.delete(`${API_URL}users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw error
  }
}
