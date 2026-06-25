'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1;transform:translateY(-4px)">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function ClickToPlace({ onMove }: { onMove: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) { onMove([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

function FlyToOnTrigger({ position, flyToKey }: { position: [number, number] | null; flyToKey: number }) {
  const map = useMap()
  const lastKey = useRef(flyToKey)

  useEffect(() => {
    if (position && flyToKey !== lastKey.current) {
      lastKey.current = flyToKey
      map.flyTo(position, 17)
    }
  }, [flyToKey, position, map])

  return null
}

interface Props {
  position: [number, number] | null
  defaultCenter: [number, number]
  flyToKey: number
  onChange: (pos: [number, number]) => void
}

export default function LocationPicker({ position, defaultCenter, flyToKey, onChange }: Props) {
  return (
    <div>
      <MapContainer
        center={position ?? defaultCenter}
        zoom={position ? 17 : 13}
        style={{ height: 220, width: '100%', borderRadius: 12, border: '1px solid #333' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onMove={onChange} />
        <FlyToOnTrigger position={position} flyToKey={flyToKey} />
        {position && (
          <Marker
            position={position}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng()
                onChange([latlng.lat, latlng.lng])
              },
            }}
          />
        )}
      </MapContainer>
      <div style={{ marginTop: 6, fontSize: 11, color: '#777', textAlign: 'center' }}>
        Tap or drag the pin to fine-tune the exact spot
      </div>
    </div>
  )
}
