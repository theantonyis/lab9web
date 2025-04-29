const WebSocket = require('ws');
const http = require('http');
const PORT = 3001;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map(); // socket -> {name, room}
const rooms = new Map(); // room -> Set of sockets

wss.on('connection', (ws) => {
    console.log('🟢 New connection');

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch {
            return ws.send(JSON.stringify({ type: 'info', text: 'Невідомий формат' }));
        }

        // Server-side token handling update (for server.js)
        if (msg.type === 'auth') {
            try {
                // Properly decode base64 token as JSON
                const tokenString = Buffer.from(msg.token, 'base64').toString();
                const payload = JSON.parse(tokenString);

                // Validate the payload has a name
                if (!payload.name) {
                    return ws.send(JSON.stringify({
                        type: 'info',
                        text: 'Помилка автентифікації: ім\'я відсутнє'
                    }));
                }

                clients.set(ws, { name: payload.name, room: null });
                ws.send(JSON.stringify({
                    type: 'info',
                    text: `Вітаємо, ${payload.name}`
                }));
            } catch (error) {
                console.error('Auth error:', error);
                ws.send(JSON.stringify({
                    type: 'info',
                    text: 'Помилка автентифікації: невірний формат даних'
                }));
            }
        }

        if (msg.type === 'join') {
            const client = clients.get(ws);
            if (!client) return;

            if (client.room) {
                rooms.get(client.room)?.delete(ws);
            }

            client.room = msg.room;
            if (!rooms.has(msg.room)) rooms.set(msg.room, new Set());
            rooms.get(msg.room).add(ws);

            ws.send(JSON.stringify({ type: 'info', text: `Приєднано до кімнати ${msg.room}` }));
        }

        if (msg.type === 'chat') {
            const client = clients.get(ws);
            if (!client?.room) return;

            const payload = {
                type: 'chat',
                from: client.name,
                text: msg.text,
            };

            for (const clientWs of rooms.get(client.room)) {
                clientWs.send(JSON.stringify(payload));
            }
        }

        if (msg.type === 'file') {
            const client = clients.get(ws);
            if (!client?.room) return;

            const payload = {
                type: 'file',
                from: client.name,
                name: msg.name,
                data: msg.data,
            };

            for (const clientWs of rooms.get(client.room)) {
                clientWs.send(JSON.stringify(payload));
            }
        }
    });

    ws.on('close', () => {
        const client = clients.get(ws);
        if (client?.room && rooms.has(client.room)) {
            rooms.get(client.room).delete(ws);
        }
        clients.delete(ws);
        console.log('🔴 Connection closed');
    });
});

server.listen(PORT, () => {
    console.log(`✅ WebSocket server running at ws://localhost:${PORT}`);
});
