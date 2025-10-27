'use client'

import { useEffect } from 'react'
import { initFirebase } from '@/lib/firebase/client'

export default function FirebaseInit() {
  useEffect(() => {
    initFirebase()
  }, [])

  return null
}