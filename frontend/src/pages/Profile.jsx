import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const LEVEL_NAMES = ['', '初心', '見習', '入門', '旅客', '遊人', '熟手', '達人', '精通']
const LEVEL_ICONS = ['', '🌱', '📖', '🎒', '✈️', '🌍', '💪', '🏆', '👑']

export default function Profile() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [tab, setTab] = useState('stats')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await api.get('/auth/me')
        setUser(userRes.user)
        const progRes = await api.get('/progress?language=ja')
        setStats(progRes.stats)
        const achRes = await api.get('/achievements')
        setAchievements(achRes.achievements || [])
        const dailyRes = await api.get('/daily-stats')
        setDailyStats(dailyRes.stats || [])
        const lbRes = await api.get('/leaderboard')
        setLeaderboard(lbRes.leaderboard || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>

  const earned = achievements.filter(a => a.earned)
  const locked = achievements.filter(a => !a.earned)
  const myRank = leaderboard.findIndex(e => e.username === user?.username) + 1

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <Link to="/" className="back-btn">←</Link>
        <div className="profile-info">
          <div className="avatar-large">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div className="profile-name">{user?.username}</div>
          <div className="profile-level">
            {LEVEL_ICONS[stats?.level || 1]} Lv.{stats?.level || 1} {LEVEL_NAMES[stats?.level || 1]}
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="profile-xp">
        <div className="xp-info">
          <span>⭐ {stats?.xp || 0} XP</span>
          <span>🔥 {stats?.streak || 0} 天連續</span>
        </div>
        <div className="xp-bar-full">
          <div className="xp-fill" style={{
            width: `${Math.min(((stats?.xp || 0) / ((stats?.level + 1) * 100)) * 100, 100)}%`
          }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {['stats', 'achievements', 'calendar', 'ranking'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'stats' ? '📊' : t === 'achievements' ? '🏆' : t === 'calendar' ? '📅' : '🏅'}
            <span>{t === 'stats' ? '統計' : t === 'achievements' ? '成就' : t === 'calendar' ? '日曆' : '排名'}</span>
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="tab-content">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-val">{stats?.phrases_learned || 0}</div>
              <div className="stat-lbl">已學句子</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-val">{stats?.phrases_completed || 0}</div>
              <div className="stat-lbl">完全掌握</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-val">{stats?.xp || 0}</div>
              <div className="stat-lbl">總 XP</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-val">{stats?.streak || 0}</div>
              <div className="stat-lbl">連續天數</div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {tab === 'achievements' && (
        <div className="tab-content">
          {earned.length > 0 && (
            <>
              <div className="ach-section-title">🏅 已獲得 ({earned.length})</div>
              <div className="ach-grid">
                {earned.map(a => (
                  <div key={a.id} className="ach-card earned">
                    <div className="ach-icon">{a.icon}</div>
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc">{a.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {locked.length > 0 && (
            <>
              <div className="ach-section-title">🔒 鎖定中 ({locked.length})</div>
              <div className="ach-grid">
                {locked.map(a => (
                  <div key={a.id} className="ach-card locked">
                    <div className="ach-icon">🔒</div>
                    <div className="ach-name">{a.name}</div>
                    <div className="ach-desc">{a.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div className="tab-content">
          <div className="calendar-title">📅 學習日曆</div>
          <div className="calendar-grid">
            {(dailyStats || []).slice(0, 30).map((s, i) => (
              <div key={i} className={`cal-day ${s.sentences_completed > 0 ? 'active' : ''}`}>
                <div className="cal-dot">{s.sentences_completed > 0 ? '●' : '○'}</div>
                <div className="cal-date">{s.date?.slice(5)}</div>
                <div className="cal-xp">+{s.xp_earned || 0}XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking Tab */}
      {tab === 'ranking' && (
        <div className="tab-content">
          {myRank > 0 && (
            <div className="my-rank">
              你的排名：第 {myRank} 位
            </div>
          )}
          <div className="leaderboard">
            {leaderboard.map((entry, i) => (
              <div key={i} className={`lb-row ${entry.username === user?.username ? 'me' : ''}`}>
                <div className="lb-rank">{i + 1}</div>
                <div className="lb-name">{entry.username}</div>
                <div className="lb-xp">⭐ {entry.xp} XP</div>
                <div className="lb-streak">🔥 {entry.streak}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .profile-page { max-width: 640px; margin: 0 auto; padding: 16px; padding-bottom: 40px; }
        .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .back-btn { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; border: none; font-size: 18px; cursor: pointer; text-decoration: none; display: flex; align-items: center; justify-content: center; }
        .profile-info { flex: 1; text-align: center; }
        .avatar-large { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; margin: 0 auto 8px; }
        .profile-name { font-size: 22px; font-weight: 700; color: #1e1e2e; }
        .profile-level { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .profile-xp { background: #f9fafb; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
        .xp-info { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
        .xp-bar-full { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .xp-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 4px; transition: width 0.5s; }
        .profile-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 12px; border: none; background: #f3f4f6; cursor: pointer; font-size: 13px; color: #6b7280; transition: all 0.2s; }
        .tab.active { background: #eef2ff; color: #6366f1; font-weight: 600; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stat-card { background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .stat-icon { font-size: 28px; margin-bottom: 8px; }
        .stat-val { font-size: 28px; font-weight: 800; color: #6366f1; }
        .stat-lbl { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        .ach-section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; margin-top: 8px; }
        .ach-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ach-card { background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .ach-card.locked { opacity: 0.5; }
        .ach-icon { font-size: 32px; margin-bottom: 8px; }
        .ach-name { font-size: 14px; font-weight: 600; color: #1e1e2e; margin-bottom: 4px; }
        .ach-desc { font-size: 12px; color: #9ca3af; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .cal-day { background: white; border-radius: 8px; padding: 8px 4px; text-align: center; }
        .cal-day.active { background: #ede9fe; }
        .cal-dot { font-size: 16px; color: #6366f1; }
        .cal-date { font-size: 10px; color: #9ca3af; }
        .cal-xp { font-size: 10px; color: #a78bfa; }
        .my-rank { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px; border-radius: 12px; text-align: center; font-weight: 600; margin-bottom: 16px; }
        .leaderboard { display: flex; flex-direction: column; gap: 8px; }
        .lb-row { display: flex; align-items: center; gap: 12px; background: white; border-radius: 12px; padding: 12px 16px; }
        .lb-row.me { background: #eef2ff; border: 2px solid #6366f1; }
        .lb-rank { font-size: 18px; font-weight: 700; color: #6366f1; width: 24px; }
        .lb-name { flex: 1; font-weight: 600; color: #1e1e2e; }
        .lb-xp { font-size: 13px; color: #6b7280; }
        .lb-streak { font-size: 13px; color: #f59e0b; }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #6b7280; gap: 12px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
