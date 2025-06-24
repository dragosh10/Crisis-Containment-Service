let clientId = null; 
let clientPins = [];
let clientPinCluster = null;
let tempAlarmPin = null;
let currentPinCount = 0;


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
    
    setTimeout(() => {
        setupAlarmMethodHandlers(map, createCustomIcon);
    }, 100);
    
   
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

   
    loadClientPins();
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
       
        let secureName = '';
        if (name && name.trim()) {
            secureName = secureInput(name.trim(), 'pinName');
            
           
            if (secureName.length > 15) {
                throw new Error('Pin name must be 15 characters or less');
            }
            
           
            if (secureName.length < 1) {
                secureName = ''; 
            }
        }
        
       
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            throw new Error('Invalid coordinates provided');
        }
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Coordinates out of valid range');
        }
        
       
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
                name: secureName || `Pin ${pinSlot}` 
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save pin: ${response.status}`);
        }

        const result = await response.json();
        console.log('Pin saved with security validation:', result);

       
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




function saveRecentAlert(alert) {
    let alerts = JSON.parse(localStorage.getItem('recentAlerts') || '[]');
    alerts.unshift(alert);
    if (alerts.length > 5) alerts = alerts.slice(0, 5);
    localStorage.setItem('recentAlerts', JSON.stringify(alerts));
}

function renderRecentAlerts() {
    const alerts = JSON.parse(localStorage.getItem('recentAlerts') || '[]');
    const list = document.getElementById('recentAlertsList');
    if (!list) return;
    list.innerHTML = '';
    if (alerts.length === 0) {
        list.innerHTML = '<li style="color:#fff;opacity:0.7;font-size:14px;">No recent alerts</li>';
        return;
    }
    const lastSeen = parseInt(localStorage.getItem('lastSeenAlert') || '0', 10);

    alerts.forEach((alert, idx) => {
        const li = document.createElement('li');
        li.style.padding = '8px 0';
        li.style.borderBottom = '1px solid #fff2';
        li.style.cursor = 'pointer';

       
        let isMissed = false;
        if (alert.created_at && new Date(alert.created_at).getTime() > lastSeen) {
            isMissed = true;
        }

        li.innerHTML = `
            <strong>${encodeHTML(alert.event || 'Alert')}</strong>
            ${isMissed ? '<span style="color: #ffd700; font-size: 12px; margin-left: 8px; background: #c00; padding: 2px 6px; border-radius: 4px;">MISSED!</span>' : ''}
            <br>
            <span style='font-size:12px;'>${encodeHTML(alert.instruction || '')}</span>
        `;

       
        li.addEventListener('click', () => {
           
            if (alert.created_at) {
                localStorage.setItem('lastSeenAlert', new Date(alert.created_at).getTime());
                renderRecentAlerts();
            }
            showAlertDetailsModal(alert);
        });
        list.appendChild(li);
    });
}


function showAlertDetailsModal(alert) {
   
    const oldModal = document.getElementById('alert-details-modal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'alert-details-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = '#fff';
    modal.style.color = '#222';
    modal.style.padding = '24px 32px';
    modal.style.borderRadius = '10px';
    modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
    modal.style.zIndex = '10001';
    modal.style.minWidth = '260px';
    modal.style.maxWidth = '90vw';

   
    let formattedDate = '-';
    if (alert.created_at) {
       
        formattedDate = alert.created_at.replace('T', ' ').replace('Z', '');
      
        formattedDate = formattedDate.replace(/\.[0-9]+/, '');
    }

    modal.innerHTML = `
        <h3 style="margin-top:0;">${encodeHTML(alert.event || 'Alert details')}</h3>
        <div style="margin-bottom:8px;"><strong>Location:</strong> ${alert.lat ? encodeHTML(alert.lat.toString()) : '-'}, ${alert.lon ? encodeHTML(alert.lon.toString()) : '-'}</div>
        <div style="margin-bottom:8px;"><strong>Date:</strong> ${formattedDate}</div>
        <div style="margin-bottom:8px;"><strong>Gravity:</strong> ${encodeHTML(alert.gravity || '-')}</div>
        <button id="close-alert-details" style="margin-top:12px;padding:6px 18px;background:#c00;color:#fff;border:none;border-radius:4px;cursor:pointer;">Close</button>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-alert-details').onclick = () => modal.remove();
}


