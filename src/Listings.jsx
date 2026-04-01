import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from './lib/supabase'

function formatPrice(price) {
  if (!price) return 'Price on Request'
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`
  return `$${price.toLocaleString()}`
}

const TYPE_COLORS = {
  Office:      { bg: '#dbeafe', text: '#1d4ed8' },
  Retail:      { bg: '#dcfce7', text: '#15803d' },
  Industrial:  { bg: '#ffedd5', text: '#c2410c' },
  Multifamily: { bg: '#f3e8ff', text: '#7e22ce' },
  Land:        { bg: '#fef9c3', text: '#a16207' },
  'Mixed-Use': { bg: '#fce7f3', text: '#be185d' },
}

const TYPES = ['All', 'Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed-Use']

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Largest', value: 'sqft_desc' },
]

export default function Listings() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('newest')
  const [hoveredId, setHoveredId] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
      setProperties(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = (filter === 'All' ? properties : properties.filter(p => p.type === filter))
    .slice()
    .sort((a, b) => {
      if (sort === 'price_asc') return (a.asking_price || 0) - (b.asking_price || 0)
      if (sort === 'price_desc') return (b.asking_price || 0) - (a.asking_price || 0)
      if (sort === 'sqft_desc') return (b.size_sqft || 0) - (a.size_sqft || 0)
      return 0 // newest: already sorted by created_at from supabase
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#fff' }}>

      {/* ── Top Nav ── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '16px', height: '60px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: '20px', color: '#006aff', letterSpacing: '-0.5px', flexShrink: 0 }}>
          PROXAL
        </Link>

        {/* Fake search bar */}
        <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            readOnly
            placeholder="Search by city, zip, or address..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#374151', backgroundColor: '#f9fafb', cursor: 'text', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
            {loading ? '—' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#374151', backgroundColor: '#fff', cursor: 'pointer' }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', gap: '8px', flexShrink: 0, overflowX: 'auto' }}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 14px', borderRadius: '999px', border: '1.5px solid',
              borderColor: filter === t ? '#006aff' : '#e5e7eb',
              backgroundColor: filter === t ? '#006aff' : '#fff',
              color: filter === t ? '#fff' : '#374151',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Split layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left: scrollable list ── */}
        <div style={{ width: '45%', overflowY: 'auto', borderRight: '1px solid #e5e7eb', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: '160px', borderRadius: '12px', backgroundColor: '#f3f4f6', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
              <p style={{ margin: 0, fontSize: '15px' }}>No properties match this filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(p => {
                const tc = TYPE_COLORS[p.type] ?? { bg: '#f3f4f6', text: '#374151' }
                const isHovered = hoveredId === p.id
                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex', borderRadius: '12px', overflow: 'hidden',
                      border: '1px solid', borderColor: isHovered ? '#006aff' : '#e5e7eb',
                      backgroundColor: '#fff', cursor: 'pointer',
                      boxShadow: isHovered ? '0 4px 20px rgba(0,106,255,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}
                  >
                    {/* Photo */}
                    <div style={{ width: '200px', flexShrink: 0, position: 'relative', backgroundColor: '#f3f4f6' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ height: '100%', minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>No photo</div>
                      }
                      <span style={{
                        position: 'absolute', top: '10px', left: '10px',
                        backgroundColor: p.status === 'For Lease' ? '#006aff' : '#0f1117',
                        color: '#fff', fontSize: '10px', fontWeight: 700,
                        padding: '3px 7px', borderRadius: '4px', letterSpacing: '0.6px',
                      }}>
                        {p.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                      {/* Top: price + type */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f1117', letterSpacing: '-0.5px' }}>
                          {formatPrice(p.asking_price)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text, flexShrink: 0, marginLeft: '8px' }}>
                          {p.type}
                        </span>
                      </div>

                      {/* Address */}
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.address}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                          {p.city}, {p.state} {p.zip}
                        </p>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6' }}>
                        {p.size_sqft && (
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{p.size_sqft.toLocaleString()}</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '3px' }}>sqft</span>
                          </div>
                        )}
                        {p.cap_rate && (
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{p.cap_rate}%</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '3px' }}>cap</span>
                          </div>
                        )}
                        {p.year_built && (
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{p.year_built}</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '3px' }}>built</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: map panel ── */}
        <div style={{ flex: 1, position: 'sticky', top: 0, backgroundColor: '#e8edf2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
          {/* Subtle grid background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
            backgroundSize: '40px 40px', opacity: 0.4,
          }} />
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006aff" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#374151' }}>Map view coming soon</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Interactive Mapbox map with property pins</p>
          </div>
        </div>

      </div>
    </div>
  )
}
