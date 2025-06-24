
function initializeMap() {
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

   
    loadEarthquakes(map);
    loadFires(map);
    loadCalamities(map);
    loadFloods(map);
    
  
    if (typeof initializeShelters === 'function') {
        initializeShelters(map, null, createCustomIcon);
    }
    if (typeof loadShelters === 'function') {
        loadShelters(map, createCustomIcon);
    }

  
    map.setView([45.9432, 24.9668], 7);

    return map;
}


function createLegend(map) {
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <div class="legend-header">
                <strong>Disaster Types .</strong>
                <button id="legend-toggle" style="background: #9E1717; border: 1px solid #9E1717; color: white; padding: 2px 6px; font-size: 12px; cursor: pointer; border-radius: 3px;">Hide</button>
            </div>
            <div id="legend-content">
                <div><i class="fas fa-house-crack" style="color: #ff4444;"></i> Earthquake</div>
                <div><i class="fas fa-fire" style="color: #ff8800;"></i> Fire</div>
                <div><i class="fas fa-water" style="color: #0099cc;"></i> Flood</div>
                <div><i class="fas fa-sun" style="color: #ffd700;"></i> Heatwave</div>
                <div><i class="fas fa-wind" style="color: #8b4513;"></i> Hurricane</div>
                <div><i class="fas fa-cloud-meatball" style="color: #4169e1;"></i> Hailstorm</div>
                <div><i class="fas fa-tree" style="color: #ff6600;"></i> Wildfire</div>
                <div><i class="fas fa-water" style="color: #006699;"></i> Tsunami</div>
                <div><i class="fas fa-mountain" style="color: #cc0000;"></i> Volcanic Eruption</div>
                <div><i class="fas fa-mountain" style="color: #8b4513;"></i> Landslide</div>
                <div><i class="fas fa-exclamation-triangle" style="color: #ffbb33;"></i> Other</div>
                <hr style="border-color: #555; margin: 8px 0;">
                <div><i class="fas fa-home" style="color: #28a745;"></i> Shelter</div>
                <div><i class="fas fa-route" style="color: #ffc107;"></i> Escape Route</div>
            </div>
        `;
        return div;
    };
    legend.addTo(map);

  
    map.on('legendadd', function() {
        const toggleBtn = document.getElementById('legend-toggle');
        const legendContent = document.getElementById('legend-content');
        let isVisible = true;

        toggleBtn.addEventListener('click', function() {
            if (isVisible) {
                legendContent.style.display = 'none';
                toggleBtn.textContent = 'Show';
            } else {
                legendContent.style.display = 'block';
                toggleBtn.textContent = 'Hide';
            }
            isVisible = !isVisible;
        });
    });

  
    setTimeout(() => {
        map.fire('legendadd');
    }, 100);
}


function initializeSidebar() {
    document.querySelector('[data-section="filter"]').classList.add('active');
    document.getElementById('filterSection').style.display = 'block';
}


function setupFilters() {
    document.addEventListener('DOMContentLoaded', function() {
     
        const disasterFilterCheckbox = document.getElementById('disasterFilter');
        const disasterTypeSelect = document.getElementById('disasterTypeSelect');
        if (disasterFilterCheckbox && disasterTypeSelect) {
            disasterFilterCheckbox.addEventListener('change', function() {
                disasterTypeSelect.disabled = !this.checked;
            });
            disasterTypeSelect.disabled = !disasterFilterCheckbox.checked;
        }

      
        const shelterFilterCheckbox = document.querySelector('.filter-label input[type="checkbox"]:not(#disasterFilter):not(#locationFilter)');
        const shelterTypeSelect = document.getElementById('shelterTypeFilter');
        if (shelterFilterCheckbox && shelterTypeSelect) {
            shelterFilterCheckbox.addEventListener('change', function() {
                shelterTypeSelect.disabled = !this.checked;
            });
            shelterTypeSelect.disabled = !shelterFilterCheckbox.checked;
        }
    });
}


function setupLogout() {
    document.getElementById('logout-icon').addEventListener('click', function() {
        if (confirm('Are you sure you want to log out?')) {
            fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                } else {
                    console.error('Logout failed');
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
                window.location.href = '/';
            });
        }
    });
}


function toggleSidebar() {
    const body = document.body;
    const mainContent = document.querySelector('.main-content');
    
    body.classList.toggle('sidebar-collapsed');
    
   
    setTimeout(() => {
        window.map.invalidateSize();
    }, 300); 
}


function setupSidebarControls() {
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
}


function handleMobileLayout() {
    const body = document.body;
    const legend = document.querySelector('.legend');
    const legendContent = document.getElementById('legend-content');
    const legendToggle = document.getElementById('legend-toggle');
    
    if (window.innerWidth <= 768) {
      
        body.classList.add('sidebar-collapsed');
        
      
        if (legend) {
            legend.style.display = 'block';
        }
        if (legendContent) {
            legendContent.style.display = 'none';
        }
        if (legendToggle) {
            legendToggle.textContent = 'Show';
        }
    } else {
       
        if (legend) {
            legend.style.display = 'block';
        }
        if (legendContent) {
            legendContent.style.display = 'block';
        }
        if (legendToggle) {
            legendToggle.textContent = 'Hide';
        }
    }
    
   
    setTimeout(() => {
        if (window.map) {
            window.map.invalidateSize();
        }
    }, 100);
}


const tips = [
    {
        title: "Earthquake Preparedness",
        image: "/images/firefighter.png",
        content: `
            <p><strong>Drop, Cover, and Hold On</strong> - The best protection during an earthquake.</p>
            <p><strong>Stay away from glass</strong> - Windows and mirrors can shatter.</p>
            <p><strong>Have an emergency kit</strong> - Water, food, flashlight, and first aid supplies.</p>
        `
    },
    {
        title: "Fire Prevention",
        image: "/images/fire.png",
        content: `
            <p><strong>Install smoke detectors</strong> - Check batteries regularly and test monthly.</p>
            <p><strong>Keep fire extinguishers</strong> - Place them in kitchen, garage, and key areas.</p>
            <p><strong>Plan escape routes</strong> - Practice fire drills with your family.</p>
            <p><strong>Safe cooking habits</strong> - Never leave cooking unattended.</p>
        `
    },
    {
        title: "Flood Preparation",
        image: "/images/flood.png",
        content: `
            <p><strong>Know your flood risk</strong> - Check local flood maps and evacuation routes.</p>
            <p><strong>Emergency kit ready</strong> - Include waterproof containers and supplies.</p>
            <p><strong>Avoid flooded roads</strong> - Turn around, don't drown. 6 inches can knock you down.</p>
            <p><strong>Move to higher ground</strong> - If flooding threatens, evacuate immediately.</p>
        `
    }
];

let currentTipIndex = 0;

function changeTip(direction) {
    currentTipIndex += direction;
    if (currentTipIndex >= tips.length) {
        currentTipIndex = 0;
    } else if (currentTipIndex < 0) {
        currentTipIndex = tips.length - 1;
    }
    updateTipDisplay();
}

function updateTipDisplay() {
    const currentTip = tips[currentTipIndex];
    document.getElementById('tipTitle').textContent = currentTip.title;
    document.getElementById('tipText').innerHTML = currentTip.content;
    document.getElementById('tipImage').src = currentTip.image;
}


function setupInfoIcon() {
    document.getElementById('info-icon').addEventListener('click', function() {
        const body = document.body;
        const filterHeader = document.querySelector('[data-section="filter"]');
        const filterSection = document.getElementById('filterSection');
        const emergencyHeader = document.querySelector('[data-section="emergency"]');
        const emergencySection = document.getElementById('emergencySection');
        const shelterHeader = document.querySelector('[data-section="shelter"]');
        const shelterSection = document.getElementById('shelterSection');
        const protipsHeader = document.querySelector('[data-section="protips"]');
        const protipsSection = document.getElementById('protipsSection');
        const mapIcon = document.getElementById('map-icon');
        const infoIcon = document.getElementById('info-icon');

     
        body.classList.remove('sidebar-collapsed');

       
        filterHeader.style.display = 'none';
        filterSection.style.display = 'none';
        emergencyHeader.style.display = 'none';
        emergencySection.style.display = 'none';
        shelterHeader.style.display = 'none';
        shelterSection.style.display = 'none';

      
        protipsHeader.style.display = 'block';
        protipsSection.style.display = 'block';
        protipsHeader.classList.add('active');

     
        mapIcon.classList.remove('active');
        infoIcon.classList.add('active');

       
        updateTipDisplay();

       
        setTimeout(() => {
            if (window.map) {
                window.map.invalidateSize();
            }
        }, 300);
    });
}


function setupMapIcon() {
    document.getElementById('map-icon').addEventListener('click', function(e) {
        e.preventDefault();
        
        const body = document.body;
        const filterHeader = document.querySelector('[data-section="filter"]');
        const filterSection = document.getElementById('filterSection');
        const emergencyHeader = document.querySelector('[data-section="emergency"]');
        const emergencySection = document.getElementById('emergencySection');
        const shelterHeader = document.querySelector('[data-section="shelter"]');
        const shelterSection = document.getElementById('shelterSection');
        const protipsHeader = document.querySelector('[data-section="protips"]');
        const protipsSection = document.getElementById('protipsSection');
        const mapIcon = document.getElementById('map-icon');
        const infoIcon = document.getElementById('info-icon');

        if (protipsSection.style.display === 'block') {
         
            protipsHeader.style.display = 'none';
            protipsSection.style.display = 'none';
            protipsHeader.classList.remove('active');

            filterHeader.style.display = 'block';
            filterSection.style.display = 'block';
            emergencyHeader.style.display = 'block';
            shelterHeader.style.display = 'block';
            filterHeader.classList.add('active');

          
            infoIcon.classList.remove('active');
            mapIcon.classList.add('active');

           
            body.classList.remove('sidebar-collapsed');
        } else {
           
            toggleSidebar();
        }

      
        setTimeout(() => {
            if (window.map) {
                window.map.invalidateSize();
            }
        }, 300);
    });
}


function initializeMapAuthorities() {
   
    window.map = initializeMap();
    
    
    createLegend(window.map);
    initializeSidebar();
    setupFilters();
    setupLogout();
    setupSidebarControls();
    setupInfoIcon();
    setupMapIcon();
    
    
    handleMobileLayout();
    window.addEventListener('resize', handleMobileLayout);
}


document.addEventListener('DOMContentLoaded', function() {
    initializeMapAuthorities();
});


window.changeTip = changeTip; 