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
      data.filter(c => c.lat != null && c.lng != null).forEach(c => {
        const now = new Date();
        // Filtrare: doar pinuri adaugate in ultimele 5 zile
        if (c.added_at) {
          const [d, m, y, h, min, s] = c.added_at.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/).slice(1).map(Number);
          const addedDate = new Date(y, m - 1, d, h, min, s);
          const diffDays = (now - addedDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 5) return; // nu afisa pinul
        }
        // Format dates for display (convert from yyyy-mm-dd to dd/mm/yyyy, HH:mm:ss)
        const formatDate = (dateStr) => {
          if (!dateStr) return 'N/A';
          const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);
          if (parts) return dateStr; // already formatted
          const date = new Date(dateStr);
          const pad = n => n < 10 ? '0' + n : n;
          return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };
        // Gravitate + simbol
        const gravitySymbols = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          critical: '🔴'
        };
        const gravityText = c.gravity ? `${gravitySymbols[c.gravity] || ''} ${c.gravity.charAt(0).toUpperCase() + c.gravity.slice(1)}` : 'N/A';
        // Descriere show more
        let desc = c.description || '';
        let showMoreBtn = '';
        let descShort = desc;
        if (desc.length > 60) {
          descShort = desc.slice(0, 60) + '...';
          showMoreBtn = `<br><a href="#" class="show-more-link" data-id="desc-${c.id}">Show more</a>`;
        }
        // Popup HTML
        const popupHtml = `
          <div style="min-width:220px;max-width:300px;">
            <strong>Type:</strong> ${c.type}<br>
            <strong>Start Date:</strong> ${formatDate(c.startdate)}<br>
            <strong>End Date:</strong> ${formatDate(c.enddate)}<br>
            <strong>Description:</strong> <span id="desc-${c.id}">${descShort}</span>${showMoreBtn}<br>
            <strong>Gravity:</strong> ${gravityText}<br>
            <button class="delete-pin-btn" data-id="${c.id}" style="margin-top:8px;color:white;background:#c00;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Șterge pin</button>
          </div>
        `;
        const marker = L.marker([c.lat, c.lng], {
          icon: iconTypes[c.type] || iconTypes.generic
        }).bindPopup(popupHtml).addTo(map);
        marker.on('popupopen', function() {
          // Show more logic
          const showMore = document.querySelector(`.show-more-link[data-id='desc-${c.id}']`);
          if (showMore) {
            showMore.addEventListener('click', function(e) {
              e.preventDefault();
              document.getElementById(`desc-${c.id}`).textContent = desc;
              showMore.style.display = 'none';
            });
          }
          // Delete pin logic
          const delBtn = document.querySelector(`.delete-pin-btn[data-id='${c.id}']`);
          if (delBtn) {
            delBtn.addEventListener('click', function() {
              if (confirm('Ești sigur? Acțiunea este ireversibilă?')) {
                fetch(`/calamities/${c.id}`, { method: 'DELETE' })
                  .then(res => res.json())
                  .then(() => { map.removeLayer(marker); })
                  .catch(() => alert('Eroare la ștergere pin!'));
              }
            });
          }
        });
      });
    })
    .catch(console.error);

  // 2. Permite adăugarea pinurilor noi prin click pe hartă
  map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    // Adăugare pin provizoriu
    window.tempMarker = L.marker([lat, lng], {
      icon: iconTypes.generic,
      draggable: true
    }).addTo(map);

    // Actualizare coordonate la drag
    window.tempMarker.on('dragend', function(event) {
      const newLat = event.target.getLatLng().lat.toFixed(6);
      const newLng = event.target.getLatLng().lng.toFixed(6);
      document.getElementById('lat').value = newLat;
      document.getElementById('lng').value = newLng;
      coordDisplay.textContent = `Selected: Latitude: ${newLat}, Longitude: ${newLng}`;
    });

    const formHtml = `
      <form class="popup-form">
        <label>Latitude: <input name="lat" value="${lat.toFixed(5)}" readonly></label>
        <br>
        <label>Longitude: <input name="lng" value="${lng.toFixed(5)}" readonly></label>
        <br>
        <label>Type:
          <select name="type" required>
            <option value="fire">Fire</option>
            <option value="flood">Flood</option>
            <option value="earthquake">Earthquake</option>
            <option value="generic">Other</option>
          </select>
        </label>
         <br>
        <label>Country:
          <input name="country" type="text" placeholder="Enter country">
        </label>
        <br>
        <label>County:
          <input name="county" type="text" placeholder="Enter county">
        </label>
        <br>
        <label>Town:
          <input name="town" type="text" placeholder="Enter town">
        </label>
        <br>
        <label>Description:
        <br>
          <textarea name="description" placeholder="Describe the calamity..." rows="3" maxlength="250"></textarea>
        </label>
        <br>
        <label>Start Date (dd/mm/yyyy):
          <input name="startdate" type="date">
        </label>
        <br>
        <label>End Date (dd/mm/yyyy):
          <input name="enddate" type="date">
        </label>
        <br>
        <label>Gravity:
          <select name="gravity">
            <option value="">Select gravity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
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
        
        // Convert date format from yyyy-mm-dd (HTML input) to proper format for database
        const formatDateForDB = (dateStr) => {
          if (!dateStr) return null;
          return dateStr; // HTML date input already gives yyyy-mm-dd format
        };

        const calamity = {
          lat: parseFloat(formData.get('lat')),
          lng: parseFloat(formData.get('lng')),
          type: formData.get('type'),
          country: formData.get('country') || null,
          county: formData.get('county') || null,
          town: formData.get('town') || null,
          description: formData.get('description') || null,
          startdate: formatDateForDB(formData.get('startdate')),
          enddate: formatDateForDB(formData.get('enddate')),
          gravity: formData.get('gravity') || null
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
          // Format dates for display
          const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);
            if (parts) return dateStr; // already formatted
            const date = new Date(dateStr);
            const pad = n => n < 10 ? '0' + n : n;
            return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
          };

          L.marker([calamity.lat, calamity.lng], {
            icon: iconTypes[calamity.type] || iconTypes.generic
          }).bindPopup(`
            <strong>Type:</strong> ${calamity.type}<br>
            <strong>County:</strong> ${calamity.county || 'N/A'}<br>
            <strong>Town:</strong> ${calamity.town || 'N/A'}<br>
            <strong>Description:</strong> ${calamity.description}<br>
            <strong>Start Date:</strong> ${formatDate(calamity.startdate)}<br>
            <strong>End Date:</strong> ${formatDate(calamity.enddate)}<br>
            <strong>Gravity:</strong> ${calamity.gravity || 'N/A'}
          `).addTo(map);

          map.closePopup();
        })
        .catch(err => alert("Failed to save calamity: " + err.message));
      });
    }, 50);
  });
}
