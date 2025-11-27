import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserInfo, getUsers, createUser, updateUser, deleteUser } from '../services/auth'

interface User {
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

interface UserFormData {
  username: string
  email: string
  full_name: string
  password: string
  role: string
  disabled: boolean
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'viewer',
    disabled: false
  })
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const usersData = await getUsers()
      setUsers(usersData)
    } catch (err) {
      setError('Failed to fetch users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser(formData)
      setShowAddModal(false)
      resetForm()
      fetchUsers()
    } catch (err) {
      setError('Failed to create user')
      console.error('Error creating user:', err)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    
    try {
      await updateUser(currentUser.id, formData)
      setShowEditModal(false)
      resetForm()
      fetchUsers()
    } catch (err) {
      setError('Failed to update user')
      console.error('Error updating user:', err)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId)
        fetchUsers()
      } catch (err) {
        setError('Failed to delete user')
        console.error('Error deleting user:', err)
      }
    }
  }

  const openEditModal = (user: User) => {
    setCurrentUser(user)
    setFormData({
      username: user.username,
      email: user.email || '',
      full_name: user.full_name || '',
      password: '',
      role: user.role,
      disabled: user.disabled
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'viewer',
      disabled: false
    })
    setCurrentUser(null)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="admin-actions">
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Add New User
        </button>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email || '-'}</td>
                <td>{user.full_name || '-'}</td>
                <td>{user.role}</td>
                <td>{user.disabled ? 'Disabled' : 'Active'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="viewer">Viewer</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="disabled"
                  name="disabled"
                  checked={formData.disabled}
                  onChange={handleInputChange}
                />
                <label htmlFor="disabled">Disabled</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && currentUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit User: {currentUser.username}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditUser} className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Password (leave empty to keep current)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="viewer">Viewer</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="disabled"
                  name="disabled"
                  checked={formData.disabled}
                  onChange={handleInputChange}
                />
                <label htmlFor="disabled">Disabled</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
