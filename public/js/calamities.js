//iconuri

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

//functii date

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

function formatDateForDB(dateTimeStr) {
  if (!dateTimeStr) return null;
  const date = new Date(dateTimeStr);
  const pad = n => n < 10 ? '0' + n : n;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}


//pinuri si markere

function createCalamityMarker(calamity, icons) {
          const gravitySymbols = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
           
          };
  const gravityText = calamity.gravity ? `${gravitySymbols[calamity.gravity] || ''} ${calamity.gravity.charAt(0).toUpperCase() + calamity.gravity.slice(1)}` : 'N/A';
  
      //functie show more
  let desc = calamity.description || 'N/A';
          let showMoreBtn = '';
          let descShort = desc;
          if (desc.length > 10) {
            descShort = desc.slice(0, 10) + '...';
    showMoreBtn = `<br><a href="#" class="show-more-link" data-id="desc-${calamity.id}" style="color: #007bff; text-decoration: underline;">Show more</a>`;
          }
  
          // popup pin + butoane
          const popupHtml = `
            <div style="min-width:220px;max-width:300px; line-height: 1.4;">
      <div style="margin-bottom: 8px;"><strong>Type:</strong> ${calamity.type}</div>
      <div style="margin-bottom: 8px;"><strong>Start Date:</strong> ${formatDate(calamity.startdate)}</div>
      <div style="margin-bottom: 8px;"><strong>End Date:</strong> ${formatDate(calamity.enddate)}</div>
      <div style="margin-bottom: 8px;"><strong>Description:</strong><br><span id="desc-${calamity.id}" style="word-wrap: break-word;">${descShort}</span>${showMoreBtn}</div>
              <div style="margin-bottom: 12px;"><strong>Gravity:</strong> ${gravityText}</div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="delete-pin-btn" data-id="${calamity.id}" style="color:white;background:#c00;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;">Șterge pin</button>
        <button class="show-shelters-btn" data-id="${calamity.id}" style="color:white;background:#007bff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;">Show shelters/escape routes</button>
              </div>
            </div>
          `;
  
  const marker = L.marker([calamity.lat, calamity.lng], {
    icon: icons[calamity.type] || icons.default
          }).bindPopup(popupHtml);
          
          //adaugare date la marker
          marker.calamityData = {
    id: calamity.id,
    type: calamity.type,
    lat: calamity.lat,
    lng: calamity.lng
  };
  
  return { marker, description: desc };
}


//show more logic 

