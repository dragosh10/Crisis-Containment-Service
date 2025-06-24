let selectedDisasterPin = null;
let isSelectingDisasterPin = false;
window.allCalamityMarkers = window.allCalamityMarkers || [];

function createCustomIcon(iconClass, color) {
  const iconSize = 48;
  return L.divIcon({
      html: `<i class="${iconClass} fa-2x" style="color: ${color};"></i>`,
      className: 'custom-icon',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize/2, iconSize/2],
      popupAnchor: [0, -iconSize/2]
  });
}


window.createCustomIcon = createCustomIcon;


function initializeCalamityIcons() {
  return {
    earthquake: createCustomIcon('fas fa-house-crack', '#ff4444'),
    fire: createCustomIcon('fas fa-fire', '#ff8800'),
    flood: createCustomIcon('fas fa-water', '#0099cc'),
    heatwave: createCustomIcon('fas fa-sun', '#ffd700'),
    hurricane: createCustomIcon('fas fa-wind', '#8b4513'),
    hailstorm: createCustomIcon('fas fa-cloud-meatball', '#4169e1'),
    wildfire: createCustomIcon('fas fa-tree', '#ff6600'),
    tsunami: createCustomIcon('fas fa-water', '#006699'),
    'volcanic eruption': createCustomIcon('fas fa-mountain', '#cc0000'),
    landslide: createCustomIcon('fas fa-mountain', '#8b4513'),
    other: createCustomIcon('fas fa-exclamation-triangle', '#ffbb33'),
    default: createCustomIcon('fas fa-exclamation-triangle', '#ffbb33')
  };
}



function formatDate(dateStr) {
  if (!dateStr) return 'N/A';

  if (dateStr.includes('/')) return dateStr; 
  

  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    const pad = n => n < 10 ? '0' + n : n;
    return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  
 
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(dateStr);
    const pad = n => n < 10 ? '0' + n : n;
    return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  
  return dateStr;
}



function createCalamityMarker(calamity, icons) {

  const gravitySymbols = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
  };
  const gravityText = calamity.gravity ? `${gravitySymbols[calamity.gravity] || ''} ${calamity.gravity.charAt(0).toUpperCase() + calamity.gravity.slice(1)}` : 'N/A';
  
  
  let desc = calamity.description || 'N/A';
  let showMoreBtn = '';
  let descShort = desc;
  if (desc.length > 10) {
    descShort = desc.slice(0, 10) + '...';
    showMoreBtn = `<br><a href="#" class="show-more-link" data-id="desc-${calamity.id}" style="color: #007bff; text-decoration: underline;">Show more</a>`;
  }
  
 
  const popupHtml = `
    <div style="min-width:220px;max-width:300px; line-height: 1.4;">
      <div style="margin-bottom: 8px;"><strong>Type:</strong> ${calamity.type}</div>
      <div style="margin-bottom: 8px;"><strong>Start Date:</strong> ${formatDate(calamity.startdate)}</div>
      <div style="margin-bottom: 8px;"><strong>End Date:</strong> ${formatDate(calamity.enddate)}</div>
      <div style="margin-bottom: 8px;"><strong>Description:</strong><br><span id="desc-${calamity.id}" style="word-wrap: break-word;">${descShort}</span>${showMoreBtn}</div>
      <div style="margin-bottom: 12px;"><strong>Gravity:</strong> ${gravityText}</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="show-shelters-btn" data-id="${calamity.id}" style="color:white;background:#007bff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;">Show shelters/escape routes</button>
      </div>
    </div>
  `;
  
  const marker = L.marker([calamity.lat, calamity.lng], {
    icon: icons[calamity.type] || icons.default
  }).bindPopup(popupHtml);
  
 
  marker.calamityData = {
    id: calamity.id,
    type: calamity.type,
    lat: calamity.lat,
    lng: calamity.lng
  };
  
  return { marker, description: desc };
}



function setupPopupHandlers(marker, calamity, description) {
  marker.on('popupopen', function() {
   
    const showMore = document.querySelector(`.show-more-link[data-id='desc-${calamity.id}']`);
    if (showMore) {
      showMore.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById(`desc-${calamity.id}`).textContent = description;
        showMore.style.display = 'none';
      });
    }
    
  
    const showSheltersBtn = document.querySelector(`.show-shelters-btn[data-id='${calamity.id}']`);
    if (showSheltersBtn) {
      showSheltersBtn.addEventListener('click', function() {
        if (window.toggleEmergencyShelters) {
          const isShowing = window.toggleEmergencyShelters(calamity.id);
          showSheltersBtn.textContent = isShowing ? 'Hide shelters/escape routes' : 'Show shelters/escape routes';
          showSheltersBtn.style.background = isShowing ? '#6c757d' : '#007bff';
        }
      });
    }
  });
}



