import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  runTransaction,
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
  {
  genre: '인디 록',
  title: 'Antifreeze',
  artist: '검정치마',
  description: '몽환적인 기타 사운드와 담백한 감성이 돋보이는 대표곡이에요.',
  spotifyId: '0U4bQKJH7mYtF0FfGvY7Xn',
},
{
  genre: '인디 팝',
  title: 'bad',
  artist: 'wave to earth',
  description: '잔잔하면서도 몽환적인 분위기가 매력적인 곡이에요.',
  spotifyId: '3v5o91PrUtf0nmO6j8J7dZ',
},
{
  genre: 'R&B',
  title: '그건 아마 우리의 잘못은 아닐 거야',
  artist: '백예린',
  description: '섬세한 감정선을 아름답게 표현한 감성 R&B 곡이에요.',
  spotifyId: '6g6x8Jv75KgR4cThxKkk4D',
},
{
  genre: '발라드',
  title: 'Love poem',
  artist: '아이유',
  description: '따뜻한 위로를 전하는 감성 발라드예요.',
  spotifyId: '7HrE6HtYNBbGqp5GmHbFV0',
},
{
  genre: '발라드',
  title: '밤편지',
  artist: '아이유',
  description: '조용한 밤에 듣기 좋은 포근한 감성의 노래예요.',
  spotifyId: '3P3UA61WRQqwCXaoFOTENd',
},
{
  genre: '인디',
  title: '주저하는 연인들을 위해',
  artist: '잔나비',
  description: '따뜻한 밴드 사운드와 서정적인 가사가 인상적인 곡이에요.',
  spotifyId: '6wN6Q1v4Qv7v4N0sQk9nQj',
},
{
  genre: '인디',
  title: '꿈과 책과 힘과 벽',
  artist: '잔나비',
  description: '청춘의 감성을 담은 서정적인 밴드 음악이에요.',
  spotifyId: '6MoQ0GQWvYQ8M2S2N5rX4N',
},
{
  genre: '인디 팝',
  title: 'Your Dog Loves You',
  artist: 'Colde',
  description: '포근한 멜로디와 부드러운 보컬이 매력적인 곡이에요.',
  spotifyId: '5LOFhskslqjQTFg56sQf5A',
},
{
  genre: 'R&B',
  title: '와르르 ♥',
  artist: 'Colde',
  description: '감미로운 보컬과 따뜻한 감성이 돋보이는 곡이에요.',
  spotifyId: '4nQxqN4v7n4mP0rR7t8A8H',
},
{
  genre: '인디',
  title: 'Home',
  artist: '김수영',
  description: '잔잔한 피아노와 감성적인 목소리가 인상적인 노래예요.',
  spotifyId: '6v0Kyx0yM2mKQ7dVY2xQ9D',
},
{
  genre: '포크',
  title: '잘 지내자, 우리',
  artist: '짙은',
  description: '담담한 위로를 건네는 따뜻한 포크 발라드예요.',
  spotifyId: '4t4k1qJH3Q3fWzM5w8nH2A',
},
{
  genre: '인디',
  title: 'To My Youth',
  artist: '볼빨간사춘기',
  description: '청춘의 불안과 희망을 담은 감성적인 곡이에요.',
  spotifyId: '2vG4nH9Gm3Sg2M0m6cXh4V',
},
{
  genre: '발라드',
  title: '너였다면',
  artist: '정승환',
  description: '애절한 감정이 진하게 전해지는 발라드예요.',
  spotifyId: '5GEPc1qk2t3uQ5r9v4fM6L',
},
{
  genre: 'OST',
  title: 'Beautiful',
  artist: 'Crush',
  description: '달콤한 감성이 가득한 로맨틱 OST예요.',
  spotifyId: '7M6CFRuBrM5x7u0kZXHYQ6',
},
{
  genre: 'OST',
  title: 'Stay With Me',
  artist: '찬열, 펀치',
  description: '웅장하면서도 감성적인 분위기가 인상적인 OST예요.',
  spotifyId: '1HYzRuWjmS9LXCkdVHi25K',
},
{
  genre: 'R&B',
  title: 'instagram',
  artist: 'DEAN',
  description: '세련된 사운드와 감성적인 가사가 매력적인 곡이에요.',
  spotifyId: '6zX5f3x9v8R4vK5cP7A4lY',
},
{
  genre: '인디 팝',
  title: '우주를 줄게',
  artist: '볼빨간사춘기',
  description: '사랑스러운 감성과 따뜻한 멜로디가 돋보이는 곡이에요.',
  spotifyId: '2dQ4VJ9cX2sL4t6F8nH3Bq',
},
{
  genre: '발라드',
  title: '취기를 빌려',
  artist: '산들',
  description: '부드러운 보컬과 감미로운 분위기가 인상적인 노래예요.',
  spotifyId: '2QjOHCTQ1Jl3zawyYOpxh6',
},
{
  genre: '포크',
  title: '그대라는 시',
  artist: '태연',
  description: '잔잔한 피아노 선율이 아름다운 감성 발라드예요.',
  spotifyId: '3q6qPk7hN4JQYfD9wL2QeQ',
},
{
  genre: '인디',
  title: '우연을 믿어요',
  artist: '적재',
  description: '따뜻한 기타 사운드와 감성적인 가사가 매력적인 곡이에요.',
  spotifyId: '2q8Xv7Qw6jM8Rk2N9bP1Ft',
},
]

