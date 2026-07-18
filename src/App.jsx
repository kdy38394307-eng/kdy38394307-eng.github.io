import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import './App.css'

const recommendations = [
  {
    genre: '인디 록',
    title: 'EVERYTHING',
    artist: '검정치마',
    description: '잔잔한 기타와 감성적인 보컬이 어우러지는 인디 록 곡이에요.',
    spotifyId: '4vb7g4GrE9cOrhEzUWadN8',
  },
  {
    genre: '인디 팝',
    title: 'seasons',
    artist: 'wave to earth',
    description: '계절이 바뀌는 듯한 분위기를 담은 따뜻한 밴드 사운드예요.',
    spotifyId: '5VBjyOQzqlPNgdRPMM6prF',
  },
  {
    genre: 'R&B',
    title: 'Square (2017)',
    artist: '백예린',
    description: '담담하면서도 깊은 감정이 느껴지는 백예린의 대표곡이에요.',
    spotifyId: '0WZhf0isd4av5qlFfKknC3',
  },
  {
    genre: '힙합',
    title: 'FLYING HIGH WITH U',
    artist: '빈첸',
    description: '감성적인 멜로디와 솔직한 랩이 어우러진 곡이에요.',
    spotifyId: '4iZIvaus7v4wSjFvdF83NA',
  },
  {
    genre: '포크',
    title: '숲',
    artist: '최유리',
    description: '차분한 목소리와 따뜻한 분위기로 위로를 전하는 곡이에요.',
    spotifyId: '33xRp6ZX1DKraRFHR9ZDck',
  },
  {
    genre: 'OST',
    title: '밤, 바다',
    artist: '최유리',
    description: '고요한 밤바다 같은 분위기가 매력적인 감성적인 곡이에요.',
    spotifyId: '7zkut02u2ekBqbZeT395YF',
  },
]

const initialSubmission = {
  nickname: '',
  song: '',
  story: '',
}

