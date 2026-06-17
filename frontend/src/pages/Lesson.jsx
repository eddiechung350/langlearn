import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

const VOICE_MAP = {
  ja: 'ja-JP-NanamiNeural',
  fr: 'fr-FR-DeniseNeural',
  es: 'es-ES-ElviraNeural',
  zh: 'zh-HK-HiuGaaiNeural',
}

export default function Lesson() {
  const { day } = useParams()
  const [lessonData, setLessonData] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [audioLoading, setAudioLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLesson()
  }, [day])

  const loadLesson = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getLesson(parseInt(day))
      setLessonData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const playAudio = async (text, language = 'ja') => {
    setAudioLoading(true)
    try {
      // Use Web Speech API as fallback (browser native, no server needed)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'ja' ? 'ja-JP' : language === 'fr' ? 'fr-FR' : 'es-ES'
        utterance.rate = 0.8
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      }
    } catch (err) {
      console.error('Audio error:', err)
    } finally {
      setAudioLoading(false)
    }
  }

  const handleNext = () => {
    if (lessonData && currentIndex < lessonData.phrases.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加載課程中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', color: 'var(--coral)' }}>
          <p>❌ {error}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            返回首頁
          </Link>
        </div>
      </div>
    )
  }

  const phrase = lessonData?.phrases?.[currentIndex]
  if (!phrase) return null

  const totalPhrases = lessonData?.phrases?.length || 0
  const language = lessonData?.language || 'ja'

  return (
    <>
      <div className="page">
        <div className="header" style={{ margin: -20, marginBottom: 16, borderRadius: 0 }}>
          <Link to="/" className="header-back">←</Link>
          <span className="header-title">📚 Day {day}</span>
          <div style={{ width: 40 }} />
        </div>

        <div className="lesson-header">
          <div className="day">Lesson {currentIndex + 1} of {totalPhrases}</div>
          <div className="title">{lessonData?.title || `Day ${day}`}</div>
        </div>

        <div className="phrase-card">
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>
            {phrase.usage_context && `📍 ${phrase.usage_context}`}
          </div>
          <div className="phrase-japanese">{phrase.japanese}</div>
          <div className="phrase-romaji">{phrase.romaji}</div>
          <div className="phrase-chinese">{phrase.chinese}</div>
          
          <button
            className="phrase-audio-btn"
            onClick={() => playAudio(phrase.japanese, language)}
            disabled={audioLoading}
          >
            {audioLoading ? '🔊...' : '🔊 播放發音'}
          </button>
        </div>

        <div className="phraseNav" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ← 上一個
          </button>
          <Link
            to={`/practice/${phrase.id}`}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            🎤 練習發音 →
          </Link>
          <button
            className="btn btn-secondary"
            onClick={handleNext}
            disabled={currentIndex === totalPhrases - 1}
          >
            下一個 →
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(lessonData?.phrases || []).map((p, i) => (
              <div
                key={p.id}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: i === currentIndex ? 'var(--coral)' : i < currentIndex ? 'var(--mint)' : 'var(--cream-dark)',
                  color: i === currentIndex ? 'white' : 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