const initialSubmission = {
  nickname: '',
  song: '',
  story: '',
}

const featuredStories = {
  '4vb7g4GrE9cOrhEzUWadN8': [
    {
      id: 'samchogoryeo-everything',
      nickname: '삼초고려',
      story:
        '일상에 지치고 사랑에 실패해 한참을 헤매던 때, 아무 일정도 없던 어느 밤 그 사람을 만났어요. 이 곡을 들으며 함께 걸었던 밤바다는 아직도 선명해요. Everything이 흐르면, 잠시 멈춰 있던 마음에도 다시 낭만이 찾아오는 것 같습니다.',
    },
  ],
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())
}

function findKnownSong(songName) {
  const normalized = songName.toLowerCase().replace(/\s+/g, '')

  return recommendations.find((item) => {
    const title = item.title.toLowerCase().replace(/\s+/g, '')
    const artistAndTitle = `${item.artist}-${item.title}`
      .toLowerCase()
      .replace(/\s+/g, '')

    return normalized === title || normalized === artistAndTitle
  })
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
  const [stories, setStories] = useState(featuredStories[recommendations[0].spotifyId] || [])
  const [storiesLoading, setStoriesLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function loadStories() {
      setStoriesLoading(true)
      try {
        const storySnapshot = await getDocs(
          query(
            collection(db, 'songSubmissions'),
            where('songId', '==', music.spotifyId),
          ),
        )

        if (!cancelled) {
          const savedStories = storySnapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort((first, second) => {
              const firstTime = first.createdAt?.toMillis?.() || 0
              const secondTime = second.createdAt?.toMillis?.() || 0
              return secondTime - firstTime
            })
          setStories([
            ...(featuredStories[music.spotifyId] || []),
            ...savedStories,
          ])
        }
      } catch {
        if (!cancelled) setStories(featuredStories[music.spotifyId] || [])
      } finally {
        if (!cancelled) setStoriesLoading(false)
      }
    }

    loadStories()
    return () => {
      cancelled = true
    }
  }, [music.spotifyId])

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

    if (!user) {
      setSubmissionMessage('저장 연결을 준비 중입니다. 잠시 후 다시 눌러주세요.')
      return
    }

    setSubmissionLoading(true)

    try {
      const day = todayKey()
      const dailySubmissionRef = doc(db, 'dailySongSubmissions', `${day}_${user.uid}`)
      const knownSong = findKnownSong(nextSubmission.song)

      await runTransaction(db, async (transaction) => {
        const alreadySubmitted = await transaction.get(dailySubmissionRef)

        if (alreadySubmitted.exists()) {
          throw new Error('daily-limit')
        }

        const newSubmissionRef = doc(collection(db, 'songSubmissions'))
        transaction.set(newSubmissionRef, {
          ...nextSubmission,
          songId: knownSong?.spotifyId || null,
          songTitle: knownSong?.title || nextSubmission.song,
          songArtist: knownSong?.artist || '',
          userId: user.uid,
          createdAt: serverTimestamp(),
        })
        transaction.set(dailySubmissionRef, {
          userId: user.uid,
          submittedAt: serverTimestamp(),
        })
      })

      setSubmission(initialSubmission)
      setSubmissionMessage(
        knownSong
          ? '추천과 사연이 저장됐어요. 같은 곡 아래에 함께 표시됩니다.'
          : '추천이 저장됐어요. 등록된 곡 목록에 추가하면 메인 화면에서도 사연을 볼 수 있어요.',
      )
    } catch (error) {
      if (error.message === 'daily-limit') {
        setSubmissionMessage('오늘은 이미 한 곡을 추천했어요. 내일 다시 추천해 주세요.')
      } else if (error.code === 'permission-denied') {
        setSubmissionMessage('Firebase 저장 권한이 막혀 있어요. Firestore 규칙을 확인해 주세요.')
      } else {
        setSubmissionMessage('추천 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
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
            <>
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

              <section className="stories-card" aria-label={`${music.title} 사연`}>
                <div className="story-heading">
                  <div>
                    <p className="category">LISTENER STORIES</p>
                    <h2>이 곡에 남겨진 이야기</h2>
                  </div>
                  <span>{stories.length}개의 사연</span>
                </div>
                <div className={stories.length > 2 ? 'story-window is-scrolling' : 'story-window'}>
                  <div className="story-track">
                    {stories.map((story) => (
                      <article className="story-item" key={story.id}>
                        <strong>{story.nickname}</strong>
                        <p>{story.story}</p>
                      </article>
                    ))}
                  </div>
                </div>
                {storiesLoading && <p className="story-note">사연을 불러오는 중...</p>}
              </section>
            </>
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
                    placeholder="예: EVERYTHING 또는 검정치마 - EVERYTHING"
                  />
                </label>

                <p className="form-note">
                  등록된 곡 제목을 입력하면 해당 곡 아래에 사연이 쌓입니다. 새 곡도 저장되며, 곡 목록에 추가한 뒤 메인 화면에 표시할 수 있어요.
                </p>

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
