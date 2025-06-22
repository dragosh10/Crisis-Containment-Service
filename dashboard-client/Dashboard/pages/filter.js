// Filtrare pentru calamități și adăposturi pe baza tipului de calamitate
(function() {
  // Asumăm că aceste funcții/variabile există global din calamities.js și shelters.js
  // - filterCalamitiesByType(type)
  // - window.permanentShelterCluster, window.emergencyShelterCluster
  // - fiecare marker de shelter are shelter.calamity_type

  function filterSheltersByCalamityType(type) {
    // Permanent shelters
    if (window.permanentShelterCluster) {
      window.permanentShelterCluster.clearLayers();
      window.allPermanentShelterMarkers = window.allPermanentShelterMarkers || [];
      if (!type || type === 'All' || type === '') {
        window.allPermanentShelterMarkers.forEach(marker => window.permanentShelterCluster.addLayer(marker));
      } else {
        window.allPermanentShelterMarkers.forEach(marker => {
          if (marker.shelterData && marker.shelterData.calamity_type === type) {
            window.permanentShelterCluster.addLayer(marker);
          }
        });
      }
    }
    // Emergency shelters (dacă vrei să filtrezi și aici, adaugă logică similară)
  }

  // Hook pentru dropdown
  document.addEventListener('DOMContentLoaded', function() {
    const disasterTypeSelect = document.getElementById('disasterTypeSelect');
    const everythingCheckbox = document.getElementById('locationFilter');
    if (!disasterTypeSelect) return;

    disasterTypeSelect.addEventListener('change', function() {
      const type = this.value;
      if (window.filterCalamitiesByType) window.filterCalamitiesByType(type);
      filterSheltersByCalamityType(type);
      if (everythingCheckbox) everythingCheckbox.checked = false;
    });
    if (everythingCheckbox) {
      everythingCheckbox.addEventListener('change', function() {
        if (this.checked) {
          if (window.filterCalamitiesByType) window.filterCalamitiesByType('');
          filterSheltersByCalamityType('');
          disasterTypeSelect.value = '';
        }
      });
    }
  });

  // Expun funcția global dacă vrei să o folosești din alte scripturi
  window.filterSheltersByCalamityType = filterSheltersByCalamityType;
})(); 