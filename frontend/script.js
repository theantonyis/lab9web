let socket;
let token = "";
let userName = "";
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds

function log(msg) {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML += `<div>${msg}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function connectWebSocket() {
    socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
        reconnectAttempts = 0;
        log("<i>З'єднання встановлено</i>");
        socket.send(JSON.stringify({ type: "auth", token }));

        // If we were in a room before, rejoin it
        const room = document.getElementById("roomInput").value;
        if (room) {
            socket.send(JSON.stringify({ type: "join", room }));
        }
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat") {
            log(`<b>${msg.from}:</b> ${msg.text}`);
        } else if (msg.type === "info") {
            log(`<i>${msg.text}</i>`);
        } else if (msg.type === "file") {
            const link = document.createElement("a");
            link.href = msg.data;
            link.download = msg.name;
            link.textContent = `${msg.from} надіслав файл: ${msg.name}`;
            log(link.outerHTML);
        }
    };

    socket.onclose = (event) => {
        log("<i>З'єднання закрите</i>");

        // Try to reconnect if not a normal closure
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            log(`<i>Спроба перепідключення (${reconnectAttempts}/${maxReconnectAttempts})...</i>`);
            setTimeout(connectWebSocket, reconnectDelay);
        }
    };

    socket.onerror = (error) => {
        log(`<i>Помилка з'єднання</i>`);
        console.error("WebSocket error:", error);
    };
}

document.getElementById("loginBtn").onclick = () => {
    userName = document.getElementById("username").value;
    if (!userName) return alert("Введіть ім'я");

    // Create a proper JSON object and encode it as base64
    const payload = JSON.stringify({ name: userName });
    token = btoa(payload);

    document.getElementById("auth-section").style.display = "none";
    document.getElementById("chat-section").style.display = "block";

    connectWebSocket();
};

document.getElementById("joinRoomBtn").onclick = () => {
    const room = document.getElementById("roomInput").value;
    if (!room) return alert("Введіть назву кімнати");

    sendMessage({ type: "join", room });
};

document.getElementById("sendBtn").onclick = () => {
    const text = document.getElementById("messageInput").value;
    if (!text) return;

    if (sendMessage({ type: "chat", text })) {
        document.getElementById("messageInput").value = "";
    }
};

document.getElementById("fileInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        sendMessage({
            type: "file",
            name: file.name,
            data: reader.result
        });
    };
    reader.readAsDataURL(file);
};

// Helper function to safely send messages
function sendMessage(data) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        log("<i>Неможливо надіслати повідомлення, оскільки з'єднання закрите. Спроба перепідключення...</i>");
        if (reconnectAttempts < maxReconnectAttempts) {
            connectWebSocket();
        }
        return false;
    }

    try {
        socket.send(JSON.stringify(data));
        return true;
    } catch (error) {
        log(`<i>Помилка при надсиланні повідомлення: ${error.message}</i>`);
        console.error("Error sending message:", error);
        return false;
    }
}