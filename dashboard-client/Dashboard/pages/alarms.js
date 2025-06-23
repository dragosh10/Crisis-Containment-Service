
let clientId = null; // Will be fetched dynamically
let clientPins = [];
let clientPinCluster = null;
let tempAlarmPin = null;
let currentPinCount = 0;

// Function to get current user info and set clientId
async function initializeClientId() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user && !data.user.is_authority) {
                clientId = data.user.id;
                console.log('Client ID initialized:', clientId);
                return true;
            } else {
                console.error('User is not a client or not found');
                return false;
            }
        } else if (response.status === 401) {
            console.log('User not authenticated - forms will be available but data operations disabled');
            return false;
        } else if (response.status === 404) {
            console.error('API endpoint not found - server may need to be restarted');
            return false;
        } else {
            console.error('Failed to fetch user info, status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        return false;
    }
}

// Utility function to ensure clientId is available
function ensureClientId(showUserMessage = false) {
    if (clientId === null) {
        console.error('Client ID not initialized. Make sure initializeClientAlarms was called first.');
        if (showUserMessage) {
            alert('Please log in as a client to use alarm features.');
        }
        return false;
    }
    return true;
}




async function initializeClientAlarms(map, createCustomIcon) {
    // Always set up the form handlers first, regardless of authentication status
    setTimeout(() => {
        setupAlarmMethodHandlers(map, createCustomIcon);
    }, 100);
    
    // Then try to initialize the client ID
    const clientIdInitialized = await initializeClientId();
    if (!clientIdInitialized) {
        console.error('Failed to initialize client ID. User may not be logged in or may not be a client.');
        console.log('Forms will be available but data operations will be disabled until proper authentication.');
        return;
    }
   
    if (!window.clientPinCluster) {
        window.clientPinCluster = L.markerClusterGroup({
            chunkedLoading: true,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let className = 'marker-cluster marker-cluster-client-pins';
                
                if (count < 2) {
                    className += ' marker-cluster-client-small';
                } else if (count < 3) {
                    className += ' marker-cluster-client-medium';
                } else {
                    className += ' marker-cluster-client-large';
                }
                
                return new L.DivIcon({ 
                    html: `<div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><span>${count}</span></div>`, 
                    className: className, 
                    iconSize: new L.Point(40, 40) 
                });
            }
        });
        map.addLayer(window.clientPinCluster);
    }

    // Now that clientId is set, proceed with loading data
    loadClientPins();
}


/*
async function displayClientZoneStatus() {
    if (!ensureClientId()) return;
    
    try {
        const response = await fetch(`/client-zone/${clientId}`);
        let statusMessage = '';
        
        if (response.ok) {
            const zoneData = await response.json();
            if (zoneData && (zoneData.Country || zoneData.County || zoneData.Town)) {
                // Build status message from existing data with security sanitization
                const zoneParts = [];
                if (zoneData.Town) zoneParts.push(encodeHTML(String(zoneData.Town)));
                if (zoneData.County) zoneParts.push(encodeHTML(String(zoneData.County)));
                if (zoneData.Country) zoneParts.push(encodeHTML(String(zoneData.Country)));
                
                if (zoneParts.length > 0) {
                    statusMessage = `The zone you selected is: ${zoneParts.join(', ')}`;
                } else {
                    statusMessage = "You haven not selected a zone yet";
                }
            } else {
                statusMessage = "You haven not selected a zone yet";
            }
        } else if (response.status === 404) {
            statusMessage = "You haven not selected a zone yet";
        } else {
            statusMessage = "Error loading zone information";
        }
        
      
        let statusDiv = document.getElementById('zone-status-message');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'zone-status-message';
            statusDiv.style.cssText = 'margin: 10px 0; padding: 8px; background-color: rgba(255,255,255,0.1); border-radius: 4px; font-size: 14px; color: #ccc;';
            
           
            const zoneFields = document.querySelector('.zone-fields');
            if (zoneFields) {
                zoneFields.parentNode.insertBefore(statusDiv, zoneFields.nextSibling);
            }
        }
        
        // Use safe text setting to prevent XSS
        safeSetText(statusDiv, statusMessage);
        
    } catch (error) {
        console.error('Error loading client zone status:', error);
        let statusDiv = document.getElementById('zone-status-message');
        if (statusDiv) {
            safeSetText(statusDiv, "Error loading zone information");
        }
    }
}

async function saveClientZoneData(country, county, town) {
    if (!ensureClientId()) return;
    
    try {
      
        const secureCountry = country ? secureInput(country.trim(), 'zone') : '';
        const secureCounty = county ? secureInput(county.trim(), 'zone') : '';
        const secureTown = town ? secureInput(town.trim(), 'zone') : '';
        
        // Validate optional fields only if they are provided
        if (secureCountry && secureCountry.length < 2) {
            throw new Error('Country must be at least 2 characters long if provided');
        }
         
        if (secureCounty && secureCounty.length < 2) {
            throw new Error('County must be at least 2 characters long if provided');
        }
         
        if (secureTown && secureTown.length < 2) {
            throw new Error('Town must be at least 2 characters long if provided');
        }
        
        const response = await fetch('/client-zone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_client: clientId,
                Country: secureCountry || null,
                County: secureCounty || null, 
                Town: secureTown || null    
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save zone data: ${response.status}`);
        }

        const result = await response.json();
        console.log('Zone data saved:', result);
         
        displayClientZoneStatus();
        
        return result;
    } catch (error) {
        console.error('Error saving zone data:', error);
        throw error;
    }
}

*/

