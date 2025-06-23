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


async function ensureClientExists() {
    if (!ensureClientId()) return false;
    
    try {       
        const zoneResponse = await fetch('/client-zone/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_client: clientId
            })
        });

       
        const pinsResponse = await fetch('/client-pins/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_client: clientId
            })
        });

        console.log(`Client ${clientId} records ensured in both tables`);
        return true;
    } catch (error) {
        console.error('Error ensuring client exists:', error);
        return false;
    }
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
    ensureClientExists().then(() => {
        loadClientPins();
    });
}



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

    
    const zoneFields = ['zoneCountry', 'zoneCounty', 'zoneTown'];
    zoneFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const counterId = `${fieldId}-count`;
        
       
        let counter = document.getElementById(counterId);
        if (!counter && field) {
            counter = document.createElement('div');
            counter.id = counterId;
            counter.style.cssText = 'font-size: 12px; color: #ccc; margin-top: 4px;';
            field.parentNode.insertBefore(counter, field.nextSibling);
        }

        if (field && counter) {
            field.maxLength = 50;
            counter.textContent = '50 characters remaining';
            
            field.addEventListener('input', function(e) {
                try {
                    const maxLength = 50;
                    let value = e.target.value;
                    
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
                    
                    // Remove non-allowed characters for zone input
                    const cleanValue = value.replace(/[^a-zA-Z0-9\s\-\.,]/g, '');
                    if (cleanValue !== value) {
                        e.target.value = cleanValue;
                        value = cleanValue;
                        alert('Special characters removed - only letters, numbers, spaces, hyphens, dots and commas allowed');
                    }
                    
                    const remaining = maxLength - value.length;
                    counter.textContent = `${remaining} characters remaining`;
                    counter.style.color = remaining < 10 ? '#ff4444' : '#ccc';
                } catch (error) {
                    console.error('Security validation error:', error);
                    e.target.value = '';
                    counter.textContent = '50 characters remaining';
                    alert('Input rejected for security reasons');
                }
            });
        }
    });

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

        } else if (e.target.value === 'select-zone') {
            pinPlacementForm.style.display = 'block';
            pinFields.style.display = 'none';
            zoneFields.style.display = 'block';
            submitButton.textContent = 'Save Zone Alarm';
            coordDisplay.style.display = 'none';

          
            const pinCountDisplay = document.getElementById('pin-count-display');
            if (pinCountDisplay) {
                pinCountDisplay.style.display = 'none';
            }

        
            const countryField = document.getElementById('zoneCountry');
            const countyField = document.getElementById('zoneCounty');
            const townField = document.getElementById('zoneTown');
            
            if (countryField) countryField.value = '';
            if (countyField) countyField.value = '';
            if (townField) townField.value = '';

          
            displayClientZoneStatus();

          
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
                removeAllAlarmCancelButtons();
            });

        } else {
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

            } else if (method === 'select-zone') {
                const country = document.getElementById('zoneCountry').value.trim();
                const county = document.getElementById('zoneCounty').value.trim();
                const town = document.getElementById('zoneTown').value.trim();

                // No validation required since all fields are optional
                await saveClientZoneData(country, county, town);
                formMessage.textContent = 'Zone alarm saved successfully!';
                formMessage.style.color = 'lightgreen';
                clearAlarmForm();
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
    const fields = ['description', 'lat', 'lng', 'zoneCountry', 'zoneCounty', 'zoneTown'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
        
     
        if (fieldId === 'description') {
            const charCount = document.getElementById('char-count');
            if (charCount) {
                charCount.textContent = '15 characters remaining';
                charCount.style.color = '#ccc';
            }
        } else if (fieldId.startsWith('zone')) {
            const zoneCounter = document.getElementById(`${fieldId}-count`);
            if (zoneCounter) {
                zoneCounter.textContent = '50 characters remaining';
                zoneCounter.style.color = '#ccc';
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

//SQL Injection Prevention


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

//XSS Prevention

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
        case 'zone':
            
            sanitized = sanitizeForSQL(sanitized);
            sanitized = encodeHTML(sanitized);
       
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.,]/g, '');
            break;
            
        case 'pinName':
        
            sanitized = sanitizeForSQL(sanitized);
            sanitized = encodeHTML(sanitized);
           
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.,!]/g, '');
            break;
            
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

async function showCapAlertBanner() {
    // Înlocuiește cu metoda ta de a obține userId (ex: din sesiune, cookie, sau endpoint user)
    let userId = null;
    try {
        const resUser = await fetch('/api/user');
        if (resUser.ok) {
            const data = await resUser.json();
            userId = data.user?.id;
        }
    } catch {}
    if (!userId) return;
    const res = await fetch(`/alerts/${userId}`);
    if (res.ok) {
        const xml = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const event = doc.querySelector('event')?.textContent || 'Alertă';
        const instruction = doc.querySelector('instruction')?.textContent || '';
        // Creează bannerul
        let banner = document.createElement('div');
        banner.id = 'cap-alert-banner';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.background = '#c00';
        banner.style.color = 'white';
        banner.style.padding = '16px';
        banner.style.zIndex = '9999';
        banner.style.textAlign = 'center';
        banner.style.fontSize = '1.2em';
        banner.innerHTML = `<strong>${event}!</strong> ${instruction} <button id="close-cap-alert" style="margin-left:24px;padding:4px 12px;background:#fff;color:#c00;border:none;border-radius:4px;cursor:pointer;">Închide</button>`;
        document.body.appendChild(banner);
        document.getElementById('close-cap-alert').onclick = () => banner.remove();
    }
}
window.addEventListener('DOMContentLoaded', showCapAlertBanner);


