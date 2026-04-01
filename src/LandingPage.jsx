import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from './lib/supabase'

const IMAGES = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85&fit=crop',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85&fit=crop',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=85&fit=crop',
  'https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?w=1600&q=85&fit=crop',
  'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=1600&q=85&fit=crop',
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [currentImage, setCurrentImage] = useState(0)
  const [showGate, setShowGate] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  function handleListingsClick(e) {
    e.preventDefault()
    setShowGate(true)
  }

  function handleGateSubmit(e) {
    e.preventDefault()
    if (pwInput === import.meta.env.VITE_LISTINGS_PASSWORD) {
      navigate('/listings')
    } else {
      setPwError(true)
      setPwInput('')
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % IMAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setErrorMsg('')

    const clean = email.trim().toLowerCase()

    const { error } = await supabase
      .from('waitlist')
      .insert([{ email: clean }])

    if (error) {
      if (error.code === '23505') {
        setStatus('success') // already on list, still show success
      } else {
        setStatus('error')
        setErrorMsg("Something went wrong. Try again.")
      }
      return
    }

    // Send welcome email via serverless function (key stays server-side)
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean }),
    })

    setStatus('success')
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="text-xl font-bold tracking-tight text-white">
          PROXAL
        </span>
        <div className="flex items-center gap-6">
          <button onClick={handleListingsClick} className="text-sm font-medium text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">
            Browse listings →
          </button>
          <a href="#waitlist" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Get early access →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Commercial real estate,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            without the paywall
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl">
          Search, map, and evaluate commercial properties for free.
          No $15,000/year CoStar subscription. No gatekeeping. Just the data you need.
        </p>

        {/* Waitlist form */}
        <div id="waitlist" className="mt-10 w-full max-w-md">
          {status === 'success' ? (
            <div className="bg-green-950 border border-green-800 rounded-xl px-6 py-5">
              <p className="text-green-400 font-semibold text-lg">You're on the list ✓</p>
              <p className="text-green-600 text-sm mt-1">
                We'll email you the moment early access opens.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === 'loading' ? 'Joining...' : 'Join waitlist'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-red-400 text-sm">{errorMsg}</p>
          )}

          {status !== 'success' && (
            <p className="mt-3 text-gray-600 text-xs">
              No spam. Unsubscribe anytime.
            </p>
          )}
        </div>
      </main>

      {/* Rotating Hero Image */}
      <div className="px-6 pb-16 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden" style={{ height: '480px' }}>

          {/* Images stacked, crossfade via opacity */}
          {IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt="Commercial properties in New Jersey"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
              style={{ opacity: i === currentImage ? 1 : 0 }}
            />
          ))}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />

          {/* Stats */}
          <div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-6">
            {[
              { value: 'NY · NJ · FL', label: 'Launching & expanding' },
              { value: 'Free', label: 'No subscription' },
              { value: 'Live', label: 'Interactive map' },
            ].map((stat) => (
              <div key={stat.label} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl px-5 py-3">
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-300 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="absolute top-4 right-4 flex gap-1.5">
            {IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentImage ? 'bg-white w-4' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full">
        <h2 className="text-center text-gray-500 text-sm font-semibold uppercase tracking-widest mb-12">
          What you get
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🗺️',
              title: 'Interactive map',
              desc: 'Every commercial listing plotted on a live map. Filter by type, size, and price. No subscription required.',
            },
            {
              icon: '🔍',
              title: 'Powerful search',
              desc: 'Search by city, zip, neighborhood, or property type across NJ. Find exactly what you need in seconds.',
            },
            {
              icon: '🤖',
              title: 'AI deal evaluator',
              desc: "Paste a listing and get an instant AI-powered breakdown of whether it's a good deal — and why.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Ready to stop paying CoStar?
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Join the waitlist and be first to access the free alternative.
        </p>
        <a
          href="#waitlist"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          Get early access — it's free
        </a>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-900 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} PROXAL. Built to disrupt CoStar.
      </footer>

      {/* Password modal */}
      {showGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowGate(false); setPwError(false); setPwInput('') }}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white font-bold text-lg mb-1">
              PROXAL
            </p>
            <p className="text-gray-400 text-sm mb-6">Enter your access code to view listings</p>
            <form onSubmit={handleGateSubmit}>
              <input
                type="password"
                placeholder="Access code"
                value={pwInput}
                autoFocus
                onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
                style={{ borderColor: pwError ? '#ef4444' : undefined }}
              />
              {pwError && <p className="text-red-400 text-sm mb-3">Incorrect access code</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Access listings
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}