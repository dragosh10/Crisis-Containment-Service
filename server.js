const http = require('http');
const fs = require('fs');
const path = require('path');
const earthquakeApi = require('./earthquakeApi');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'SarahDaniel11.',
  database: 'calamities',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});
module.exports = db;

const PORT = 3000;

const server = http.createServer((req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    if (req.method === 'GET' && req.url === '/calamities') {
        db.query('SELECT * FROM calamities')
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
    if (req.method === 'POST' && req.url === '/calamities') {
        console.log('Received POST request to /calamities');  // Debug log
        let body = '';
        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', async () => {
            try {
                console.log('Received body:', body);  // Debug log
                const data = JSON.parse(body);
                console.log('Parsed data:', data);  // Debug log
                const { lat, lng, type, description } = data;

                if (lat === undefined || lat === null || lng === undefined || lng === null || !type) {
                    console.log('Missing required fields:', { lat, lng, type });  // Debug log
                    res.writeHead(400, { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ error: 'Missing required fields' }));
                    return;
                }

                console.log('Inserting into database:', { lat, lng, type, description });  // Debug log
                const [result] = await db.query(
                    'INSERT INTO calamities (lat, lng, type, description) VALUES (?, ?, ?, ?)',
                    [lat, lng, type, description || null]
                );

                console.log('Database result:', result);  // Debug log
                res.writeHead(201, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ message: 'Calamity added', id: result.insertId }));
            } catch (err) {
                console.error('Error details:', err);  // Debug log
                res.writeHead(500, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: 'Failed to insert calamity: ' + err.message }));
            }
        });

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
            // add other cases as needed
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
