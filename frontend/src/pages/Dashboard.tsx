import React, { useEffect, useState } from 'react'
import { getExperiments } from '../services/experiments'
import { getModels } from '../services/models'
import ReactECharts from 'echarts-for-react'
import { Link } from 'react-router-dom'

interface Experiment {
  id: number
  name: string
  status: string
  created_at: string
}

interface Model {
  id: number
  name: string
  experiment_id: number
  created_at: string
}

const Dashboard: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        // 尝试从localStorage获取缓存数据
        const cachedExperiments = localStorage.getItem('dashboard_experiments')
        const cachedModels = localStorage.getItem('dashboard_models')
        const cacheTime = localStorage.getItem('dashboard_cache_time')
        const now = Date.now()
        const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

        if (cachedExperiments && cachedModels && cacheTime && (now - parseInt(cacheTime) < CACHE_DURATION)) {
          // 使用缓存数据
          setExperiments(JSON.parse(cachedExperiments))
          setModels(JSON.parse(cachedModels))
        } else {
          // 从API获取最新数据
          const experimentsData = await getExperiments()
          const modelsData = await getModels()
          // Ensure experimentsData is an array
          const safeExperiments = Array.isArray(experimentsData) ? experimentsData : []
          const safeModels = Array.isArray(modelsData) ? modelsData : []
          setExperiments(safeExperiments)
          setModels(safeModels)
          // 缓存数据
          localStorage.setItem('dashboard_experiments', JSON.stringify(safeExperiments))
          localStorage.setItem('dashboard_models', JSON.stringify(safeModels))
          localStorage.setItem('dashboard_cache_time', now.toString())
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        // Set empty arrays on error
        setExperiments([])
        setModels([])
        setError('Failed to load dashboard data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Ensure experiments is an array before calling filter
  const safeExperiments = Array.isArray(experiments) ? experiments : []
  const runningExperiments = safeExperiments.filter(exp => exp.status === 'running')
  const completedExperiments = safeExperiments.filter(exp => exp.status === 'completed')
  const failedExperiments = safeExperiments.filter(exp => exp.status === 'failed')
  const createdExperiments = safeExperiments.filter(exp => exp.status === 'created')

  // Chart options for experiment status distribution
  const pieChartOptions = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      borderRadius: 8,
      textStyle: {
        color: '#333'
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      data: ['Created', 'Running', 'Completed', 'Failed'],
      textStyle: {
        color: '#666',
        fontSize: 12
      },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20
    },
    series: [
      {
        name: 'Experiment Status',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 12,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 24,
            fontWeight: 'bold',
            color: '#333'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: createdExperiments.length,
            name: 'Created',
            itemStyle: { color: '#64b5f6' }
          },
          {
            value: runningExperiments.length,
            name: 'Running',
            itemStyle: { color: '#81c784' }
          },
          {
            value: completedExperiments.length,
            name: 'Completed',
            itemStyle: { color: '#9575cd' }
          },
          {
            value: failedExperiments.length,
            name: 'Failed',
            itemStyle: { color: '#ef5350' }
          }
        ]
      }
    ]
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading">Loading Dashboard</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to QLib Management System</p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button className="btn btn-sm btn-secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon total-experiments">📊</div>
          <div className="stat-content">
            <h3 className="stat-title">Total Experiments</h3>
            <p className="stat-value">{experiments.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon running-experiments">🚀</div>
          <div className="stat-content">
            <h3 className="stat-title">Running Experiments</h3>
            <p className="stat-value">{runningExperiments.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon completed-experiments">✅</div>
          <div className="stat-content">
            <h3 className="stat-title">Completed Experiments</h3>
            <p className="stat-value">{completedExperiments.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon failed-experiments">❌</div>
          <div className="stat-content">
            <h3 className="stat-title">Failed Experiments</h3>
            <p className="stat-value">{failedExperiments.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon total-models">🤖</div>
          <div className="stat-content">
            <h3 className="stat-title">Total Models</h3>
            <p className="stat-value">{models.length}</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="chart-section">
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">Experiment Status Distribution</h2>
              <Link to="/experiments" className="view-all-link">
                View All Experiments
              </Link>
            </div>
            <div className="chart-wrapper">
              <ReactECharts 
                option={pieChartOptions} 
                style={{ height: '400px', width: '100%' }}
                className="status-chart"
              />
            </div>
          </div>
        </div>
        
        <div className="recent-experiments-section">
          <div className="section-header">
            <h2>Recent Experiments</h2>
            <Link to="/experiments" className="view-all-link">
              View All
            </Link>
          </div>
          
          {safeExperiments.length > 0 ? (
            <div className="recent-experiments-list">
              {safeExperiments
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map(experiment => (
                  <Link 
                    key={experiment.id} 
                    to={`/experiments/${experiment.id}`} 
                    className="recent-experiment-item"
                  >
                    <div className="experiment-info">
                      <h3 className="experiment-name">{experiment.name}</h3>
                      <div className="experiment-meta">
                        <div className={`experiment-status status-${experiment.status}`}>
                          {experiment.status}
                        </div>
                        <p className="created-at">
                          Created: {new Date(experiment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="experiment-actions">
                      <span className="action-icon">→</span>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No experiments yet</h3>
              <p>Start by creating your first experiment</p>
              <Link to="/experiments" className="btn btn-primary">
                Create Experiment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