async function loadClientPins() {
    if (!ensureClientId()) return;
    
    try {
        const response = await fetch(`/client-pins/${clientId}`);
        if (response.ok) {
            const pinsData = await response.json();
            if (pinsData) {
                clientPins = [];
                currentPinCount = 0;

               
                for (let i = 1; i <= 3; i++) {
                    const lat = pinsData[`pin${i}_lat`];
                    const lng = pinsData[`pin${i}_lng`];
                    const name = pinsData[`pin${i}_name`];

                    if (lat && lng) {
                        const pin = {
                            id: i,
                            lat: lat,
                            lng: lng,
                            name: name || `Pin ${i}`
                        };
                        clientPins.push(pin);
                        currentPinCount++;
                        createClientPinMarker(pin);
                    }
                }

                updatePinCountDisplay();
            }
        }
    } catch (error) {
        console.error('Error loading client pins:', error);
    }
}

function createClientPinMarker(pin) {
  
    const clientPinIcon = L.divIcon({
        html: `<i class="fas fa-map-pin fa-2x" style="color: #28a745;"></i>`,
        className: 'custom-icon client-pin-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const popupHtml = `
        <div style="min-width:180px;max-width:250px; line-height: 1.4;">
            <div style="margin-bottom: 8px;"><strong>Name:</strong> ${pin.name}</div>
            <div style="margin-bottom: 8px;"><strong>Location:</strong> ${pin.lat}, ${pin.lng}</div>
            <div style="margin-bottom: 12px;"></div>
            <button class="delete-client-pin-btn" data-pin-id="${pin.id}" style="color:white;background:#dc3545;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:14px;">Delete Pin</button>
        </div>
    `;

    const marker = L.marker([pin.lat, pin.lng], {
        icon: clientPinIcon
    }).bindPopup(popupHtml);

    
    marker.on('popupopen', function() {
        const deleteBtn = document.querySelector(`.delete-client-pin-btn[data-pin-id="${pin.id}"]`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                deleteClientPin(pin.id, marker);
            });
        }
    });

    window.clientPinCluster.addLayer(marker);
    pin.marker = marker;
}

async function saveClientPin(lat, lng, name) {
    if (currentPinCount >= 3) {
        alert('Maximum 3 pins allowed. Please delete an existing pin first.');
        return false;
    }

    try {
        // Apply security sanitization to pin name (with explicit empty check)
        let secureName = '';
        if (name && name.trim()) {
            secureName = secureInput(name.trim(), 'pinName');
            
            // Validate pin name length
            if (secureName.length > 15) {
                throw new Error('Pin name must be 15 characters or less');
            }
            
            // Additional security check for pin names
            if (secureName.length < 1) {
                secureName = ''; // Reset to empty if sanitization removed everything
            }
        }
        
        // Validate coordinates (prevent injection through numeric fields)
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            throw new Error('Invalid coordinates provided');
        }
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Coordinates out of valid range');
        }
        
        // Find next available pin slot
        let pinSlot = 1;
        const existingPins = clientPins.map(p => p.id);
        while (existingPins.includes(pinSlot) && pinSlot <= 3) {
            pinSlot++;
        }

        if (pinSlot > 3) {
            alert('Maximum 3 pins allowed. Please delete an existing pin first.');
            return false;
        }

        const response = await fetch('/client-pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_client: clientId,
                pin_slot: pinSlot,
                lat: lat,
                lng: lng,
                name: secureName || `Pin ${pinSlot}` // Use default name if empty
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save pin: ${response.status}`);
        }

        const result = await response.json();
        console.log('Pin saved with security validation:', result);

        // Add to local array and create marker
        const newPin = {
            id: pinSlot,
            lat: lat,
            lng: lng,
            name: secureName || `Pin ${pinSlot}`
        };
        
        clientPins.push(newPin);
        currentPinCount++;
        createClientPinMarker(newPin);
        updatePinCountDisplay();

        return true;
    } catch (error) {
        console.error('Error saving pin:', error);
        alert('Error saving pin: ' + error.message);
        return false;
    }
}

