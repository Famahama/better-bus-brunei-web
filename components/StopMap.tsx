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

function LocationMarker() {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const map = useMap()

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 })
    map.on('locationfound', e => {
      setPos([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, 16)
    })
  }, [map])

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
  return (
    <MapContainer
      center={[4.92, 114.95]}
      zoom={12}
      style={{ height: 380, width: '100%', borderRadius: 12, border: '1px solid #333' }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker />
      {pins.map((pin, i) => (
        <Marker key={i} position={[pin.lat, pin.lng]} icon={stopIcon}>
          <Popup>
            <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 150 }}>
              <strong>{pin.stop_name}</strong><br />
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
  )
}
