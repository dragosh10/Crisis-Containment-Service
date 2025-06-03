async function loadFires(map) {
  const apiKey = 'b31a89e6d1e64e887e88c555d8210e6b';
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/7`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch FIRMS data');

    const text = await response.text();
    const lines = text.trim().split('\n');
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

    lines.slice(1).forEach(line => {
      const cols = line.split(',');

      const lat = parseFloat(cols[latIndex]);
      const lon = parseFloat(cols[lonIndex]);
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
       
      `)
      .bindTooltip(`
        🔥 
        ${acq_date}
      `, {
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        sticky: true
      });

      markers.addLayer(marker);
    });

    map.addLayer(markers);
  } catch (err) {
    console.error('Error loading fire data:', err);
  }
}
