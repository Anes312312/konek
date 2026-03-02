const io = require('socket.io-client');

const socket1 = io('http://localhost:5000', { transports: ['websocket'] });
const socket2 = io('http://localhost:5000', { transports: ['websocket'] });

socket1.on('connect', () => {
    console.log('User 1 connected:', socket1.id);
    socket1.emit('join', { userId: 'user1', profile: { username: 'User One' } });
});

socket2.on('connect', () => {
    console.log('User 2 connected:', socket2.id);
    socket2.emit('join', { userId: 'user2', profile: { username: 'User Two' } });

    setTimeout(() => {
        console.log('User 2 sending message to User 1...');
        socket2.emit('send_message', {
            sender_id: 'user2',
            receiver_id: 'user1',
            content: 'Hello, User One! This is a test message.',
            message_type: 'text'
        });
    }, 1000);
});

socket1.on('connect_error', (err) => {
    console.log('User 1 connect_error:', err.message);
});

socket2.on('connect_error', (err) => {
    console.log('User 2 connect_error:', err.message);
});

socket1.on('receive_message', (msg) => {
    console.log('User 1 received message:', msg);
    process.exit(0);
});

socket2.on('receive_message', (msg) => {
    console.log('User 2 received message:', msg);
});

setTimeout(() => {
    console.log('Timeout. Test failed.');
    process.exit(1);
}, 5000);
