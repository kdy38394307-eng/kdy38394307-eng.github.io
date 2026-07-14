import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
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
    genre: '신스팝',
    title: 'After Hours',
    artist: 'The Weeknd',
    description: '밤 산책이나 드라이브에 어울리는 몽환적인 신스팝 앨범이에요.',
    spotifyId: '03NCvBIGqzLPhLoi4pDb3L',
  },
  {
    genre: '팝',
    title: 'Future Nostalgia',
    artist: 'Dua Lipa',
    description: '밝고 리듬감 있는 팝 음악이 필요할 때 듣기 좋은 앨범이에요.',
    spotifyId: '7fJJK56U9fHixgO0HQkhtI',
  },
  {
    genre: 'K-pop',
    title: "NewJeans 2nd EP 'Get Up'",
    artist: 'NewJeans',
    description: '가볍고 세련된 분위기의 K-pop을 듣고 싶을 때 추천해요.',
    spotifyId: '4N1fROq2oeyLGAlQ1C1j18',
  },
  {
    genre: '인디 팝',
    title: 'folklore',
    artist: 'Taylor Swift',
    description: '조용히 집중하거나 비 오는 날 듣기 좋은 감성적인 앨범이에요.',
    spotifyId: '2fenSS68JI1h4Fo296JfGr',
  },
]

function App() {
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [recommendationIndex, setRecommendationIndex] = useState(0)
  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)
  const [message, setMessage] = useState('')

  const music = recommendations[recommendationIndex]

  // 사이트 방문자를 익명으로 로그인시킴
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

  // 현재 앨범의 좋아요 수와 내 좋아요 여부를 불러옴
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

  async function addLike() {
    if (!user || liked) return

    try {
      const likeId = `${music.spotifyId}_${user.uid}`

      await setDoc(doc(db, 'likes', likeId), {
        albumId: music.spotifyId,
        userId: user.uid,
        createdAt: serverTimestamp(),
      })

      setLiked(true)
      setLikeCount((currentCount) => currentCount + 1)
    } catch {
      setMessage('좋아요 저장에 실패했습니다. 다시 시도해 주세요.')
    }
  }

  function showNextRecommendation() {
    setShowRecommendation(true)
    setRecommendationIndex(
      (currentIndex) => (currentIndex + 1) % recommendations.length,
    )
  }

  return (
    <main className="app">
      <h1>나만의 음악 추천</h1>
      <p>지금 기분에 어울리는 음악을 찾아보세요.</p>

      <button type="button" onClick={() => setShowRecommendation(true)}>
        음악 추천받기
      </button>

      {showRecommendation && (
        <section className="recommendation">
          <div className="album-area">
            <iframe
              title={`${music.title} 앨범`}
              src={`https://open.spotify.com/embed/album/${music.spotifyId}?utm_source=generator`}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>

          <div className="description-area">
            <p className="category">{music.genre}</p>
            <h2>{music.title}</h2>
            <p className="artist">{music.artist}</p>
            <p className="description">{music.description}</p>

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

            <button type="button" onClick={showNextRecommendation}>
              다른 추천 보기
            </button>

            {message && <p className="message">{message}</p>}
          </div>
        </section>
      )}
    </main>
  )
}

export default App