import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { getProfitLoss } from '../services/experiments'

interface ProfitLossData {
  id: number
  model_id: number
  model_name: string
  date: string
  profit: number
  loss: number
  total: number
}

const ProfitLoss: React.FC = () => {
  const [profitLossData, setProfitLossData] = useState<ProfitLossData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfitLossData = async () => {
      try {
        // 调用真实API获取收益数据
        const data = await getProfitLoss()
        // Ensure data is an array
        setProfitLossData(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch profit/loss data:', err)
        setProfitLossData([])
      } finally {
        setLoading(false)
      }
    }

    fetchProfitLossData()
  }, [])

  if (loading) {
    return <div className="container">Loading...</div>
  }

  // 准备图表数据
  const modelNames = [...new Set(profitLossData.map(item => item.model_name))]
  const dates = [...new Set(profitLossData.map(item => item.date))].sort()

  // 折线图配置
  const lineChartOptions = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a0}: {c0}<br/>{a1}: {c1}<br/>{a2}: {c2}'
    },
    legend: {
      data: ['Profit', 'Loss', 'Total']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Profit',
        type: 'line',
        stack: 'Total',
        data: dates.map(date => {
          const item = profitLossData.find(d => d.date === date && d.model_name === modelNames[0])
          return item ? item.profit : 0
        }),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Loss',
        type: 'line',
        stack: 'Total',
        data: dates.map(date => {
          const item = profitLossData.find(d => d.date === date && d.model_name === modelNames[0])
          return item ? -item.loss : 0
        }),
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: 'Total',
        type: 'line',
        data: dates.map(date => {
          const item = profitLossData.find(d => d.date === date && d.model_name === modelNames[0])
          return item ? item.total : 0
        }),
        itemStyle: { color: '#1890ff' }
      }
    ]
  }

  // 柱状图配置
  const barChartOptions = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['Profit', 'Loss']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: dates
    },
    series: [
      {
        name: 'Profit',
        type: 'bar',
        data: dates.map(date => {
          const item = profitLossData.find(d => d.date === date && d.model_name === modelNames[0])
          return item ? item.profit : 0
        }),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: 'Loss',
        type: 'bar',
        data: dates.map(date => {
          const item = profitLossData.find(d => d.date === date && d.model_name === modelNames[0])
          return item ? item.loss : 0
        }),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  }

  return (
    <div className="container page-transition">
      <h1>收益情况</h1>
      
      <div className="dashboard">
        <div className="card stats-card">
          <h3>总收益</h3>
          <p className="stat-value">¥{profitLossData.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}</p>
        </div>
        <div className="card stats-card">
          <h3>总亏损</h3>
          <p className="stat-value">¥{profitLossData.reduce((sum, item) => sum + item.loss, 0).toLocaleString()}</p>
        </div>
        <div className="card stats-card">
          <h3>净利润</h3>
          <p className="stat-value">¥{profitLossData.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="chart-container">
        <h2 className="chart-title">收益趋势图</h2>
        <ReactECharts option={lineChartOptions} style={{ height: '400px', width: '100%' }} />
      </div>
      
      <div className="chart-container">
        <h2 className="chart-title">收益与亏损对比</h2>
        <ReactECharts option={barChartOptions} style={{ height: '400px', width: '100%' }} />
      </div>
      
      <div className="data-table-container">
        <h2>详细数据</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>模型名称</th>
              <th>收益</th>
              <th>亏损</th>
              <th>总计</th>
            </tr>
          </thead>
          <tbody>
            {profitLossData.map(item => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.model_name}</td>
                <td className="profit">¥{item.profit.toLocaleString()}</td>
                <td className="loss">¥{item.loss.toLocaleString()}</td>
                <td className={item.total >= 0 ? 'total-profit' : 'total-loss'}>¥{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProfitLoss