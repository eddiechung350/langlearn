import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

const LEVEL_NAMES = ['', '初心', '見習', '入門', '旅客', '遊人', '熟手', '達人', '精通']
const LANG_FLAG = { ja: '🗾', fr: '🇫🇷', it: '🇮🇹' }
const LANG_NAME = { ja: '日本語', fr: 'Français', it: 'Italiano' }

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [languages, setLanguages] = useState([])
  const [selectedLang, setSelectedLang] = useState('ja')
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const userRes = await api.get('/api/auth/me')
        setUser(userRes.user)

        // Load all languages
        const langRes = await api.get('/api/languages')
        setLanguages(langRes.languages)

        // Load progress
        const progRes = await api.get(`/api/progress?language=${selectedLang}`)
        setStats(progRes.stats)
        setAchievements(progRes.achievements || [])

        // Load daily stats
        const dailyRes = await api.get('/api/daily-stats')
        setDailyStats(dailyRes.stats || [])

        // Load content for selected language
        const contRes = await api.get(`/api/${selectedLang}/content`)
        setContent(contRes)
      } catch (e) {
        console.error('Load error', e)
      }
      setLoading(false)
    }
    loadData()
  }, [selectedLang])

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>

  const xpForNext = stats?.level ? Math.ceil((stats.level + 1) * 100 - (stats.xp || 0)) : 100
  const xpProgress = stats?.level ? Math.round(((stats.xp || 0) / ((stats.level + 1) * 100)) * 100) : 0
  const recentAchievements = achievements.filter(a => a.earned).slice(-3)

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <div className="user-greeting">
          <div className="avatar-circle">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <h1>{user?.username} 👋</h1>
            <div className="level-badge">
              <span className="level-num">Lv.{stats?.level || 1}</span>
              <span className="level-name">{LEVEL_NAMES[stats?.level || 1]}</span>
            </div>
          </div>
        </div>
        <Link to="/profile" className="profile-btn">👤</Link>
      </div>

      {/* XP Progress */}
      <div className="xp-card">
        <div className="xp-header">
          <span>⭐ 經驗值 {stats?.xp || 0} XP</span>
          <span>🔥 {stats?.streak || 0} 天連續</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${Math.min(xpProgress, 100)}%` }} />
        </div>
        <div className="xp-footer">
          再 {xpForNext} XP 到下一級
        </div>
      </div>

      {/* Language Selector */}
      <div className="lang-selector">
        {languages.map(l => (
          <button
            key={l.code}
            className={`lang-btn ${selectedLang === l.code ? 'active' : ''}`}
            onClick={() => setSelectedLang(l.code)}
          >
            <span className="lang-flag">{l.flag}</span>
            <span className="lang-name">{l.name}</span>
          </button>
        ))}
      </div>

      {/* Today's Goal */}
      <div className="goal-card">
        <div className="goal-header">
          <span>🎯 今日目標</span>
          {stats?.streak ? <span className="streak-badge">🔥 {stats.streak}天</span> : null}
        </div>
        <div className="goal-body">
          <div className="goal-stat">
            <div className="goal-num">{stats?.phrases_learned || 0}</div>
            <div className="goal-label">已學句子</div>
          </div>
          <div className="goal-divider" />
          <div className="goal-stat">
            <div className="goal-num">{stats?.phrases_completed || 0}</div>
            <div className="goal-label">完全掌握</div>
          </div>
          <div className="goal-divider" />
          <div className="goal-stat">
            <div className="goal-num">{content?.days?.length || 0}</div>
            <div className="goal-label">可用天數</div>
          </div>
        </div>
      </div>

      {/* Scene/Day Grid */}
      <div className="section-title">
        📅 學習場景 — {LANG_NAME[selectedLang]}
      </div>
      <div className="scene-grid">
        {content?.days?.map(day => (
          <button
            key={day.day}
            className="scene-card"
            onClick={() => navigate(`/shadowing/${day.day}?lang=${selectedLang}`)}
          >
            <div className="scene-icon">{day.scene_name?.match(/[\p{Emoji}]/u)?.[0] || '📚'}</div>
            <div className="scene-info">
              <div className="scene-day">Day {day.day}</div>
              <div className="scene-name">{day.scene_name}</div>
              <div className="scene-count">{day.phrases.length} 句</div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/review" className="quick-btn review">
          <span className="qa-icon">🔁</span>
          <span>複習回顧</span>
        </Link>
        <Link to="/profile" className="quick-btn profile">
          <span className="qa-icon">🏆</span>
          <span>成就牆</span>
        </Link>
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="section-title">🏅 最近成就</div>
      )}
      <div className="achievement-row">
        {recentAchievements.map(a => (
          <div key={a.id} className="achievement-badge earned">
            <span className="a-icon">{a.icon}</span>
            <span className="a-name">{a.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        .home-page { max-width: 640px; margin: 0 auto; padding: 16px; padding-bottom: 80px; }
        .home-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .user-greeting { display: flex; align-items: center; gap: 12px; }
        .avatar-circle { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; }
        .home-header h1 { font-size: 20px; font-weight: 700; color: #1e1e2e; margin: 0; }
        .level-badge { display: inline-flex; gap: 6px; margin-top: 2px; }
        .level-num { background: #f3f4f6; color: #6366f1; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .level-name { background: #ede9fe; color: #7c3aed; padding: 2px 8px; border-radius: 8px; font-size: 12px; }
        .profile-btn { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; border: none; font-size: 18px; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; }
        .xp-card { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; padding: 16px 20px; color: white; margin-bottom: 16px; }
        .xp-header { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; opacity: 0.9; }
        .xp-bar { height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; }
        .xp-fill { height: 100%; background: white; border-radius: 4px; transition: width 0.5s; }
        .xp-footer { font-size: 12px; opacity: 0.8; margin-top: 6px; text-align: right; }
        .lang-selector { display: flex; gap: 8px; margin-bottom: 16px; }
        .lang-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 12px; border: 2px solid #e5e7eb; background: white; cursor: pointer; transition: all 0.2s; }
        .lang-btn.active { border-color: #6366f1; background: #eef2ff; }
        .lang-flag { font-size: 24px; }
        .lang-name { font-size: 12px; font-weight: 600; color: #374151; }
        .goal-card { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 20px; }
        .goal-header { font-size: 13px; color: #6b7280; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .streak-badge { background: #fff7ed; color: #ea580c; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }
        .goal-body { display: flex; justify-content: space-around; align-items: center; }
        .goal-stat { text-align: center; }
        .goal-num { font-size: 28px; font-weight: 800; color: #6366f1; }
        .goal-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }
        .goal-divider { width: 1px; height: 40px; background: #e5e7eb; }
        .section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .scene-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .scene-card { background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: all 0.2s; text-align: left; }
        .scene-card:hover { border-color: #6366f1; box-shadow: 0 4px 12px rgba(99,102,241,0.15); transform: translateY(-2px); }
        .scene-icon { font-size: 28px; }
        .scene-day { font-size: 11px; color: #9ca3af; }
        .scene-name { font-size: 14px; font-weight: 600; color: #1e1e2e; }
        .scene-count { font-size: 12px; color: #6b7280; }
        .quick-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .quick-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; color: white; transition: transform 0.2s; }
        .quick-btn:hover { transform: scale(1.02); }
        .quick-btn.review { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .quick-btn.profile { background: linear-gradient(135deg, #10b981, #059669); }
        .qa-icon { font-size: 18px; }
        .achievement-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .achievement-badge { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; background: #f3f4f6; color: #6b7280; }
        .achievement-badge.earned { background: #fef3c7; color: #92400e; }
        .a-icon { font-size: 16px; }
        .a-name { font-size: 12px; }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #6b7280; gap: 12px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
