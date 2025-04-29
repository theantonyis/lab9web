let socket;
let token = "";
let userName = "";

function log(msg) {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML += `<div>${msg}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("loginBtn").onclick = () => {
    userName = document.getElementById("username").value;
    if (!userName) return alert("Введіть ім'я");

    // Перетворення userName в UTF-8 перед кодуванням у base64
    const utf8UserName = unescape(encodeURIComponent(userName));
    token = btoa(utf8UserName); // Тепер можна без помилок

    document.getElementById("auth-section").style.display = "none";
    document.getElementById("chat-section").style.display = "block";

    socket = new WebSocket("ws://localhost:3001");

    socket.onopen = () => {
        socket.send(JSON.stringify({ type: "auth", token }));
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

    socket.onclose = () => {
        log("<i>З'єднання закрите</i>");
    };
};

document.getElementById("joinRoomBtn").onclick = () => {
    const room = document.getElementById("roomInput").value;
    socket.send(JSON.stringify({ type: "join", room }));
};

document.getElementById("sendBtn").onclick = () => {
    const text = document.getElementById("messageInput").value;

    // Перевірка на відкритий стан WebSocket
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "chat", text }));
        document.getElementById("messageInput").value = "";
    } else {
        log("<i>Неможливо надіслати повідомлення, оскільки з'єднання закрите</i>");
    }
};


document.getElementById("fileInput").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        socket.send(JSON.stringify({
            type: "file",
            name: file.name,
            data: reader.result
        }));
    };
    reader.readAsDataURL(file);
};