function setupMarkerClickHandlers(marker, calamity) {
  marker.on('click', function(e) {
    if (window.isSelectingEmergency && window.isSelectingEmergency()) {
      e.originalEvent.stopPropagation();
      const wasSelected = window.handleEmergencySelection(calamity);
      if (wasSelected) {
        return; 
      }
    }
    
   
    if (window.isSelectingDisasterPin && window.isSelectingDisasterPin()) {
      e.originalEvent.stopPropagation();
      const wasSelected = window.handleDisasterPinSelection(calamity);
      if (wasSelected) {
        return; 
      }
    }
  });
}



function refreshCalamities() {
  const icons = initializeCalamityIcons();
  
  fetch('/calamities_c')
    .then(res => res.json())
    .then(data => {
      
      window.calamityCluster.clearLayers();
      window.allCalamityMarkers = [];

      data.filter(c => c.lat != null && c.lng != null).forEach(c => {
        const now = new Date();
     
        if (c.added_at) {
          const [d, m, y, h, min, s] = c.added_at.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/).slice(1).map(Number);
          const addedDate = new Date(y, m - 1, d, h, min, s);
          const diffDays = (now - addedDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 5) return; 
        }
        
        const { marker, description } = createCalamityMarker(c, icons);
        setupPopupHandlers(marker, c, description);
        setupMarkerClickHandlers(marker, c);
        
        window.allCalamityMarkers.push(marker);
        window.calamityCluster.addLayer(marker);
      });
    })
    .catch(console.error);
}








function setupSectionHeaders() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function() {
        const sectionId = this.dataset.section + 'Section';
        const content = document.getElementById(sectionId);
        const wasActive = this.classList.contains('active');

       
        document.querySelectorAll('.section-header').forEach(h => h.classList.remove('active'));
        document.querySelectorAll('.section-content').forEach(c => c.style.display = 'none');

       
        if (!wasActive) {
            this.classList.add('active');
            content.style.display = 'block';
        }
    });
  });
}



function loadCalamities(map) {

  if (!window.calamityCluster) {
    window.calamityCluster = L.markerClusterGroup({
      chunkedLoading: true,
      chunkProgress: function(processed, total, elapsed) {
        if (processed === total) {
        
        }
      }
    });
  
    map.addLayer(window.calamityCluster);
  }


  refreshCalamities();

  window.refreshCalamities = refreshCalamities;

  
  setupSectionHeaders();
 

  window.isSelectingDisasterPin = () => isSelectingDisasterPin;

  
  function applyDisasterFilter() {
    if (selectedDisasterPin && selectedDisasterPin.type) {
    
      window.calamityCluster.eachLayer(function(layer) {
        if (layer.calamityData) {
          if (layer.calamityData.type === selectedDisasterPin.type) {
            layer.setOpacity(1.0);
          } else {
            layer.setOpacity(0.3); 
          }
        }
      });
    }
  }

 
  function resetDisasterFilter() {
    window.calamityCluster.eachLayer(function(layer) {
      layer.setOpacity(1.0);
    });
  }

  
  function handleDisasterPinSelection(calamity) {
    if (isSelectingDisasterPin) {
      selectedDisasterPin = {
        id: calamity.id,
        type: calamity.type,
        lat: calamity.lat,
        lng: calamity.lng
      };
      
      
      document.getElementById('selected-disaster-type').innerHTML = `<strong>Type:</strong> ${calamity.type}`;
      document.getElementById('selected-disaster-coords').innerHTML = `<strong>Coordinates:</strong> ${calamity.lat}, ${calamity.lng}`;
      document.getElementById('selected-disaster-info').style.display = 'block';
      
     
      const confirmCheckbox = document.getElementById('confirmDisasterPin');
      if (confirmCheckbox) {
        confirmCheckbox.checked = false;
      }
      
      return true; 
    }
      return false; 
    }

  
  window.handleDisasterPinSelection = handleDisasterPinSelection;

  function filterCalamitiesByType(type) {
    
    window.calamityCluster.clearLayers();
    if (!type || type === 'All' || type === '') {
      window.allCalamityMarkers.forEach(marker => window.calamityCluster.addLayer(marker));
    } else {
      window.allCalamityMarkers.forEach(marker => {
        if (marker.calamityData && marker.calamityData.type === type) {
          window.calamityCluster.addLayer(marker);
        }
      });
    }

   
    if (window.earthquakeCluster && window.allEarthquakeMarkers) {
      window.earthquakeCluster.clearLayers();
      window.allEarthquakeMarkers.forEach(marker => {
        if (!type || type === 'All' || type === '' || marker.calamityData?.type === type) {
          window.earthquakeCluster.addLayer(marker);
        }
      });
    }

    
    if (window.fireCluster && window.allFireMarkers) {
      window.fireCluster.clearLayers();
      window.allFireMarkers.forEach(marker => {
        if (!type || type === 'All' || type === '' || marker.calamityData?.type === type) {
          window.fireCluster.addLayer(marker);
        }
      });
    }

   
  }

  
  window.filterCalamitiesByType = filterCalamitiesByType;
}