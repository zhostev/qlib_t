import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUserInfo, logout, isAuthenticated } from '../../services/auth'
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
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoading(true)
      try {
        if (isAuthenticated()) {
          const info = await getUserInfo()
          if (info) {
            setUser(info.username || null)
            setUserInfo(info)
          } else {
            // 即使getUserInfo返回null，也可以尝试使用localStorage中的用户名
            const storedUser = localStorage.getItem('username')
            if (storedUser) {
              setUser(storedUser)
              setUserInfo({ username: storedUser })
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
        // 即使获取用户信息失败，也可以尝试使用localStorage中的用户名
        const storedUser = localStorage.getItem('username')
        if (storedUser) {
          setUser(storedUser)
          setUserInfo({ username: storedUser })
        }
      } finally {
        setIsLoading(false)
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
                Dashboard
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/experiments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Experiments
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/models" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Models
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/configs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Configs
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/profit-loss" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                收益情况
              </NavLink>
            </li>
          </ul>
          <div className="nav-user">
            {isLoading ? (
              <div className="user-avatar loading" title="Loading user info...">
                <span className="loading-spinner"></span>
              </div>
            ) : user ? (
              <div className="user-info" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="user-avatar"
                  onClick={toggleUserMenu}
                  title={`Click to view ${user}'s info`}
                  aria-haspopup="true"
                  aria-expanded={showUserMenu}
                >
                  {getInitials(user)}
                </div>
                {showUserMenu && (
                  <div 
                    className="user-dropdown"
                    role="menu"
                    aria-labelledby="user-avatar"
                  >
                    <div className="user-details">
                      <div className="user-name">{user}</div>
                      {userInfo?.full_name && (
                        <div className="user-fullname">{userInfo.full_name}</div>
                      )}
                      {userInfo?.email && (
                        <div className="user-email">{userInfo.email}</div>
                      )}
                      {userInfo?.disabled && (
                        <div className="user-status disabled">Account Disabled</div>
                      )}
                    </div>
                    <div className="dropdown-divider"></div>
                    <NavLink 
                      to="/profile" 
                      className="dropdown-btn profile-btn" 
                      onClick={() => setShowUserMenu(false)}
                      role="menuitem"
                    >
                      Profile
                    </NavLink>
                    <button 
                      className="logout-btn dropdown-btn" 
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/" className="login-btn">
                Login
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation