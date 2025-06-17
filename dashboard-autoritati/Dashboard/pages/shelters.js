// Shelter functionality
let selectedEmergency = null;
let shelterTempMarker = null;
let isSelectingEmergency = false;
let emergencyConfirmed = false;

function initializeShelters(map, icons, createCustomIcon) {
  // Create shelter icons
  const shelterIcon = createCustomIcon('fas fa-home', '#28a745');
  const escapeRouteIcon = createCustomIcon('fas fa-route', '#ffc107');

  // Shelter method selection handler
  document.getElementById('shelterMethod').addEventListener('change', function(e) {
      const shelterForm = document.getElementById('shelterForm');
      const emergencySelection = document.getElementById('emergencySelection');
      const shelterCoordinates = document.getElementById('shelterCoordinates');
      const commonFields = document.getElementById('commonShelterFields');
      const permanentCalamityTypeField = document.getElementById('permanentCalamityTypeField');
      
      // Clear previous state
      selectedEmergency = null;
      isSelectingEmergency = false;
      emergencyConfirmed = false;
      if (shelterTempMarker) {
          map.removeLayer(shelterTempMarker);
          shelterTempMarker = null;
      }
      map.off('click');
      
      // Reset confirmation checkbox
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
          
          // Hide confirmation section initially
          document.getElementById('emergencyConfirmationSection').style.display = 'none';
          document.getElementById('emergency-info').style.display = 'none';
          
          // Add cancel button for emergency shelter
          addShelterCancelButton('emergency');
          
      } else if (e.target.value === 'permanent-shelter') {
          shelterForm.style.display = 'block';
          emergencySelection.style.display = 'none';
          shelterCoordinates.style.display = 'block';
          commonFields.style.display = 'block';
          permanentCalamityTypeField.style.display = 'block';
          
          // Add cancel button for permanent shelter
          addShelterCancelButton('permanent');
          
          // Enable map clicking for shelter coordinates
          enableShelterMapClick();
      } else {
          shelterForm.style.display = 'none';
          permanentCalamityTypeField.style.display = 'none';
          removeShelterCancelButton();
      }
  });

  // Emergency confirmation checkbox handler
  document.getElementById('confirmEmergencyPin').addEventListener('change', function() {
      const shelterCoordinates = document.getElementById('shelterCoordinates');
      const commonFields = document.getElementById('commonShelterFields');
      
      if (this.checked && selectedEmergency) {
          // Checkbox is checked and we have a selected emergency
          emergencyConfirmed = true;
          isSelectingEmergency = false;
          
          // Show shelter coordinates and common fields
          shelterCoordinates.style.display = 'block';
          commonFields.style.display = 'block';
          
          // Enable map clicking for shelter coordinates
          enableShelterMapClick();
          
      } else {
          // Checkbox is unchecked - clear everything
          emergencyConfirmed = false;
          isSelectingEmergency = true;
          selectedEmergency = null;
          
          // Hide shelter coordinates and common fields
          shelterCoordinates.style.display = 'none';
          commonFields.style.display = 'none';
          
          // Clear form fields
          clearShelterForm();
          
          // Remove temporary marker
          if (shelterTempMarker) {
              map.removeLayer(shelterTempMarker);
              shelterTempMarker = null;
          }
          
          // Disable map click for shelter coordinates
          map.off('click');
          
          // Hide emergency info and confirmation
          document.getElementById('emergency-info').style.display = 'none';
          document.getElementById('emergencyConfirmationSection').style.display = 'none';
      }
  });

  // Function to add cancel button for shelter
  function addShelterCancelButton(type) {
      removeShelterCancelButton(); // Remove existing button first
      
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

  // Function to remove cancel button
  function removeShelterCancelButton() {
      const cancelBtn = document.getElementById('cancelShelterButton');
      if (cancelBtn) cancelBtn.remove();
  }

  // Function to enable map click for shelter coordinates
  function enableShelterMapClick() {
      map.on('click', function(e) {
          const shelterMethod = document.getElementById('shelterMethod').value;
          
          // Allow map click for permanent shelters OR confirmed emergency shelters
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
              
              // Add new shelter temp marker
              shelterTempMarker = L.marker([lat, lng], {
                  icon: shelterIcon,
                  draggable: true
              }).addTo(map);
              
              // Update coordinates when marker is dragged
              shelterTempMarker.on('dragend', function(event) {
                  const newLat = event.target.getLatLng().lat.toFixed(6);
                  const newLng = event.target.getLatLng().lng.toFixed(6);
                  document.getElementById('shelterLat').value = newLat;
                  document.getElementById('shelterLng').value = newLng;
              });
          }
      });
  }

  // Helper function to get icon color
  function getIconColor(type) {
    const colorMap = {
      earthquake: '#ff4444',
      fire: '#ff8800',
      flood: '#0099cc',
      heatwave: '#ffd700',
      hurricane: '#8b4513',
      hailstorm: '#4169e1',
      wildfire: '#ff6600',
      tsunami: '#006699',
      'volcanic eruption': '#cc0000',
      landslide: '#8b4513',
      other: '#ffbb33'
    };
    return colorMap[type] || '#ffbb33';
  }

  // Helper function to get calamity type by ID
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

  // Shelter description validation
  const shelterDescriptionField = document.getElementById('shelterDescription');
  const shelterCharCount = document.getElementById('shelter-char-count');
  const shelterDescriptionError = document.getElementById('shelter-description-error');

  if (shelterDescriptionField) {
      shelterDescriptionField.addEventListener('input', function(e) {
          const value = e.target.value;
          const remainingChars = 250 - value.length;
          
          // Update character count
          shelterCharCount.textContent = `${remainingChars} characters remaining`;
          shelterCharCount.style.color = remainingChars < 20 ? '#ff4444' : '#ccc';
          
          // Validate characters (alphanumeric + .,;()!/ and spaces)
          const validPattern = /^[a-zA-Z0-9\s.,;()!/]*$/;
          
          if (!validPattern.test(value)) {
              shelterDescriptionError.textContent = 'Only alphanumeric characters and .,;()!/ punctuation are allowed';
              shelterDescriptionError.style.display = 'block';
              // Remove invalid characters
              e.target.value = value.replace(/[^a-zA-Z0-9\s.,;()!/]/g, '');
          } else {
              shelterDescriptionError.style.display = 'none';
          }
      });

      shelterDescriptionField.addEventListener('paste', function(e) {
          // Allow paste but filter on next input event
          setTimeout(() => {
              const event = new Event('input', { bubbles: true });
              e.target.dispatchEvent(event);
          }, 0);
      });
  }

  // Function to clear shelter form
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
    
    // Reset confirmation checkbox
    const confirmCheckbox = document.getElementById('confirmEmergencyPin');
    if (confirmCheckbox) {
        confirmCheckbox.checked = false;
    }
    
    // Reset character count
    if (shelterCharCount) {
      shelterCharCount.textContent = '250 characters remaining';
      shelterCharCount.style.color = '#ccc';
    }
    
    // Hide description error
    if (shelterDescriptionError) {
      shelterDescriptionError.style.display = 'none';
    }
  }

  // Shelter form submission
  document.getElementById('addShelterButton').addEventListener('click', async function(e) {
      e.preventDefault();
      
      const shelterMethod = document.getElementById('shelterMethod').value;
      const shelterType = document.getElementById('shelterType').value;
      const shelterDescription = document.getElementById('shelterDescription').value;
      const shelterLat = parseFloat(document.getElementById('shelterLat').value);
      const shelterLng = parseFloat(document.getElementById('shelterLng').value);
      const permanentCalamityType = document.getElementById('permanentCalamityType').value;
      
      // Validate required fields
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
      
      // Validate description if provided
      if (shelterDescription) {
          const validPattern = /^[a-zA-Z0-9\s.,;()!/]*$/;
          if (!validPattern.test(shelterDescription)) {
              document.getElementById('shelter-form-message').textContent = 'Description contains invalid characters. Only alphanumeric and .,;()!/ are allowed';
              document.getElementById('shelter-form-message').style.color = 'red';
              return;
          }
          if (shelterDescription.length > 250) {
              document.getElementById('shelter-form-message').textContent = 'Description is too long. Maximum 250 characters allowed';
              document.getElementById('shelter-form-message').style.color = 'red';
              return;
          }
      }
      
      // Prepare data for submission
      let data = {
          lat: shelterLat,
          lng: shelterLng,
          type_shelter: shelterType,
          permanent: shelterMethod === 'permanent-shelter',
          description: shelterDescription || null
      };
      
      // Handle calamity type
      if (shelterMethod === 'emergency-shelter' && selectedEmergency) {
          data.id_calamity = selectedEmergency.id;
          // Get calamity type for emergency shelters
          data.calamity_type = await getCalamityTypeById(selectedEmergency.id);
      } else if (shelterMethod === 'permanent-shelter') {
          // Use selected calamity type for permanent shelters
          data.calamity_type = permanentCalamityType;
      }
      
      // Submit shelter data
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
          
          // Remove temporary marker
          if (shelterTempMarker) {
              map.removeLayer(shelterTempMarker);
              shelterTempMarker = null;
          }
          
          // Refresh shelters on map if function exists
          if (window.refreshShelters) {
              window.refreshShelters();
          }
          
          // Reset form
          clearShelterForm();
          document.getElementById('shelterForm').style.display = 'none';
          document.getElementById('shelterMethod').value = '';
          removeShelterCancelButton();
          map.off('click');
          isSelectingEmergency = false;
          emergencyConfirmed = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
              document.getElementById('shelter-form-message').textContent = '';
              document.getElementById('shelter-form-message').style.color = 'white';
          }, 3000);
      })
      .catch(error => {
          console.error('Error details:', error);
          document.getElementById('shelter-form-message').style.color = 'red';
          document.getElementById('shelter-form-message').textContent = 'Error: ' + error.message;
          // Clear error message after 5 seconds
          setTimeout(() => {
              document.getElementById('shelter-form-message').textContent = '';
              document.getElementById('shelter-form-message').style.color = 'white';
          }, 5000);
      });
  });

  // Function to handle emergency selection for shelters
  function handleEmergencySelection(calamity) {
      if (isSelectingEmergency) {
          selectedEmergency = {
              id: calamity.id,
              type: calamity.type,
              lat: calamity.lat,
              lng: calamity.lng
          };
          
          // Update UI to show selected emergency
          document.getElementById('selected-emergency-type').innerHTML = `<strong>Type:</strong> ${calamity.type}`;
          document.getElementById('selected-emergency-coords').innerHTML = `<strong>Coordinates:</strong> ${calamity.lat}, ${calamity.lng}`;
          document.getElementById('selected-emergency-icon').style.display = 'none';
          document.getElementById('emergency-info').style.display = 'block';
          
          // Show confirmation section but don't proceed to shelter coordinates yet
          document.getElementById('emergencyConfirmationSection').style.display = 'block';
          
          // Reset confirmation checkbox when a new emergency is selected
          const confirmCheckbox = document.getElementById('confirmEmergencyPin');
          if (confirmCheckbox) {
              confirmCheckbox.checked = false;
          }
          
          // Don't show shelter coordinates until confirmed
          emergencyConfirmed = false;
          
          return true; // Indicate that the emergency was selected for shelter
      }
      return false; // Indicate normal behavior
  }

  // Make functions available globally
  window.handleEmergencySelection = handleEmergencySelection;
  window.isSelectingEmergency = () => isSelectingEmergency;
}