window.addEventListener('DOMContentLoaded', () => {
    const alertsHeader = document.querySelector('[data-section="alerts"]');
    const alertsSection = document.getElementById('alertsSection');
    if (alertsHeader && alertsSection) {
        alertsHeader.addEventListener('click', () => {
            const isOpen = alertsSection.style.display === 'block';
            alertsSection.style.display = isOpen ? 'none' : 'block';
        });
    }
    renderRecentAlerts();
});


function handlePersonalAlert(alert) {
    saveRecentAlert({
        event: alert.event,
        instruction: alert.instruction,
        lat: alert.lat,
        lon: alert.lon,
        gravity: alert.gravity,
        created_at: alert.created_at
    });
    renderRecentAlerts();
}


function setupRealtimeAlerts() {
    let userId = null;
    fetch('/api/user').then(r => r.json()).then(data => {
        userId = data.user?.id;
        if (!userId) return;
        const ws = new WebSocket('ws://localhost:3001');
        ws.onopen = () => {
            ws.send(JSON.stringify({ userId }));
        };
        ws.onmessage = (event) => {
            try {
                const alert = JSON.parse(event.data);
                if (alert.refresh) {
                    if (window.refreshCalamities) {
                        window.refreshCalamities();
                    }
                    return;
                }
              
                if (alert.event || alert.instruction) {
                    handlePersonalAlert(alert);
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
                    banner.innerHTML = `<strong>${alert.event || 'Alertă'}!</strong> ${alert.instruction || ''} <button id=\"close-cap-alert\" style=\"margin-left:24px;padding:4px 12px;background:#fff;color:#c00;border:none;border-radius:4px;cursor:pointer;\">Închide</button>`;
                    document.body.appendChild(banner);
                    document.getElementById('close-cap-alert').onclick = () => banner.remove();
                }
            } catch (e) { console.error('Eroare la parsarea alertei WebSocket:', e); }
        };
    });
}
window.addEventListener('DOMContentLoaded', setupRealtimeAlerts);


window.addEventListener('DOMContentLoaded', () => {
    renderRecentAlerts();
});


window.addEventListener('beforeunload', () => {
    localStorage.setItem('lastSeenAlert', Date.now());
});


function showMissedAlertsBanner(n) {
    if (document.getElementById('missed-alerts-banner')) return; 
    let banner = document.createElement('div');
    banner.id = 'missed-alerts-banner';
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
    banner.innerHTML = `<strong>Missed ${n} alert${n > 1 ? 's' : ''}!</strong> Check the ALERTS section. <button id="close-missed-alerts" style="margin-left:24px;padding:4px 12px;background:#fff;color:#c00;border:none;border-radius:4px;cursor:pointer;">Close</button>`;
    document.body.appendChild(banner);
    document.getElementById('close-missed-alerts').onclick = () => banner.remove();
}


async function fetchAndRenderRecentAlerts() {
    try {
        const response = await fetch('/api/user-alerts');
        if (!response.ok) {
            renderRecentAlerts(); 
            return;
        }
        const data = await response.json();
        if (data.alerts && Array.isArray(data.alerts)) {
            localStorage.setItem('recentAlerts', JSON.stringify(data.alerts));
          
            const lastSeen = parseInt(localStorage.getItem('lastSeenAlert') || '0', 10);
            let missedCount = 0;
            data.alerts.forEach(alert => {
                if (alert.created_at && new Date(alert.created_at).getTime() > lastSeen) {
                    missedCount++;
                }
            });
            if (missedCount > 0) {
                showMissedAlertsBanner(missedCount);
            }
        }
        renderRecentAlerts();
    } catch (e) {
        console.error('Eroare la fetch alerts:', e);
        renderRecentAlerts();
    }
}


window.addEventListener('DOMContentLoaded', fetchAndRenderRecentAlerts);


