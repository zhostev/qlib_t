import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExperiments, createExperiment, runExperiment, deleteExperiment } from '../services/experiments'
import { getConfigs } from '../services/configs'
import YAMLEditor from '../components/YAMLEditor/YAMLEditor'
import * as yaml from 'js-yaml'

interface Experiment {
  id: number
  name: string
  description: string
  config: any
  status: string
  created_at: string
  updated_at: string
  performance?: any
  error?: string
}

interface Config {
  id: number
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
}

const Experiments: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null)
  const [yamlContent, setYamlContent] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const experimentsData = await getExperiments()
        const configsData = await getConfigs()
        // Ensure experimentsData is an array
        setExperiments(Array.isArray(experimentsData) ? experimentsData : [])
        // Ensure configsData is an array
        setConfigs(Array.isArray(configsData) ? configsData : [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
        // Set empty arrays on error
        setExperiments([])
        setConfigs([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const configId = parseInt(e.target.value)
    setSelectedConfig(configId)
    
    const config = configs.find(c => c.id === configId)
    if (config) {
      setYamlContent(config.content)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // Parse YAML content to JSON
      const config = yaml.load(yamlContent) as any
      
      await createExperiment({
        name,
        description,
        config
      })
      
      // Refresh experiments list
      const experimentsData = await getExperiments()
      setExperiments(experimentsData)
      
      // Reset form
      resetForm()
    } catch (err: any) {
      if (err.name === 'YAMLException') {
        setError('Invalid YAML format')
      } else {
        setError(err.response?.data?.detail || 'Failed to create experiment')
      }
    }
  }

  const handleRunExperiment = async (id: number) => {
    try {
      await runExperiment(id)
      
      // Refresh experiments list
      const experimentsData = await getExperiments()
      setExperiments(experimentsData)
    } catch (err) {
      console.error('Failed to run experiment:', err)
    }
  }

  const handleDeleteExperiment = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this experiment?')) {
      try {
        await deleteExperiment(id)
        setExperiments(experiments.filter(exp => exp.id !== id))
      } catch (err) {
        console.error('Failed to delete experiment:', err)
      }
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setSelectedConfig(null)
    setYamlContent('')
    setShowForm(false)
    setError('')
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Experiments</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          Create Experiment
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <h2>Create Experiment</h2>
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
              <label htmlFor="config">Select Config Template</label>
              <select
                id="config"
                value={selectedConfig || ''}
                onChange={handleConfigChange}
              >
                <option value="">-- Select Config --</option>
                {configs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="yamlContent">YAML Config</label>
              <YAMLEditor
                value={yamlContent}
                onChange={setYamlContent}
                error={error}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn">
                Create
              </button>
              <button type="button" className="btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="experiments-list">
        {experiments.map(experiment => (
          <div key={experiment.id} className="experiment-card">
            <div className="experiment-header">
              <h3 className="experiment-name">{experiment.name}</h3>
              <span className={`experiment-status status-${experiment.status}`}>
                {experiment.status}
              </span>
            </div>
            
            <p className="experiment-description">{experiment.description}</p>
            
            <div className="experiment-meta">
              <div className="meta-item">
                <span className="meta-label">Created:</span>
                <span className="meta-value">{new Date(experiment.created_at).toLocaleString()}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Updated:</span>
                <span className="meta-value">{new Date(experiment.updated_at).toLocaleString()}</span>
              </div>
            </div>
            
            {experiment.performance && (
              <div className="experiment-performance">
                <h4>Performance</h4>
                <div className="performance-metrics">
                  {Object.entries(experiment.performance).map(([key, value]) => (
                    <div key={key} className="metric-item">
                      <span className="metric-key">{key}:</span>
                      <span className="metric-value">
                        {typeof value === 'number' ? value.toFixed(4) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {experiment.error && (
              <div className="experiment-error">
                <h4>Error</h4>
                <p className="error-message">{experiment.error}</p>
              </div>
            )}
            
            <div className="experiment-actions">
              <button 
                className="action-btn view-btn"
                onClick={() => navigate(`/experiments/${experiment.id}`)}
              >
                View Details
              </button>
              {experiment.status === 'created' && (
                <button 
                  className="action-btn run-btn"
                  onClick={() => handleRunExperiment(experiment.id)}
                >
                  Run Experiment
                </button>
              )}
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDeleteExperiment(experiment.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Experiments
