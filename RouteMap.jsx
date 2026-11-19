
import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Starting and ending markers
const createMarker = (color, label) =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background:${color};
        color:white;
        width:42px;
        height:42px;
        border-radius:50% 50% 50% 5%;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 3px 10px #0003;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          font-size:18px;
          font-weight:bold;
        ">${label}</span>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
  })

const startIcon = createMarker('#28734a', 'A')
const endIcon = createMarker('#e56b5d', 'B')

// Automatically fit the route inside the map
function FitRoute({ coordinates }) {
  const map = useMap()

  useEffect(() => {
    if (coordinates.length < 2) return

    const bounds = L.latLngBounds(coordinates)

    map.invalidateSize()

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 18,
      animate: true,
    })
  }, [map, coordinates])

  return null
}

// AI classification settings
const markerStyles = {
  POTENTIAL_BARRIER: {
    color: '#d44848',
    title: '⚠️ Possible Obstacle',
    description:
      'An obstacle may be present here. Please check the path ahead.',
  },

  SUPPORTIVE_FEATURE: {
    color: '#28734a',
    title: '♿ Helpful Feature',
    description:
      'A feature that may make walking easier was identified here.',
  },

  VERIFY_STEP_FREE_ACCESS: {
    color: '#d99826',
    title: '⚠️ Access Needs Checking',
    description:
      'Step-free access has not been confirmed at this location.',
  },
}

export default function RouteMap({ onObservationsLoaded }) {
  const [routeLine, setRouteLine] = useState([])
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadMapData() {
      try {
        setLoading(true)
        setError('')

        const [routeResponse, evidenceResponse] =
          await Promise.all([
            fetch('/journey-route.geojson', {
              signal: controller.signal,
            }),
            fetch('/journey-evidence.geojson', {
              signal: controller.signal,
            }),
          ])

        if (!routeResponse.ok || !evidenceResponse.ok) {
          throw new Error('Could not load journey data')
        }

        const routeData = await routeResponse.json()
        const evidenceData = await evidenceResponse.json()

        const routeFeature = routeData.features?.find(
          (feature) => feature.geometry?.type === 'LineString'
        )

        if (!routeFeature) {
          throw new Error('No route found in GeoJSON')
        }

        const coordinates = routeFeature.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        )

        setRouteLine(coordinates)

        // Only show observations with relevant AI findings
        const relevantObservations =
          (evidenceData.features || []).filter((feature) => {
            const category =
              feature.properties?.journey_attention ||
              feature.properties?.attention_status

            return (
              feature.geometry?.type === 'Point' &&
              markerStyles[category] !== undefined
            )
          })

        setObservations(relevantObservations)
        console.log('Map found:', relevantObservations.length)
        onObservationsLoaded?.(relevantObservations)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMapData()

    return () => controller.abort()
  }, [])

  const startPoint = routeLine[0]
  const endPoint = routeLine[routeLine.length - 1]

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {loading && <p>Loading accessibility map...</p>}

      {error && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      {!loading && !error && routeLine.length > 1 && (
        <MapContainer
          center={startPoint}
          zoom={15}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitRoute coordinates={routeLine} />

          <Polyline
            positions={routeLine}
            pathOptions={{
              color: '#28734a',
              weight: 7,
              opacity: 0.9,
            }}
          />

          {/* AI accessibility observation markers */}
          {observations.map((feature, index) => {
            const category =
              feature.properties?.journey_attention ||
              feature.properties?.attention_status

            const style = markerStyles[category]

            if (!style) return null

            const [lng, lat] = feature.geometry.coordinates

            const detectedFeatures =
              feature.properties?.detected_features || []

            return (
              <CircleMarker
                key={feature.properties?.image_id || index}
                center={[lat, lng]}
                radius={6}
                pathOptions={{
  color: '#ffffff',
  weight: 1.5,
  fillColor: style.color,
  fillOpacity: 0.95,
}}
              >
                <Popup>
                  <div style={{
  minWidth: 170,
  maxWidth: 210,
  fontSize: 16,
  lineHeight: 1.5
}}>
                    <strong>{style.title}</strong>

                    <p>{style.description}</p>

                    {detectedFeatures.length > 0 && (
                      <p>
                        Detected: {detectedFeatures.join(', ')}
                      </p>
                    )}

                    <small>
                      AI observation — not independently verified
                    </small>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          <Marker position={startPoint} icon={startIcon}>
            <Popup>Start: 20 Jalan Membina</Popup>
          </Marker>

          <Marker position={endPoint} icon={endIcon}>
            <Popup>Destination: 131 Jalan Bukit Merah</Popup>
          </Marker>
        </MapContainer>
      )}

    </div>
  )
}
