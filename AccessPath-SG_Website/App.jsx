import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useState, useEffect } from 'react';
import { MapPinned, ClipboardCheck, ChartColumnIncreasing, MapPin, Accessibility, AlertTriangle, Lightbulb } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Polygon,
  GeoJSON,
  Popup,
  useMap 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';



const sampleLocations = [
  {
    id: 1,
    area: 'Tiong Bahru',
    name: 'Tiong Bahru — Kerb Review',
    position: [1.2865, 103.8270],
    description: 'Illustrative kerb accessibility issue requiring site verification.',
    issue: 'Potential kerb barrier',
    priority: 'High',
    intervention: 'Consider installing a dropped kerb to improve step-free pedestrian access.',
    recommendation: 'Review kerb height and assess whether a suitable dropped kerb is needed.'
  },
  {
    id: 2,
    area: 'Havelock',
    name: 'Havelock — Ramp Review',
    position: [1.2885, 103.8340],
    description: 'Illustrative ramp accessibility review location.',
    issue: 'Ramp accessibility review',
    priority: 'Medium',
    intervention: 'Consider improving ramp gradients, handrails and slip-resistant surfaces.',
    recommendation: 'Assess ramp gradient, surface condition and handrail provision.'
  }
];

const locations = sampleLocations;

const studyAreaBoundary = [
  [1.29075, 103.82395],
  [1.29070, 103.82520],
  [1.29070, 103.82660],
  [1.29068, 103.82800],
  [1.29058, 103.82930],
  [1.29035, 103.83030],
  [1.28990, 103.83110],
  [1.28955, 103.83200],
  [1.28925, 103.83285],
  [1.28860, 103.83305],
  [1.28760, 103.83310],
  [1.28680, 103.83300],
  [1.28600, 103.83325],
  [1.28540, 103.83380],
  [1.28490, 103.83395],
  [1.28460, 103.83350],
  [1.28435, 103.83270],
  [1.28400, 103.83160],
  [1.28355, 103.83040],
  [1.28285, 103.82940],
  [1.28225, 103.82850],
  [1.28255, 103.82790],
  [1.28310, 103.82700],
  [1.28375, 103.82600],
  [1.28450, 103.82500],
  [1.28550, 103.82440],
  [1.28650, 103.82400],
  [1.28750, 103.82390],
  [1.28850, 103.82395],
  [1.28950, 103.82395],
];



function MapController({ studyBoundary }) {
  const map = useMap();

  useEffect(() => {
    if (!studyBoundary) return;

    const boundaryLayer = L.geoJSON(studyBoundary);

    map.fitBounds(boundaryLayer.getBounds(), {
      padding: [35, 35],
      maxZoom: 16,
      animate: true,
      duration: 1.2,
    });
  }, [map, studyBoundary]);

  return null;
}


