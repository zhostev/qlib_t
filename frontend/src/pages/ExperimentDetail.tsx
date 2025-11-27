import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getExperiment } from '../services/experiments'
import { getModelVersions } from '../services/models'
import ReactECharts from 'echarts-for-react'
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

const ExperimentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [models, setModels] = useState<ModelVersion[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      
      try {
        const experimentData = await getExperiment(parseInt(id))
        const modelsData = await getModelVersions(parseInt(id))
        setExperiment(experimentData)
        // Ensure modelsData is an array
        setModels(Array.isArray(modelsData) ? modelsData : [])
      } catch (err) {
        console.error('Failed to fetch experiment details:', err)
        // Set empty array on error
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!experiment) {
    return <div className="container">Experiment not found</div>
  }

  // Prepare chart data if performance is available
  const getChartOption = () => {
    if (!experiment.performance) {
      return {
        title: {
          text: 'Performance Chart',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [],
            type: 'line'
          }
        ]
      }
    }

    const cumulativeReturns = experiment.performance.cumulative_returns
    const dates = Object.keys(cumulativeReturns)
    const values = Object.values(cumulativeReturns) as number[]

    return {
      title: {
        text: 'Cumulative Returns',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const date = params[0].axisValue
          const value = params[0].value
          return `${date}<br/>Cumulative Return: ${(value * 100).toFixed(2)}%`
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          data: values.map(v => (v * 100).toFixed(2)),
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#646cff'
          }
        }
      ]
    }
  }

  return (
    <div className="container page-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Experiment: {experiment.name}</h1>
        <button className="btn" onClick={() => navigate('/experiments')}>
          Back to Experiments
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <h3>Experiment Info</h3>
          <p><strong>Status:</strong> <span className={`experiment-status status-${experiment.status}`}>{experiment.status}</span></p>
          <p><strong>Created At:</strong> {new Date(experiment.created_at).toLocaleString()}</p>
          <p><strong>Updated At:</strong> {new Date(experiment.updated_at).toLocaleString()}</p>
          <p><strong>Description:</strong> {experiment.description}</p>
          {experiment.error && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#d32f2f' }}>
              <strong>Error:</strong> {experiment.error}
            </div>
          )}
        </div>

        {experiment.performance && (
          <div className="card">
            <h3>Performance Metrics</h3>
            <p><strong>Total Return:</strong> {(experiment.performance.total_return * 100).toFixed(2)}%</p>
            <p><strong>Max Drawdown:</strong> {(experiment.performance.max_drawdown * 100).toFixed(2)}%</p>
            <p><strong>Annual Return:</strong> {(experiment.performance.annual_return * 100).toFixed(2)}%</p>
            <p><strong>Sharpe Ratio:</strong> {experiment.performance.sharpe_ratio.toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>YAML Config</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
          {yaml.dump(experiment.config, { indent: 2 })}
        </pre>
      </div>

      {experiment.performance && (
        <div className="chart-container">
          <h2 className="chart-title">Performance Chart</h2>
          <ReactECharts option={getChartOption()} style={{ height: '400px' }} />
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Model Versions</h2>
        {models.length > 0 ? (
          <div className="models-list">
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Version</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Created At</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map(model => (
                  <tr key={model.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{model.name}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{model.version}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{new Date(model.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                      <button 
                        style={{ padding: '5px 10px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => navigate(`/models/${model.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No models available for this experiment</p>
        )}
      </div>
    </div>
  )
}

export default ExperimentDetail
