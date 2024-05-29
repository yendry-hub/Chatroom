const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const db = new sqlite3.Database('chat.db');

// Create messages table
db.serialize(() => {
    db.run("CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, message TEXT)");
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected');

    // Load previous messages from database
    db.all("SELECT username, message FROM messages", [], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach((row) => {
            socket.emit('chat message', { username: row.username, message: row.message });
        });
    });

    socket.on('chat message', (msg) => {
        const { username, message } = msg;

        // Save message to database
        db.run("INSERT INTO messages (username, message) VALUES (?, ?)", [username, message], function(err) {
            if (err) {
                return console.log(err.message);
            }
            console.log(`A message from ${username} was saved to the database.`);
        });

        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
