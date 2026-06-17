import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !password) {
      setError('請輸入名稱和密碼')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.login(name.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <div className="emoji">🐰</div>
        <h1>LangLearn</h1>
        <p>每日15分鐘，學會新語言</p>
      </div>
      <div className="auth-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">名稱</label>
            <input
              type="text"
              className="form-input"
              placeholder="你的名字"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密碼</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '登入中...' : '登入 🐰'}
          </button>
        </form>
      </div>
      <div className="auth-footer">
        還沒有帳戶？<Link to="/register">立即註冊</Link>
      </div>
    </div>
  )
}
