const { create } = require('xmlbuilder2');
const fs = require('fs');


function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}


function generateCapAlerts(calamity, clients) {
   
    if (!fs.existsSync('./alerts')) fs.mkdirSync('./alerts');
    const affected = [];
    for (const client of clients) {
        for (const pin of client.pins) {
            const dist = haversine(calamity.lat, calamity.lon, pin.lat, pin.lon);
            if (dist <= 30) {
                affected.push({ userId: client.userId, pin, dist });
                break; 
            }
        }
    }
   
    for (const entry of affected) {
        const xmlObj = {
            alert: {
                '@xmlns': 'urn:oasis:names:tc:emergency:cap:1.2',
                identifier: `cri-${Date.now()}-${entry.userId}`,
                sender: 'cri@cri.com',
                sent: new Date().toISOString(),
                status: 'Actual',
                msgType: 'Alert',
                scope: 'Public',
                info: {
                    category: 'Met',
                    event: calamity.event,
                    urgency: calamity.urgency,
                    severity: calamity.severity,
                    certainty: calamity.certainty,
                    instruction: calamity.instruction,
                    area: {
                        areaDesc: calamity.areaDesc,
                        circle: `${calamity.lat},${calamity.lon} 30`,
                        polygon: undefined,
                        geocode: undefined,
                       
                        pin: `${entry.pin.lat},${entry.pin.lon}`
                    }
                }
            }
        };
        const xml = create(xmlObj).end({ prettyPrint: true });
        const fileName = `cap_alert_user_${entry.userId}.xml`;
        fs.writeFileSync(`./alerts/${fileName}`, xml);
        console.log(`Alertă CAP generată pentru user ${entry.userId}: ./alerts/${fileName}`);
    }
}


if (require.main === module) {
   
    if (!fs.existsSync('./alerts')) fs.mkdirSync('./alerts');
    const calamity = {
        event: 'Earthquake',
        urgency: 'Immediate',
        severity: 'Severe',
        certainty: 'Observed',
        instruction: 'Evacuați zona afectată!',
        areaDesc: 'București și împrejurimi',
        lat: 44.4268,
        lon: 26.1025
    };
    const clients = [
        { userId: 1, pins: [ { lat: 44.43, lon: 26.10, name: 'Acasă' }, { lat: 45, lon: 27, name: 'Serviciu' } ] },
        { userId: 2, pins: [ { lat: 46, lon: 25, name: 'Acasă' } ] },
        { userId: 3, pins: [ { lat: 44.5, lon: 26.1, name: 'Acasă' } ] }
    ];
    generateCapAlerts(calamity, clients);
}

module.exports = generateCapAlerts; 