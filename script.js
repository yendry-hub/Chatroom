const socket = io();

document.getElementById('username-button').addEventListener('click', enterChat);
document.getElementById('light-theme-button').addEventListener('click', () => switchTheme('light'));
document.getElementById('dark-theme-button').addEventListener('click', () => switchTheme('dark'));

function enterChat() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    if (username !== '') {
        sessionStorage.setItem('username', username);
        document.getElementById('username-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
    }
}

document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    if (message !== '') {
        const username = sessionStorage.getItem('username');
        socket.emit('chat message', { username, message });
        chatInput.value = '';
    }
}

socket.on('chat message', (msg) => {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.textContent = `${msg.username}: ${msg.message}`;
    messageElement.classList.add('message');
    const currentUsername = sessionStorage.getItem('username');
    if (msg.username === currentUsername) {
        messageElement.classList.add('self');
    } else {
        messageElement.classList.add('other');
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

function switchTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}
