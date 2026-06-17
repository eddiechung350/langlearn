import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Progress() {
  const [stats, setStats] = useState({ total: 0, learned: 0, percent: 0 })
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await api.getCurrentUser()
      setStats(data.stats || { total: 0, learned: 0, percent: 0 })
      setUser(data.user)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加載中...</p>
      </div>
    )
  }

  return (
    <>
      <div className="page">
        <div className="header" style={{ margin: -20, marginBottom: 16, borderRadius: 0 }}>
          <Link to="/" className="header-back">←</Link>
          <span className="header-title">📊 學習進度</span>
          <div style={{ width: 40 }} />
        </div>

        <div className="progress-hero">
          <div className="progress-percent">{stats.percent || 0}%</div>
          <div className="progress-label">課程完成度</div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${stats.percent || 0}%` }}
            />
          </div>
        </div>

        <div className="home-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.learned || 0}</div>
            <div className="stat-label">已掌握phrases</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.total || 0}</div>
            <div className="stat-label">總phrases</div>
          </div>
        </div>

        {user && (
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>📈 學習統計</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-light)' }}>🔥 連續學習</span>
                <span style={{ fontWeight: 700 }}>{user.streak || 1} 天</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-light)' }}>🎯 當前語言</span>
                <span style={{ fontWeight: 700 }}>{user.language === 'ja' ? '🇯🇵 日語' : user.language}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-light)' }}>📅 每日目標</span>
                <span style={{ fontWeight: 700 }}>{user.daily_goal || 5} phrases</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-light)' }}>📆 開始日期</span>
                <span style={{ fontWeight: 700 }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('zh-HK') : '今天'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="card" style={{ background: 'var(--lavender)', border: 'none' }}>
          <h3 style={{ marginBottom: 8 }}>💡 學習技巧</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 16 }}>
            <li>每天溫習已學過的phrase比學新的更重要</li>
            <li>嘗試自己先說，再看答案</li>
            <li>標記為「忘記」的phrase會更快出現</li>
            <li>連續學習天數越多，記憶效果越好</li>
          </ul>
        </div>

        <Link to="/" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
          🏠 返回首頁
        </Link>
      </div>
    </>
  )
}
