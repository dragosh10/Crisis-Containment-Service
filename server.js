const http = require('http');
const fs = require('fs');
const path = require('path');
const earthquakeApi = require('./earthquakeApi');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'sarah',
  database: 'web',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});
module.exports = db;

const PORT = 3000;

const server = http.createServer((req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') {
  res.writeHead(204);
  res.end();
  return;
}
    if (req.method === 'GET' && req.url === '/earthquakes') {
        earthquakeApi.getEarthquakeData((data, error) => {
            if (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch earthquake data' }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            }
        });
        return; 
    }

    if (req.method === 'GET' && req.url === '/floods') {
      
        const https = require('https');
        
        const apiUrl = 'https://environment.data.gov.uk/flood-monitoring/id/floods';
        
        https.get(apiUrl, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    const floodData = JSON.parse(data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(floodData));
                } catch (error) {
                    console.error('Error parsing flood data:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to parse flood data' }));
                }
            });
        }).on('error', (error) => {
            console.error('Error fetching flood data:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch flood data from API' }));
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/calamities') {
        db.query('SELECT * FROM calamities')
            .then(([rows, fields]) => {
                function formatDateTime(date) {
                    if (!date) return null;
                    const d = new Date(date);
                    const pad = n => n < 10 ? '0' + n : n;
                    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                }
                rows.forEach(row => {
                    if (row.startdate) row.startdate = formatDateTime(row.startdate);
                    if (row.enddate) row.enddate = formatDateTime(row.enddate);
                    if (row.added_at) row.added_at = formatDateTime(row.added_at);
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows));
            })
            .catch(err => {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }
    if (req.method === 'POST' && req.url === '/calamities') {
        console.log('Received POST request to /calamities');
        console.log('Headers:', req.headers);
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            console.log('Raw body:', body);
            if (!body) {
              console.log('Empty body received');
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Empty request body' }));
              return;
            }
            const data = JSON.parse(body);
            console.log('Parsed data:', data);
            const { lat, lng, type, description, county, town, startdate, enddate, gravity, country } = data;
      
            if (!type) {
              console.log('Missing required fields:', { lat, lng, type, description, county, town, startdate, enddate, gravity, country });
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }
      
         
            const now = new Date();
            const added_at = now.toISOString().slice(0, 19).replace('T', ' '); 
      
            console.log('Inserting into database:', { lat, lng, type, description, county, town, startdate, enddate, gravity, country, added_at });
            const [result] = await db.query(
              `INSERT INTO calamities
              (lat, lng, type, description, county, town, startdate, enddate, gravity, country, added_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                lat || null,
                lng || null,
                type,
                description || null,
                county || null,
                town || null,
                startdate || null,
                enddate || null,
                gravity || null,
                country || null,
                added_at
              ]
            );
      
            res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ message: 'Calamity added', id: result.insertId }));
          } catch (err) {
            console.error('Error details:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to process request: ' + err.message }));
          }
        });
        return;
      }
    if (req.method === 'DELETE' && req.url.startsWith('/calamities/')) {
        const id = req.url.split('/').pop();
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing id' }));
            return;
        }
        try {
            db.query('DELETE FROM calamities WHERE id = ?', [id])
                .then(([result]) => {
                    if (result.affectedRows === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Calamity not found' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ message: 'Calamity deleted successfully' }));
                    }
                })
                .catch(err => {
                    console.error('Delete calamity error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Failed to delete calamity: ' + err.message }));
                });
        } catch (err) {
            console.error('Delete calamity error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to delete calamity: ' + err.message }));
        }
        return;
    }
    if (req.method === 'GET' && req.url.startsWith('/authority-app')) {
        let filePath = '.' + req.url;
        if (filePath === './authority-app' || filePath === './authority-app/') {
            filePath = './authority-app/index.html';
        }
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
          
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
        return;
    }

    if (req.method === 'GET' && req.url.startsWith('/dashboard-autoritati')) {
        let filePath = '.' + req.url;
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
        return;
    }

    
    if (req.method === 'GET' && req.url === '/shelters') {
        db.query('SELECT * FROM shelters')
            .then(([rows, fields]) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows));
            })
            .catch(err => {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }

   
    if (req.method === 'POST' && req.url === '/shelters') {
        console.log('Received POST request to /shelters');
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });
        req.on('end', async () => {
            try {
                console.log('Raw body:', body);
                if (!body) {
                    console.log('Empty body received');
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Empty request body' }));
                    return;
                }
                const data = JSON.parse(body);
                console.log('Parsed shelter data:', data);
                const { lat, lng, id_calamity, type_shelter, permanent, description, calamity_type } = data;

                if (!lat || !lng || !type_shelter) {
                    console.log('Missing required fields:', { lat, lng, type_shelter });
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required fields: lat, lng, type_shelter' }));
                    return;
                }

                console.log('Inserting shelter into database:', { lat, lng, id_calamity, type_shelter, permanent, description, calamity_type });
                const [result] = await db.query(
                    `INSERT INTO shelters (lat, lng, id_calamity, type_shelter, permanent, description, calamity_type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [lat, lng, id_calamity || null, type_shelter, permanent || false, description || null, calamity_type || null]
                );

                res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Shelter added successfully', id: result.insertId }));
            } catch (err) {
                console.error('Error details:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to process request: ' + err.message }));
            }
        });
        return;
    }

   
    if (req.method === 'DELETE' && req.url.startsWith('/shelters/')) {
        const id = req.url.split('/').pop();
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing shelter id' }));
            return;
        }
        try {
            db.query('DELETE FROM shelters WHERE id = ?', [id])
                .then(([result]) => {
                    if (result.affectedRows === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Shelter not found' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ message: 'Shelter deleted successfully' }));
                    }
                })
                .catch(err => {
                    console.error('Delete shelter error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Failed to delete shelter: ' + err.message }));
                });
        } catch (err) {
            console.error('Delete shelter error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to delete shelter: ' + err.message }));
        }
        return;
    }

   
    if (req.method === 'GET' && req.url === '/calamities_c') {
        db.query('SELECT * FROM calamities')
            .then(([rows, fields]) => {
                function formatDateTime(date) {
                    if (!date) return null;
                    const d = new Date(date);
                    const pad = n => n < 10 ? '0' + n : n;
                    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                }
                rows.forEach(row => {
                    if (row.startdate) row.startdate = formatDateTime(row.startdate);
                    if (row.enddate) row.enddate = formatDateTime(row.enddate);
                    if (row.added_at) row.added_at = formatDateTime(row.added_at);
                });
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(rows));
            })
            .catch(err => {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }

    
    if (req.method === 'GET' && req.url === '/shelters_c') {
        db.query('SELECT * FROM shelters')
            .then(([rows, fields]) => {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(rows));
            })
            .catch(err => {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }

    //client zone si pins 
    if (req.method === 'GET' && req.url.startsWith('/client-zone/')) {
        const clientId = req.url.split('/').pop();
        if (!clientId) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing client id' }));
            return;
        }
        
        db.query('SELECT * FROM clientZone WHERE id_client = ?', [clientId])
            .then(([rows, fields]) => {
                const zoneData = rows.length > 0 ? rows[0] : null;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(zoneData));
            })
            .catch(err => {
                console.error('Error fetching client zone:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }

    
    if (req.method === 'POST' && req.url === '/client-zone') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id_client, Country, County, Town } = data;

                if (!id_client || !Country) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required fields: id_client, Country' }));
                    return;
                }

                
                const [existing] = await db.query('SELECT id FROM clientZone WHERE id_client = ?', [id_client]);
                
                if (existing.length > 0) {
                   
                    await db.query(
                        'UPDATE clientZone SET Country = ?, County = ?, Town = ? WHERE id_client = ?',
                        [Country, County || null, Town || null, id_client]
                    );
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Zone updated successfully' }));
                } else {
                   
                    const [result] = await db.query(
                        'INSERT INTO clientZone (id_client, Country, County, Town) VALUES (?, ?, ?, ?)',
                        [id_client, Country, County || null, Town || null]
                    );
                    res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Zone created successfully', id: result.insertId }));
                }
            } catch (err) {
                console.error('Error saving client zone:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to save zone: ' + err.message }));
            }
        });
        return;
    }

    
    if (req.method === 'GET' && req.url.startsWith('/client-pins/')) {
        const clientId = req.url.split('/').pop();
        if (!clientId) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing client id' }));
            return;
        }
        
        db.query('SELECT * FROM clientPins WHERE id_client = ?', [clientId])
            .then(([rows, fields]) => {
                const pinsData = rows.length > 0 ? rows[0] : null;
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(pinsData));
            })
            .catch(err => {
                console.error('Error fetching client pins:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Database error' }));
            });
        return;
    }

   
    if (req.method === 'POST' && req.url === '/client-pins') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id_client, pin_slot, lat, lng, name } = data;

                if (!id_client || !pin_slot || lat === undefined || lng === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required fields: id_client, pin_slot, lat, lng' }));
                    return;
                }

                if (pin_slot < 1 || pin_slot > 3) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Pin slot must be between 1 and 3' }));
                    return;
                }

             
                const [existing] = await db.query('SELECT id FROM clientPins WHERE id_client = ?', [id_client]);
                
                const latField = `pin${pin_slot}_lat`;
                const lngField = `pin${pin_slot}_lng`;
                const nameField = `pin${pin_slot}_name`;

                if (existing.length > 0) {
                   
                    await db.query(
                        `UPDATE clientPins SET ${latField} = ?, ${lngField} = ?, ${nameField} = ? WHERE id_client = ?`,
                        [lat, lng, name || `Pin ${pin_slot}`, id_client]
                    );
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Pin updated successfully' }));
                } else {
                    
                    const insertData = {
                        id_client: id_client,
                        pin1_lat: pin_slot === 1 ? lat : null,
                        pin1_lng: pin_slot === 1 ? lng : null,
                        pin1_name: pin_slot === 1 ? (name || 'Pin 1') : null,
                        pin2_lat: pin_slot === 2 ? lat : null,
                        pin2_lng: pin_slot === 2 ? lng : null,
                        pin2_name: pin_slot === 2 ? (name || 'Pin 2') : null,
                        pin3_lat: pin_slot === 3 ? lat : null,
                        pin3_lng: pin_slot === 3 ? lng : null,
                        pin3_name: pin_slot === 3 ? (name || 'Pin 3') : null
                    };

                    const [result] = await db.query(
                        'INSERT INTO clientPins (id_client, pin1_lat, pin1_lng, pin1_name, pin2_lat, pin2_lng, pin2_name, pin3_lat, pin3_lng, pin3_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [insertData.id_client, insertData.pin1_lat, insertData.pin1_lng, insertData.pin1_name, 
                         insertData.pin2_lat, insertData.pin2_lng, insertData.pin2_name,
                         insertData.pin3_lat, insertData.pin3_lng, insertData.pin3_name]
                    );
                    res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Pin created successfully', id: result.insertId }));
                }
            } catch (err) {
                console.error('Error saving client pin:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to save pin: ' + err.message }));
            }
        });
        return;
    }

  
    if (req.method === 'DELETE' && req.url === '/client-pins') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id_client, pin_slot } = data;

                if (!id_client || !pin_slot) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required fields: id_client, pin_slot' }));
                    return;
                }

                if (pin_slot < 1 || pin_slot > 3) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Pin slot must be between 1 and 3' }));
                    return;
                }

                const latField = `pin${pin_slot}_lat`;
                const lngField = `pin${pin_slot}_lng`;
                const nameField = `pin${pin_slot}_name`;

                const [result] = await db.query(
                    `UPDATE clientPins SET ${latField} = NULL, ${lngField} = NULL, ${nameField} = NULL WHERE id_client = ?`,
                    [id_client]
                );

                if (result.affectedRows === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Client pins record not found' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Pin deleted successfully' }));
                }
            } catch (err) {
                console.error('Error deleting client pin:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to delete pin: ' + err.message }));
            }
        });
        return;
    }

    if (req.method === 'GET') {
        let filePath = '.' + req.url;
        if (filePath === './') {
            filePath = './index.html';
        }

        const extname = path.extname(filePath);
        let contentType = 'text/html';

        switch (extname) {
            case '.css':
                contentType = 'text/css';
                break;
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    fs.readFile('./404.html', (err404, data404) => {
                        if (err404) {
                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('404 Not Found');
                        } else {
                            res.writeHead(404, { 'Content-Type': 'text/html' });
                            res.end(data404);
                        }
                    });
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('405 Method Not Allowed');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


