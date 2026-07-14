import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDq0kL6QNAGM9D-FUwzqNQ4Pw_EqfZd7CY",
  authDomain: "music-recommendation-e484e.firebaseapp.com",
  projectId: "music-recommendation-e484e",
  storageBucket: "music-recommendation-e484e.firebasestorage.app",
  messagingSenderId: "740436416429",
  appId: "1:740436416429:web:545cc9fc93ff455464b324",
  measurementId: "G-TW3FTKLLKF"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)