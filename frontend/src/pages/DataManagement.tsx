import React, { useState, useEffect } from 'react'
import { getStockData, getStockCodes } from '../services/data'
import './DataManagement.css'

interface StockData {
  id: number
  stock_code: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  created_at: string
  updated_at: string
}

interface DataResponse {
  data: StockData[]
  total: number
  page: number
  per_page: number
}

const DataManagement: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([])
  const [stockCodes, setStockCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filtering, setFiltering] = useState(false)
  const [stockCode, setStockCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStockCodes()
  }, [])

  useEffect(() => {
    fetchStockData()
  }, [stockCode, startDate, endDate, page, perPage])

  const fetchStockCodes = async () => {
    try {
      const codes = await getStockCodes()
      setStockCodes(codes)
    } catch (err) {
      console.error('Error fetching stock codes:', err)
    }
  }

  const fetchStockData = async () => {
    try {
      setLoading(true)
      const response: DataResponse = await getStockData({
        stock_code: stockCode || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        per_page: perPage
      })
      setStockData(response.data)
      setTotal(response.total)
    } catch (err) {
      setError('Failed to fetch stock data')
      console.error('Error fetching stock data:', err)
    } finally {
      setLoading(false)
      setFiltering(false)
    }
  }

  const handleFilter = () => {
    setPage(1)
    setFiltering(true)
  }

  const handleReset = () => {
    setStockCode('')
    setStartDate('')
    setEndDate('')
    setPage(1)
    setFiltering(true)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(parseInt(e.target.value))
    setPage(1)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="data-management">
      <div className="page-header">
        <h1>数据管理</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-container">
        <h2>数据筛选</h2>
        <div className="filter-form">
          <div className="filter-group">
            <label htmlFor="stockCode">股票代码</label>
            <select
              id="stockCode"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              className="form-control"
            >
              <option value="">全部</option>
              {stockCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="startDate">开始日期</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="endDate">结束日期</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="filter-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleFilter}
              disabled={filtering}
            >
              {filtering ? '筛选中...' : '筛选'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleReset}
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        <div className="table-header">
          <h2>股票数据</h2>
          <div className="table-controls">
            <div className="per-page-selector">
              <label htmlFor="perPage">每页显示：</label>
              <select
                id="perPage"
                value={perPage}
                onChange={handlePerPageChange}
                className="form-control"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>股票代码</th>
                    <th>日期</th>
                    <th>开盘价</th>
                    <th>最高价</th>
                    <th>最低价</th>
                    <th>收盘价</th>
                    <th>成交量</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((data) => (
                    <tr key={data.id}>
                      <td>{data.stock_code}</td>
                      <td>{data.date}</td>
                      <td>{data.open.toFixed(2)}</td>
                      <td>{data.high.toFixed(2)}</td>
                      <td>{data.low.toFixed(2)}</td>
                      <td>{data.close.toFixed(2)}</td>
                      <td>{data.volume.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {total > 0 && (
              <div className="pagination">
                <div className="pagination-info">
                  显示 {((page - 1) * perPage) + 1} 到 {Math.min(page * perPage, total)} 条，共 {total} 条
                </div>
                <div className="pagination-controls">
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                  >
                    首页
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    上一页
                  </button>
                  <span className="page-info">
                    第 {page} 页 / 共 {totalPages} 页
                  </span>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    下一页
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                  >
                    末页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DataManagement
