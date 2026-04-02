import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import supabase from './lib/supabase'

const ANIMATION_CSS = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .detail-overlay { animation: slideInRight 0.22s ease-out forwards; }
  .proxal-marker  { cursor: pointer !important; }
`

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

const TYPES        = ['All', 'Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed-Use']
const SORT_OPTIONS = [
  { label: 'Newest',             value: 'newest'     },
  { label: 'Price: Low to High', value: 'price_asc'  },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Largest',            value: 'sqft_desc'  },
]

function StatBox({ label, value, valueColor }) {
  if (!value) return null
  return (
    <div style={{ backgroundColor: '#f9fafb', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: '17px', fontWeight: 800, color: valueColor || '#111827' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

// ── Leaflet map with geocoded pins ──────────────────────────────────────────
function PropertyMap({ properties, selected, onSelect }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const markersRef    = useRef({})
  const geocodingDone = useRef(new Set())
  const [coords, setCoords] = useState({})

  // Load Leaflet from CDN once
  useEffect(() => {
    let mounted = true

    function initMap() {
      if (!mounted || !containerRef.current || mapRef.current || !window.L) return
      const L   = window.L
      const map = L.map(containerRef.current, { zoomControl: true }).setView([40.75, -74.2], 10)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      // trigger marker useEffect after map is ready
      setCoords(c => ({ ...c }))
    }

    if (window.L) {
      initMap()
    } else {
      if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
        const css = document.createElement('link')
        css.rel  = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(css)
      }
      if (!document.querySelector('script[src*="leaflet@1.9.4"]')) {
        const script    = document.createElement('script')
        script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload   = () => { if (mounted) initMap() }
        document.head.appendChild(script)
      } else {
        // script already exists, poll until window.L is ready
        const interval = setInterval(() => {
          if (window.L) { clearInterval(interval); initMap() }
        }, 100)
      }
    }

    return () => {
      mounted = false
      Object.values(markersRef.current).forEach(m => m.remove())
      markersRef.current = {}
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Geocode properties without stored lat/lng (1.2s apart to respect Nominatim)
  useEffect(() => {
    properties.forEach((p, i) => {
      if (geocodingDone.current.has(p.id)) return
      geocodingDone.current.add(p.id)

      if (p.lat && p.lng) {
        setCoords(prev => ({ ...prev, [p.id]: { lat: p.lat, lng: p.lng } }))
        return
      }

      setTimeout(() => {
        const q = encodeURIComponent(`${p.address}, ${p.city}, ${p.state}, USA`)
        fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
          .then(r => r.json())
          .then(data => {
            if (data?.[0]) {
              setCoords(prev => ({
                ...prev,
                [p.id]: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
              }))
            }
          })
          .catch(() => {})
      }, i * 1200)
    })
  }, [properties])

  // Add / update markers whenever coords or selected changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L   = window.L
    const map = mapRef.current

    properties.forEach(p => {
      const c          = coords[p.id]
      if (!c) return
      const isSelected = selected?.id === p.id

      if (markersRef.current[p.id]) {
        markersRef.current[p.id].setStyle({
          radius:    isSelected ? 12 : 8,
          fillColor: isSelected ? '#006aff' : '#0f1117',
        })
        if (isSelected) map.panTo([c.lat, c.lng], { animate: true, duration: 0.4 })
        return
      }

      const marker = L.circleMarker([c.lat, c.lng], {
        radius: isSelected ? 12 : 8, fillColor: isSelected ? '#006aff' : '#0f1117',
        color: '#fff', weight: 2.5, fillOpacity: 1, className: 'proxal-marker',
      })
      marker.bindTooltip(
        `<div style="font:700 12px/1.3 sans-serif">${formatPrice(p.asking_price)}</div>
         <div style="font:11px sans-serif;color:#555">${p.address}</div>`,
        { direction: 'top', offset: [0, -10], opacity: 1 }
      )
      marker.on('click', () => onSelect(p))
      marker.addTo(map)
      markersRef.current[p.id] = marker
    })
  }, [coords, selected, properties, onSelect])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// ── Detail panel (no close btn — handled by overlay wrapper) ────────────────
function DetailPanel({ property: p }) {
  const tc = TYPE_COLORS[p.type] ?? { bg: '#f3f4f6', text: '#374151' }
  const [mapCoords, setMapCoords] = useState(p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null)
  const [mapError, setMapError]   = useState(false)

  useEffect(() => {
    if (mapCoords) return
    const q = encodeURIComponent(`${p.address}, ${p.city}, ${p.state} ${p.zip}`)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`)
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) setMapCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
        else setMapError(true)
      })
      .catch(() => setMapError(true))
  }, [p.address, p.city, p.state, p.zip, mapCoords])

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Photo */}
      <div style={{ position: 'relative', height: '260px', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
        {p.image_url
          ? <img src={p.image_url} alt={p.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>No photo available</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
        <span style={{
          position: 'absolute', bottom: '14px', left: '14px',
          backgroundColor: p.status === 'For Lease' ? '#006aff' : '#0f1117',
          color: '#fff', fontSize: '11px', fontWeight: 700,
          padding: '5px 11px', borderRadius: '6px', letterSpacing: '0.6px',
        }}>
          {p.status?.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '5px', backgroundColor: tc.bg, color: tc.text }}>{p.type}</span>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f1117', letterSpacing: '-1px', marginBottom: '4px', lineHeight: 1.1 }}>
          {formatPrice(p.asking_price)}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>{p.address}</div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>{p.city}, {p.state} {p.zip}</div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <StatBox label="Square Feet" value={p.size_sqft ? p.size_sqft.toLocaleString() + ' sqft' : null} />
          <StatBox label="Cap Rate"    value={p.cap_rate  ? p.cap_rate + '%' : null} valueColor="#16a34a" />
          <StatBox label="Year Built"  value={p.year_built} />
          <StatBox label="Zoning"      value={p.zoning} />
        </div>

        {/* Mini map */}
        {!mapError && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Location</div>
            {mapCoords ? (
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.006},${mapCoords.lat - 0.006},${mapCoords.lng + 0.006},${mapCoords.lat + 0.006}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`}
                  width="100%" height="180"
                  style={{ border: 'none', display: 'block' }}
                  title="Property location"
                />
                <a
                  href={`https://www.openstreetmap.org/?mlat=${mapCoords.lat}&mlon=${mapCoords.lng}#map=16/${mapCoords.lat}/${mapCoords.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: '#fff', color: '#374151', fontSize: '11px', fontWeight: 600, padding: '4px 9px', borderRadius: '5px', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}
                >
                  Open in Maps ↗
                </a>
              </div>
            ) : (
              <div style={{ height: '180px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>
                Loading map…
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {p.description && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>About this property</div>
            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.65' }}>{p.description}</p>
          </div>
        )}

        {/* Details */}
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Listing details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              <span style={{ fontWeight: 700, color: '#006aff' }}>PROXAL</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <button
          style={{ width: '100%', padding: '14px', backgroundColor: '#006aff', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0055cc'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#006aff'}
        >
          Contact about this property
        </button>
        {p.listing_url && (
          <a
            href={p.listing_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', marginTop: '10px', padding: '13px', backgroundColor: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#006aff'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            View original listing ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main Listings page ──────────────────────────────────────────────────────
export default function Listings() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('All')
  const [sort, setSort]             = useState('newest')
  const [hoveredId, setHoveredId]   = useState(null)
  const [selected, setSelected]     = useState(null)

  const closeDetail = useCallback(() => setSelected(null), [])
  const handleSelect = useCallback(p => setSelected(p), [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('properties').select('*').order('created_at', { ascending: false })
      setProperties(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Close detail on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeDetail() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDetail])

  const filtered = (filter === 'All' ? properties : properties.filter(p => p.type === filter))
    .slice()
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.asking_price || 0) - (b.asking_price || 0)
      if (sort === 'price_desc') return (b.asking_price || 0) - (a.asking_price || 0)
      if (sort === 'sqft_desc')  return (b.size_sqft    || 0) - (a.size_sqft    || 0)
      return 0
    })

  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', backgroundColor: '#fff' }}>

        {/* Nav */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '16px', height: '60px', flexShrink: 0, zIndex: 100 }}>
          <Link to="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: '20px', color: '#006aff', letterSpacing: '-0.5px', flexShrink: 0 }}>PROXAL</Link>
          <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input readOnly placeholder="Search by city, zip, or address…"
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: '#374151', backgroundColor: '#f9fafb', cursor: 'text', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
              {loading ? '—' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </span>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', color: '#374151', backgroundColor: '#fff', cursor: 'pointer' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', gap: '8px', flexShrink: 0, overflowX: 'auto' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: '6px 14px', borderRadius: '999px', border: '1.5px solid',
              borderColor: filter === t ? '#006aff' : '#e5e7eb',
              backgroundColor: filter === t ? '#006aff' : '#fff',
              color: filter === t ? '#fff' : '#374151',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{t}</button>
          ))}
        </div>

        {/* Split layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: 30% listings */}
          <div style={{ width: '30%', overflowY: 'auto', borderRight: '1px solid #e5e7eb', padding: '14px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: '120px', borderRadius: '10px', backgroundColor: '#f3f4f6' }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
                <p style={{ margin: 0, fontSize: '15px' }}>No properties match this filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.map(p => {
                  const tc         = TYPE_COLORS[p.type] ?? { bg: '#f3f4f6', text: '#374151' }
                  const isHovered  = hoveredId === p.id
                  const isSelected = selected?.id === p.id
                  return (
                    <div key={p.id}
                      onClick={() => setSelected(isSelected ? null : p)}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        borderRadius: '10px', overflow: 'hidden', border: '2px solid',
                        borderColor: isSelected ? '#006aff' : isHovered ? '#93c5fd' : '#e5e7eb',
                        backgroundColor: isSelected ? '#f0f7ff' : '#fff', cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 16px rgba(0,106,255,0.15)' : isHovered ? '0 2px 10px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'box-shadow 0.15s, border-color 0.15s, background-color 0.15s',
                      }}
                    >
                      <div style={{ height: '130px', position: 'relative', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.address} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>No photo</div>
                        }
                        <span style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: p.status === 'For Lease' ? '#006aff' : '#0f1117', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '3px 6px', borderRadius: '4px', letterSpacing: '0.6px' }}>
                          {p.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f1117', letterSpacing: '-0.5px' }}>{formatPrice(p.asking_price)}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: tc.bg, color: tc.text }}>{p.type}</span>
                        </div>
                        <p style={{ margin: '0 0 1px', fontWeight: 600, fontSize: '12px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</p>
                        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#6b7280' }}>{p.city}, {p.state}</p>
                        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                          {p.size_sqft && <span style={{ fontSize: '11px', color: '#6b7280' }}><strong style={{ color: '#111827' }}>{p.size_sqft.toLocaleString()}</strong> sqft</span>}
                          {p.cap_rate  && <span style={{ fontSize: '11px', color: '#6b7280' }}><strong style={{ color: '#16a34a' }}>{p.cap_rate}%</strong> cap</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: map (always visible) + detail overlay */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

            {/* OSM map fills the right panel */}
            <PropertyMap properties={filtered} selected={selected} onSelect={handleSelect} />

            {/* Detail panel slides over the map */}
            {selected && (
              <div
                className="detail-overlay"
                style={{
                  position: 'absolute', top: 0, right: 0,
                  width: '400px', height: '100%',
                  backgroundColor: '#fff',
                  boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
                  zIndex: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}
              >
                {/* ✕ close button top-left */}
                <button
                  onClick={closeDetail}
                  title="Close"
                  style={{
                    position: 'absolute', top: '12px', left: '12px', zIndex: 30,
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(4px)',
                    border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.72)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.48)'}
                >
                  ×
                </button>

                <DetailPanel key={selected.id} property={selected} />
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
