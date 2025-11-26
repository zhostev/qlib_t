import React, { useState, useEffect } from 'react'
import { getUserInfo } from '../services/auth'

const Profile: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo()
        setUserInfo(info)
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserInfo()
  }, [])

  if (loading) {
    return <div className="loading">Loading user information...</div>
  }

  return (
    <div className="profile-container">
      <h1>User Profile</h1>
      <div className="profile-card">
        <h2>Personal Information</h2>
        <div className="profile-info">
          <div className="info-item">
            <label>Username:</label>
            <span>{userInfo.username}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{userInfo.email || 'Not provided'}</span>
          </div>
          <div className="info-item">
            <label>Full Name:</label>
            <span>{userInfo.full_name || 'Not provided'}</span>
          </div>
          <div className="info-item">
            <label>Account Status:</label>
            <span>{userInfo.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="info-item">
            <label>Joined At:</label>
            <span>{new Date(userInfo.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile