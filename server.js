const http = require('http');
const fs = require('fs');
const path = require('path');
const earthquakeApi = require('./earthquakeApi');
const mysql = require('mysql2/promise');

//SQL injection

function validateInput(input, type = 'general') {
    if (typeof input !== 'string') {
        return input;
    }
    
   
    const sqlPatterns = [
        /(\bOR\b.*\b=\b)/i,
        /(\bAND\b.*\b=\b)/i,
        /\bUNION\b.*\bSELECT\b/i,
        /\bDROP\b.*\bTABLE\b/i,
        /\bDELETE\b.*\bFROM\b/i,
        /\bINSERT\b.*\bINTO\b/i,
        /\bUPDATE\b.*\bSET\b/i,
        /--/,
        /\/\*.*\*\//,
        /;.*$/,
        /'\s*OR\s*'.*'=/i,
        /'\s*AND\s*'.*'=/i
    ];
    
    
    const xssPatterns = [
        /<script/i,
        /<iframe/i,
        /javascript:/i,
        /vbscript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
        /onclick\s*=/i,
        /onmouseover\s*=/i,
        /<img[^>]+src[^>]*>/i,
        /<svg/i,
        /eval\s*\(/i,
        /alert\s*\(/i,
        /document\.cookie/i,
        /document\.write/i
    ];
    
 
    for (let pattern of sqlPatterns) {
        if (pattern.test(input)) {
            throw new Error('Potentially dangerous SQL pattern detected');
        }
    }
    
    for (let pattern of xssPatterns) {
        if (pattern.test(input)) {
            throw new Error('Potentially dangerous XSS pattern detected');
        }
    }
    
    return input;
}

function sanitizeInput(input, type = 'general') {
    if (typeof input !== 'string') {
        return input;
    }
    
    let sanitized = input;
    
   
    sanitized = sanitized
        .replace(/[<>]/g, '') 
        .replace(/['"`]/g, '') 
        .replace(/[;&|]/g, '') 
        .replace(/--/g, '') 
        .replace(/\/\*/g, '') 
        .replace(/\*\//g, ''); 
    
   
    switch (type) {
        case 'zone':
           
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.,]/g, '');
            break;
        case 'pinName':
           
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.,!]/g, '');
            break;
        case 'numeric':
         
            sanitized = sanitized.replace(/[^0-9.\-]/g, '');
            break;
    }
    
    return sanitized.trim();
}

function validateNumeric(value, min = null, max = null) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        throw new Error('Invalid numeric value');
    }
    
    if (min !== null && num < min) {
        throw new Error(`Value must be at least ${min}`);
    }
    
    if (max !== null && num > max) {
        throw new Error(`Value must be at most ${max}`);
    }
    
    return num;
}



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
      
            // Validate required fields
            if (!type) {
              console.log('Missing required fields:', { lat, lng, type, description, county, town, startdate, enddate, gravity, country });
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }

            // Apply security validation and sanitization for authorities
            let secureLat = null;
            let secureLng = null;
            let secureType = null;
            let secureDescription = null;
            let secureCounty = null;
            let secureTown = null;
            let secureGravity = null;
            let secureCountry = null;

            // Validate and sanitize coordinates
            if (lat !== null && lat !== undefined) {
                secureLat = validateNumeric(lat, -90, 90);
                if (secureLat === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Invalid latitude value' }));
                    return;
                }
            }

            if (lng !== null && lng !== undefined) {
                secureLng = validateNumeric(lng, -180, 180);
                if (secureLng === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Invalid longitude value' }));
                    return;
                }
            }

            // Validate and sanitize type (required)
            if (!type || typeof type !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Type is required and must be a string' }));
                return;
            }
            secureType = sanitizeInput(validateInput(type.trim(), 'general'), 'general');
            if (!secureType || secureType.length < 1 || secureType.length > 50) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Type must be between 1 and 50 characters' }));
                return;
            }

            // Validate and sanitize description (optional)
            if (description && typeof description === 'string' && description.trim().length > 0) {
                secureDescription = sanitizeInput(validateInput(description.trim(), 'general'), 'general');
                if (secureDescription.length > 250) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Description must not exceed 250 characters' }));
                    return;
                }
            }

            // Validate and sanitize zone fields (optional)
            if (county && typeof county === 'string' && county.trim().length > 0) {
                secureCounty = sanitizeInput(validateInput(county.trim(), 'zone'), 'zone');
                if (secureCounty.length > 50) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'County must not exceed 50 characters' }));
                    return;
                }
            }

            if (town && typeof town === 'string' && town.trim().length > 0) {
                secureTown = sanitizeInput(validateInput(town.trim(), 'zone'), 'zone');
                if (secureTown.length > 50) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Town must not exceed 50 characters' }));
                    return;
                }
            }

            if (country && typeof country === 'string' && country.trim().length > 0) {
                secureCountry = sanitizeInput(validateInput(country.trim(), 'zone'), 'zone');
                if (secureCountry.length > 50) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Country must not exceed 50 characters' }));
                    return;
                }
            }

            // Validate gravity (optional)
            if (gravity !== null && gravity !== undefined && gravity !== '') {
                const validGravityLevels = ['low', 'medium', 'high'];
                if (typeof gravity !== 'string' || !validGravityLevels.includes(gravity.toLowerCase())) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Gravity must be one of: low, medium, high' }));
                    return;
                }
                secureGravity = sanitizeInput(validateInput(gravity.trim().toLowerCase(), 'general'), 'general');
            }
      
            const now = new Date();
            const added_at = now.toISOString().slice(0, 19).replace('T', ' ');
            
            console.log('Inserting into database with security validation:', { 
                lat: secureLat, lng: secureLng, type: secureType, description: secureDescription, 
                county: secureCounty, town: secureTown, startdate, enddate, gravity: secureGravity, 
                country: secureCountry, added_at 
            });
            
            const [result] = await db.query(
              `INSERT INTO calamities
              (lat, lng, type, description, county, town, startdate, enddate, gravity, country, added_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                secureLat || null,
                secureLng || null,
                secureType,
                secureDescription || null,
                secureCounty || null,
                secureTown || null,
                startdate || null,
                enddate || null,
                secureGravity || null,
                secureCountry || null,
                added_at
              ]
            );
      
            res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ message: 'Calamity added', id: result.insertId }));
          } catch (err) {
            console.error('Error details:', err.message);
            console.error('Error stack:', err.stack);
            console.error('Received data:', data);
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

        // Apply security validation for DELETE operations
        try {
            const secureId = validateNumeric(id, 1, 999999);
            if (secureId === undefined) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Invalid calamity ID' }));
                return;
            }

            db.query('DELETE FROM calamities WHERE id = ?', [secureId])
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
                    res.end(JSON.stringify({ error: 'Failed to delete calamity: Security validation failed' }));
                });
        } catch (err) {
            console.error('Delete calamity error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to delete calamity: Security validation failed' }));
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

                // Validate required fields
                if (!lat || !lng || !type_shelter) {
                    console.log('Missing required fields:', { lat, lng, type_shelter });
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required fields: lat, lng, type_shelter' }));
                    return;
                }

                // Apply security validation and sanitization for shelters
                let secureLat = null;
                let secureLng = null;
                let secureIdCalamity = null;
                let secureTypeShelter = null;
                let secureDescription = null;
                let secureCalamityType = null;

                // Validate and sanitize coordinates (required)
                secureLat = validateNumeric(lat, -90, 90);
                if (secureLat === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Invalid latitude value' }));
                    return;
                }

                secureLng = validateNumeric(lng, -180, 180);
                if (secureLng === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Invalid longitude value' }));
                    return;
                }

                // Validate and sanitize type_shelter (required)
                if (!type_shelter || typeof type_shelter !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Shelter type is required and must be a string' }));
                    return;
                }
                secureTypeShelter = sanitizeInput(validateInput(type_shelter.trim(), 'general'), 'general');
                if (!secureTypeShelter || secureTypeShelter.length < 1 || secureTypeShelter.length > 50) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Shelter type must be between 1 and 50 characters' }));
                    return;
                }

                // Validate and sanitize id_calamity (optional)
                if (id_calamity !== null && id_calamity !== undefined) {
                    secureIdCalamity = validateNumeric(id_calamity, 1, 999999);
                    if (secureIdCalamity === undefined) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Invalid calamity ID' }));
                        return;
                    }
                }

                // Validate and sanitize description (optional)
                if (description && typeof description === 'string' && description.trim().length > 0) {
                    secureDescription = sanitizeInput(validateInput(description.trim(), 'general'), 'general');
                    if (secureDescription.length > 250) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Description must not exceed 250 characters' }));
                        return;
                    }
                }

                // Validate and sanitize calamity_type (optional)
                if (calamity_type && typeof calamity_type === 'string' && calamity_type.trim().length > 0) {
                    secureCalamityType = sanitizeInput(validateInput(calamity_type.trim(), 'general'), 'general');
                    if (secureCalamityType.length > 50) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Calamity type must not exceed 50 characters' }));
                        return;
                    }
                }

                console.log('Inserting shelter into database with security validation:', { 
                    lat: secureLat, lng: secureLng, id_calamity: secureIdCalamity, 
                    type_shelter: secureTypeShelter, permanent, description: secureDescription, 
                    calamity_type: secureCalamityType 
                });

                const [result] = await db.query(
                    `INSERT INTO shelters (lat, lng, id_calamity, type_shelter, permanent, description, calamity_type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [secureLat, secureLng, secureIdCalamity || null, secureTypeShelter, permanent || false, secureDescription || null, secureCalamityType || null]
                );

                res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Shelter added successfully', id: result.insertId }));
            } catch (err) {
                console.error('Error details:', err.message);
                console.error('Error stack:', err.stack);
                console.error('Received shelter data:', data);
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

        // Apply security validation for DELETE operations
        try {
            const secureId = validateNumeric(id, 1, 999999);
            if (secureId === undefined) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Invalid shelter ID' }));
                return;
            }

            db.query('DELETE FROM shelters WHERE id = ?', [secureId])
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
                    res.end(JSON.stringify({ error: 'Failed to delete shelter: Security validation failed' }));
                });
        } catch (err) {
            console.error('Delete shelter error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to delete shelter: Security validation failed' }));
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

                 
                const validatedClientId = validateNumeric(id_client, 1, 999999);
                
               
                let secureCountry = null;
                let secureCounty = null;
                let secureTown = null;
                
                
                if (Country && typeof Country === 'string' && Country.trim().length > 0) {
                    secureCountry = sanitizeInput(validateInput(Country.trim(), 'zone'), 'zone');
                }
                
                if (County && typeof County === 'string' && County.trim().length > 0) {
                    secureCounty = sanitizeInput(validateInput(County.trim(), 'zone'), 'zone');
                }
                
                if (Town && typeof Town === 'string' && Town.trim().length > 0) {
                    secureTown = sanitizeInput(validateInput(Town.trim(), 'zone'), 'zone');
                }
                
               
                if (secureCountry && (secureCountry.length < 2 || secureCountry.length > 50)) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Country must be between 2 and 50 characters if provided' }));
                    return;
                }
                
               
                if (secureCounty && (secureCounty.length < 2 || secureCounty.length > 50)) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'County must be between 2 and 50 characters if provided' }));
                    return;
                }
                
               
                if (secureTown && (secureTown.length < 2 || secureTown.length > 50)) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Town must be between 2 and 50 characters if provided' }));
                    return;
                }

             
                const [existing] = await db.query('SELECT id FROM clientZone WHERE id_client = ?', [validatedClientId]);
                
                if (existing.length > 0) {
                  
                    await db.query(
                        'UPDATE clientZone SET Country = ?, County = ?, Town = ? WHERE id_client = ?',
                        [secureCountry, secureCounty, secureTown, validatedClientId]
                    );
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Zone updated successfully' }));
                } else {
                    
                    const [result] = await db.query(
                        'INSERT INTO clientZone (id_client, Country, County, Town) VALUES (?, ?, ?, ?)',
                        [validatedClientId, secureCountry, secureCounty, secureTown]
                    );
                    res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Zone created successfully', id: result.insertId }));
                }
            } catch (err) {
                console.error('Error saving client zone:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to save zone: Security validation failed' }));
            }
        });
        return;
    }

 
    if (req.method === 'POST' && req.url === '/client-zone/ensure') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id_client } = data;

                if (!id_client) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required field: id_client' }));
                    return;
                }

          
                const [existing] = await db.query('SELECT id FROM clientZone WHERE id_client = ?', [id_client]);
                
                if (existing.length === 0) {
                   
                    const [result] = await db.query(
                        'INSERT INTO clientZone (id_client, Country, County, Town) VALUES (?, NULL, NULL, NULL)',
                        [id_client]
                    );
                    console.log(`Created empty zone record for client ${id_client}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Client zone record ensured' }));
            } catch (err) {
                console.error('Error ensuring client zone:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to ensure zone: ' + err.message }));
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

                // Validate and sanitize all inputs
                const validatedClientId = validateNumeric(id_client, 1, 999999);
                const validatedPinSlot = validateNumeric(pin_slot, 1, 3);
                const validatedLat = validateNumeric(lat, -90, 90);
                const validatedLng = validateNumeric(lng, -180, 180);

                if (!validatedClientId || !validatedPinSlot || validatedLat === undefined || validatedLng === undefined) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing or invalid required fields: id_client, pin_slot, lat, lng' }));
                    return;
                }

              
                let secureName = null;
                if (name) {
                    secureName = sanitizeInput(validateInput(name, 'pinName'), 'pinName');
                    if (secureName.length < 1 || secureName.length > 15) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ error: 'Pin name must be between 1 and 15 characters' }));
                        return;
                    }
                } else {
                    secureName = `Pin ${validatedPinSlot}`;
                }

               
                const [existing] = await db.query('SELECT id FROM clientPins WHERE id_client = ?', [validatedClientId]);
                
                const latField = `pin${validatedPinSlot}_lat`;
                const lngField = `pin${validatedPinSlot}_lng`;
                const nameField = `pin${validatedPinSlot}_name`;

                if (existing.length > 0) {
                 
                    await db.query(
                        `UPDATE clientPins SET ${latField} = ?, ${lngField} = ?, ${nameField} = ? WHERE id_client = ?`,
                        [validatedLat, validatedLng, secureName, validatedClientId]
                    );
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ message: 'Pin updated successfully' }));
                } else {
                   
                    const insertData = {
                        id_client: validatedClientId,
                        pin1_lat: validatedPinSlot === 1 ? validatedLat : null,
                        pin1_lng: validatedPinSlot === 1 ? validatedLng : null,
                        pin1_name: validatedPinSlot === 1 ? secureName : null,
                        pin2_lat: validatedPinSlot === 2 ? validatedLat : null,
                        pin2_lng: validatedPinSlot === 2 ? validatedLng : null,
                        pin2_name: validatedPinSlot === 2 ? secureName : null,
                        pin3_lat: validatedPinSlot === 3 ? validatedLat : null,
                        pin3_lng: validatedPinSlot === 3 ? validatedLng : null,
                        pin3_name: validatedPinSlot === 3 ? secureName : null
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
                res.end(JSON.stringify({ error: 'Failed to save pin: Security validation failed' }));
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

    
    if (req.method === 'POST' && req.url === '/client-pins/ensure') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { id_client } = data;

                if (!id_client) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Missing required field: id_client' }));
                    return;
                }

               
                const [existing] = await db.query('SELECT id FROM clientPins WHERE id_client = ?', [id_client]);
                
                if (existing.length === 0) {
                  
                    const [result] = await db.query(
                        'INSERT INTO clientPins (id_client, pin1_lat, pin1_lng, pin1_name, pin2_lat, pin2_lng, pin2_name, pin3_lat, pin3_lng, pin3_name) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)',
                        [id_client]
                    );
                    console.log(`Created empty pins record for client ${id_client}`);
                }

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ message: 'Client pins record ensured' }));
            } catch (err) {
                console.error('Error ensuring client pins:', err);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Failed to ensure pins: ' + err.message }));
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


