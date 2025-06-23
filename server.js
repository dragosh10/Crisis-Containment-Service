const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const bcrypt = require('bcrypt');
const earthquakeApi = require('./earthquakeApi');
const mysql = require('mysql2/promise');

const saltRounds = 10;

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

// Helper function to parse cookies
const getCookies = (cookieString) => {
    if (!cookieString) return {};
    return cookieString.split(';')
        .map(cookie => cookie.trim().split('='))
        .reduce((cookies, [key, value]) => ({
            ...cookies,
            [key]: value
        }), {});
};

// Authentication middleware
const requireAuth = async (req, res) => {
    const cookies = getCookies(req.headers.cookie);
    if (!cookies.userEmail) {
        return null; // Not authenticated
    }
    
    try {
        const [result] = await db.query(
            'SELECT id, email, is_authority FROM users WHERE email = ?',
            [cookies.userEmail]
        );
        
        if (result.length > 0) {
            return result[0]; // Return user data
        }
        return null; // User not found
    } catch (error) {
        console.error('Auth error:', error);
        return null;
    }
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath = parsedUrl.pathname;
    
    // Debug logging
    console.log(`${req.method} ${filePath}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Authentication routes
    if (req.method === 'POST' && filePath === '/api/signup') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());

        req.on('end', async () => {
            try {
                const { email, password } = JSON.parse(body);

                const [existingUser] = await db.query(
                    'SELECT * FROM users WHERE email = ?',
                    [email]
                );

                if (existingUser.length > 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Acest email este deja înregistrat!' }));
                    return;
                }

                const hashedPassword = await bcrypt.hash(password, saltRounds);
                const isAuthority = email.toLowerCase().endsWith('@cri.com');

                await db.query(
                    'INSERT INTO users (email, password, is_authority) VALUES (?, ?, ?)',
                    [email, hashedPassword, isAuthority]
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Cont creat cu succes!' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && filePath === '/api/login') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());

        req.on('end', async () => {
            try {
                const { email, password } = JSON.parse(body);

                const [result] = await db.query(
                    'SELECT * FROM users WHERE email = ?',
                    [email]
                );

                if (result.length > 0) {
                    const match = await bcrypt.compare(password, result[0].password);
                    if (match) {
                        const cookieExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Set-Cookie': `userEmail=${email}; expires=${cookieExpiry.toUTCString()}; path=/`
                        });
                        res.end(JSON.stringify({ success: true, isAuthority: result[0].is_authority }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Email sau parolă incorectă!' }));
                    }
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Email sau parolă incorectă!' }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    if (req.method === 'POST' && filePath === '/api/logout') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'userEmail=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // GET logout route for easy access
    if (req.method === 'GET' && filePath === '/logout') {
        res.writeHead(302, {
            'Location': '/',
            'Set-Cookie': 'userEmail=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        });
        res.end();
        return;
    }

    // API endpoint to get current user info
    if (req.method === 'GET' && filePath === '/api/user') {
        console.log('API /api/user endpoint accessed');
        const cookies = getCookies(req.headers.cookie);
        console.log('Cookies for /api/user:', cookies);
        if (!cookies.userEmail) {
            console.log('No userEmail cookie found');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
            return;
        }

        try {
            const [result] = await db.query(
                'SELECT id, email, is_authority FROM users WHERE email = ?',
                [cookies.userEmail]
            );

            if (result.length > 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    user: {
                        id: result[0].id,
                        email: result[0].email,
                        is_authority: result[0].is_authority
                    }
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'User not found' }));
            }
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: error.message }));
        }
        return;
    }

    // Root route - serve index.html and handle redirects based on login status
    if (filePath === '/') {
        const cookies = getCookies(req.headers.cookie);
        console.log('Root route accessed. Cookies:', cookies);
        if (cookies.userEmail) {
            console.log('User is logged in with email:', cookies.userEmail);
            try {
                const [result] = await db.query(
                    'SELECT is_authority FROM users WHERE email = ?',
                    [cookies.userEmail]
                );

                if (result.length > 0 && result[0].is_authority) {
                    res.writeHead(302, { 'Location': '/dashboard-autoritati/Dashboard/pages/map-authorities.html' });
                } else {
                    res.writeHead(302, { 'Location': '/dashboard-client/Dashboard/pages/map-client.html' });
                }
                res.end();
                return;
            } catch (error) {
                res.writeHead(302, { 'Location': '/dashboard-client/Dashboard/pages/map-client.html' });
                res.end();
                return;
            }
        } else {
            // User not logged in - serve the main landing page
            console.log('User not logged in - serving index.html');
            fs.readFile('./public/views/index.html', (err, data) => {
                if (err) {
                    console.log('Error reading index.html:', err);
                    res.writeHead(500);
                    res.end('Error loading page');
                    return;
                }
                console.log('Successfully serving index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
            return;
        }
    }
    if (req.method === 'GET' && req.url === '/earthquakes') {
        // Require authentication for earthquake data
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
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
        // Require authentication for flood data
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
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
        // Require authentication for calamities data
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
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
        // Require authority authentication for adding calamities
        const user = await requireAuth(req, res);
        console.log('POST /calamities - User from requireAuth:', user);
        
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        console.log('User is_authority value:', user.is_authority);
        console.log('User is_authority type:', typeof user.is_authority);
        console.log('User is_authority === true:', user.is_authority === true);
        console.log('User is_authority === 1:', user.is_authority === 1);
        
        if (!user.is_authority) {
            console.log('Authority check failed for user:', user.email);
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authority access required' }));
            return;
        }
        
        console.log('Authority check passed for user:', user.email);
        
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
            const { lat, lng, type, description, startdate, enddate, gravity } = data;
      
            if (!type) {
              console.log('Missing required fields:', { lat, lng, type, description,  startdate, enddate, gravity });
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }
      
         
            const now = new Date();
            const added_at = now.toISOString().slice(0, 19).replace('T', ' '); 
      
            console.log('Inserting into database:', { lat, lng, type, description,  startdate, enddate, gravity, added_at });
            const [result] = await db.query(
              `INSERT INTO calamities
              (lat, lng, type, description, startdate, enddate, gravity, added_at)
              VALUES (?, ?, ?, ?, ?, ?, ?,  ?)`,
              [
                lat || null,
                lng || null,
                type,
                description || null,
                startdate || null,
                enddate || null,
                gravity || null,
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



    
    if (req.method === 'GET' && req.url === '/shelters') {
        // Require authentication for shelter data
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
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
        // Require authority authentication for adding shelters
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (!user.is_authority) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authority access required' }));
            return;
        }
        
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
        // Require authentication for client shelter data
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
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
   

    
   
    
    if (req.method === 'GET' && req.url.startsWith('/client-pins/')) {
        // Require client authentication
        const user = await requireAuth(req, res);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authentication required' }));
            return;
        }
        
        if (user.is_authority) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Client access only' }));
            return;
        }
        
        const clientId = req.url.split('/').pop();
        if (!clientId) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Missing client id' }));
            return;
        }
        
        // Ensure user can only access their own data
        if (parseInt(clientId) !== user.id) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Access denied - can only access your own data' }));
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

    // CRITICAL: Authentication check for dashboard routes - MUST come before ALL other static file serving
    if (filePath.startsWith('/dashboard-client/') || filePath.startsWith('/dashboard-autoritati/')) {
        console.log('Dashboard access attempt:', filePath);
        const cookies = getCookies(req.headers.cookie);
        console.log('Dashboard access cookies:', cookies);
        console.log('Raw cookie header:', req.headers.cookie);
        console.log('UserEmail cookie value:', cookies.userEmail);
        console.log('UserEmail cookie exists:', !!cookies.userEmail);
        
        if (!cookies.userEmail) {
            // User not logged in - redirect to login page instead of root
            console.log('Dashboard access denied - no authentication');
            res.writeHead(302, { 'Location': '/login.html' });
            res.end();
            return;
        }

        try {
            const [result] = await db.query(
                'SELECT is_authority FROM users WHERE email = ?',
                [cookies.userEmail]
            );

            if (result.length === 0) {
                // Invalid user - redirect to index
                console.log('Dashboard access denied - user not found');
                res.writeHead(302, { 'Location': '/' });
                res.end();
                return;
            }

            const isAuthority = result[0].is_authority;
            console.log('Dashboard access - user type:', isAuthority ? 'authority' : 'client');
            
            // Check if user is trying to access the wrong dashboard
            if (filePath.startsWith('/dashboard-autoritati/') && !isAuthority) {
                // Regular user trying to access authority dashboard - redirect to client dashboard
                console.log('Client user redirected from authority dashboard');
                res.writeHead(302, { 'Location': '/dashboard-client/Dashboard/pages/map-client.html' });
                res.end();
                return;
            }
            
            if (filePath.startsWith('/dashboard-client/') && isAuthority) {
                // Authority trying to access client dashboard - redirect to authority dashboard
                console.log('Authority user redirected from client dashboard');
                res.writeHead(302, { 'Location': '/dashboard-autoritati/Dashboard/pages/map-authorities.html' });
                res.end();
                return;
            }
            
            console.log('Dashboard access granted - serving file:', filePath);
           
            const dashboardFilePath = '.' + filePath;
            
            const extname = path.extname(dashboardFilePath);
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

            fs.readFile(dashboardFilePath, (err, data) => {
                if (err) {
                    console.error('Error serving dashboard file:', err);
                    res.writeHead(404);
                    res.end('Dashboard file not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
            return; 
            
        } catch (error) {
            
            console.log('Dashboard access denied - database error:', error);
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
        }
    }

    
    if (filePath === '/login.html') {
        fs.readFile('./public/views/login.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading login page');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    if (filePath === '/signup.html') {
        fs.readFile('./public/views/signup.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading signup page');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }



  
    if (filePath.startsWith('/css/') || filePath.startsWith('/js/') || filePath.startsWith('/images/')) {
        let assetPath = './public' + filePath;
        
        const extname = path.extname(assetPath);
        let contentType = 'text/plain';

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

        fs.readFile(assetPath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Asset not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    if (req.method === 'GET') {
        
        if (filePath.startsWith('/dashboard-client/') || filePath.startsWith('/dashboard-autoritati/')) {
            console.log('SECURITY WARNING: Dashboard file request bypassed authentication check!');
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
        }
        
        let staticFilePath = '.' + req.url;
        if (staticFilePath === './') {
            staticFilePath = './index.html';
        }

        const extname = path.extname(staticFilePath);
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

        fs.readFile(staticFilePath, (err, data) => {
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


