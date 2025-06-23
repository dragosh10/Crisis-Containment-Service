const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });
const userSockets = {}; // userId -> ws

wss.on('connection', (ws) => {
    ws.on('message', msg => {
        try {
            const { userId } = JSON.parse(msg);
            if (userId) {
                userSockets[userId] = ws;
                ws.userId = userId;
            }
        } catch {}
    });
    ws.on('close', () => {
        if (ws.userId && userSockets[ws.userId] === ws) {
            delete userSockets[ws.userId];
        }
    });
});

function sendAlertToUser(userId, alertData) {
    const ws = userSockets[userId];
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(alertData));
    }
}

function broadcastAlertToAllClients(alertData) {
    for (const ws of Object.values(userSockets)) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(alertData));
        }
    }
}

module.exports = { sendAlertToUser, broadcastAlertToAllClients }; 