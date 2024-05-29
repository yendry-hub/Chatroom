class FirebaseConnection {
    constructor(db_ref, message_channel) {
        this.randId = Math.floor(Math.random() * 1000000000);
        log('Welcome, this chat doesn\'t have history.');
        log('Please keep the browser open, so you can see others join.');
        log(`Your Client ID: ${this.randId}`);
        this.message_channel = message_channel;
        this.db_ref = db_ref;
        this.cleanup();
        this.connection = this.connect();
        this.connection.onDisconnect().set([{
            type: 'disconnect',
            sender: null, // send to both
            data: JSON.stringify({id: this.get_session_id()})
        }]);
    }
    connect() {
        this.db_ref.child(this.message_channel).remove();
        return this.db_ref.child(this.message_channel);
    }
    on(type, fn) {
        const id = this.get_session_id();
        this.connection.limitToLast(1).on('child_added', function(snapshot) {
            var message = snapshot.val();
            var data;
            if (message.type == type && message.sender != id) {
                if (typeof message.data !== 'undefined') {
                    data = JSON.parse(message.data);
                }
                if (message.target && message.target === id || !message.target) {
                    fn(data);
                }
            }
        });
    }
    emit(type, data, target = null) {
        const payload = {
            type: type,
            sender: this.get_session_id()
        };
        if (target) {
            payload.target = target;
        }
        if (typeof data !== 'undefined') {
            payload.data = JSON.stringify(data);
        }
        const msg = this.connection.push(payload);
        msg.remove();
    }
    get_session_id() {
        return this.randId;
    }
    disconnect() {
    }
    cleanup() {
        firebase.database().ref(`${this.message_channel}/send`).once("value", snap => {
            const list = [];
            snap.forEach(x => {
                const value = x.val();
                const messages = value[message_channel];
                if (messages && messages.length === 1) {
                    const { type } = messages[0];
                    if (type === 'disconnect') {
                        list.push(x.key);
                    }
                }
            });
            list.forEach(name => {
                firebase.database().ref(`/send/${name}`).remove();
            });
        });
    }
}

const audio = new Audio('https://cdn.jsdelivr.net/gh/jcubic/static/assets/lonely-hello.mp3');
audio.loop = false;

const fb_config = {
    apiKey: "AIzaSyCiYZ-_3zXQCu6DIkOd_HRGLCS3s6bIYiE",
    authDomain: "jcubic-webrtc.firebaseapp.com",
    databaseURL: "https://jcubic-webrtc.firebaseio.com",
    projectId: "jcubic-webrtc",
    storageBucket: "jcubic-webrtc.appspot.com",
    messagingSenderId: "530153588319"
};

const config = {
    iceServers: [
        {
            urls: "stun:openrelay.metered.ca:80",
        },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        }
    ],
    trickle: false
};

firebase.initializeApp(fb_config);

const room = 'steady-horse';
let user;
const peer_connection = {};
const peers = [];
const message_channel = 'WebRTC_codepen_chat';

const db_ref = firebase.database().ref(`send/${room}`);
const users = db_ref.child('users');

const connection = new FirebaseConnection(db_ref, message_channel);

input.addEventListener('keypress', (e) => {
    if (e.keyCode == 13) {
        if (input.value.trim()) {
            const message = `${user}> ${input.value}`;
            input.value = '';
            send(message);
            Object.values(peer_connection).forEach(({promise, peer}) => {
                if (!peer.writable) {
                    console.log('Peer in Invalid state detected (ignoring)');
                    return;
                }
                promise.then(() => {
                    peer.send(message);
                })
            });
        }
    }
});
set_user.addEventListener('click', pick_user);
username.addEventListener('keypress', function(e) {
    if (e.keyCode == 13) {
        pick_user();
    }
});

dialog.showModal();
function pick_user() {
    const value = username.value.trim();
    if (value) {
        user = value;
        init();
    }
}


function init() {
    dialog.close();
    new_user(users, connection, peer_connection);
    connection.on('disconnect', function(data) {
        const peer_info = peer_connection[data.id];
        if (peer_info) {
            log(`${data.id} disconnected`);
            try {
                const peer = peer_info.peer;
                peer.removeAllListeners('signal');
                peer.removeAllListeners('data');
                peer.removeAllListeners('error');
                peer.removeAllListeners('close');
                peer.destroy();
            } catch(e) {
                console.log('ERROR', e);
            }
            delete peer_connection[data.id];
        }
    });
}

function new_user(users, connection, peer_connection) {
    const ref = users.push();
    ref.onDisconnect().remove();
    const update = {};
    const id = connection.get_session_id();
    update[ref.key] = { id };
    users.update(update);
    users.once('value', function(snapshot) {
        const data = snapshot.val();
        if (data) {
            const users = Object.values(data);
            users.forEach(function(data) {
                if (data.id !== id) {
                    join(data.id, connection, peer_connection);
                }
            });
        }
    });
    connection.on('signal', ({data, test, origin}) => {
        const peer_info = peer_connection[origin];
        if (!peer_info) {
            join(origin, connection, peer_connection);
        } else {
            const peer = peer_info.peer;
            if (!peer.ready) {
                try {
                    peer.signal(data);
                } catch(e) {
                    console.log('INVALID STATE: when signal');
                    console.log(e);
                }
            }
        }
    });
    users.limitToLast(1).on('child_added', function(snapshot) {
        const data = snapshot.val();
        if (data.id !== id) {
            make_connection(data.id, connection, peer_connection);
            sound();
        }
    });
}

function make_connection(user_id, connection, peer_connection) {
    connect({ initiator: true, config }, user_id, connection, peer_connection);
}

function connect(settings, user_id, connection, peer_connection) {
    const peer = new SimplePeer(settings);
    const promise = new Promise(function(resolve) {
        peer.on('connect', () => {
            log(`${user_id} Ready`);
            peer_data.ready = true;
            resolve();
        }); 
    });
    const peer_data = {
        peer,
        user_id,
        ready: false,
        promise
    };
    peer.on('signal', data => {
        connection.emit('signal', { origin: connection.get_session_id(), data }, user_id);
    });
    peer.on('close', (e) => {
        console.log({CLOSE: e});
        peers.push({...peer_connection});
    });
    peer.on('error', (e) => {
        console.log({ERROR: e});
        //log(e.toString());
    });
    peer.on('data', send);
    peer_connection[user_id] = peer_data
}

function join(user_id, connection, peer_connection) {
    connect({ config }, user_id, connection, peer_connection);
}

function send(message) {
    output.value += message + '\n';
    output.scrollTop = output.scrollHeight;
}

function sound() {
    audio.play();
}

function log(str) {
    var date = new Date();
    var nums = [date.getHours(), date.getMinutes(), date.getSeconds()];
    var time_str = nums.map((n) => n.toString().padStart(2, '0')).join(':');
    if (typeof str !== 'string') {
        str = JSON.stringify(str);
    }
    let message; 
    if (str == '{}') {
        message = new Error().stack;
    } else {
        message = '[' + time_str + '] ' + str;
    }
    output.value += message + '\n';
    console.log(message);
}