function App() {
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [recommendationIndex, setRecommendationIndex] = useState(0)
  const [seenRecommendationIds, setSeenRecommendationIds] = useState([])
  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeRanking, setLikeRanking] = useState(
    recommendations.map((music) => ({ ...music, likes: 0 })),
  )
  const [likeLoading, setLikeLoading] = useState(false)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [hasEntered, setHasEntered] = useState(false)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submission, setSubmission] = useState(initialSubmission)
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState('')

  const music = recommendations[recommendationIndex]

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        signInAnonymously(auth).catch(() => {
          setMessage('좋아요 기능에 연결하지 못했습니다.')
        })
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) return

    async function loadLikes() {
      setLikeLoading(true)

      try {
        const likeId = `${music.spotifyId}_${user.uid}`

        const [myLike, allLikes] = await Promise.all([
          getDoc(doc(db, 'likes', likeId)),
          getCountFromServer(
            query(
              collection(db, 'likes'),
              where('albumId', '==', music.spotifyId),
            ),
          ),
        ])

        setLiked(myLike.exists())
        setLikeCount(allLikes.data().count)
        setMessage('')
      } catch {
        setMessage('좋아요 정보를 불러오지 못했습니다.')
      } finally {
        setLikeLoading(false)
      }
    }

    loadLikes()
  }, [music.spotifyId, user])

  async function loadLikeRanking() {
    setRankingLoading(true)

    try {
      const ranking = await Promise.all(
        recommendations.map(async (item) => {
          const likes = await getCountFromServer(
            query(
              collection(db, 'likes'),
              where('albumId', '==', item.spotifyId),
            ),
          )

          return {
            ...item,
            likes: likes.data().count,
          }
        }),
      )

      setLikeRanking(
        ranking.sort((first, second) => second.likes - first.likes).slice(0, 10),
      )
    } catch {
      setMessage('인기 순위를 불러오지 못했습니다.')
    } finally {
      setRankingLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    loadLikeRanking()
  }, [user])

  async function addLike() {
    if (!user || liked) return

    try {
      const likeId = `${music.spotifyId}_${user.uid}`

      await setDoc(doc(db, 'likes', likeId), {
        albumId: music.spotifyId,
        title: music.title,
        artist: music.artist,
        userId: user.uid,
        createdAt: serverTimestamp(),
      })

      setLiked(true)
      setLikeCount((currentCount) => currentCount + 1)
      loadLikeRanking()
    } catch {
      setMessage('좋아요 저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  function showRandomRecommendation() {
    const unseenRecommendations = recommendations.filter(
      (item) => !seenRecommendationIds.includes(item.spotifyId),
    )

    if (unseenRecommendations.length === 0) {
      setMessage('이번 접속에서 모든 추천곡을 다 봤어요. 새로 접속하면 다시 추천받을 수 있어요.')
      return
    }

    const randomIndex = Math.floor(Math.random() * unseenRecommendations.length)
    const nextMusic = unseenRecommendations[randomIndex]
    const nextIndex = recommendations.findIndex(
      (item) => item.spotifyId === nextMusic.spotifyId,
    )

    setShowRecommendation(true)
    setRecommendationIndex(nextIndex)
    setSeenRecommendationIds((currentIds) => [
      ...currentIds,
      nextMusic.spotifyId,
    ])
    setMessage('')
  }

  function updateSubmission(event) {
    const { name, value } = event.target

    setSubmission((currentSubmission) => ({
      ...currentSubmission,
      [name]: value,
    }))
  }

  async function submitRecommendation(event) {
    event.preventDefault()

    const nextSubmission = {
      nickname: submission.nickname.trim(),
      song: submission.song.trim(),
      story: submission.story.trim(),
    }

    if (
      !nextSubmission.nickname ||
      !nextSubmission.song ||
      !nextSubmission.story
    ) {
      setSubmissionMessage('닉네임, 노래, 사연을 모두 작성해 주세요.')
      return
    }

    setSubmissionLoading(true)

    try {
      await addDoc(collection(db, 'songSubmissions'), {
        ...nextSubmission,
        userId: user?.uid ?? null,
        createdAt: serverTimestamp(),
      })

      setSubmission(initialSubmission)
      setSubmissionMessage('추천이 저장됐어요. 좋은 음악 고마워요.')
    } catch {
      setSubmissionMessage('추천 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmissionLoading(false)
    }
  }

  if (!hasEntered) {
    return (
      <main className="memory-landing">
        <div className="memory-overlay" />

        <section className="memory-content">
          <p className="memory-label">MUSIC & MEMORIES</p>

          <h1>
            음악 한 곡이
            <br />
            그날의 우리를 데려올 때
          </h1>

          <p className="memory-message">
            지나간 계절, 함께 웃었던 순간,
            <br />
            그리고 아직 마음속에 남아 있는 이야기.
            <br />
            여러분의 추억을 음악으로 공유해 주세요.
          </p>

          <button
            type="button"
            className="enter-button"
            onClick={() => setHasEntered(true)}
          >
            추억 속으로 들어가기 <span>→</span>
          </button>
        </section>

        <section className="memory-gallery" aria-label="추억 사진">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80"
            alt="함께 즐기는 음악 축제"
          />
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80"
            alt="친구들과 함께한 즐거운 순간"
          />
          <img
            src="https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=700&q=80"
            alt="소중한 사람들과의 추억"
          />
        </section>

        <p className="scroll-note">SCROLL TO REMEMBER</p>
      </main>
    )
  }

  return (
    <main className="app">
      <section className="main-hero">
        <p className="eyebrow">TODAY'S MEMORY TRACK</p>
        <h1>나만의 음악 추천</h1>
        <p>오늘의 기분과 잘 맞는 한 곡을 랜덤으로 만나보세요.</p>

        <div className="hero-actions">
          <button type="button" onClick={showRandomRecommendation}>
            음악 추천받기
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowSubmitForm((currentValue) => !currentValue)}
          >
            노래 추천하기
          </button>
        </div>
      </section>

      <section className="content-layout">
        <div className="music-column">
          {showRecommendation ? (
            <section className="recommendation">
              <div className="album-area">
                <iframe
                  title={`${music.title} 앨범`}
                  src={`https://open.spotify.com/embed/track/${music.spotifyId}?utm_source=generator`}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>

              <div className="description-area">
                <p className="category">{music.genre}</p>
                <h2>{music.title}</h2>
                <p className="artist">{music.artist}</p>
                <p className="description">{music.description}</p>

                <div className="button-group">
                  <button
                    type="button"
                    className={liked ? 'like-button liked' : 'like-button'}
                    onClick={addLike}
                    disabled={!user || liked || likeLoading}
                  >
                    {likeLoading
                      ? '좋아요 불러오는 중...'
                      : liked
                        ? `♥ 좋아요 완료 · ${likeCount}`
                        : `♡ 좋아요 · ${likeCount}`}
                  </button>

                  <button type="button" onClick={showRandomRecommendation}>
                    다른 추천 보기
                  </button>
                </div>

                {message && <p className="message">{message}</p>}
              </div>
            </section>
          ) : (
            <section className="empty-card">
              <p className="category">READY</p>
              <h2>아직 고르지 않은 오늘의 한 곡</h2>
              <p>
                추천 버튼을 누르면 이번 접속에서 아직 나오지 않은 곡 중 하나를
                랜덤으로 보여드릴게요.
              </p>
              {message && <p className="message">{message}</p>}
            </section>
          )}

          {showSubmitForm && (
            <section className="submission-card">
              <div>
                <p className="category">SHARE YOUR SONG</p>
                <h2>노래 추천 제출</h2>
              </div>

              <form onSubmit={submitRecommendation}>
                <label>
                  닉네임
                  <input
                    type="text"
                    name="nickname"
                    value={submission.nickname}
                    onChange={updateSubmission}
                    placeholder="예: 여름밤"
                  />
                </label>

                <label>
                  노래
                  <input
                    type="text"
                    name="song"
                    value={submission.song}
                    onChange={updateSubmission}
                    placeholder="예: 가수 - 곡 제목"
                  />
                </label>

                <label>
                  사연
                  <textarea
                    name="story"
                    value={submission.story}
                    onChange={updateSubmission}
                    placeholder="이 노래를 추천하고 싶은 이유를 적어주세요."
                    rows="5"
                  />
                </label>

                <button type="submit" disabled={submissionLoading}>
                  {submissionLoading ? '저장 중...' : '추천 제출하기'}
                </button>
              </form>

              {submissionMessage && (
                <p className="submission-message">{submissionMessage}</p>
              )}
            </section>
          )}
        </div>

        <aside className="ranking-card">
          <div className="ranking-header">
            <p className="category">LIKE CHART</p>
            <h2>인기 음악 Top 10</h2>
          </div>

          <ol className="ranking-list">
            {likeRanking.map((item, index) => (
              <li key={item.spotifyId}>
                <span className="rank-number">{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.artist}</p>
                </div>
                <span className="rank-like">{item.likes}</span>
              </li>
            ))}
          </ol>

          {rankingLoading && <p className="ranking-note">순위 불러오는 중...</p>}
        </aside>
      </section>
    </main>
  )
}

export default App
