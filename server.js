const http = require('http');
const fs = require('fs');
const path = require('path');
const pool = require('./src/db/database');
const url = require('url');
const bcrypt = require('bcrypt');
const saltRounds = 10; // pentru criptarea parolei

// Funcție pentru parsarea cookie-urilor
const getCookies = (cookieString) => {
    if (!cookieString) return {};
    return cookieString.split(';')
        .map(cookie => cookie.trim().split('='))
        .reduce((cookies, [key, value]) => ({
            ...cookies,
            [key]: value
        }), {});
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath = parsedUrl.pathname;

    // Handle API endpoints
    // Handler pentru signup
    if (req.method === 'POST' && filePath === '/api/signup') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                console.log('Body received:', body);
                const { email, password } = JSON.parse(body);
                console.log('Attempting to create user:', email);
                
                // Verificăm dacă email-ul există deja
                const existingUser = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );

                if (existingUser.rows.length > 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Acest email este deja înregistrat!' 
                    }));
                    return;
                }

                // Criptăm parola înainte de a o salva
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Verificăm dacă email-ul este de la o autoritate (@cri.com)
                const isAuthority = email.toLowerCase().endsWith('@cri.com');

                // Inserăm noul utilizator cu parola criptată și statusul de autoritate
                await pool.query(
                    'INSERT INTO users (email, password, is_authority) VALUES ($1, $2, $3)',
                    [email, hashedPassword, isAuthority]
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Cont creat cu succes!' 
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: error.message 
                }));
            }
            return;
        });
        return;
    }

    // Handler pentru logout
    if (req.method === 'POST' && filePath === '/api/logout') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'userEmail=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
        });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Handler pentru login
    if (req.method === 'POST' && filePath === '/api/login') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { email, password } = JSON.parse(body);
                
                // Căutăm utilizatorul după email
                const result = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );

                if (result.rows.length > 0) {
                    // Verificăm parola
                    const match = await bcrypt.compare(password, result.rows[0].password);
                    if (match) {
                        // Setăm cookie-ul la login cu expirare în 24 ore
                        const cookieExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Set-Cookie': `userEmail=${email}; expires=${cookieExpiry.toUTCString()}; path=/`
                        });
                        res.end(JSON.stringify({ 
                            success: true, 
                            isAuthority: result.rows[0].is_authority 
                        }));
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
            return;
        });
        return;
    }
    
    // Dacă suntem pe root, redirectăm către dashboard-ul corespunzător
    if (filePath === '/') {
        const cookies = getCookies(req.headers.cookie);
        if (cookies.userEmail) {
            // Verificăm dacă utilizatorul este autoritate
            try {
                const result = await pool.query(
                    'SELECT is_authority FROM users WHERE email = $1',
                    [cookies.userEmail]
                );
                
                if (result.rows.length > 0 && result.rows[0].is_authority) {
                    res.writeHead(302, { 'Location': '/authority-dashboard.html' });
                } else {
                    res.writeHead(302, { 'Location': '/dashboard.html' });
                }
                res.end();
                return;
            } catch (error) {
                console.error('Error checking authority status for root redirect:', error);
                res.writeHead(302, { 'Location': '/dashboard.html' });
                res.end();
                return;
            }
        } else {
            // Dacă nu este logat, redirecționăm către login
            res.writeHead(302, { 'Location': '/login.html' });
            res.end();
            return;
        }
    }

    // Verificăm cookie-urile pentru paginile protejate
    if (filePath === '/dashboard.html') {
        const cookies = getCookies(req.headers.cookie);
        if (!cookies.userEmail) {
            // Dacă nu există cookie, redirecționăm către login
            res.writeHead(302, { 'Location': '/login.html' });
            res.end();
            return;
        }
        
        // Verificăm dacă utilizatorul este autoritate și îl redirecționăm către dashboard-ul corespunzător
        try {
            const result = await pool.query(
                'SELECT is_authority FROM users WHERE email = $1',
                [cookies.userEmail]
            );
            
            if (result.rows.length > 0 && result.rows[0].is_authority) {
                // Dacă este autoritate, redirecționăm către dashboard-ul de autoritate
                res.writeHead(302, { 'Location': '/authority-dashboard.html' });
                res.end();
                return;
            }
        } catch (error) {
            console.error('Error checking authority status for dashboard redirect:', error);
        }
    }

    // Verificăm cookie-urile pentru dashboard-ul de autoritate
    if (filePath === '/authority-dashboard.html') {
        const cookies = getCookies(req.headers.cookie);
        if (!cookies.userEmail) {
            // Dacă nu există cookie, redirecționăm către login
            res.writeHead(302, { 'Location': '/login.html' });
            res.end();
            return;
        }
        
        // Verificăm dacă utilizatorul este autoritate
        try {
            const result = await pool.query(
                'SELECT is_authority FROM users WHERE email = $1',
                [cookies.userEmail]
            );
            
            if (result.rows.length === 0 || !result.rows[0].is_authority) {
                // Dacă nu este autoritate, redirecționăm către dashboard normal
                res.writeHead(302, { 'Location': '/dashboard.html' });
                res.end();
                return;
            }
        } catch (error) {
            console.error('Error checking authority status:', error);
            res.writeHead(302, { 'Location': '/login.html' });
            res.end();
            return;
        }
    }

    // Mapăm URL-urile la fișierele corecte
    if (filePath === '/login.html') {
        // Dacă utilizatorul este deja logat, redirecționăm către dashboard-ul corespunzător
        const cookies = getCookies(req.headers.cookie);
        if (cookies.userEmail) {
            // Verificăm dacă utilizatorul este autoritate pentru a-l redirecționa către dashboard-ul corect
            try {
                const result = await pool.query(
                    'SELECT is_authority FROM users WHERE email = $1',
                    [cookies.userEmail]
                );
                
                if (result.rows.length > 0 && result.rows[0].is_authority) {
                    res.writeHead(302, { 'Location': '/authority-dashboard.html' });
                } else {
                    res.writeHead(302, { 'Location': '/dashboard.html' });
                }
                res.end();
                return;
            } catch (error) {
                console.error('Error checking authority status for redirect:', error);
                // În caz de eroare, redirecționăm către dashboard normal
                res.writeHead(302, { 'Location': '/dashboard.html' });
                res.end();
                return;
            }
        }
        filePath = './src/views/login.html';
    } else if (filePath === '/signup.html') {
        filePath = './src/views/signup.html';
    } else if (filePath === '/dashboard.html') {
        filePath = './src/views/dashboard.html';
    } else if (filePath === '/authority-dashboard.html') {
        filePath = './src/views/authority-dashboard.html';
    } else if (filePath.startsWith('/public/')) {
        // Servim fișiere statice din folderul public
        filePath = '.' + filePath;
    }

    // Obținem extensia fișierului pentru a seta Content-Type corect
    const extname = path.extname(filePath);
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
    }

    // Citim și trimitem fișierul
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT') {
                // Pagină negăsită
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found', 'utf-8');
            } else {
                // Alt tip de eroare server
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // Succes
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serverul rulează pe portul ${PORT}`);
});
