const rooms = new Map(); // key: roomName, value: Set of clients

function joinRoom(room, ws) {
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(ws);
    ws.room = room;
}

function leaveRoom(ws) {
    const room = ws.room;
    if (room && rooms.has(room)) {
        rooms.get(room).delete(ws);
        if (rooms.get(room).size === 0) rooms.delete(room);
    }
}

function broadcastToRoom(room, message) {
    const clients = rooms.get(room);
    if (!clients) return;
    for (const client of clients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

module.exports = { joinRoom, leaveRoom, broadcastToRoom };
