const iconTypes = {
  fire: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/482/482580.png', iconSize: [25, 25] }),
  flood: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/727/727803.png', iconSize: [25, 25] }),
  earthquake: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/992/992700.png', iconSize: [25, 25] }),
  generic: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png', iconSize: [25, 25] })
};

function loadCalamities(map) {
  // 1. Încarcă pinurile salvate din baza ta
  fetch('/calamities')
    .then(res => res.json())
    .then(data => {
      data.forEach(c => {
        L.marker([c.lat, c.lng], {
          icon: iconTypes[c.type] || iconTypes.generic
        }).bindPopup(`
          <strong>Type:</strong> ${c.type}<br>
          <strong>Description:</strong> ${c.description}
        `).addTo(map);
      });
    })
    .catch(console.error);

  // 2. Permite adăugarea pinurilor noi prin click pe hartă
  map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    const formHtml = `
      <form class="popup-form">
        <label>Latitude: <input name="lat" value="${lat.toFixed(5)}" readonly></label>
        <br>
        <label>Longitude: <input name="lng" value="${lng.toFixed(5)}" readonly></label>
        <br>
        <label>Type:
          <select name="type">
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="earthquake">Earthquake</option>
            <option value="generic">Other</option>
          </select>
        </label>
        <br>
        <label>Description:
        <br>
          <textarea name="description" placeholder="Describe the calamity..." rows="3"></textarea>
        </label>
        <br>
        <button type="submit">Save Pin</button>
      </form>
    `;

    const popup = L.popup()
      .setLatLng([lat, lng])
      .setContent(formHtml)
      .openOn(map);

    setTimeout(() => {
      document.querySelector('.popup-form').addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const calamity = {
          lat: parseFloat(formData.get('lat')),
          lng: parseFloat(formData.get('lng')),
          type: formData.get('type'),
          description: formData.get('description')
        };

        fetch('/calamities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calamity)
        })
        .then(res => {
          if (!res.ok) throw new Error("Failed to save calamity");
          return res.json();
        })
        .then(() => {
          L.marker([calamity.lat, calamity.lng], {
            icon: iconTypes[calamity.type] || iconTypes.generic
          }).bindPopup(`
            <strong>Type:</strong> ${calamity.type}<br>
            <strong>Description:</strong> ${calamity.description}
          `).addTo(map);

          map.closePopup();
        })
        .catch(err => alert("Failed to save calamity: " + err.message));
      });
    }, 50);
  });
}
