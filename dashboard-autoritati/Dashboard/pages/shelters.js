//sql injection
function sanitizeForSQL(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
  
    return input
        .replace(/'/g, "''")          
        .replace(/"/g, '""')          
        .replace(/;/g, '')            
        .replace(/--/g, '')          
        .replace(/\/\*/g, '')          
        .replace(/\*\//g, '')          
        .replace(/\bOR\b/gi, '')       
        .replace(/\bAND\b/gi, '')      
        .replace(/\bUNION\b/gi, '')    
        .replace(/\bSELECT\b/gi, '')   
        .replace(/\bINSERT\b/gi, '')   
        .replace(/\bUPDATE\b/gi, '')  
        .replace(/\bDELETE\b/gi, '')   
        .replace(/\bDROP\b/gi, '')     
        .replace(/\bEXEC\b/gi, '')     
        .replace(/\bALTER\b/gi, '');   
}


function validateSQLSafety(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
    const dangerousPatterns = [
        /'.*OR.*'/i,
        /'.*AND.*'/i,
        /UNION.*SELECT/i,
        /DROP.*TABLE/i,
        /DELETE.*FROM/i,
        /INSERT.*INTO/i,
        /UPDATE.*SET/i,
        /--/,
        /\/\*.*\*\//,
        /;\s*$/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
}

//Cross-Site Scripting Xss

function encodeHTML(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    
    return input.replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}


function sanitizeHTML(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    
    input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    
    const dangerousTags = [
        'script', 'iframe', 'object', 'embed', 'form', 'input', 
        'textarea', 'button', 'select', 'option', 'meta', 'link'
    ];
    
    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`, 'gi');
        input = input.replace(regex, '');
        
        
        const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
        input = input.replace(selfClosingRegex, '');
    });
    
    
    const dangerousAttrs = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeyup',
        'onkeydown', 'onkeypress', 'javascript:', 'vbscript:'
    ];
    
    dangerousAttrs.forEach(attr => {
        const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        input = input.replace(regex, '');
    });
    
    return input;
}


function validateXSSSafety(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
    const xssPatterns = [
        /<script/i,
        /<iframe/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /onclick=/i,
        /onmouseover=/i,
        /<img[^>]+src[^>]*>/i,
        /<svg[^>]*>/i,
        /eval\(/i,
        /alert\(/i,
        /document\.cookie/i,
        /document\.write/i
    ];
    
    return !xssPatterns.some(pattern => pattern.test(input));
}


function secureInput(input, type = 'general') {
   
    if (!input || typeof input !== 'string' || input.trim() === '') {
        return '';
    }
    
    const trimmedInput = input.trim();
    
   
    if (!validateSQLSafety(trimmedInput)) {
        throw new Error('Potentially dangerous SQL pattern detected');
    }
    
    
    if (!validateXSSSafety(trimmedInput)) {
        throw new Error('Potentially dangerous XSS pattern detected');
    }
    
    
    let sanitized = trimmedInput;
    
    switch (type) {
        case 'description':
            
            sanitized = sanitizeForSQL(sanitized);
            sanitized = sanitizeHTML(sanitized);
            sanitized = encodeHTML(sanitized);
            break;
            
        default:
            
            sanitized = sanitizeForSQL(sanitized);
            sanitized = encodeHTML(sanitized);
            break;
    }
    
    
    sanitized = sanitized.trim();
    
    
    if (sanitized !== trimmedInput) {
        console.warn('Input was sanitized for security:', { original: trimmedInput, sanitized: sanitized });
    }
    
    return sanitized;
}

//Safe DOM Manipulation

function safeSetText(element, text) {
    if (!element) return;
    
    
    element.textContent = encodeHTML(String(text));
}

function safeSetHTML(element, html) {
    if (!element) return;
    
   
    const sanitizedHTML = sanitizeHTML(encodeHTML(String(html)));
    element.innerHTML = sanitizedHTML;
}

function safeSetAttribute(element, attribute, value) {
    if (!element) return;
    

    const sanitizedValue = encodeHTML(String(value));
    element.setAttribute(attribute, sanitizedValue);
}



let selectedEmergency = null;
let shelterTempMarker = null;
let isSelectingEmergency = false;
let emergencyConfirmed = false;

function initializeShelters(map, icons, createCustomIcon) {
  
  const shelterIcon = createCustomIcon('fas fa-home', '#28a745');
  const escapeRouteIcon = createCustomIcon('fas fa-route', '#ffc107');

 
  document.getElementById('shelterMethod').addEventListener('change', function(e) {
      const shelterForm = document.getElementById('shelterForm');
      const emergencySelection = document.getElementById('emergencySelection');
      const shelterCoordinates = document.getElementById('shelterCoordinates');
      const commonFields = document.getElementById('commonShelterFields');
      const permanentCalamityTypeField = document.getElementById('permanentCalamityTypeField');
      
    
      selectedEmergency = null;
      isSelectingEmergency = false;
      emergencyConfirmed = false;
      if (shelterTempMarker) {
          map.removeLayer(shelterTempMarker);
          shelterTempMarker = null;
      }
      map.off('click');
      
     //reset confirmation checkbox
      const confirmCheckbox = document.getElementById('confirmEmergencyPin');
      if (confirmCheckbox) {
          confirmCheckbox.checked = false;
      }
      
      if (e.target.value === 'emergency-shelter') {
          shelterForm.style.display = 'block';
          emergencySelection.style.display = 'block';
          shelterCoordinates.style.display = 'none';
          commonFields.style.display = 'none';
          permanentCalamityTypeField.style.display = 'none';
          isSelectingEmergency = true;
          
          // hide confirmation section initially
          document.getElementById('emergencyConfirmationSection').style.display = 'none';
          document.getElementById('emergency-info').style.display = 'none';
          
          
          addShelterCancelButton('emergency');
          
      } else if (e.target.value === 'permanent-shelter') {
          shelterForm.style.display = 'block';
          emergencySelection.style.display = 'none';
          shelterCoordinates.style.display = 'block';
          commonFields.style.display = 'block';
          permanentCalamityTypeField.style.display = 'block';
          
        
          addShelterCancelButton('permanent');
          enableShelterMapClick();
      } else {
          shelterForm.style.display = 'none';
          permanentCalamityTypeField.style.display = 'none';
          removeShelterCancelButton();
      }
  });

  // confirmation checkbox 
  document.getElementById('confirmEmergencyPin').addEventListener('change', function() {
      const shelterCoordinates = document.getElementById('shelterCoordinates');
      const commonFields = document.getElementById('commonShelterFields');
      
      if (this.checked && selectedEmergency) {
          // am selectat un emergency
          emergencyConfirmed = true;
          isSelectingEmergency = false;
          
          // shelter coordonates fields se afiseaza 
          shelterCoordinates.style.display = 'block';
          commonFields.style.display = 'block';
          
          // Enable map clicking for shelter coordinates
          enableShelterMapClick();
          
      } else {
          // checkbox dai unchecked atunci se sterge tot
          emergencyConfirmed = false;
          isSelectingEmergency = true;
          selectedEmergency = null;
          
          // shelder coordonates fields se ascund
          shelterCoordinates.style.display = 'none';
          commonFields.style.display = 'none';
          
         
          clearShelterForm();
          
         
          if (shelterTempMarker) {
              map.removeLayer(shelterTempMarker);
              shelterTempMarker = null;
          }
          
          map.off('click');
          
         
          document.getElementById('emergency-info').style.display = 'none';
          document.getElementById('emergencyConfirmationSection').style.display = 'none';
      }
  });

  // cancel button shelter
  function addShelterCancelButton(type) {
      removeShelterCancelButton(); 
      
      const submitButton = document.getElementById('addShelterButton');
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelShelterButton';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'filter-input';
      cancelBtn.style.cssText = 'background-color: #666; color: white; cursor: pointer; margin-top: 8px;';
      submitButton.parentNode.insertBefore(cancelBtn, submitButton.nextSibling);
      
      cancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          clearShelterForm();
          document.getElementById('shelterForm').style.display = 'none';
          document.getElementById('shelterMethod').value = '';
          isSelectingEmergency = false;
          selectedEmergency = null;
          emergencyConfirmed = false;
          map.off('click');
          if (shelterTempMarker) {
              map.removeLayer(shelterTempMarker);
              shelterTempMarker = null;
          }
      });
  }

  
  function removeShelterCancelButton() {
      const cancelBtn = document.getElementById('cancelShelterButton');
      if (cancelBtn) cancelBtn.remove();
  }

  
  function enableShelterMapClick() {
      map.on('click', function(e) {
          const shelterMethod = document.getElementById('shelterMethod').value;
          
          
          const canPlaceShelter = (shelterMethod === 'permanent-shelter') || 
                                 (shelterMethod === 'emergency-shelter' && !isSelectingEmergency && emergencyConfirmed);
          
          if (canPlaceShelter) {
              const lat = e.latlng.lat.toFixed(6);
              const lng = e.latlng.lng.toFixed(6);
              document.getElementById('shelterLat').value = lat;
              document.getElementById('shelterLng').value = lng;
              
              // Remove previous shelter temp marker
              if (shelterTempMarker) {
                  map.removeLayer(shelterTempMarker);
              }
              
             
              shelterTempMarker = L.marker([lat, lng], {
                  icon: shelterIcon,
                  draggable: true
              }).addTo(map);
              
             
              shelterTempMarker.on('dragend', function(event) {
                  const newLat = event.target.getLatLng().lat.toFixed(6);
                  const newLng = event.target.getLatLng().lng.toFixed(6);
                  document.getElementById('shelterLat').value = newLat;
                  document.getElementById('shelterLng').value = newLng;
              });
          }
      });
  }



  // functie helper pentru a obtine tipul de calamitate dupa id
  async function getCalamityTypeById(calamityId) {
    try {
      const response = await fetch('/calamities');
      const calamities = await response.json();
      const calamity = calamities.find(c => c.id == calamityId);
      return calamity ? calamity.type : null;
    } catch (error) {
      console.error('Error fetching calamity type:', error);
      return null;
    }
  }

  // Shelter description validation with security
  const shelterDescriptionField = document.getElementById('shelterDescription');
  const shelterCharCount = document.getElementById('shelter-char-count');
  const shelterDescriptionError = document.getElementById('shelter-description-error');

  if (shelterDescriptionField) {
      shelterDescriptionField.addEventListener('input', function(e) {
          try {
              let value = e.target.value;
              const maxLength = 250;
              
              // Apply security validation
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
              shelterCharCount.textContent = `${remainingChars} characters remaining`;
              shelterCharCount.style.color = remainingChars < 20 ? '#ff4444' : '#ccc';
              
            
              const validPattern = /^[a-zA-Z0-9\s.,;()!\/\-]*$/;
              
              if (!validPattern.test(value)) {
                  shelterDescriptionError.textContent = 'Only alphanumeric characters and .,;()!/- punctuation are allowed';
                  shelterDescriptionError.style.display = 'block';
                  e.target.value = value.replace(/[^a-zA-Z0-9\s.,;()!\/\-]/g, '');
              } else {
                  shelterDescriptionError.style.display = 'none';
              }
          } catch (error) {
              console.error('Security validation error:', error);
              e.target.value = '';
              shelterCharCount.textContent = '250 characters remaining';
              alert('Input rejected for security reasons');
          }
      });

      shelterDescriptionField.addEventListener('paste', function(e) {
          setTimeout(() => {
              const event = new Event('input', { bubbles: true });
              e.target.dispatchEvent(event);
          }, 0);
      });
  }

  
  function clearShelterForm() {
    document.getElementById('shelterLat').value = '';
    document.getElementById('shelterLng').value = '';
    document.getElementById('shelterType').value = '';
    document.getElementById('shelterDescription').value = '';
    document.getElementById('permanentCalamityType').value = '';
    document.getElementById('shelter-form-message').textContent = '';
    document.getElementById('shelter-form-message').style.color = 'white';
    document.getElementById('emergency-info').style.display = 'none';
    document.getElementById('emergencyConfirmationSection').style.display = 'none';
    selectedEmergency = null;
    emergencyConfirmed = false;
    
   
    const confirmCheckbox = document.getElementById('confirmEmergencyPin');
    if (confirmCheckbox) {
        confirmCheckbox.checked = false;
    }
    
    
    if (shelterCharCount) {
      shelterCharCount.textContent = '250 characters remaining';
      shelterCharCount.style.color = '#ccc';
    }
    
    
    if (shelterDescriptionError) {
      shelterDescriptionError.style.display = 'none';
    }
  }

  
  document.getElementById('addShelterButton').addEventListener('click', async function(e) {
      e.preventDefault();
      
      const shelterMethod = document.getElementById('shelterMethod').value;
      const shelterType = document.getElementById('shelterType').value;
      const shelterDescription = document.getElementById('shelterDescription').value;
      const shelterLat = parseFloat(document.getElementById('shelterLat').value);
      const shelterLng = parseFloat(document.getElementById('shelterLng').value);
      const permanentCalamityType = document.getElementById('permanentCalamityType').value;
      
      // validare inputs
      if (!shelterType) {
          document.getElementById('shelter-form-message').textContent = 'Please select a shelter type';
          document.getElementById('shelter-form-message').style.color = 'red';
          return;
      }
      
      if (isNaN(shelterLat) || isNaN(shelterLng)) {
          document.getElementById('shelter-form-message').textContent = 'Please click on the map to set shelter coordinates';
          document.getElementById('shelter-form-message').style.color = 'red';
          return;
      }
      
      if (shelterMethod === 'emergency-shelter' && (!selectedEmergency || !emergencyConfirmed)) {
          document.getElementById('shelter-form-message').textContent = 'Please select an emergency and confirm your selection';
          document.getElementById('shelter-form-message').style.color = 'red';
          return;
      }
      
      if (shelterMethod === 'permanent-shelter' && !permanentCalamityType) {
          document.getElementById('shelter-form-message').textContent = 'Please select an emergency type for the permanent shelter';
          document.getElementById('shelter-form-message').style.color = 'red';
          return;
      }
      
     
      if (shelterDescription) {
          try {
              
              const secureDescription = secureInput(shelterDescription, 'description');
              
              if (secureDescription.length > 250) {
                  document.getElementById('shelter-form-message').textContent = 'Description is too long. Maximum 250 characters allowed';
                  document.getElementById('shelter-form-message').style.color = 'red';
                  return;
              }
              
             
              document.getElementById('shelterDescription').value = secureDescription;
              
          } catch (error) {
              document.getElementById('shelter-form-message').textContent = 'Description contains unsafe content: ' + error.message;
              document.getElementById('shelter-form-message').style.color = 'red';
              return;
          }
      }
      
      
      let data = {
          lat: shelterLat,
          lng: shelterLng,
          type_shelter: shelterType,
          permanent: shelterMethod === 'permanent-shelter',
          description: shelterDescription || null
      };
      
     
      // slectare calamitate type
      if (shelterMethod === 'emergency-shelter' && selectedEmergency) {
          data.id_calamity = selectedEmergency.id;
         
          data.calamity_type = await getCalamityTypeById(selectedEmergency.id);
      } else if (shelterMethod === 'permanent-shelter') {
         
          data.calamity_type = permanentCalamityType;
      }
      
    //submit data to server
      fetch('/shelters', {
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
          document.getElementById('shelter-form-message').style.color = 'lightgreen';
          document.getElementById('shelter-form-message').textContent = response.message || 'Shelter added successfully!';
          
        
          if (shelterTempMarker) {
              map.removeLayer(shelterTempMarker);
              shelterTempMarker = null;
          }
          
          
          if (window.refreshShelters) {
              window.refreshShelters();
          }
          
          // resetare form
          clearShelterForm();
          document.getElementById('shelterForm').style.display = 'none';
          document.getElementById('shelterMethod').value = '';
          removeShelterCancelButton();
          map.off('click');
          isSelectingEmergency = false;
          emergencyConfirmed = false;
          
       
          setTimeout(() => {
              document.getElementById('shelter-form-message').textContent = '';
              document.getElementById('shelter-form-message').style.color = 'white';
          }, 3000);
      })
      .catch(error => {
          console.error('Error details:', error);
          document.getElementById('shelter-form-message').style.color = 'red';
          document.getElementById('shelter-form-message').textContent = 'Error: ' + error.message;
          
          setTimeout(() => {
              document.getElementById('shelter-form-message').textContent = '';
              document.getElementById('shelter-form-message').style.color = 'white';
          }, 5000);
      });
  });


  function handleEmergencySelection(calamity) {
      if (isSelectingEmergency) {
          selectedEmergency = {
              id: calamity.id,
              type: calamity.type,
              lat: calamity.lat,
              lng: calamity.lng
          };
          
       
          document.getElementById('selected-emergency-type').innerHTML = `<strong>Type:</strong> ${calamity.type}`;
          document.getElementById('selected-emergency-coords').innerHTML = `<strong>Coordinates:</strong> ${calamity.lat}, ${calamity.lng}`;
          document.getElementById('selected-emergency-icon').style.display = 'none';
          document.getElementById('emergency-info').style.display = 'block';
          
        
          document.getElementById('emergencyConfirmationSection').style.display = 'block';
          
         
          const confirmCheckbox = document.getElementById('confirmEmergencyPin');
          if (confirmCheckbox) {
              confirmCheckbox.checked = false;
          }
          
       
          emergencyConfirmed = false;
          
          return true; 
      }
      return false; 
  }

 
  window.handleEmergencySelection = handleEmergencySelection;
  window.isSelectingEmergency = () => isSelectingEmergency;
}


function loadShelters(map, createCustomIcon) {
   
    if (!window.permanentShelterCluster) {
        window.permanentShelterCluster = L.markerClusterGroup({
            chunkedLoading: true,
            iconCreateFunction: function(cluster) {
                return new L.DivIcon({ 
                    html: '<div><span>' + cluster.getChildCount() + '</span></div>', 
                    className: 'marker-cluster marker-cluster-permanent-shelter', 
                    iconSize: new L.Point(40, 40) 
                });
            }
        });
        map.addLayer(window.permanentShelterCluster);
    }

    if (!window.emergencyShelterCluster) {
        window.emergencyShelterCluster = L.markerClusterGroup({
            chunkedLoading: true,
            iconCreateFunction: function(cluster) {
                return new L.DivIcon({ 
                    html: '<div><span>' + cluster.getChildCount() + '</span></div>', 
                    className: 'marker-cluster marker-cluster-emergency-shelter', 
                    iconSize: new L.Point(40, 40) 
                });
            }
        });
      
    }

 
    let visibleEmergencyShelters = new Set();

   
    function refreshPermanentShelters() {
        fetch('/shelters')
            .then(res => res.json())
            .then(data => {
              
                window.permanentShelterCluster.clearLayers();
                window.allPermanentShelterMarkers = []; // Reset array for filtering

                data.filter(shelter => shelter.permanent === 1 || shelter.permanent === true)
                    .forEach(shelter => {
                        if (shelter.lat && shelter.lng) {
                            const marker = createShelterMarker(shelter, window.permanentShelterCluster, createCustomIcon);
                            // Add marker to global array for filtering
                            window.allPermanentShelterMarkers.push(marker);
                        }
                    });
            })
            .catch(console.error);
    }

  
    function showEmergencyShelters(calamityId) {
        fetch('/shelters')
            .then(res => res.json())
            .then(data => {
                const emergencyShelters = data.filter(shelter => 
                    shelter.id_calamity == calamityId && 
                    (shelter.permanent === 0 || shelter.permanent === false)
                );

                emergencyShelters.forEach(shelter => {
                    if (shelter.lat && shelter.lng) {
                        createShelterMarker(shelter, window.emergencyShelterCluster, createCustomIcon);
                    }
                });

                if (!map.hasLayer(window.emergencyShelterCluster)) {
                    map.addLayer(window.emergencyShelterCluster);
                }
            })
            .catch(console.error);
    }

 
    function hideEmergencyShelters(calamityId) {
        window.emergencyShelterCluster.clearLayers();
        if (map.hasLayer(window.emergencyShelterCluster)) {
            map.removeLayer(window.emergencyShelterCluster);
        }
    }

 
    function createShelterMarker(shelter, cluster, createCustomIcon) {
     
        const shelterIcon = shelter.type_shelter === 'shelter' 
            ? createCustomIcon('fas fa-home', '#28a745')
            : createCustomIcon('fas fa-route', '#ffc107');

      
        const calamityTypeText = shelter.calamity_type || 'N/A';
        
      
        let desc = shelter.description || 'N/A';
        let showMoreBtn = '';
        let descShort = desc;
        if (desc !== 'N/A' && desc.length > 10) {
            descShort = desc.slice(0, 10) + '...';
            showMoreBtn = `<br><a href="#" class="shelter-show-more-link" data-id="shelter-desc-${shelter.id}" style="color: #007bff; text-decoration: underline;">Show more</a>`;
        }
        
        const popupHtml = `
            <div style="min-width:200px;max-width:300px; line-height: 1.4;">
                <div style="margin-bottom: 8px;"><strong>Type:</strong> ${shelter.type_shelter}</div>
                <div style="margin-bottom: 8px;"><strong>Category:</strong> ${calamityTypeText}</div>
                <div style="margin-bottom: 8px;"><strong>Location:</strong> ${shelter.lat}, ${shelter.lng}</div>
                <div style="margin-bottom: 8px;"><strong>Description:</strong><br><span id="shelter-desc-${shelter.id}" style="word-wrap: break-word;">${descShort}</span>${showMoreBtn}</div>
                <div style="margin-bottom: 12px;"></div>
                <button class="delete-shelter-btn" data-id="${shelter.id}" style="color:white;background:#dc3545;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;">Delete shelter</button>
            </div>
        `;

        const marker = L.marker([shelter.lat, shelter.lng], {
            icon: shelterIcon
        }).bindPopup(popupHtml);

        // Add shelter data to marker for filtering
        marker.shelterData = shelter;

     
        marker.on('popupopen', function() {
          //show more logic
            const showMore = document.querySelector(`.shelter-show-more-link[data-id="shelter-desc-${shelter.id}"]`);
            if (showMore) {
                showMore.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.getElementById(`shelter-desc-${shelter.id}`).textContent = desc;
                    showMore.style.display = 'none';
                });
            }

            // delete button logic
            const deleteBtn = document.querySelector(`.delete-shelter-btn[data-id="${shelter.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    if (confirm('Ești sigur? Acțiunea este ireversibilă?')) {
                        fetch(`/shelters/${shelter.id}`, { method: 'DELETE' })
                            .then(res => res.json())
                            .then(response => {
                                if (response.error) {
                                    alert('Error: ' + response.error);
                                } else {
                                
                                    cluster.removeLayer(marker);
                                    alert('Shelter deleted successfully!');
                                }
                            })
                            .catch(error => {
                                console.error('Delete error:', error);
                                alert('Error deleting shelter: ' + error.message);
                            });
                    }
                });
            }
        });

        cluster.addLayer(marker);
        return marker;
    }

   
    function toggleEmergencyShelters(calamityId) {
        const calamityElement = document.querySelector(`.show-shelters-btn[data-id='${calamityId}']`);
        const isCurrentlyShowing = calamityElement && calamityElement.classList.contains('shelters-showing');
        
     
        document.querySelectorAll('.show-shelters-btn.shelters-showing').forEach(btn => {
            if(btn !== calamityElement) {
                hideEmergencyShelters(btn.dataset.id);
                btn.classList.remove('shelters-showing');
                btn.textContent = 'Show shelters/escape routes';
                btn.style.background = '#007bff';
            }
        });
        
        if (isCurrentlyShowing) {
            hideEmergencyShelters(calamityId);
            calamityElement.classList.remove('shelters-showing');
            calamityElement.textContent = 'Show shelters/escape routes';
            calamityElement.style.background = '#007bff';
            return false;
        } else {
            showEmergencyShelters(calamityId);
            if(calamityElement) {
                calamityElement.classList.add('shelters-showing');
                calamityElement.textContent = 'Hide shelters/escape routes';
                calamityElement.style.background = '#6c757d';
            }
            return true;
        }
    }

   
    function refreshShelters() {
        refreshPermanentShelters();
       
        const currentlyVisible = Array.from(visibleEmergencyShelters);
        visibleEmergencyShelters.clear();
        window.emergencyShelterCluster.clearLayers();
        currentlyVisible.forEach(calamityId => {
            showEmergencyShelters(calamityId);
            visibleEmergencyShelters.add(calamityId);
        });
    }

   
    refreshPermanentShelters();

   
    window.refreshShelters = refreshShelters;
    window.toggleEmergencyShelters = toggleEmergencyShelters;
}

