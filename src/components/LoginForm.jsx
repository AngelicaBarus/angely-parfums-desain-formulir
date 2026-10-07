import { useState } from 'react'

// Validasi form (pola dari PPT 5): kumpulkan pesan error ke dalam satu objek.
const EMAIL_RE = /\S+@\S+\.\S+/

function validateForm(data) {
  const newErrors = {}

  if (!data.email.trim()) {
    newErrors.email = 'Email harus diisi'
  } else if (!EMAIL_RE.test(data.email)) {
    newErrors.email = 'Format email tidak valid'
  }

  if (!data.password) {
    newErrors.password = 'Kata sandi harus diisi'
  } else if (data.password.length < 6) {
    newErrors.password = 'Kata sandi minimal 6 karakter'
  }

  return newErrors
}

// Form login = controlled component (PPT 5).
export default function LoginForm({ emailRef }) {
  const [values, setValues] = useState({ email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [remember, setRemember] = useState(false)
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)

  // error diturunkan dari state (single source of truth), tidak disimpan terpisah
  const errors = validateForm(values)
  const errorOf = (name) => ((submitted || touched[name]) && errors[name]) || ''

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setSuccess(false)
  }

  const handleBlur = (event) => {
    const { name } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    setSuccess(Object.keys(errors).length === 0)
  }

  const hasError = submitted && Object.keys(errors).length > 0

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="welcome">WELCOME TO</p>
      <h1 className="logo">Angély Parfums</h1>
      <p className="tagline">A little fragrance, a little story.</p>

      <fieldset className="lock">
        <label className="field">
          <span>Email</span>
          <input
            ref={emailRef}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={Boolean(errorOf('email'))}
            aria-describedby="err-email"
          />
          <small className="err" id="err-email" role="alert">
            {errorOf('email')}
          </small>
        </label>

        <label className="field">
          <span>Kata Sandi</span>
          <div className="pw">
            <input
              type={show ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={Boolean(errorOf('password'))}
              aria-describedby="err-password"
            />
            <button type="button" className="eye" onClick={() => setShow((v) => !v)}>
              {show ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          <small className="err" id="err-password" role="alert">
            {errorOf('password')}
          </small>
        </label>

        <div className="row">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <i />
            <span>Ingat saya</span>
          </label>
          <a href="#lupa" onClick={(e) => e.preventDefault()}>
            Lupa kata sandi?
          </a>
        </div>

        <button type="submit" className="submit">
          Masuk →
        </button>
      </fieldset>

      <p className={'msg ' + (success ? 'ok' : hasError ? 'error' : '')} role="status" aria-live="polite">
        {success ? 'Selamat datang kembali ✨' : hasError ? 'Periksa kembali isian Anda.' : ''}
      </p>
    </form>
  )
}