async function deleteClientPin(pinId, marker) {
    if (confirm('Are you sure you want to delete this pin?')) {
        try {
            const response = await fetch('/client-pins', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_client: clientId,
                    pin_slot: pinId
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete pin: ${response.status}`);
            }

          
            clientPins = clientPins.filter(p => p.id !== pinId);
            currentPinCount--;
            window.clientPinCluster.removeLayer(marker);
            updatePinCountDisplay();

            console.log('Pin deleted successfully');
        } catch (error) {
            console.error('Error deleting pin:', error);
            alert('Error deleting pin: ' + error.message);
        }
    }
}

function updatePinCountDisplay() {
    const pinCountDisplay = document.getElementById('pin-count-display');
    if (pinCountDisplay) {
        pinCountDisplay.textContent = `Pins: ${currentPinCount}/3`;
        pinCountDisplay.style.color = currentPinCount >= 3 ? '#ff4444' : '#28a745';
        
       
        const pinMethod = document.getElementById('pinMethod');
        if (pinMethod && pinMethod.value === 'place-pin') {
            pinCountDisplay.style.display = 'block';
        } else {
            pinCountDisplay.style.display = 'none';
        }
    }
}



function setupAlarmMethodHandlers(map, createCustomIcon) {
   
    function removeAllAlarmCancelButtons() {
        const existingCancelButtons = document.querySelectorAll('[id^="cancelAlarm"]');
        existingCancelButtons.forEach(btn => btn.remove());
    }

  
    const pinNameField = document.getElementById('description');
    const pinCharCount = document.getElementById('char-count');
    if (pinNameField && pinCharCount) {
        pinNameField.addEventListener('input', function(e) {
            try {
                const maxLength = 15;
                let value = e.target.value;
                
                // Apply security validation
                if (!validateSQLSafety(value)) {
                    e.target.value = value.replace(/['";\-\-\/\*]/g, '');
                    value = e.target.value;
                    alert('Potentially dangerous characters removed for security');
                }
                
                if (!validateXSSSafety(value)) {
                    e.target.value = encodeHTML(value);
                    value = e.target.value;
                    alert('Input sanitized for security');
                }
                
                const remaining = maxLength - value.length;
                pinCharCount.textContent = `${remaining} characters remaining`;
                pinCharCount.style.color = remaining < 3 ? '#ff4444' : '#ccc';
            } catch (error) {
                console.error('Security validation error:', error);
                e.target.value = '';
                pinCharCount.textContent = '15 characters remaining';
                alert('Input rejected for security reasons');
            }
        });
    }

    
  

    const pinMethodSelect = document.getElementById('pinMethod');
    if (!pinMethodSelect) {
        console.error('pinMethod select element not found!');
        return;
    }

    pinMethodSelect.addEventListener('change', function(e) {
        const pinPlacementForm = document.getElementById('pinPlacementForm');
        const pinFields = document.querySelector('.pin-fields');
        const zoneFields = document.querySelector('.zone-fields');
        const submitButton = document.getElementById('addPinButton');
        const coordDisplay = document.querySelector('.coordinates-display');

      
        if (tempAlarmPin) {
            map.removeLayer(tempAlarmPin);
            tempAlarmPin = null;
        }
        
        map.off('click.alarmPin');
        removeAllAlarmCancelButtons();

        if (e.target.value === 'place-pin') {
            pinPlacementForm.style.display = 'block';
            pinFields.style.display = 'block';
            zoneFields.style.display = 'none';
            submitButton.textContent = 'Add Alarm Pin';
            coordDisplay.style.display = 'block';
            coordDisplay.textContent = 'Click on map to set alarm pin coordinates';

           
            if (!document.getElementById('pin-count-display')) {
                const pinCountDiv = document.createElement('div');
                pinCountDiv.id = 'pin-count-display';
                pinCountDiv.style.cssText = 'margin: 8px 0; font-weight: bold; font-size: 14px;';
                submitButton.parentNode.insertBefore(pinCountDiv, submitButton);
            }
            updatePinCountDisplay();

            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelAlarmButton';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'filter-input';
            cancelBtn.style.cssText = 'background-color: #666; color: white; cursor: pointer; margin-top: 8px;';
            submitButton.parentNode.insertBefore(cancelBtn, submitButton.nextSibling);

            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearAlarmForm();
                pinPlacementForm.style.display = 'none';
                pinMethodSelect.value = '';
                coordDisplay.style.display = 'none';
                if (tempAlarmPin) {
                    map.removeLayer(tempAlarmPin);
                    tempAlarmPin = null;
                }
               
                map.off('click.alarmPin');
                removeAllAlarmCancelButtons();
            });

          
            const mapContainer = map.getContainer();
            mapContainer.addEventListener('click', function(domEvent) {
                const containerBounds = mapContainer.getBoundingClientRect();
                const point = L.point(domEvent.clientX - containerBounds.left, domEvent.clientY - containerBounds.top);
                const latlng = map.containerPointToLatLng(point);
                
               
                const lat = latlng.lat.toFixed(6);
                const lng = latlng.lng.toFixed(6);
                document.getElementById('lat').value = lat;
                document.getElementById('lng').value = lng;
                coordDisplay.textContent = `Selected: Latitude: ${lat}, Longitude: ${lng}`;

              
                if (tempAlarmPin) {
                    map.removeLayer(tempAlarmPin);
                }

             
                const tempIcon = L.divIcon({
                    html: `<i class="fas fa-map-pin fa-2x" style="color: #ffc107;"></i>`,
                    className: 'custom-icon temp-alarm-pin',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                tempAlarmPin = L.marker([lat, lng], {
                    icon: tempIcon,
                    draggable: true
                }).addTo(map);

               
                tempAlarmPin.on('dragend', function(event) {
                    const newLat = event.target.getLatLng().lat.toFixed(6);
                    const newLng = event.target.getLatLng().lng.toFixed(6);
                    document.getElementById('lat').value = newLat;
                    document.getElementById('lng').value = newLng;
                    coordDisplay.textContent = `Selected: Latitude: ${newLat}, Longitude: ${newLng}`;
                });
            });

        }  else {
            pinPlacementForm.style.display = 'none';
            removeAllAlarmCancelButtons();
            
         
            const pinCountDisplay = document.getElementById('pin-count-display');
            if (pinCountDisplay) {
                pinCountDisplay.style.display = 'none';
            }
        }
    });

   
    setupAlarmFormSubmission(map);
}

function setupAlarmFormSubmission(map) {
    const submitButton = document.getElementById('addPinButton');
    if (!submitButton) return;

  
    const newSubmitButton = submitButton.cloneNode(true);
    submitButton.parentNode.replaceChild(newSubmitButton, submitButton);

    newSubmitButton.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const method = document.getElementById('pinMethod').value;
        const formMessage = document.getElementById('form-message');

        if (!method) {
            formMessage.textContent = 'Please select an alarm method';
            formMessage.style.color = 'red';
            return;
        }

        try {
            if (method === 'place-pin') {
                const lat = parseFloat(document.getElementById('lat').value);
                const lng = parseFloat(document.getElementById('lng').value);
                const pinName = document.getElementById('description').value.trim();

                if (isNaN(lat) || isNaN(lng)) {
                    formMessage.textContent = 'Please click on the map to set coordinates';
                    formMessage.style.color = 'red';
                    return;
                }

                if (currentPinCount >= 3) {
                
                    showTemporaryAlert('Maximum 3 pins allowed. Delete an existing pin first.');
                    return;
                }

                const success = await saveClientPin(lat, lng, pinName);
                if (success) {
                    formMessage.textContent = 'Alarm pin added successfully!';
                    formMessage.style.color = 'lightgreen';
                    
                 
                    if (tempAlarmPin) {
                        map.removeLayer(tempAlarmPin);
                        tempAlarmPin = null;
                    }
                    clearAlarmForm();
                }

            } 
         
            setTimeout(() => {
                formMessage.textContent = '';
                formMessage.style.color = 'white';
            }, 3000);

        } catch (error) {
            console.error('Error saving alarm:', error);
            formMessage.textContent = 'Error saving alarm: ' + error.message;
            formMessage.style.color = 'red';
        }
    });
}

function clearAlarmForm() {
    const fields = ['description', 'lat', 'lng'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
        
     
        if (fieldId === 'description') {
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.textContent = '15 characters remaining';
                charCount.style.color = '#ccc';
            }
        } 
    });

    const coordDisplay = document.querySelector('.coordinates-display');
    if (coordDisplay) {
        coordDisplay.textContent = 'Click on map to set coordinates';
    }
}


function showTemporaryAlert(message) {
    return new Promise((resolve) => {
        const alertShown = alert(message);
       
        resolve();
    });
}



window.initializeClientAlarms = initializeClientAlarms;
window.loadClientPins = loadClientPins;
window.updatePinCountDisplay = updatePinCountDisplay;

