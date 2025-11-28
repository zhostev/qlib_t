import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUserInfo, logout, isAuthenticated, getToken } from '../../services/auth'
import './Navigation.css'

interface UserInfo {
  username: string
  email?: string
  full_name?: string
  disabled?: boolean
}

const Navigation: React.FC = () => {
  const [user, setUser] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserInfo = async () => {
      console.log('Checking authentication status...')
      console.log('Is authenticated:', isAuthenticated())
      console.log('Token:', getToken())
      if (isAuthenticated()) {
        try {
          const info = await getUserInfo()
          console.log('User info:', info)
          if (info) {
            setUser(info.username || null)
            setUserInfo(info)
          }
        } catch (error) {
          console.error('Error fetching user info:', error)
          // 即使获取用户信息失败，也可以尝试使用localStorage中的用户名（如果有的话）
          const storedUser = localStorage.getItem('username')
          if (storedUser) {
            setUser(storedUser)
            setUserInfo({ username: storedUser })
          }
        }
      }
    }
    fetchUserInfo()
  }, [])

  const handleLogout = () => {
    logout()
    setUser(null)
    setUserInfo(null)
    setShowUserMenu(false)
    navigate('/')
  }

  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowUserMenu(!showUserMenu)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <NavLink to="/dashboard" className="logo-link">
            QLib AI
          </NavLink>
        </div>
        <div className="nav-content">
          <ul className="nav-menu">
            <li className="nav-item">
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                仪表盘
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/experiments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                实验管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/models" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                模型管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/factors" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                因子管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/data" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                数据管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/configs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                配置管理
              </NavLink>
            </li>
            {/* Admin menu item - only visible to admins */}
            {userInfo?.role === 'admin' && (
              <li className="nav-item">
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  系统管理
                </NavLink>
              </li>
            )}
          </ul>
          <div className="nav-user">
            {user && (
              <div className="user-info" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="user-avatar"
                  onClick={(e) => {
                    if (userInfo?.role === 'admin') {
                      navigate('/admin')
                    } else {
                      toggleUserMenu(e)
                    }
                  }}
                  title={userInfo?.role === 'admin' ? "Click to go to admin page" : "Click to view user info"}
                >
                  {getInitials(user)}
                </div>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-details">
                      <div className="user-name">{user}</div>
                      {userInfo?.full_name && (
                        <div className="user-fullname">{userInfo.full_name}</div>
                      )}
                      {userInfo?.email && (
                        <div className="user-email">{userInfo.email}</div>
                      )}
                    </div>
                    <div className="dropdown-divider"></div>
                    {/* Add user management link for admins */}
                    {userInfo?.role === 'admin' && (
                      <button 
                        className="user-management-btn dropdown-btn"
                        onClick={() => {
                          setShowUserMenu(false)
                          navigate('/admin')
                        }}
                      >
                        用户管理
                      </button>
                    )}
                    <button className="logout-btn dropdown-btn" onClick={handleLogout}>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation