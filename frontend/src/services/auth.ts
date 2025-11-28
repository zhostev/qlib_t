import axios from 'axios'

const API_URL = '/api/auth/'

interface LoginResponse {
  access_token: string
  token_type: string
}

export interface UserInfo {
  id?: number
  username: string
  email?: string
  full_name?: string
  role?: string
  disabled?: boolean
  created_at?: string
  updated_at?: string
  last_login?: string
}

export const login = async (username: string, password: string): Promise<void> => {
  try {
    // Call actual login API to get token
    const response = await axios.post<LoginResponse>(`${API_URL}token`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      transformRequest: [(data) => {
        // Transform data to form-urlencoded format
        return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`).join('&');
      }]
    });
    
    const { access_token, token_type } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('token_type', token_type);
    localStorage.setItem('username', username);
    
    // 获取并存储用户信息
    const userInfo = await getUserInfo();
    if (userInfo) {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
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
    password?: string
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
