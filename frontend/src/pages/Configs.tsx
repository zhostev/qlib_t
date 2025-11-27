import React, { useState, useEffect } from 'react'
import { getConfigs, createConfig, updateConfig, deleteConfig } from '../services/configs'
import YAMLEditor from '../components/YAMLEditor/YAMLEditor'

interface Config {
  id: number
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
  type?: string // 配置类型
  status?: string // 配置状态
  author?: string // 创建者
}

const Configs: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Config | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await getConfigs()
        setConfigs(data)
      } catch (err) {
        console.error('Failed to fetch configs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingConfig) {
        await updateConfig(editingConfig.id, { name, description, content })
      } else {
        await createConfig({ name, description, content })
      }
      
      // Refresh configs list
      const data = await getConfigs()
      setConfigs(data)
      
      // Reset form
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save config')
    }
  }

  const handleEdit = (config: Config) => {
    setEditingConfig(config)
    setName(config.name)
    setDescription(config.description)
    setContent(config.content)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this config?')) {
      try {
        await deleteConfig(id)
        setConfigs(configs.filter(config => config.id !== id))
      } catch (err) {
        console.error('Failed to delete config:', err)
      }
    }
  }

  const resetForm = () => {
    setEditingConfig(null)
    setName('')
    setDescription('')
    setContent('')
    setShowForm(false)
    setError('')
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container page-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Configs</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          Create Config
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <h2>{editingConfig ? 'Edit Config' : 'Create Config'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="content">Content</label>
              <YAMLEditor
                value={content}
                onChange={setContent}
                error={error}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn">
                {editingConfig ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="configs-list">
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <thead style={{ backgroundColor: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Author</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Description</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created At</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Updated At</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Content Preview</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map(config => (
              <tr key={config.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontWeight: '500' }}>
                  <div>{config.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>ID: {config.id}</div>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    backgroundColor: '#e8f0fe', 
                    color: '#1967d2', 
                    fontSize: '0.8rem', 
                    fontWeight: '500' 
                  }}>
                    {config.type || 'Unknown'}
                  </span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '3px 8px', 
                    borderRadius: '12px', 
                    backgroundColor: config.status === 'active' ? '#e6f4ea' : '#fce8e6', 
                    color: config.status === 'active' ? '#0e7420' : '#c5221f', 
                    fontSize: '0.8rem', 
                    fontWeight: '500' 
                  }}>
                    {config.status || 'Draft'}
                  </span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '0.9rem' }}>{config.author || 'Unknown'}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{config.description || 'No description'}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '0.85rem', color: '#666' }}>{new Date(config.created_at).toLocaleString()}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', fontSize: '0.85rem', color: '#666' }}>{new Date(config.updated_at).toLocaleString()}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', color: '#888' }}>
                  {config.content.substring(0, 100)}{config.content.length > 100 ? '...' : ''}
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <button style={{ marginRight: '8px', padding: '4px 8px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => handleEdit(config)}>
                    Edit
                  </button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => handleDelete(config.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Configs
