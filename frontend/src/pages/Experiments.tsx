import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExperiments, createExperiment, runExperiment, deleteExperiment } from '../services/experiments'
import { getConfigs } from '../services/configs'
import { getBenchmarks } from '../services/benchmarks'
import { getUserInfo } from '../services/auth'
import type { ConfigType } from '../services/configs'
import YAMLEditor from '../components/YAMLEditor/YAMLEditor'
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
  start_time?: string
  end_time?: string
  progress?: number
  performance?: any
  error?: string
}

interface Config {
  id: number
  name: string
  description: string
  content: string
  type: ConfigType
  created_at: string
  updated_at: string
}

const Experiments: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [configs, setConfigs] = useState<Config[]>([])
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null)
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null)
  const [yamlContent, setYamlContent] = useState('')
  const [error, setError] = useState('')
  const [userInfo, setUserInfo] = useState<any>(null)
  const navigate = useNavigate()
  
  // Get user info from localStorage and API
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // First try to get from API
        const info = await getUserInfo()
        if (info) {
          setUserInfo(info)
          localStorage.setItem('userInfo', JSON.stringify(info))
        } else {
          // Fallback to localStorage
          const storedUserInfo = localStorage.getItem('userInfo')
          if (storedUserInfo) {
            setUserInfo(JSON.parse(storedUserInfo))
          }
        }
      } catch (error) {
        console.error('Failed to get user info:', error)
        // Fallback to localStorage
        const storedUserInfo = localStorage.getItem('userInfo')
        if (storedUserInfo) {
          setUserInfo(JSON.parse(storedUserInfo))
        }
      }
    }
    
    fetchUserInfo()
  }, [])
  
  // For now, always show the create experiment button
  // The actual permission check will be handled by the backend
  const canCreateExperiments = true
  
  // Debug: Log user info and permission status
  useEffect(() => {
    console.log('User Info:', userInfo)
    console.log('Can Create Experiments:', canCreateExperiments)
  }, [userInfo, canCreateExperiments])

  // Fetch data initially and then every 5 seconds for real-time updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const experimentsData = await getExperiments()
        // Ensure experimentsData is an array
        setExperiments(Array.isArray(experimentsData) ? experimentsData : [])
      } catch (err) {
        console.error('Failed to fetch experiments:', err)
      }
    }

    // Fetch configs only once initially
    const fetchConfigs = async () => {
      try {
        const configsData = await getConfigs()
        // Ensure configsData is an array
        setConfigs(Array.isArray(configsData) ? configsData : [])
      } catch (err) {
        console.error('Failed to fetch configs:', err)
        // Set empty array on error
        setConfigs([])
      }
    }

    // Fetch benchmarks only once initially
    const fetchBenchmarks = async () => {
      try {
        const benchmarksData = await getBenchmarks()
        setBenchmarks(benchmarksData)
      } catch (err) {
        console.error('Failed to fetch benchmarks:', err)
        // Set empty array on error
        setBenchmarks([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    fetchConfigs()
    fetchBenchmarks()

    // Set up interval to refresh experiments every 5 seconds
    const interval = setInterval(fetchData, 5000)

    // Clean up interval on component unmount
    return () => clearInterval(interval)
  }, [])

  const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const configId = parseInt(e.target.value)
    setSelectedConfig(configId)
    setSelectedBenchmark(null)
    
    const config = configs.find(c => c.id === configId)
    if (config) {
      setYamlContent(config.content)
      // 如果是实验模板，自动填充名称和描述
      if (config.type === 'experiment_template') {
        setName(config.name.replace(' Template', ''))
        setDescription(config.description || '')
      }
    }
  }
  
  const handleBenchmarkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const benchmarkId = e.target.value
    setSelectedBenchmark(benchmarkId)
    setSelectedConfig(null)
    
    const benchmark = benchmarks.find(b => b.id === benchmarkId)
    if (benchmark) {
      setYamlContent(benchmark.content)
      // 自动填充名称和描述
      setName(benchmark.name)
      setDescription(`基于${benchmark.model}模型的benchmark实验`)
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
        setError('无效的YAML格式')
      } else if (err.response?.status === 403) {
        setError('您没有创建实验的权限，请联系管理员')
      } else {
        setError(err.response?.data?.detail || '创建实验失败')
      }
    }
  }

  const handleRunExperiment = async (id: number) => {
    try {
      await runExperiment(id)
      
      // Refresh experiments list
      const experimentsData = await getExperiments()
      setExperiments(experimentsData)
    } catch (err: any) {
      console.error('Failed to run experiment:', err)
      if (err.response?.status === 403) {
        alert('您没有运行实验的权限，请联系管理员')
      } else {
        alert('运行实验失败，请稍后重试')
      }
    }
  }

  const handleDeleteExperiment = async (id: number) => {
    if (window.confirm('确定要删除这个实验吗？')) {
      try {
        await deleteExperiment(id)
        setExperiments(experiments.filter(exp => exp.id !== id))
      } catch (err: any) {
        console.error('Failed to delete experiment:', err)
        if (err.response?.status === 403) {
          alert('您没有删除实验的权限，请联系管理员')
        } else {
          alert('删除实验失败，请稍后重试')
        }
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

  // Prepare chart data if performance is available
  const getChartOption = (performance: any) => {
    if (!performance) {
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

    const cumulativeReturns = performance.cumulative_returns
    const dates = Object.keys(cumulativeReturns)
    const values = Object.values(cumulativeReturns) as number[]

    return {
      title: {
        text: 'Cumulative Returns',
        left: 'center',
        textStyle: {
          fontSize: 14
        }
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
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          fontSize: 10
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

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>实验管理</h1>
        {canCreateExperiments && (
          <button className="btn" onClick={() => setShowForm(true)}>
            创建实验
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
          <h2>创建实验</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="name">名称</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="description">描述</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="benchmark">选择Benchmark样例</label>
              <select
                id="benchmark"
                value={selectedBenchmark || ''}
                onChange={handleBenchmarkChange}
              >
                <option value="">-- 选择Benchmark样例 --</option>
                {benchmarks.map(benchmark => (
                  <option key={benchmark.id} value={benchmark.id}>
                    {benchmark.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="config">或选择配置模板</label>
              <select
                id="config"
                value={selectedConfig || ''}
                onChange={handleConfigChange}
              >
                <option value="">-- 选择配置 --</option>
                {configs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="yamlContent">YAML配置</label>
              <YAMLEditor
                value={yamlContent}
                onChange={setYamlContent}
                error={error}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn">
                创建
              </button>
              <button type="button" className="btn" onClick={resetForm}>
                取消
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
                <span className="meta-label">创建时间:</span>
                <span className="meta-value">{new Date(experiment.created_at).toLocaleString()}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">更新时间:</span>
                <span className="meta-value">{new Date(experiment.updated_at).toLocaleString()}</span>
              </div>
              {experiment.start_time && (
                <div className="meta-item">
                  <span className="meta-label">开始时间:</span>
                  <span className="meta-value">{new Date(experiment.start_time).toLocaleString()}</span>
                </div>
              )}
              {experiment.end_time && (
                <div className="meta-item">
                  <span className="meta-label">结束时间:</span>
                  <span className="meta-value">{new Date(experiment.end_time).toLocaleString()}</span>
                </div>
              )}
              {experiment.progress !== undefined && (
                <div className="meta-item full-width">
                  <span className="meta-label">进度:</span>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${experiment.progress}%` }}
                    ></div>
                    <span className="progress-text">{experiment.progress.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
            
            {experiment.performance && (
              <div className="experiment-performance">
                <h4>性能指标</h4>
                <div className="performance-metrics">
                  {experiment.performance.total_return !== undefined && (
                    <div className="metric-item">
                      <span className="metric-key">Total Return:</span>
                      <span className={`metric-value ${experiment.performance.total_return >= 0 ? 'positive' : 'negative'}`}>
                        {experiment.performance.total_return.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {experiment.performance.annual_return !== undefined && (
                    <div className="metric-item">
                      <span className="metric-key">Annual Return:</span>
                      <span className={`metric-value ${experiment.performance.annual_return >= 0 ? 'positive' : 'negative'}`}>
                        {experiment.performance.annual_return.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {experiment.performance.sharpe_ratio !== undefined && (
                    <div className="metric-item">
                      <span className="metric-key">Sharpe Ratio:</span>
                      <span className={`metric-value ${experiment.performance.sharpe_ratio >= 0 ? 'positive' : 'negative'}`}>
                        {experiment.performance.sharpe_ratio.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {experiment.performance.max_drawdown !== undefined && (
                    <div className="metric-item">
                      <span className="metric-key">Max Drawdown:</span>
                      <span className="metric-value">
                        {experiment.performance.max_drawdown.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Performance Chart */}
                <div className="performance-chart" style={{ marginTop: '20px', height: '300px' }}>
                  <ReactECharts option={getChartOption(experiment.performance)} style={{ height: '100%' }} />
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
                  查看详情
                </button>
                {canCreateExperiments && (experiment.status === 'created' || experiment.status === 'completed' || experiment.status === 'failed') && (
                <button 
                  className="action-btn run-btn"
                  onClick={() => handleRunExperiment(experiment.id)}
                >
                  {experiment.status === 'created' ? '运行实验' : '重新运行'}
                </button>
              )}
              {canCreateExperiments && (
              <button 
                className="action-btn delete-btn"
                onClick={() => handleDeleteExperiment(experiment.id)}
              >
                删除
              </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Experiments
