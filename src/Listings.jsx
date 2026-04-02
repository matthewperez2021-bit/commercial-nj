import { useEffect, useState, useCallback } from 'react'
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

function StatBox({ label, value, valueColor }) {
  if (!value) return null
  return (
    <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: 800, color: valueColor || '#111827' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function DetailPanel({ property: p, onClose }) {
  const tc = TYPE_COLORS[p.type] ?? { bg: '#f3f4f6', text: '#374151' }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Photo */}
      <div style={{ position: 'relative', height: '260px', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
        {p.image_url
          ? <img src={p.image_url} alt={p.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>No photo available</div>
        }
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '32px', height: '32px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)', border: 'none',
            color: '#fff', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Status badge on photo */}
        <span style={{
          position: 'absolute', bottom: '14px', left: '14px',
          backgroundColor: p.status === 'For Lease' ? '#006aff' : '#0f1117',
          color: '#fff', fontSize: '11px', fontWeight: 700,
          padding: '4px 10px', borderRadius: '5px', letterSpacing: '0.6px',
        }}>
          {p.status?.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1 }}>

        {/* Type badge + price */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text }}>
            {p.type}
          </span>
        </div>

        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f1117', letterSpacing: '-1px', marginBottom: '6px' }}>
          {formatPrice(p.asking_price)}
        </div>

        <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>{p.address}</div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{p.city}, {p.state} {p.zip}</div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <StatBox label="Square Feet" value={p.size_sqft ? p.size_sqft.toLocaleString() + ' sqft' : null} />
          <StatBox label="Cap Rate" value={p.cap_rate ? p.cap_rate + '%' : null} valueColor="#16a34a" />
          <StatBox label="Year Built" value={p.year_built} />
          <StatBox label="Zoning" value={p.zoning} />
        </div>

        {/* Description */}
        {p.description && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>About this property</div>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>{p.description}</p>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Listing details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {p.broker_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#9ca3af' }}>Broker</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{p.broker_name}</span>
              </div>
            )}
            {p.broker_phone && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#9ca3af' }}>Phone</span>
                <a href={`tel:${p.broker_phone}`} style={{ fontWeight: 600, color: '#006aff', textDecoration: 'none' }}>{p.broker_phone}</a>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#9ca3af' }}>Listed via</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>PROXAL</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button style={{
          width: '100%', marginTop: '20px', padding: '14px',
          backgroundColor: '#006aff', color: '#fff', border: 'none',
          borderRadius: '10px', fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', letterSpacing: '-0.2px',
        }}>
          Contact about this property
        </button>

        {p.listing_url && (
          <a
            href={p.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', marginTop: '10px', padding: '13px',
              backgroundColor: '#fff', color: '#374151', border: '1px solid #e5e7eb',
              borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
            }}
          >
            View original listing ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default function Listings() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('newest')
  const [hoveredId, setHoveredId] = useState(null)
  const [selected, setSelected] = useState(null)

  const closeDetail = useCallback(() => setSelected(null), [])

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
      return 0
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#fff' }}>

      {/* ── Top Nav ── */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '16px', height: '60px', flexShrink: 0, zIndex: 100 }}>
        <Link to="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: '20px', color: '#006aff', letterSpacing: '-0.5px', flexShrink: 0 }}>
          PROXAL
        </Link>

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
                <div key={i} style={{ height: '160px', borderRadius: '12px', backgroundColor: '#f3f4f6' }} />
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
                const isSelected = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(isSelected ? null : p)}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex', borderRadius: '12px', overflow: 'hidden',
                      border: '2px solid',
                      borderColor: isSelected ? '#006aff' : isHovered ? '#93c5fd' : '#e5e7eb',
                      backgroundColor: isSelected ? '#f0f7ff' : '#fff',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 20px rgba(0,106,255,0.15)' : isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.15s, border-color 0.15s, background-color 0.15s',
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f1117', letterSpacing: '-0.5px' }}>
                          {formatPrice(p.asking_price)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text, flexShrink: 0, marginLeft: '8px' }}>
                          {p.type}
                        </span>
                      </div>

                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.address}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                          {p.city}, {p.state} {p.zip}
                        </p>
                      </div>

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

        {/* ── Right: detail panel or map placeholder ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {selected ? (
            <DetailPanel property={selected} onClose={closeDetail} />
          ) : (
            <div style={{ height: '100%', backgroundColor: '#e8edf2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', position: 'relative' }}>
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
                <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#374151' }}>Click a listing to view details</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Map view with property pins coming soon</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
