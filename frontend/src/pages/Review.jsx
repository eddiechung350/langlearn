import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Review() {
  const [phrases, setPhrases] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    loadReview()
  }, [])

  const loadReview = async () => {
    setLoading(true)
    try {
      const data = await api.getReview(10)
      setPhrases(data.phrases || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async (rating) => {
    const phrase = phrases[currentIndex]
    if (!phrase) return

    try {
      await api.updateProgress(phrase.id, rating)
    } catch (err) {
      console.error(err)
    }

    setCompleted(c => c + 1)
    setShowAnswer(false)

    if (currentIndex < phrases.length - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 300)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加載溫習中...</p>
      </div>
    )
  }

  if (phrases.length === 0) {
    return (
      <div className="page">
        <div className="header" style={{ margin: -20, marginBottom: 16, borderRadius: 0 }}>
          <Link to="/" className="header-back">←</Link>
          <span className="header-title">📝 溫習</span>
          <div style={{ width: 40 }} />
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h3 style={{ marginTop: 12 }}>今日溫習完成！</h3>
          <p style={{ color: 'var(--text-light)', marginTop: 8 }}>
            所有phrase都已溫習，繼續保持！
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            🏠 返回首頁
          </Link>
        </div>
      </div>
    )
  }

  const phrase = phrases[currentIndex]
  const progress = `${currentIndex + 1} / ${phrases.length}`

  return (
    <>
      <div className="page">
        <div className="header" style={{ margin: -20, marginBottom: 16, borderRadius: 0 }}>
          <Link to="/" className="header-back">←</Link>
          <span className="header-title">📝 溫習</span>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>{progress}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 6, background: 'var(--cream-dark)', borderRadius: 3 }}>
            <div style={{
              height: '100%',
              width: `${((currentIndex) / phrases.length) * 100}%`,
              background: 'var(--mint)',
              borderRadius: 3,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        <div
          className="card"
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowAnswer(true)}
        >
          {!showAnswer ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
              <div style={{ fontFamily: 'Noto Sans JP', fontSize: 28, fontWeight: 700 }}>
                {phrase.japanese}
              </div>
              <div style={{ color: 'var(--text-light)', marginTop: 12, fontSize: 14 }}>
                點擊顯示答案
              </div>
            </>
          ) : (
            <>
              <div className="phrase-japanese" style={{ fontSize: 28 }}>{phrase.japanese}</div>
              <div className="phrase-romaji" style={{ fontSize: 18, marginTop: 8 }}>{phrase.romaji}</div>
              <div className="phrase-chinese" style={{ fontSize: 16, marginTop: 8 }}>{phrase.chinese}</div>
            </>
          )}
        </div>

        {showAnswer && (
          <div className="rating-section">
            <div className="rating-label">這個發音你觉得怎么样？</div>
            <div className="rating-buttons">
              <button className="rating-btn rating-1" onClick={() => handleRating(1)}>
                <span className="rating-emoji">😵</span>
                忘記了
              </button>
              <button className="rating-btn rating-2" onClick={() => handleRating(2)}>
                <span className="rating-emoji">🤔</span>
                有啲難
              </button>
              <button className="rating-btn rating-3" onClick={() => handleRating(3)}>
                <span className="rating-emoji">😊</span>
                正常
              </button>
              <button className="rating-btn rating-4" onClick={() => handleRating(4)}>
                <span className="rating-emoji">🤩</span>
                完美！
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
