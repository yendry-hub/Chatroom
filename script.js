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
        const chatBox = document.getElementById('chat-box');
        const messageElement = document.createElement('div');
        const username = sessionStorage.getItem('username');
        messageElement.textContent = `${username}: ${message}`;
        messageElement.classList.add('message');
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        chatInput.value = '';
    }
}

function switchTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
}
