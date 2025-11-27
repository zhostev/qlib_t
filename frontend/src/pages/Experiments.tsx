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
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState('')
  const [yamlError, setYamlError] = useState('')
  const navigate = useNavigate()

  // 默认YAML配置示例
  const defaultYamlExample = `# QLib实验配置示例
qlib_init:
    provider_uri: "~/.qlib/qlib_data/cn_data"
    region: cn
market: &market csi300
benchmark: &benchmark SH000300
data_handler_config:
    start_time: 2008-01-01
    end_time: 2020-08-01
    fit_start_time: 2008-01-01
    fit_end_time: 2014-12-31
    instruments: *market
    freq: day
task:
    model:
        class: LGBModel
        module_path: qlib.contrib.model.gbdt
        kwargs:
            loss: mse
            colsample_bytree: 0.8879
            learning_rate: 0.0421
            subsample: 0.8789
            lambda_l1: 205.6999
            lambda_l2: 580.9768
            max_depth: 8
            num_leaves: 210
            num_threads: 20
    dataset:
        class: DatasetH
        module_path: qlib.data.dataset
        kwargs:
            handler:
                class: Alpha158
                module_path: qlib.contrib.data.handler
                kwargs:
                    start_time: 2008-01-01
                    end_time: 2020-08-01
                    fit_start_time: 2008-01-01
                    fit_end_time: 2014-12-31
                    instruments: *market
                    freq: day
            segments:
                train:
                    - "2008-01-01"
                    - "2014-12-31"
                valid:
                    - "2015-01-01"
                    - "2016-12-31"
                test:
                    - "2017-01-01"
                    - "2020-08-01"
    record:
        - class: SignalRecord
          module_path: qlib.workflow.record_temp
        - class: PortAnaRecord
          module_path: qlib.workflow.record_temp
          kwargs:
              config:
                  strategy:
                      class: TopkDropoutStrategy
                      module_path: qlib.contrib.strategy.signal_strategy
                      kwargs:
                          topk: 50
                          n_drop: 5
                  backtest:
                      start_time: 2017-01-01
                      end_time: 2020-08-01
                      freq: day
                      account: 100000000
                      benchmark: *benchmark
                      exchange_kwargs:
                          freq: day
                          limit_threshold: 0.095
                          deal_price: close
                          open_cost: 0.0005
                          close_cost: 0.0015
                          min_cost: 5
`

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
    const configId = e.target.value
    if (configId === '') {
      setSelectedConfig(null)
      setYamlContent(defaultYamlExample)
    } else {
      const id = parseInt(configId)
      setSelectedConfig(id)
      
      const config = configs.find(c => c.id === id)
      if (config) {
        setYamlContent(config.content)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setYamlError('')
    
    // 客户端验证
    if (!name.trim()) {
      setNameError('实验名称不能为空');
      return;
    }
    
    if (name.length < 3) {
      setNameError('实验名称至少需要3个字符');
      return;
    }
    
    if (!yamlContent.trim()) {
      setYamlError('YAML配置不能为空');
      return;
    }
    
    setSubmitting(true)

    try {
      // Parse YAML content to JSON
      const config = yaml.load(yamlContent) as any
      
      // 验证YAML结构
      if (!config || typeof config !== 'object') {
        throw new Error('YAML配置必须是有效的对象');
      }
      
      if (!config.task) {
        throw new Error('YAML配置必须包含task字段');
      }
      
      if (!config.task.model || !config.task.dataset) {
        throw new Error('task字段必须包含model和dataset');
      }
      
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
        setYamlError(`YAML格式错误: ${err.message.split(' at line')[0]}`);
      } else {
        setError(err.response?.data?.detail || err.message || '创建实验失败');
      }
    } finally {
      setSubmitting(false)
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
    setYamlContent(defaultYamlExample)
    setShowForm(false)
    setError('')
    setNameError('')
    setYamlError('')
    setSubmitting(false)
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container page-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Experiments</h1>
          <button className="btn" onClick={() => {
            setShowForm(true)
            setYamlContent(defaultYamlExample)
          }}>
            Create Experiment
          </button>
        </div>

      {showForm && (
        <div style={{ marginBottom: '20px', padding: '25px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', border: '1px solid #e8e8e8' }}>
          <h2 style={{ marginBottom: '25px', color: '#333', fontSize: '24px', fontWeight: '600' }}>创建实验</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                实验名称 <span style={{ color: '#ff4d4f', fontSize: '0.8em' }}>(必填)</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  // 实时验证名称
                  if (!value.trim()) {
                    setNameError('实验名称不能为空');
                  } else if (value.length < 3) {
                    setNameError('实验名称至少需要3个字符');
                  } else {
                    setNameError('');
                  }
                }}
                placeholder="例如: LightGBM_Alpha158_Experiment"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${nameError ? '#ff4d4f' : '#d9d9d9'}`,
                  fontSize: '14px',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = nameError ? '#ff4d4f' : '#1890ff';
                  (e.target as HTMLInputElement).style.boxShadow = nameError ? '0 0 0 2px rgba(255, 77, 79, 0.2)' : '0 0 0 2px rgba(24, 144, 255, 0.2)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = nameError ? '#ff4d4f' : '#d9d9d9';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
              {nameError && (
                <small style={{ color: '#ff4d4f', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                  ⚠️ {nameError}
                </small>
              )}
              {!nameError && (
                <small style={{ color: '#666', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                  实验的唯一标识符，用于区分不同实验
                </small>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                实验描述
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="例如: 使用LightGBM模型和Alpha158因子进行回测实验"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                  fontSize: '14px',
                  resize: 'vertical',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = '#1890ff';
                  (e.target as HTMLTextAreaElement).style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.2)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = '#d9d9d9';
                  (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
                }}
              />
              <small style={{ color: '#666', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                实验的详细描述，帮助您和团队理解实验目的
              </small>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="config" style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                选择配置模板
              </label>
              <select
                id="config"
                value={selectedConfig || ''}
                onChange={handleConfigChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d9d9d9',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\" width=\"16\" height=\"16\"%3E%3Cpath fill=\"%23666\" d=\"M840.4 300H183.6c-19.7 0-35.3 15.6-35.3 35.3v35.3c0 19.7 15.6 35.3 35.3 35.3h656.8c19.7 0 35.3-15.6 35.3-35.3v-35.3c0-19.7-15.6-35.3-35.3-35.3z\"/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '32px'
                }}
                onFocus={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#1890ff';
                  (e.target as HTMLSelectElement).style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.2)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLSelectElement).style.borderColor = '#d9d9d9';
                  (e.target as HTMLSelectElement).style.boxShadow = 'none';
                }}
              >
                <option value="">-- 选择模板或使用默认配置 --</option>
                {configs.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                选择一个预定义的配置模板，或直接在下方编辑器中输入自定义配置
              </small>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="yamlContent" style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                YAML配置
              </label>
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
                <strong style={{ fontSize: '13px', color: '#333' }}>配置说明：</strong>
                <ul style={{ margin: '6px 0 0 20px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                  <li>使用YAML格式定义实验配置</li>
                  <li>必须包含 <code>task</code> 字段，其中包含 <code>model</code> 和 <code>dataset</code></li>
                  <li>model和dataset必须指定 <code>class</code> 和 <code>module_path</code></li>
                  <li>可使用预定义模板或修改默认示例</li>
                </ul>
              </div>
              <YAMLEditor
                value={yamlContent || defaultYamlExample}
                onChange={setYamlContent}
                error={yamlError}
              />
              {yamlError && (
                <small style={{ color: '#ff4d4f', display: 'block', marginTop: '6px', fontSize: '12px' }}>
                  ⚠️ {yamlError}
                </small>
              )}
            </div>
            {error && (
              <div style={{ marginBottom: '15px', padding: '10px 12px', backgroundColor: '#fff1f0', color: '#ff4d4f', borderRadius: '6px', border: '1px solid #ffccc7', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
              <button 
                type="submit" 
                className="btn"
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  backgroundColor: submitting ? '#40a9ff' : '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: submitting ? 0.8 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#40a9ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#1890ff';
                  }
                }}
              >
                {submitting ? '创建中...' : '创建实验'}
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={resetForm}
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#fff',
                  color: submitting ? '#d9d9d9' : '#666',
                  border: `1px solid ${submitting ? '#e8e8e8' : '#d9d9d9'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    (e.target as HTMLButtonElement).style.borderColor = '#1890ff';
                    (e.target as HTMLButtonElement).style.color = '#1890ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    (e.target as HTMLButtonElement).style.borderColor = '#d9d9d9';
                    (e.target as HTMLButtonElement).style.color = '#666';
                  }
                }}
              >
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
