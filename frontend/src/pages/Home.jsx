import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

const DAY_TITLES = {
  1: 'Airport & Arrival', 2: 'Immigration', 3: 'Hotel Check-in',
  4: 'Hotel Services', 5: 'Restaurant Basics', 6: 'Ordering Food',
  7: 'Week 1 Review', 8: 'Onsen & Bath', 9: 'Shopping',
  10: 'Transportation', 11: 'Asking Directions', 12: 'Emergencies',
  13: 'Politeness', 14: 'Basic Conversation', 15: 'Final Practice'
}

export default function Home() {
  const [user, setUser] = useState(api.getUser())
  const [lessons, setLessons] = useState([])
  const [reviewCount, setReviewCount] = useState(0)
  const [stats, setStats] = useState({ total: 0, learned: 0, percent: 0 })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [lessonsData, reviewData, userData] = await Promise.all([
        api.getLessons(),
        api.getReview(1).catch(() => ({ review_count: 0 })),
        api.getCurrentUser().catch(() => null)
      ])
      setLessons(lessonsData.lessons || [])
      setReviewCount(reviewData.review_count || 0)
      if (userData) {
        setStats(userData.stats || { total: 0, learned: 0, percent: 0 })
        setUser(userData.user)
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.logout()
    navigate('/login')
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
        <div className="home-hero">
          <div className="greeting">今日學習目標</div>
          <div className="username">👋 {user?.name || '你好'}</div>
          <div className="streak">
            🔥 {user?.streak || 1} 天連續學習
          </div>
        </div>

        <div className="home-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.learned || 0}</div>
            <div className="stat-label">已學phrase</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.percent || 0}%</div>
            <div className="stat-label">完成度</div>
          </div>
        </div>

        {reviewCount > 0 && (
          <Link to="/review" className="review-banner">
            <div className="icon">📝</div>
            <div className="text">
              <div className="title">今日溫習</div>
              <div className="subtitle">有 {reviewCount} 個phrase等緊你溫習</div>
            </div>
            <div style={{ fontSize: 24 }}>→</div>
          </Link>
        )}

        <div className="section-title">📚 15天日語課程</div>
        <div className="lesson-grid">
          {lessons.map(lesson => (
            <Link
              key={lesson.day}
              to={`/lesson/${lesson.day}`}
              className={`lesson-item${(lesson.completed || lesson.learned === lesson.phrases) ? ' completed' : ''}`}
            >
              <div className="lesson-number">
                {lesson.completed || lesson.learned === lesson.phrases ? '✓' : lesson.day}
              </div>
              <div className="lesson-info">
                <div className="lesson-title">
                  Day {lesson.day}: {DAY_TITLES[lesson.day] || `Day ${lesson.day}`}
                </div>
                <div className="lesson-meta">
                  {lesson.learned || 0}/{lesson.phrases} phrases
                  {lesson.completed ? ' ✅ 完成' : ''}
                </div>
              </div>
              <div className="lesson-arrow">→</div>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        <Link to="/" className="nav-item active">
          <span className="icon">🏠</span>
          首頁
        </Link>
        <Link to="/review" className="nav-item">
          <span className="nav-icon">📝</span>
          溫習
        </Link>
        <Link to="/progress" className="nav-item">
          <span className="nav-icon">📊</span>
          進度
        </Link>
        <a onClick={handleLogout} className="nav-item" style={{ cursor: 'pointer' }}>
          <span className="icon">🚪</span>
          登出
        </a>
      </nav>
    </>
  )
}
