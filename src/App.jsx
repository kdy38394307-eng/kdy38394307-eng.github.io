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