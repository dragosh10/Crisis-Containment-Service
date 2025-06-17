function loadFloods(map) {
    console.log('Loading flood data from UK Environment Agency API...');
    fetch('/floods')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(floodData => {
        console.log('Flood Data received:', floodData);
  
        // UK Environment Agency API returns data in 'items' array
        if (!floodData.items) {
          console.error("Flood data.items doesn't exist.", floodData);
          console.log('Available flood data structure:', Object.keys(floodData));
          return;
        }
        
        if (!Array.isArray(floodData.items)) {
          console.error("Flood data.items is not an array.", typeof floodData.items);
          console.log('Available flood data structure:', floodData);
          return;
        }
        
        if (floodData.items.length === 0) {
          console.log('No active flood warnings currently in the UK - this is normal when there are no floods');
          console.log('The UK Environment Agency API is working correctly but there are no current flood alerts');
          return;
        }

        const floodLayer = L.layerGroup();
        let processedCount = 0;
        let failedCount = 0;

        console.log(`Processing ${floodData.items.length} flood warnings...`);

        floodData.items.forEach((flood, index) => {
          console.log(`Processing flood ${index + 1}:`, flood);
          
          // UK Environment Agency API structure
          const floodArea = flood.floodArea;
          const description = flood.description || flood.message || 'Flood Warning';
          const severity = flood.severity || flood.severityLevel || 'Unknown';
          
          if (!floodArea || !floodArea.polygon) {
            console.warn('No flood area polygon for flood:', flood);
            failedCount++;
            return;
          }
  
          // Fetch the polygon data
          fetch(floodArea.polygon)
            .then(res => {
              if (!res.ok) {
                throw new Error(`Failed to fetch polygon: ${res.status}`);
              }
              return res.json();
            })
            .then(geojson => {
              console.log('GeoJSON data for flood', index + 1, ':', geojson);
              
              if (!geojson.features || geojson.features.length === 0) {
                console.warn('No features in polygon GeoJSON:', geojson);
                failedCount++;
                return;
              }
  
              const feature = geojson.features[0];
              const geometry = feature.geometry;
              
              if (!geometry || !geometry.coordinates) {
                console.warn('Missing or invalid geometry in polygon:', geojson);
                failedCount++;
                return;
              }
  
              let latlngs = [];
              
              // Handle different geometry types
              if (geometry.type === "Polygon") {
                // Handle only first ring of coordinates for simplicity
                latlngs = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
              } else if (geometry.type === "MultiPolygon") {
                // For MultiPolygon, take the first polygon's first ring
                latlngs = geometry.coordinates[0][0].map(coord => [coord[1], coord[0]]);
              } else {
                console.warn('Unsupported geometry type:', geometry.type);
                failedCount++;
                return;
              }
  
              // Create the polygon with UK flood warning colors
              const severityColors = {
                'Severe Flood Warning': '#d73027',
                'Flood Warning': '#fc8d59',
                'Flood Alert': '#fee08b',
                'Warning no Longer in Force': '#91bfdb',
                '1': '#d73027', // Severe Flood Warning
                '2': '#fc8d59', // Flood Warning  
                '3': '#fee08b', // Flood Alert
                '4': '#91bfdb'  // Warning no Longer in Force
              };
              
              const color = severityColors[severity] || severityColors[flood.severityLevel] || '#ff0000';
              
              const polygon = L.polygon(latlngs, {
                color: color,
                fillColor: color,
                fillOpacity: 0.4,
                weight: 2
              }).bindPopup(`
                <div style="min-width: 200px;">
                  <strong>${description}</strong><br>
                  <strong>Severity:</strong> ${severity}<br>
                  ${flood.riverOrSea ? `<strong>River/Sea:</strong> ${flood.riverOrSea}<br>` : ''}
                  ${flood.county ? `<strong>County:</strong> ${flood.county}<br>` : ''}
                  ${flood.timeRaised ? `<strong>Time Raised:</strong> ${new Date(flood.timeRaised).toLocaleString()}<br>` : ''}
                  ${flood.floodAreaID ? `<strong>Area ID:</strong> ${flood.floodAreaID}` : ''}
                </div>
              `);
  
              floodLayer.addLayer(polygon);
  
              // Calculate the centroid for the marker (the center of the polygon)
              const bounds = polygon.getBounds();
              const center = bounds.getCenter();
  
              // Create custom icon based on severity
              const getFloodIcon = (severity) => {
                const severityLevel = flood.severityLevel || severity;
                let iconClass = 'fas fa-water';
                let iconColor = color;
                
                if (severityLevel === '1' || severity === 'Severe Flood Warning') {
                  iconClass = 'fas fa-exclamation-triangle';
                }
                
                return L.divIcon({
                  html: `<i class="${iconClass}" style="color: ${iconColor}; font-size: 24px;"></i>`,
                  className: 'custom-flood-icon',
                  iconSize: [30, 30],
                  iconAnchor: [15, 15],
                  popupAnchor: [0, -15]
                });
              };
  
              // Add a marker at the centroid
              const marker = L.marker(center, {
                icon: getFloodIcon(severity)
              }).bindPopup(`
                <div style="min-width: 200px;">
                  <strong>${description}</strong><br>
                  <strong>Severity:</strong> ${severity}<br>
                  ${flood.riverOrSea ? `<strong>River/Sea:</strong> ${flood.riverOrSea}<br>` : ''}
                  ${flood.county ? `<strong>County:</strong> ${flood.county}<br>` : ''}
                  ${flood.timeRaised ? `<strong>Time Raised:</strong> ${new Date(flood.timeRaised).toLocaleString()}<br>` : ''}
                  ${flood.floodAreaID ? `<strong>Area ID:</strong> ${flood.floodAreaID}` : ''}
                </div>
              `);
              
              floodLayer.addLayer(marker);
              processedCount++;
              
              console.log(`Successfully processed flood area ${processedCount}`);
            })
            .catch(err => {
              console.error('Error loading polygon GeoJSON for flood', index + 1, ':', err);
              failedCount++;
            });
        });
  
        // Add the flood layer to the map
        map.addLayer(floodLayer);
        
        console.log(`Started processing ${floodData.items.length} flood areas`);
        
        // Log final results after a delay to allow async operations to complete
        setTimeout(() => {
          console.log(`Flood processing complete: ${processedCount} successful, ${failedCount} failed`);
        }, 5000);
      })
      .catch(err => {
        console.error('Error fetching flood data:', err);
        
        if (err.message.includes('Failed to fetch')) {
          console.log('UK Environment Agency API is currently unavailable - network connection issue');
        } else {
          console.log('UK Environment Agency API error:', err.message);
        }
        
        // Don't show alert for API errors, just log them
        console.log('Flood data service may be temporarily unavailable');
      });
  }
  