function setupPopupHandlers(marker, calamity, description) {
          marker.on('popupopen', function() {
            // Show more logic
    const showMore = document.querySelector(`.show-more-link[data-id='desc-${calamity.id}']`);
            if (showMore) {
              showMore.addEventListener('click', function(e) {
                e.preventDefault();
        document.getElementById(`desc-${calamity.id}`).textContent = description;
                showMore.style.display = 'none';
              });
            }
    
    // delete pin logic
    const delBtn = document.querySelector(`.delete-pin-btn[data-id='${calamity.id}']`);
            if (delBtn) {
              delBtn.addEventListener('click', function() {
                if (confirm('Ești sigur? Acțiunea este ireversibilă?')) {
         



 // trimitere request delete calamitate
          fetch(`/calamities/${calamity.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
          .then(res => {
            if (!res.ok) {
              return res.text().then(text => {
                console.error('Server response:', text);
                throw new Error(`Server error: ${res.status} - ${text}`);
              });
            }
            return res.json();
          })
          .then(response => {
        

            // dispare pinul
            window.calamityCluster.removeLayer(marker);
            console.log('Calamity deleted successfully:', response.message);
          })
          .catch(error => {
            console.error('Error deleting calamity:', error);
            alert('Error deleting calamity: ' + error.message);
          });
        }
              });
            }
            
            // show shelters buton
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
            
            // Handle disaster pin selection for filter
            if (window.isSelectingDisasterPin && window.isSelectingDisasterPin()) {
              e.originalEvent.stopPropagation();
              const wasSelected = window.handleDisasterPinSelection(calamity);
              if (wasSelected) {
                return; // Stop further processing if disaster was selected for filter
              }
            }
                 
          });
}



function refreshCalamities() {
  const icons = initializeCalamityIcons();
  
  fetch('/calamities')
    .then(res => res.json())
    .then(data => {
      
      
      window.calamityCluster.eachLayer(function(layer) {
        if (layer.calamityData && layer.calamityData.id) {
         
          window.calamityCluster.removeLayer(layer);
         
          const index = window.allCalamityMarkers.indexOf(layer);
          if (index > -1) {
            window.allCalamityMarkers.splice(index, 1);
          }
        }
      });

     //adaugare noi calamitati
      data.filter(c => c.lat != null && c.lng != null).forEach(c => {
        const now = new Date();
        
        //filtrare dupa data adaugarii (ultimle 5 zile)
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


  //partea de formular

function clearAddEmergencyForm() {
  document.getElementById('description').value = '';
  document.getElementById('lat').value = '';
  document.getElementById('lng').value = '';
 
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('gravity').value = '';
  document.getElementById('emergencyType').value = '';
  document.getElementById('form-message').textContent = '';
  document.getElementById('form-message').style.color = 'white';
  document.querySelector('.coordinates-display').textContent = 'Click on map to set coordinates';
  

  const charCount = document.getElementById('char-count');
  if (charCount) {
    charCount.textContent = '250 characters remaining';
    charCount.style.color = '#ccc';
  }
  
  
  const descError = document.getElementById('description-error');
  if (descError) {
    descError.style.display = 'none';
  }
}

function setupFormValidation() {
   
    const descriptionField = document.getElementById('description');
    const charCount = document.getElementById('char-count');
    const descriptionError = document.getElementById('description-error');

    if (descriptionField) {
        descriptionField.addEventListener('input', function(e) {
            try {
                let value = e.target.value;
                const maxLength = 250;
                
               
                if (!validateSQLSafety(value)) {
                    e.target.value = sanitizeForSQL(value);
                    value = e.target.value;
                    alert('Potentially dangerous SQL characters removed');
                }
                
                if (!validateXSSSafety(value)) {
                    e.target.value = encodeHTML(value);
                    value = e.target.value;
                    alert('Input sanitized for XSS protection');
                }
                
                const remainingChars = maxLength - value.length;
                charCount.textContent = `${remainingChars} characters remaining`;
                charCount.style.color = remainingChars < 20 ? '#ff4444' : '#ccc';
                
               
                const validPattern = /^[a-zA-Z0-9\s.,;()!\/\-]*$/;
                
                if (!validPattern.test(value)) {
                    descriptionError.textContent = 'Only alphanumeric characters and .,;()!/- punctuation are allowed';
                    descriptionError.style.display = 'block';
                    e.target.value = value.replace(/[^a-zA-Z0-9\s.,;()!\/\-]/g, '');
                } else {
                    descriptionError.style.display = 'none';
                }
            } catch (error) {
                console.error('Security validation error:', error);
                e.target.value = '';
                charCount.textContent = '250 characters remaining';
                alert('Input rejected for security reasons');
            }
        });

        descriptionField.addEventListener('paste', function(e) {
            setTimeout(() => {
                const event = new Event('input', { bubbles: true });
                e.target.dispatchEvent(event);
            }, 0);
        });
    }

    
}

function handleFormSubmission(map) {
  document.getElementById('addPinButton').addEventListener('click', function(e) {
      e.preventDefault();
      const method = document.getElementById('pinMethod').value;
      const type = document.getElementById('emergencyType').value;
      const description = document.getElementById('description').value;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;
      const gravity = document.getElementById('gravity').value;

      console.log('Form values:', {
          method,
          type,
          description,
          startTime,
          endTime,
          gravity
      });

     
      if (!type) {
          document.getElementById('form-message').textContent = 'Please select a disaster type';
          return;
      }

      if (!method) {
          document.getElementById('form-message').textContent = 'Please select how to add the emergency';
          return;
      }

     
      if (description) {
          try {
            
              const secureDescription = secureInput(description, 'description');
              
              if (secureDescription.length > 250) {
                  document.getElementById('form-message').textContent = 'Description is too long. Maximum 250 characters allowed';
                  document.getElementById('form-message').style.color = 'red';
                  return;
              }
              
             
              document.getElementById('description').value = secureDescription;
              
          } catch (error) {
              document.getElementById('form-message').textContent = 'Description contains unsafe content: ' + error.message;
              document.getElementById('form-message').style.color = 'red';
              return;
          }
      }

      let data = {
          type: type.trim(),
          description: description.trim() || null,
          startdate: formatDateForDB(startTime),
          enddate: formatDateForDB(endTime),
          gravity: gravity || null
      };

     

      if (method === 'place-pin') {
          const lat = parseFloat(document.getElementById('lat').value);
          const lng = parseFloat(document.getElementById('lng').value);
          
          if (isNaN(lat) || isNaN(lng)) {
              document.getElementById('form-message').textContent = 'Please click on the map to set coordinates';
              return;
          }
          
          data = { ...data, lat, lng };
      } 
 
      Object.keys(data).forEach(key => {
          if (data[key] === undefined || data[key] === null) {
              delete data[key];
          }
      });

      console.log('Sending data to server:', data);

      fetch('/calamities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      })
      .then(res => {
          if (!res.ok) {
              return res.text().then(text => {
                  console.error('Server response:', text);
                  throw new Error(`Server error: ${res.status} - ${text}`);
              });
          }
          return res.json();
      })
      .then(response => {
          document.getElementById('form-message').style.color = 'lightgreen';
          document.getElementById('form-message').textContent = response.message || 'Emergency added successfully!';
          
          
          if (window.tempMarker) {
              map.removeLayer(window.tempMarker);
              window.tempMarker = null;
          }

        
          window.refreshCalamities();
      
          clearAddEmergencyForm();
          document.getElementById('pinPlacementForm').style.display = 'none';
          document.getElementById('pinMethod').value = '';
          
       
          const cancelPinBtn = document.getElementById('cancelPinButton');
         
          if (cancelPinBtn) cancelPinBtn.remove();
         
          
         
          map.off('click');
          
        
          document.querySelector('.coordinates-display').style.display = 'none';

          
          setTimeout(() => {
              document.getElementById('form-message').textContent = '';
              document.getElementById('form-message').style.color = 'white';
          }, 3000);
      })
      .catch(error => {
          console.error('Error details:', error);
          document.getElementById('form-message').style.color = 'red';
          document.getElementById('form-message').textContent = 'Error: ' + error.message;
         
          setTimeout(() => {
              document.getElementById('form-message').textContent = '';
              document.getElementById('form-message').style.color = 'white';
          }, 5000);
      });
  });
}

function setupPinMethodHandler(map) {
  const icons = initializeCalamityIcons();
  
  document.getElementById('pinMethod').addEventListener('change', function(e) {
    const pinPlacementForm = document.getElementById('pinPlacementForm');
    const pinFields = document.querySelector('.pin-fields');
   
    const submitButton = document.getElementById('addPinButton');
    const coordDisplay = document.querySelector('.coordinates-display');

   
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
        window.tempMarker = null;
    }

   
    map.off('click');

    if (e.target.value === 'place-pin') {
        pinPlacementForm.style.display = 'block';
        pinFields.style.display = 'block';
      
        submitButton.textContent = 'Add Emergency';
        coordDisplay.style.display = 'block';
        coordDisplay.textContent = 'Click on map to set coordinates';
        
  //buton cancel pentru pin
        if (!document.getElementById('cancelPinButton')) {
          const cancelBtn = document.createElement('button');
          cancelBtn.id = 'cancelPinButton';
          cancelBtn.textContent = 'Cancel';
          cancelBtn.className = 'filter-input';
          cancelBtn.style.cssText = 'background-color: #666; color: white; cursor: pointer; margin-top: 8px;';
          submitButton.parentNode.insertBefore(cancelBtn, submitButton.nextSibling);
          
          cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
       
            clearAddEmergencyForm();
            pinPlacementForm.style.display = 'none';
            document.getElementById('pinMethod').value = '';
            coordDisplay.style.display = 'none';
            
            if (window.tempMarker) {
              map.removeLayer(window.tempMarker);
              window.tempMarker = null;
            }
          
            map.off('click');
          });
        }
        
    
        map.on('click', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            document.getElementById('lat').value = lat;
            document.getElementById('lng').value = lng;
            coordDisplay.textContent = `Selected: Latitude: ${lat}, Longitude: ${lng}`;

            
            if (window.tempMarker) {
                map.removeLayer(window.tempMarker);
            }

           
            window.tempMarker = L.marker([lat, lng], {
                icon: icons.default,
                draggable: true
            }).addTo(map);

          
            window.tempMarker.on('dragend', function(event) {
                const newLat = event.target.getLatLng().lat.toFixed(6);
                const newLng = event.target.getLatLng().lng.toFixed(6);
                document.getElementById('lat').value = newLat;
                document.getElementById('lng').value = newLng;
                coordDisplay.textContent = `Selected: Latitude: ${newLat}, Longitude: ${newLng}`;
            });
        });
    }  else {
        pinPlacementForm.style.display = 'none';
        // pa cancel buttons
        const cancelPinBtn = document.getElementById('cancelPinButton');
      
        if (cancelPinBtn) cancelPinBtn.remove();
       
    }
  });
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
      chunkedLoading: true
    });
 
    map.addLayer(window.calamityCluster);
  }

  
  refreshCalamities();

  
  window.refreshCalamities = refreshCalamities;


  setupPinMethodHandler(map);
  setupSectionHeaders();
  setupFormValidation();
  handleFormSubmission(map);
 

 
 
  
}


//sectiune filtru


let selectedDisasterPin = null;
let isSelectingDisasterPin = false;
window.allCalamityMarkers = window.allCalamityMarkers || [];


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
    
    
    const selectedDisasterType = document.getElementById('selected-disaster-type');
    const selectedDisasterCoords = document.getElementById('selected-disaster-coords');
    const selectedDisasterInfo = document.getElementById('selected-disaster-info');
    
    if (selectedDisasterType) {
      selectedDisasterType.innerHTML = `<strong>Type:</strong> ${calamity.type}`;
    }
    if (selectedDisasterCoords) {
      selectedDisasterCoords.innerHTML = `<strong>Coordinates:</strong> ${calamity.lat}, ${calamity.lng}`;
    }
    if (selectedDisasterInfo) {
      selectedDisasterInfo.style.display = 'block';
    }
    
    
    const confirmCheckbox = document.getElementById('confirmDisasterPin');
    if (confirmCheckbox) {
      confirmCheckbox.checked = false;
    }
    
    return true; 
  }
  return false; 
}


function filterCalamitiesByType(type) {
  window.calamityCluster.clearLayers();
  if (!type || type === 'All' || type === '') {
    window.allCalamityMarkers.forEach(marker => window.calamityCluster.addLayer(marker));
    return;
  }
  window.allCalamityMarkers.forEach(marker => {
    if (marker.calamityData && marker.calamityData.type === type) {
      window.calamityCluster.addLayer(marker);
    }
  });
}


window.handleDisasterPinSelection = handleDisasterPinSelection;
window.isSelectingDisasterPin = () => isSelectingDisasterPin;
window.filterCalamitiesByType = filterCalamitiesByType;
window.applyDisasterFilter = applyDisasterFilter;
window.resetDisasterFilter = resetDisasterFilter;