// Function to load and display shelters on the map
function loadShelters(map, createCustomIcon) {
    // Create shelter cluster groups - separate for permanent and emergency shelters
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
        // Don't add to map initially - only when toggled
    }

    // Track which emergency shelters are currently visible
    let visibleEmergencyShelters = new Set();

    // Function to refresh permanent shelters only
    function refreshPermanentShelters() {
        fetch('/shelters')
            .then(res => res.json())
            .then(data => {
                // Clear existing permanent shelter markers
                window.permanentShelterCluster.clearLayers();

                data.filter(shelter => shelter.permanent === 1 || shelter.permanent === true)
                    .forEach(shelter => {
                        if (shelter.lat && shelter.lng) {
                            createShelterMarker(shelter, window.permanentShelterCluster, createCustomIcon);
                        }
                    });
            })
            .catch(console.error);
    }

    // Function to show emergency shelters for a specific calamity
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

    // Function to hide emergency shelters for a specific calamity
    function hideEmergencyShelters(calamityId) {
        window.emergencyShelterCluster.clearLayers();
        if (map.hasLayer(window.emergencyShelterCluster)) {
            map.removeLayer(window.emergencyShelterCluster);
        }
    }

    // Function to create shelter marker with all functionality
    function createShelterMarker(shelter, cluster, createCustomIcon) {
        // Choose icon based on shelter type
        const shelterIcon = shelter.type_shelter === 'shelter' 
            ? createCustomIcon('fas fa-home', '#28a745')
            : createCustomIcon('fas fa-route', '#ffc107');

        // Use calamity_type if available, otherwise show "N/A"
        const calamityTypeText = shelter.calamity_type || 'N/A';
        
        // Description with show more functionality
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

        // Add popup event handlers
        marker.on('popupopen', function() {
            // Show more functionality
            const showMore = document.querySelector(`.shelter-show-more-link[data-id="shelter-desc-${shelter.id}"]`);
            if (showMore) {
                showMore.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.getElementById(`shelter-desc-${shelter.id}`).textContent = desc;
                    showMore.style.display = 'none';
                });
            }

            // Delete shelter functionality
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
                                    // Remove marker from appropriate cluster
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
    }

    // Toggle function for emergency shelters
    function toggleEmergencyShelters(calamityId) {
        const calamityElement = document.querySelector(`.show-shelters-btn[data-id='${calamityId}']`);
        const isCurrentlyShowing = calamityElement && calamityElement.classList.contains('shelters-showing');
        
        // Hide any shelters that are currently showing
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

    // Function to refresh shelters (for use after adding new ones)
    function refreshShelters() {
        refreshPermanentShelters();
        // Keep emergency shelters if they were visible
        const currentlyVisible = Array.from(visibleEmergencyShelters);
        visibleEmergencyShelters.clear();
        window.emergencyShelterCluster.clearLayers();
        currentlyVisible.forEach(calamityId => {
            showEmergencyShelters(calamityId);
            visibleEmergencyShelters.add(calamityId);
        });
    }

    // Initial load - only permanent shelters
    refreshPermanentShelters();

    // Make functions available globally
    window.refreshShelters = refreshShelters;
    window.toggleEmergencyShelters = toggleEmergencyShelters;
}