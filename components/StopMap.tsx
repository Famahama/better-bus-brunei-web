'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { StopPin } from '@/lib/types'

const stopIcon = L.divIcon({
  html: '<div style="width:11px;height:11px;background:#F5C518;border:2px solid #0D0D0D;border-radius:50%;box-shadow:0 0 6px rgba(245,197,24,0.7)"></div>',
  className: '',
  iconSize: [11, 11],
  iconAnchor: [5, 5],
  popupAnchor: [0, -10],
})

const NEARBY_RADIUS_KM = 1

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const lat1 = a[0] * Math.PI / 180
  const lat2 = b[0] * Math.PI / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function LocationMarker({ onLocate }: { onLocate: (pos: [number, number]) => void }) {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const map = useMap()

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 })
    map.on('locationfound', e => {
      const next: [number, number] = [e.latlng.lat, e.latlng.lng]
      setPos(next)
      onLocate(next)
      map.flyTo(e.latlng, 16)
    })
  }, [map, onLocate])

  if (!pos) return null
  return (
    <Circle
      center={pos}
      radius={25}
      pathOptions={{ color: '#5FD4CF', fillColor: '#5FD4CF', fillOpacity: 0.6, weight: 2 }}
    />
  )
}

interface Props {
  pins: StopPin[]
  onSelect: (stopName: string) => void
}

export default function StopMap({ pins, onSelect }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [showAll, setShowAll] = useState(false)

  const nearbyPins = userPos ? pins.filter(p => distanceKm(userPos, [p.lat, p.lng]) <= NEARBY_RADIUS_KM) : pins
  const visiblePins = userPos && !showAll ? nearbyPins : pins
  const hiddenCount = pins.length - nearbyPins.length

  return (
    <div>
      <MapContainer
        center={[4.92, 114.95]}
        zoom={12}
        style={{ height: 380, width: '100%', borderRadius: 12, border: '1px solid #333' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocate={setUserPos} />
        {visiblePins.map((pin, i) => (
          <Marker key={i} position={[pin.lat, pin.lng]} icon={stopIcon}>
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 150 }}>
                <strong>{pin.nickname || pin.stop_name}</strong>{pin.has_shade ? ' 🌂' : ''}<br />
                {pin.nickname && <span style={{ color: '#666' }}>{pin.stop_name}<br /></span>}
                {pin.stop_code && <span style={{ color: '#666' }}>{pin.stop_code}<br /></span>}
                {pin.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pin.photo_url} alt='' style={{ width: '100%', maxWidth: 200, borderRadius: 6, margin: '4px 0' }} />
                )}
                <span
                  onClick={() => onSelect(pin.stop_name)}
                  style={{ color: '#b8860b', cursor: 'pointer', fontSize: 12 }}
                >
                  View routes →
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {userPos && hiddenCount > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#999', textAlign: 'center' }}>
          {showAll ? (
            <span onClick={() => setShowAll(false)} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', color: '#F5C518' }}>
              Show nearby only (within {NEARBY_RADIUS_KM}km)
            </span>
          ) : (
            <>
              Showing stops within {NEARBY_RADIUS_KM}km ·{' '}
              <span onClick={() => setShowAll(true)} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', color: '#F5C518' }}>
                Show all {pins.length} stops
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
