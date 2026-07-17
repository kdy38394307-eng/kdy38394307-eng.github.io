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

  // 인트로 화면이 지금 어느 단계인지 기억하는 값이에요.
  // 'text'  : 문구 + LP판 둘 다 보이는 단계 (처음 상태)
  // 'video' : 문구만 사라지고 LP판만 보이는 단계
  // 'fading': 박스 전체가 서서히 사라지는 단계
  // 'done'  : 인트로가 완전히 사라져서 화면에서 없애도 되는 단계
  const [introStage, setIntroStage] = useState('text')

  const music = recommendations[recommendationIndex]

  // 인트로 화면의 시간표를 짜는 부분이에요.
  // "3.5초 뒤에는 문구를 지워라", "5.5초 뒤에는 전체를 지워라" 처럼
  // 요리 타이머를 여러 개 맞춰두는 것과 같아요.
  useEffect(() => {
    const hideTextTimer = setTimeout(() => setIntroStage('video'), 3500)
    const startFadeTimer = setTimeout(() => setIntroStage('fading'), 5500)
    const removeIntroTimer = setTimeout(() => setIntroStage('done'), 6300)

    // 컴포넌트가 사라질 때 예약해둔 타이머들을 취소해요.
    // (안 지우면 이미 없어진 화면에 대고 계속 타이머가 실행되려고 해서
    //  불필요한 에러나 버그의 원인이 될 수 있어요.)
    return () => {
      clearTimeout(hideTextTimer)
      clearTimeout(startFadeTimer)
      clearTimeout(removeIntroTimer)
    }
  }, [])

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
    <>
      {/* introStage가 'done'이 되면 이 블록 자체를 화면에서 완전히 없애요. */}
      {introStage !== 'done' && (
        <div
          className={
            introStage === 'fading' ? 'intro-overlay intro-fading' : 'intro-overlay'
          }
        >
          <div className="intro-box">
            {/* 폴라로이드 사진 6장 (지금은 색상 그라데이션 placeholder예요.
                나중에 실제 사진이 생기면 polaroid-photo-N 클래스의
                background를 background-image: url(...) 로 바꾸면 돼요) */}
            <div className="polaroid-field">
              <div className="polaroid polaroid-1">
                <div className="polaroid-photo polaroid-photo-1" />
              </div>
              <div className="polaroid polaroid-2">
                <div className="polaroid-photo polaroid-photo-2" />
              </div>
              <div className="polaroid polaroid-3">
                <div className="polaroid-photo polaroid-photo-3" />
              </div>
              <div className="polaroid polaroid-4">
                <div className="polaroid-photo polaroid-photo-4" />
              </div>
              <div className="polaroid polaroid-5">
                <div className="polaroid-photo polaroid-photo-5" />
              </div>
              <div className="polaroid polaroid-6">
                <div className="polaroid-photo polaroid-photo-6" />
              </div>
            </div>

            {/* introStage가 'text'일 때만 문구를 보여줘요 */}
            <p
              className={
                introStage === 'text' ? 'intro-text' : 'intro-text intro-text-hidden'
              }
            >
              여러분의 추억을 공유해 주세요.
            </p>
          </div>
        </div>
      )}

      <main className="app">
      {/* showRecommendation이 true가 되면(버튼을 누르면) 이 3줄은 화면에서 사라져요 */}
      {!showRecommendation && (
        <>
          <h1>나만의 음악 추천</h1>
          <p>지금 기분에 어울리는 음악을 찾아보세요.</p>

          <button type="button" onClick={() => setShowRecommendation(true)}>
            음악 추천받기
          </button>
        </>
      )}

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
    </>
  )
}

export default App