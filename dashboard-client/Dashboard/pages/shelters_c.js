// Shelter functionality
window.allPermanentShelterMarkers = window.allPermanentShelterMarkers || [];

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
        fetch('/shelters_c')
            .then(res => res.json())
            .then(data => {
               
                window.permanentShelterCluster.clearLayers();
                window.allPermanentShelterMarkers = [];

                data.filter(shelter => shelter.permanent === 1 || shelter.permanent === true)
                    .forEach(shelter => {
                        if (shelter.lat && shelter.lng) {
                            const marker = createShelterMarker(shelter, window.permanentShelterCluster, createCustomIcon);
                            window.allPermanentShelterMarkers.push(marker);
                        }
                    });
            })
            .catch(console.error);
    }

   
    function showEmergencyShelters(calamityId) {
        fetch('/shelters_c')
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
            </div>
        `;

        const marker = L.marker([shelter.lat, shelter.lng], {
            icon: shelterIcon
        }).bindPopup(popupHtml);

        // Add shelter data to marker for filtering
        marker.shelterData = shelter;

       
        marker.on('popupopen', function() {
          
            const showMore = document.querySelector(`.shelter-show-more-link[data-id="shelter-desc-${shelter.id}"]`);
            if (showMore) {
                showMore.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.getElementById(`shelter-desc-${shelter.id}`).textContent = desc;
                    showMore.style.display = 'none';
                });
            }
        });

        cluster.addLayer(marker);
        return marker;
    }

   
    function toggleEmergencyShelters(calamityId) {
        if (visibleEmergencyShelters.has(calamityId)) {
            hideEmergencyShelters(calamityId);
            visibleEmergencyShelters.delete(calamityId);
            return false; 
        } else {
            showEmergencyShelters(calamityId);
            visibleEmergencyShelters.add(calamityId);
            return true;
        }
    }

    
    function refreshShelters() {
        refreshPermanentShelters();
        
    }

   
    refreshPermanentShelters();

   
    window.toggleEmergencyShelters = toggleEmergencyShelters;
    window.refreshShelters = refreshShelters;

    // Filtrare sheltere după permanent (1 = permanent, 0 = emergency)
    function filterSheltersByPermanent(permanentValue) {
        if (!window.permanentShelterCluster || !window.allPermanentShelterMarkers) return;
        window.permanentShelterCluster.clearLayers();
        if (typeof permanentValue === 'undefined') {
            // Toate: permanente + toate emergency
            window.allPermanentShelterMarkers.forEach(marker => {
                window.permanentShelterCluster.addLayer(marker);
            });
            fetch('/shelters_c')
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
            fetch('/shelters_c')
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
}