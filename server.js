const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 3000;

// 방 정보 저장 (메모리 기반 - 실제 서비스는 DB 사용)
const rooms = {};

// 기본 라우트
app.get('/', (req, res) => {
  res.send('PVP Platformer Server is running!');
});

// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log(`✅ New client connected: ${socket.id}`);

  // 방 생성 요청
  socket.on('createRoom', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [socket.id],
    };
    socket.join(roomCode);
    console.log(`🛠️ Room created: ${roomCode}`);
    socket.emit('roomCreated', roomCode);
  });

  // 방 입장 요청
  socket.on('joinRoom', (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(socket.id);
      socket.join(roomCode);
      console.log(`👥 ${socket.id} joined room: ${roomCode}`);
      socket.emit('roomJoined', roomCode);

      // 모두에게 현재 플레이어 목록 보내기
      io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    } else {
      socket.emit('error', 'Room not found!');
    }
  });

  // 플레이어 위치 동기화
  socket.on('playerMove', ({ roomCode, position }) => {
    socket.to(roomCode).emit('playerMoved', {
      playerId: socket.id,
      position,
    });
  });

  // 연결 종료 처리
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    // 방에서 제거
    for (const roomCode in rooms) {
      const index = rooms[roomCode].players.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomCode].players.splice(index, 1);
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
      }
    }
  });
});

// 방 코드 생성 함수 (4자리 숫자)
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 서버 실행
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
