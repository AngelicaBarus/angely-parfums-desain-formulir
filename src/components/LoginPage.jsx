import { useEffect, useRef } from 'react'
import FloraBackground from './FloraBackground.jsx'
import LoginForm from './LoginForm.jsx'

// Halaman login: form langsung aktif, tanpa lampu.
export default function LoginPage() {
  const emailRef = useRef(null)

  // fokus ke kolom email setelah halaman tampil (dilewati di HP agar keyboard tidak muncul sendiri)
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const timer = setTimeout(() => emailRef.current?.focus(), 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="login">
      <FloraBackground />
      <LoginForm emailRef={emailRef} />
    </div>
  )
}