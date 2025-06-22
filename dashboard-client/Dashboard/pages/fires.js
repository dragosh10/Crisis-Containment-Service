async function loadFires(map) {
  const apiKey = 'b31a89e6d1e64e887e88c555d8210e6b';
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/7`;

  try {
    console.log('Loading fire data from NASA FIRMS API...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    
    if (!text || text.trim().length === 0) {
      console.warn('Empty response from FIRMS API');
      return;
    }
    
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      console.warn('No fire data available from FIRMS API');
      return;
    }
    
    const headers = lines[0].split(',');

    
    const latIndex = headers.indexOf('latitude');
    const lonIndex = headers.indexOf('longitude');
    const brightIndex = headers.indexOf('brightness');
    const confIndex = headers.indexOf('confidence');
    const dateIndex = headers.indexOf('acq_date');
    const timeIndex = headers.indexOf('acq_time');
    const satIndex = headers.indexOf('satellite');
    const instIndex = headers.indexOf('instrument');

    const markers = L.markerClusterGroup();
    let processedCount = 0;

    lines.slice(1).forEach(line => {
      const cols = line.split(',');

      const lat = parseFloat(cols[latIndex]);
      const lon = parseFloat(cols[lonIndex]);
      
    
      if (isNaN(lat) || isNaN(lon)) {
        return;
      }
      
      const brightness = cols[brightIndex] || '';
      const confidence = cols[confIndex] || '';
      const acq_date = cols[dateIndex] || '';
      const acq_time = cols[timeIndex] || '';
      const satellite = cols[satIndex] || '';
      const instrument = cols[instIndex] || '';


      const marker = L.circleMarker([lat, lon], {
        radius: 6,
        fillColor: 'orange',
        color: 'red',
        weight: 1,
        fillOpacity: 0.7
      })
      .bindPopup(`
        <strong>Fire Hotspot</strong><br>
        Latitude: ${lat}<br>
        Longitude: ${lon}<br>
        Date: ${acq_date} ${acq_time}<br>
        Brightness: ${brightness}<br>
        Confidence: ${confidence}%<br>
        Satellite: ${satellite}<br>
        Instrument: ${instrument}
      `)
      .bindTooltip(`
        🔥 Fire Hotspot
        ${acq_date}
      `, {
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        sticky: true
      });

      marker.calamityData = { type: 'fire', lat: lat, lng: lon, ...{ acq_date, acq_time, brightness, confidence, satellite, instrument } };
      window.allCalamityMarkers.push(marker);
      window.calamityCluster.addLayer(marker);
      processedCount++;
    });

    map.addLayer(markers);
    console.log(`Successfully loaded ${processedCount} fire hotspots from NASA FIRMS`);
    
  } catch (err) {
    console.error('Error loading fire data:', err);
    
    if (err.name === 'AbortError') {
      console.log('NASA FIRMS API request was aborted');
    } else if (err.message.includes('Failed to fetch')) {
      console.log('NASA FIRMS API is currently unavailable - network connection issue');
    } else if (err.message.includes('CORS')) {
      console.log('NASA FIRMS API CORS issue - may need to use a proxy server');
    } else {
      console.log('NASA FIRMS API error:', err.message);
    }
    
   
    console.log('Fire data will be unavailable until the NASA FIRMS service is restored');
  }
}