// Make disaster filter functions available globally - commented out as these functions are in calamities.js
// window.handleDisasterPinSelection = handleDisasterPinSelection;
// window.isSelectingDisasterPin = () => isSelectingDisasterPin;
// window.filterCalamitiesByType = filterCalamitiesByType;
// window.applyDisasterFilter = applyDisasterFilter;
// window.resetDisasterFilter = resetDisasterFilter;

// Filtrare sheltere după permanent (1 = permanent, 0 = emergency)
function filterSheltersByPermanent(permanentValue) {
  if (!window.permanentShelterCluster || !window.allPermanentShelterMarkers) return;
  window.permanentShelterCluster.clearLayers();
  if (typeof permanentValue === 'undefined') {
    // Toate: permanente + toate emergency
    window.allPermanentShelterMarkers.forEach(marker => {
      window.permanentShelterCluster.addLayer(marker);
    });
    fetch('/shelters')
      .then(res => res.json())
      .then(data => {
        data.filter(shelter => shelter.permanent === 0 || shelter.permanent === false)
          .forEach(shelter => {
            if (shelter.lat && shelter.lng) {
              const shelterIcon = shelter.type_shelter === 'shelter' 
                ? createCustomIcon('fas fa-home', '#28a745')
                : createCustomIcon('fas fa-route', '#ffc107');
              const marker = L.marker([shelter.lat, shelter.lng], { icon: shelterIcon })
                .bindPopup(`<div style="min-width:200px;max-width:300px; line-height: 1.4;">
                  <div style="margin-bottom: 8px;"><strong>Type:</strong> ${shelter.type_shelter}</div>
                  <div style="margin-bottom: 8px;"><strong>Category:</strong> ${shelter.calamity_type || 'N/A'}</div>
                  <div style="margin-bottom: 8px;"><strong>Location:</strong> ${shelter.lat}, ${shelter.lng}</div>
                  <div style="margin-bottom: 8px;"><strong>Description:</strong><br>${shelter.description || 'N/A'}</div>
                  <div style="margin-bottom: 12px;"></div>
                  <button class='delete-shelter-btn' data-id='${shelter.id}' style='color:white;background:#dc3545;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;'>Delete shelter</button>
                </div>`);
              marker.shelterData = shelter;
              window.permanentShelterCluster.addLayer(marker);
            }
          });
      });
  } else if (Number(permanentValue) === 0) {
    // Doar emergency
    fetch('/shelters')
      .then(res => res.json())
      .then(data => {
        data.filter(shelter => shelter.permanent === 0 || shelter.permanent === false)
          .forEach(shelter => {
            if (shelter.lat && shelter.lng) {
              const shelterIcon = shelter.type_shelter === 'shelter' 
                ? createCustomIcon('fas fa-home', '#28a745')
                : createCustomIcon('fas fa-route', '#ffc107');
              const marker = L.marker([shelter.lat, shelter.lng], { icon: shelterIcon })
                .bindPopup(`<div style="min-width:200px;max-width:300px; line-height: 1.4;">
                  <div style="margin-bottom: 8px;"><strong>Type:</strong> ${shelter.type_shelter}</div>
                  <div style="margin-bottom: 8px;"><strong>Category:</strong> ${shelter.calamity_type || 'N/A'}</div>
                  <div style="margin-bottom: 8px;"><strong>Location:</strong> ${shelter.lat}, ${shelter.lng}</div>
                  <div style="margin-bottom: 8px;"><strong>Description:</strong><br>${shelter.description || 'N/A'}</div>
                  <div style="margin-bottom: 12px;"></div>
                  <button class='delete-shelter-btn' data-id='${shelter.id}' style='color:white;background:#dc3545;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;'>Delete shelter</button>
                </div>`);
              marker.shelterData = shelter;
              window.permanentShelterCluster.addLayer(marker);
            }
          });
      });
  } else {
    // Doar permanente
    window.allPermanentShelterMarkers.forEach(marker => {
      if (marker.shelterData && Number(marker.shelterData.permanent) === Number(permanentValue)) {
        window.permanentShelterCluster.addLayer(marker);
      }
    });
  }
}
window.filterSheltersByPermanent = filterSheltersByPermanent;

// Dropdown pentru filtrare rapidă (dacă există în pagină)
document.addEventListener('DOMContentLoaded', function() {
  const shelterTypeFilter = document.getElementById('shelterTypeFilter');
  if (shelterTypeFilter) {
    shelterTypeFilter.addEventListener('change', function() {
      if (this.value === 'permanent') filterSheltersByPermanent(1);
      else if (this.value === 'emergency') filterSheltersByPermanent(0);
      else filterSheltersByPermanent();
    });
  }
});