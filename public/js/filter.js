
(function() {
 
  function filterSheltersByCalamityType(type) {
   
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
   
  }

 
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

 
  window.filterSheltersByCalamityType = filterSheltersByCalamityType;
})(); 