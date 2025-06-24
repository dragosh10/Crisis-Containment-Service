function loadEarthquakes(map) {
    fetch('/earthquakes')
      .then(res => res.json())
      .then(data => {
        if (!data.features) {
          console.error("No features in data");
          return;
        }
  
        data.features.forEach(eq => {
          const [lon, lat] = eq.geometry.coordinates;
          const mag = eq.properties.mag;
          const place = eq.properties.place;
          const time = new Date(eq.properties.time).toLocaleString();
          const url = eq.properties.url;
  
          const marker = L.marker([lat, lon])
            .bindPopup(`
              <strong>${place}</strong><br>
              Magnitude: ${mag}<br>
              Time: ${time}<br>
              <a href="${url}" target="_blank">Details</a>
            `);
  
          marker.calamityData = { 
            type: 'earthquake', 
            lat: lat, 
            lng: lon, 
            magnitude: mag,
            place: place,
            time: time,
            url: url
          };
          window.allCalamityMarkers.push(marker);
          window.calamityCluster.addLayer(marker);
        });
      })
      .catch(err => {
        console.error('Error loading earthquake data:', err);
        alert('Failed to load earthquake data.');
      });
  }
  