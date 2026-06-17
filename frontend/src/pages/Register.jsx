import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !password) {
      setError('請輸入名稱和密碼')
      return
    }
    if (password !== confirmPassword) {
      setError('兩次密碼不一致')
      return
    }
    if (password.length < 4) {
      setError('密碼至少4個字')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.register(name.trim(), password, 'ja')
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
        <div className="emoji">🌍</div>
        <h1>開始學習</h1>
        <p>15天學會旅行日語</p>
      </div>
      <div className="auth-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">你的名字</label>
            <input
              type="text"
              className="form-input"
              placeholder="例如：Eddie"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密碼（至少4字）</label>
            <input
              type="password"
              className="form-input"
              placeholder="設定密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">確認密碼</label>
            <input
              type="password"
              className="form-input"
              placeholder="再輸入一次"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '創建帳戶中...' : '創建帳戶 🌟'}
          </button>
        </form>
      </div>
      <div className="auth-footer">
        已有帳戶？<Link to="/login">立即登入</Link>
      </div>
    </div>
  )
}