const createDotIcon = (status) => {
  const color =
    status === 'POTENTIAL_BARRIER' ? '#C46A53' : '#E2B04B';

  return L.divIcon({
    className: 'accesspath-dot-icon',
    html: `<div style="
      width: 10px;
      height: 10px;
      background: ${color};
      border: 1px solid white;
      border-radius: 50%;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function App() {
  
const [selected, setSelected] = useState(sampleLocations[0]);

const [classificationFilter, setClassificationFilter] = useState('ALL');

  
const [studyBoundary, setStudyBoundary] = useState(null);

const [mobilityData, setMobilityData] = useState(null);


const isInsideStudyArea = (coordinates) => {
  if (!studyBoundary || !coordinates) return false;

  const [longitude, latitude] = coordinates;

  const isInsideRing = (ring) => {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];

      if (
        (yi > latitude) !== (yj > latitude) &&
        longitude <
          ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  };

  const isInsidePolygon = (rings) =>
    isInsideRing(rings[0]) &&
    !rings.slice(1).some(isInsideRing);

  const geometries =
    studyBoundary.type === 'FeatureCollection'
      ? studyBoundary.features.map((feature) => feature.geometry)
      : studyBoundary.type === 'Feature'
        ? [studyBoundary.geometry]
        : [studyBoundary];

  return geometries.some((geometry) => {
    if (geometry?.type === 'Polygon') {
      return isInsidePolygon(geometry.coordinates);
    }

    if (geometry?.type === 'MultiPolygon') {
      return geometry.coordinates.some(isInsidePolygon);
    }

    return false;
  });
};

const flaggedLocations = mobilityData?.features?.filter(
  (feature) =>
    feature.properties?.requires_review === true &&
    feature.geometry?.type === 'Point' &&
    isInsideStudyArea(feature.geometry.coordinates)
) ?? [];

const aiLocations = flaggedLocations.map((feature, index) => {
  const properties = feature.properties ?? {};
  const [longitude, latitude] = feature.geometry.coordinates;

  const issue =
    properties.detected_features?.join(', ') ||
    'Accessibility feature requiring review';

  return {
    id: properties.image_id || `ai-${index}`,
    area: properties.road_name || 'Unknown Road',
    name: `${properties.road_name || 'Unknown Road'} — ${issue}`,
    position: [latitude, longitude],
    description: 'AI-generated observation requiring site verification.',
    issue,
    priority: 'Unassigned',
    recommendation: 'Inspect the street-view evidence and verify accessibility on site.',
    imageUrl: properties.image_url,
    attentionStatus: properties.attention_status,
  };
});

useEffect(() => {
  if (aiLocations.length === 0) return;

  setSelected((current) => {
    const stillExists = aiLocations.some(
      (location) => location.id === current?.id
    );

    return stillExists ? current : aiLocations[0];
  });
}, [mobilityData, studyBoundary]);

console.log('Flagged observations inside study area:', flaggedLocations.length);

/*const locations = flaggedLocations.map((feature, index) => {
  const properties = feature.properties ?? {};
  const [longitude, latitude] = feature.geometry.coordinates;

  const issue = properties.detected_features?.join(', ') ||
    'Accessibility feature requiring review';

  return {
    id: properties.image_id || `ai-${index}`,
    area: properties.road_name || 'Unknown Road',
    name: `${properties.road_name || 'Unknown Road'} — ${issue}`,
    position: [latitude, longitude],
    description: 'AI-generated street-view observation requiring site verification.',
    issue,
    priority: 'Unassigned',
    intervention: 'To be determined following planner review.',
    recommendation: 'Inspect the street-view evidence and verify accessibility on site.',
    imageUrl: properties.image_url,
    attentionStatus: properties.attention_status,
  };
});*/

console.log('First flagged observation:', flaggedLocations[0]?.properties);


console.log('Flagged observations:', flaggedLocations.length);

useEffect(() => {
  fetch('/accesspath_study_boundary_draft.geojson')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Boundary file not found');
      }
      return response.json();
    })
    .then((data) => setStudyBoundary(data))
    .catch((error) => {
      console.error('Failed to load study boundary:', error);
    });
}, []);

useEffect(() => {
  fetch('/mobility_locations.geojson')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Mobility dataset not found');
      }
      return response.json();
    })
    .then((data) => {
      setMobilityData(data);
      console.log('Mobility dataset loaded:', data);
    })
    .catch((error) => {
      console.error('Failed to load mobility dataset:', error);
    });
}, []);

  const [priorityFilter, setPriorityFilter] = useState('All');


const [reviewStatuses, setReviewStatuses] = useState(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('accesspath-planner-reviews')
    );


return {
  ...saved?.statuses,
};

  } catch {

return {};

  }
});

const [reviewNotes, setReviewNotes] = useState(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('accesspath-planner-reviews')
    );

    return {
      1: '',
      2: '',
      ...saved?.notes
    };
  } catch {
    return {
      1: '',
      2: ''
    };
  }
});


const [inspectionRequired, setInspectionRequired] = useState(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('accesspath-planner-reviews')
    );

    return {
      1: true,
      2: true,
      ...saved?.inspections
    };
  } catch {
    return {
      1: true,
      2: true
    };
  }
});



const saveReviews = () => {
  const reviewData = {
    statuses: reviewStatuses,
    notes: reviewNotes,
    inspections: inspectionRequired,
  };


  localStorage.setItem(
    'accesspath-planner-reviews',
    JSON.stringify(reviewData)
  );

  alert('Planner reviews saved successfully!');
};

const exportReviews = () => {
  const headers = [
    'Location',
    'Accessibility Issue',
    'Priority',
    'Review Status',
    'Inspection Required',
    'Planner Notes'
  ];

  const escapeCSV = (value) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

  const rows = locations.map((location) => [
    location.name,
    location.issue,
    location.priority,
    reviewStatuses[location.id],
    inspectionRequired[location.id] ? 'Yes' : 'No',
    reviewNotes[location.id] || ''
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(','))
    .join('\r\n');

  const blob = new Blob(
    ['\uFEFF', csv],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'AccessPath_SG_Planner_Review.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>AccessPath SG</h1>
          <p>AI-Assisted Pedestrian Accessibility Planning</p>
        </div>
        <span className="header-tag">URA PLANNER</span>
      </header>

      <div className="dashboard-body">
        <aside className="sidebar left-sidebar">

<h2 style={{
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  <MapPinned size={21} color="#41685B" strokeWidth={2} />
  Planning Tools
</h2>

          <p className="muted">
            Tiong Bahru–Havelock, Singapore
          </p>


<label>Study Area</label>

<select value="all" onChange={() => {}}>
  <option value="all">
    Tiong Bahru – Havelock
  </option>
</select>


<label>AI Classification</label>
<select
  value={classificationFilter}
  onChange={(e) => setClassificationFilter(e.target.value)}
>
  <option value="ALL">All Observations</option>
  <option value="POTENTIAL_BARRIER">Potential Barriers</option>
  <option value="ACCESS_CHECK">Access Checks</option>
</select>

<label>Accessibility Issues</label>

<select
  value={aiLocations.some((location) => location.id === selected?.id)
    ? selected.id
    : ''}
  onChange={(e) => {
    const location = aiLocations.find(
      (item) => item.id === e.target.value
    );

    if (location) setSelected(location);
  }}
>
  {aiLocations.length === 0 && (
    <option value="">Loading observations...</option>
  )}

  {aiLocations.map((location) => (
    <option key={location.id} value={location.id}>
      {location.name}
    </option>
  ))}
</select>



<label htmlFor="priorityFilter">Filter by Priority</label>

<select
  id="priorityFilter"
  value={priorityFilter}
  onChange={(e) => setPriorityFilter(e.target.value)}
>
  <option value="All">All Priorities</option>
  <option value="High">High Priority</option>
  <option value="Medium">Medium Priority</option>
</select>

<div className="info-card">

<strong
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#203F3B',
    fontSize: '15px',
    lineHeight: '1.4'
  }}
>
  <span
    style={{
      width: '38px',
      height: '38px',
      minWidth: '38px',
      backgroundColor: '#DDE9DF',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >

<ChartColumnIncreasing
  size={26}
  color="#203F3B"
  strokeWidth={3.5}
/>

  </span>

  <span>Accessibility Review Summary</span>
</strong>



  <p>

AI observations requiring review: <strong>{flaggedLocations.length}</strong>

  </p>


<p>
  Reviews started: <strong>
    {aiLocations.filter(
      (location) =>
        reviewStatuses[location.id] &&
        reviewStatuses[location.id] !== 'Pending Review'
    ).length}
  </strong> / {aiLocations.length}
</p>


<div
  style={{
    width: '100%',
    height: '10px',
    backgroundColor: '#e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '16px'
  }}
>
  <div
    style={{

width: `${
  aiLocations.length > 0
    ? (
        aiLocations.filter(
          (location) =>
            reviewStatuses[location.id] &&
            reviewStatuses[location.id] !== 'Pending Review'
        ).length / aiLocations.length
      ) * 100
    : 0
}%`,

      height: '100%',
      backgroundColor: '#173c45',
      borderRadius: '10px',
      transition: 'width 0.3s ease'
    }}
  />
</div>


<p>
  Potential barriers: <strong>
    {flaggedLocations.filter(
      (feature) =>
        feature.properties?.attention_status === 'POTENTIAL_BARRIER'
    ).length}
  </strong>
</p>

<p>
  Access checks: <strong>
    {flaggedLocations.filter(
      (feature) =>
        feature.properties?.attention_status === 'ACCESS_CHECK'
    ).length}
  </strong>
</p>

</div>

<h3>Map Legend</h3>



<p>
  <span style={{ color: '#C46A53' }}>●</span>
  {' '}Potential Barrier — Possible obstruction
</p>

<p>
  <span style={{ color: '#E2B04B' }}>●</span>
  {' '}Access Check — Accessibility assessment needed
</p>

<p style={{ fontSize: '12px', color: '#666' }}>
  AI-flagged street-view observations.
  Conditions and severity require on-site verification.
</p>




          <div className="info-card">
            <strong>Planning Objective</strong>
            <p>
              Identify potential pedestrian accessibility
              issues and support targeted urban improvements.
            </p>
          </div>
        </aside>

        <main className="map-panel">
          <div className="map-heading">
            <h2>Pedestrian Accessibility Map</h2>
            <span>Study Area Overview</span>
          </div>

          <div className="map-wrapper">
            <MapContainer
              center={[1.2875, 103.8305]}
              zoom={15}
              maxZoom={18}
              style={{ height: '100%', width: '100%' }}
            >
<MapController studyBoundary={studyBoundary} />

<TileLayer
  attribution="&copy; OpenStreetMap contributors"
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  maxNativeZoom={19}
  maxZoom={18}
  className="greyscale-map"
/>


<MarkerClusterGroup
spiderfyOnMaxZoom={true}
  chunkedLoading
  showCoverageOnHover={false}
  maxClusterRadius={50}
  iconCreateFunction={(cluster) =>
    L.divIcon({
      html: `<div style="
        background: #C46A53;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 4px solid #E8B5A7;
        box-sizing: border-box;
      ">${cluster.getChildCount()}</div>`,
      className: 'accesspath-cluster',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
  }
>

{flaggedLocations.map((feature, index) => {
if (
  classificationFilter !== 'ALL' &&
feature.properties?.attention_status !== classificationFilter &&
!(classificationFilter === 'ACCESS_CHECK' &&
  feature.properties?.attention_status === 'VERIFY_STEP_FREE_ACCESS')
) {
  return null;
}

  if (feature.geometry?.type !== 'Point') return null;

  const [longitude, latitude] = feature.geometry.coordinates;

  return (

<Marker
  key={`ai-observation-${index}`}
  position={[latitude, longitude]}
  icon={createDotIcon(feature.properties?.attention_status)}
  


>

<Popup minWidth={220} maxWidth={260}>
  <div
    style={{
      width: '230px',
      height: '230px',
      overflowY: 'scroll',
      overflowX: 'hidden',
      direction: 'rtl',
      paddingLeft: '8px',
      boxSizing: 'border-box',
    }}
  >
    <div style={{ direction: 'ltr' }}>

    <strong>
      {feature.properties?.road_name || 'Unknown Road'}
    </strong>

    <p>
      <strong>AI Detected:</strong>{' '}
      {feature.properties?.detected_features?.join(', ') ||
        'No specific feature listed'}
    </p>

    <p>
      <strong>Classification:</strong>{' '}
      {feature.properties?.attention_status?.replaceAll('_', ' ') ||
        'Unknown'}
    </p>

    <p>
      <strong>Review:</strong>{' '}
      {feature.properties?.requires_review
        ? 'Required'
        : 'Not required'}
    </p>

    <p style={{ fontSize: '12px', color: '#666' }}>
      AI-generated observation. Physical accessibility
      and severity have not been verified on site.
    </p>
  </div>
  
{feature.properties?.relative_image_path && (
  <div style={{ marginTop: '12px' }}>
    <strong>Street-View Evidence</strong>

    <img
      src={`/${feature.properties.relative_image_path}`}
      alt="Street-view image used for AI accessibility analysis"
      style={{
        width: '100%',
        maxHeight: '200px',
        objectFit: 'cover',
        borderRadius: '8px',
        marginTop: '8px',
      }}
    />


    <p style={{ fontSize: '11px', color: '#666' }}>
      Source: Google Street View.
      AI detection requires on-site verification.
    </p>
  </div>
)}

  </div>
</Popup>


</Marker>
  );
})}
</MarkerClusterGroup>




{studyBoundary && (
  <GeoJSON
    key="road-aligned-study-boundary"
    data={studyBoundary}
    style={{
      color: '#203F3B',
      weight: 3,
      opacity: 1,
      fillColor: '#7A9B87',
      fillOpacity: 0.2,
      dashArray: '10, 5',
    }}
  />
)}

            </MapContainer>
          </div>

          <p className="map-note">
            Prototype demonstration. Markers represent
            study locations, not verified barriers.
          </p>
        </main>

        <aside className="sidebar right-sidebar">

<h3>
  <MapPin size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
  Location Details
</h3>

          <p className="muted">Selected study location</p>

          <div className="info-card">
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
          </div>


<h3 style={{
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  <ClipboardCheck size={20} color="#41685B" strokeWidth={2} />
  Accessibility Assessment
</h3>


<div className="info-card">

<strong>
  <Accessibility size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
  Identified Issue
</strong>

  <p>{selected.issue}</p>
</div>

<div className="info-card">

<strong>
  <AlertTriangle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
  Review Priority
</strong>

  <p style={{
    color: selected.priority === 'High'
      ? '#dc2626'
      : '#d97706',
    fontWeight: 'bold'
  }}>
    {selected.priority}
  </p>
</div>

<div className="info-card">
  <strong>Recommended Planning Action</strong>
  <p>{selected.recommendation}</p>
</div>


<div className="info-card">
  <strong>Proposed Intervention</strong>

  <p>{selected.intervention}</p>

  <p style={{
    fontSize: '11px',
    color: '#64748b',
    marginTop: '10px'
  }}>
    Conceptual proposal — subject to site verification
    and technical assessment.
  </p>
</div>

<div className="info-card">
  <strong>AI Detection Evidence</strong>

  <p>
    <strong>Analysis Method:</strong> Vision-Language Model (VLM)
  </p>

  <p>
    <strong>Potential Observation:</strong> {selected.issue}
  </p>

  <p>
    <strong>Evidence Status:</strong> Illustrative example
  </p>

<div
  style={{
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '8px',
    padding: '10px',
    marginTop: '10px',
    marginBottom: '10px'
  }}
>
  <strong style={{ color: '#9a3412', fontSize: '13px' }}>
    ⚠ Unverified AI Observation
  </strong>

  <p style={{ fontSize: '12px', marginBottom: 0 }}>
    Requires manual review and on-site validation before
    any planning decision.
  </p>
</div>

  <p>
    <strong>Verification:</strong> Site inspection required
  </p>

  <p style={{
    fontSize: '11px',
    color: '#64748b',
    marginTop: '12px'
  }}>
    This prototype demonstrates how AI-assisted image analysis
    could support pedestrian accessibility reviews.
    The displayed issues are not verified VLM detections.
  </p>

</div>

<div className="info-card">
  <strong>Site Inspection</strong>

  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '12px',
      cursor: 'pointer'
    }}
  >
    <input
      type="checkbox"
      checked={inspectionRequired[selected.id]}
      onChange={(e) =>
        setInspectionRequired({
          ...inspectionRequired,
          [selected.id]: e.target.checked
        })
      }
    />

    Inspection Required
  </label>

  <p style={{ fontSize: '11px', color: '#64748b' }}>
    Planner-assigned inspection requirement.
    Unchecking this does not verify the AI observation.
  </p>
</div>

<div className="info-card">
  <strong>Planning Review Status</strong>


  <select
    value={reviewStatuses[selected.id]}
    onChange={(e) =>
      setReviewStatuses({
        ...reviewStatuses,
        [selected.id]: e.target.value
      })
    }
  >
    <option value="Pending Review">Pending Review</option>
    <option value="Under Review">Under Review</option>
    <option value="Intervention Proposed">
      Intervention Proposed
    </option>
  </select>

  <p style={{ fontSize: '11px', color: '#64748b' }}>
    Prototype status — changes are not permanently saved.
  </p>
</div>

<div className="info-card">
  <strong>Planner Review Notes</strong>

  <textarea
    value={reviewNotes[selected.id] || ''}
    onChange={(e) =>
      setReviewNotes({
        ...reviewNotes,
        [selected.id]: e.target.value
      })
    }
    placeholder="Enter site observations or planning comments..."
    rows={4}
    style={{
      width: '100%',
      marginTop: '12px',
      padding: '10px',
      border: '1px solid #d9e1e4',
      borderRadius: '8px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      resize: 'vertical'
    }}
  />

  <p style={{ fontSize: '11px', color: '#64748b' }}>
    Prototype notes — not permanently saved.
  </p>
</div>

<button
  type="button"
  onClick={saveReviews}
  style={{
    width: '100%',
    padding: '14px',
    backgroundColor: '#173c45',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '12px',
    marginBottom: '16px'
  }}
>
  Save Planner Review
</button>

<button
  type="button"
  onClick={exportReviews}
  style={{
    width: '100%',
    padding: '14px',
    backgroundColor: '#ffffff',
    color: '#173c45',
    border: '2px solid #173c45',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '16px'
  }}
>
  Export Review Report
</button>

          <div className="info-card">
            <strong>Next Step</strong>
            <p>
              Review selected AI-detected accessibility
              observations before proposing interventions.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;