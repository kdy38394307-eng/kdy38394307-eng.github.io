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
    title: 'EVERYTHING',
    artist: '검정치마',
    spotifyId: '4vb7g4GrE9cOrhEzUWadN8',
    description: '검정치마의 대중적이 대표곡'
  },
  {
    title: 'seasons',
    artist: 'wave to earth',
    spotifyId: '5VBjyOQzqlPNgdRPMM6prF',
    description: '주인장의 감상평 : wave to earth중 가장 좋아하는 곡'
  },
  {
    title: 'Square (2017)',
    artist: '백예린',
    spotifyId: '0WZhf0isd4av5qlFfKknC3',
    description: '주인장의 감상평 : 화창한 날 들으면 기분 좋은 곡?'
  },
  {
    title: '숲',
    artist: '최유리',
    spotifyId: '33xRp6ZX1DKraRFHR9ZDck',
    description: '주인장의 감상평 : 새벽에 들으면 감성적으로 변함'
  },
  {
    title: '밤, 바다',
    artist: '최유리',
    spotifyId: '7zkut02u2ekBqbZeT395YF',
    description: '주인장의 감상평 : 새벽에 들으면 감성적으로 변함2'
  },
  {
  title: 'Antifreeze',
  artist: '검정치마',
  spotifyId: '745W6tNeXVKjskHoCsMJvV',
  description: '주인장의 감상평 : 한국 인디 록의 대중성있는 곡'
},
{
  title: '좋은 밤 좋은 꿈',
  artist: '너드커넥션',
  spotifyId: '3s761CQaziQ0GEN1yUkIsG',
  description: '주인장의 감상평 : 지나간 추억을 미화시키는 사기 곡'
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
  const [storyLikes, setStoryLikes] = useState({}) // { [storyId]: { liked: boolean, count: number } }
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

  async function loadStoryLikes(storyList) {
  if (!user || storyList.length === 0) return

  try {
    const entries = await Promise.all(
      storyList.map(async (story) => {
        const likeId = `${story.id}_${user.uid}`

        const [myLike, allLikes] = await Promise.all([
          getDoc(doc(db, 'storyLikes', likeId)),
          getCountFromServer(
            query(
              collection(db, 'storyLikes'),
              where('storyId', '==', story.id),
            ),
          ),
        ])

        return [
          story.id,
          { liked: myLike.exists(), count: allLikes.data().count },
        ]
      }),
    )

    setStoryLikes((current) => ({
      ...current,
      ...Object.fromEntries(entries),
    }))
  } catch {
    // 사연 공감 정보는 실패해도 화면 흐름을 막지 않도록 조용히 넘어감
  }
}

useEffect(() => {
  if (!user || stories.length === 0) return

  loadStoryLikes(stories)
}, [stories, user])

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

  async function addStoryLike(storyId) {
  if (!user || storyLikes[storyId]?.liked) return

  try {
    const likeId = `${storyId}_${user.uid}`

    await setDoc(doc(db, 'storyLikes', likeId), {
      storyId,
      userId: user.uid,
      createdAt: serverTimestamp(),
    })

    setStoryLikes((current) => ({
      ...current,
      [storyId]: {
        liked: true,
        count: (current[storyId]?.count || 0) + 1,
      },
    }))
  } catch {
    setMessage('공감 저장에 실패했습니다. 다시 시도해 주세요.')
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

  function selectRecommendationById(spotifyId) {
  const nextIndex = recommendations.findIndex(
    (item) => item.spotifyId === spotifyId,
  )

  if (nextIndex === -1) return

  setShowRecommendation(true)
  setRecommendationIndex(nextIndex)
  setSeenRecommendationIds((currentIds) =>
    currentIds.includes(spotifyId)
      ? currentIds
      : [...currentIds, spotifyId],
  )
  setMessage('')
  setShowSubmitForm(false)

  document
    .querySelector('.music-column')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                  <p className="category">TODAY'S PICK</p>                 
                  <h2>{music.title}</h2>
                  <p className="artist">{music.artist}</p>
                  <p className="curator-note">
                  <span className="curator-label">주인장의 감상평</span>
                  <span className="curator-text">{music.description}</span>
                  </p>

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
  <button
    type="button"
    className={
      storyLikes[story.id]?.liked
        ? 'story-like-button liked'
        : 'story-like-button'
    }
    onClick={() => addStoryLike(story.id)}
    disabled={!user || storyLikes[story.id]?.liked}
  >
    {storyLikes[story.id]?.liked ? '👍 공감함' : '👍 공감'} ·{' '}
    {storyLikes[story.id]?.count ?? 0}
  </button>
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
      <button
        type="button"
        className="ranking-item-button"
        onClick={() => selectRecommendationById(item.spotifyId)}
      >
        <span className="rank-number">{index + 1}</span>
        <div>
          <strong>{item.title}</strong>
          <p>{item.artist}</p>
        </div>
        <span className="rank-like">{item.likes}</span>
      </button>
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
