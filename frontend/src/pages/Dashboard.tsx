import React, { useEffect, useState } from 'react'
import { getExperiments } from '../services/experiments'
import { getModels } from '../services/models'
import ReactECharts from 'echarts-for-react'

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const experimentsData = await getExperiments()
        const modelsData = await getModels()
        // Ensure experimentsData is an array
        setExperiments(Array.isArray(experimentsData) ? experimentsData : [])
        // Ensure modelsData is an array
        setModels(Array.isArray(modelsData) ? modelsData : [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
        // Set empty arrays on error
        setExperiments([])
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="container">Loading...</div>
  }

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
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 10,
      data: ['Created', 'Running', 'Completed', 'Failed']
    },
    series: [
      {
        name: 'Experiment Status',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: createdExperiments.length,
            name: 'Created',
            itemStyle: { color: '#90caf9' }
          },
          {
            value: runningExperiments.length,
            name: 'Running',
            itemStyle: { color: '#81c784' }
          },
          {
            value: completedExperiments.length,
            name: 'Completed',
            itemStyle: { color: '#64b5f6' }
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

  return (
    <div className="container page-transition">
      <h1>Dashboard</h1>
      <div className="dashboard">
        <div className="card stats-card">
          <h3>Total Experiments</h3>
          <p className="stat-value">{experiments.length}</p>
        </div>
        <div className="card stats-card">
          <h3>Running Experiments</h3>
          <p className="stat-value">{runningExperiments.length}</p>
        </div>
        <div className="card stats-card">
          <h3>Completed Experiments</h3>
          <p className="stat-value">{completedExperiments.length}</p>
        </div>
        <div className="card stats-card">
          <h3>Failed Experiments</h3>
          <p className="stat-value">{failedExperiments.length}</p>
        </div>
        <div className="card stats-card">
          <h3>Total Models</h3>
          <p className="stat-value">{models.length}</p>
        </div>
      </div>
      
      <div className="chart-container">
        <h2 className="chart-title">Experiment Status Distribution</h2>
        <ReactECharts option={pieChartOptions} style={{ height: '400px', width: '100%' }} />
      </div>
      
      <div className="recent-experiments">
        <h2>Recent Experiments</h2>
        <div className="experiments-list">
          {safeExperiments.slice(0, 5).map(experiment => (
            <div key={experiment.id} className="experiment-card">
              <h3>{experiment.name}</h3>
              <div className={`experiment-status status-${experiment.status}`}>
                {experiment.status}
              </div>
              <p className="created-at">Created at: {new Date(experiment.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
