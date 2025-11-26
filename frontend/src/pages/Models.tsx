import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getModels, deleteModel } from '../services/models'

interface ModelVersion {
  id: number
  name: string
  experiment_id: number
  version: number
  metrics: any
  path: string
  created_at: string
  performance?: any
}

const Models: React.FC = () => {
  const [models, setModels] = useState<ModelVersion[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelsData = await getModels()
        // Ensure modelsData is an array
        setModels(Array.isArray(modelsData) ? modelsData : [])
      } catch (err) {
        console.error('Failed to fetch models:', err)
        // Set empty array on error
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  const handleDeleteModel = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteModel(id)
        setModels(models.filter(model => model.id !== id))
      } catch (err) {
        console.error('Failed to delete model:', err)
      }
    }
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Models</h1>
      </div>

      <div className="models-list">
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <thead style={{ backgroundColor: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Version</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Experiment ID</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created At</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{model.name}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{model.version}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{model.experiment_id}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{new Date(model.created_at).toLocaleString()}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <button 
                    style={{ marginRight: '10px', padding: '5px 10px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => navigate(`/models/${model.id}`)}
                  >
                    View
                  </button>
                  <button 
                    style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => handleDeleteModel(model.id)}
                  >
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

export default Models
