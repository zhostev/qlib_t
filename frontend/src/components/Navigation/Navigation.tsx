import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUserInfo, logout, isAuthenticated } from '../../services/auth'
import type { UserInfo } from '../../services/auth'
import './Navigation.css'

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
                仪表盘
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/experiments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                实验管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/backtest" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                回测管理
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/risk" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                风险控制
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
              <NavLink to="/factor-analysis" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                因子分析
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
            {isLoading ? (
              <div className="user-avatar loading" title="Loading user info...">
                <span className="loading-spinner"></span>
              </div>
            ) : user ? (
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
                    {/* Add user management link for admins */}
                    {userInfo?.role === 'admin' && (
                      <button 
                        className="user-management-btn dropdown-btn"
                        onClick={() => {
                          setShowUserMenu(false)
                          navigate('/admin')
                        }}
                        role="menuitem"
                      >
                        用户管理
                      </button>
                    )}
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
                      退出登录
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