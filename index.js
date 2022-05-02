const colors = ["green", "blue", "red", "black", "orange", "yellow", "pink", "purple", "teal", "gray"];

var width = 1000;
var height = 1000;

function Dot() {
  var self = {
    x: Math.random() * (width + width) + -width,
    y: Math.random() * (height + height) + -height,
    c: colors[Math.floor(Math.random()*colors.length)]
  };
  return self;
}
function dist(x1, y1, x2, y2) {
  var a = x1 - x2;
  var b = y1 - y2;
  return Math.sqrt( a*a + b*b );
}
function getIndex(num, arr) {
  for (var n = 0; n < arr.length; n++) {
    if (num > arr[n]) {
      continue;
    } else {
      return n;
    }
  }
}


const kills = [0, 1, 3, 5, 10, 20, 25];
const sizes = [50, 75, 100, 150, 250, 400, 600];
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var dots = [];
for (var i = 0; i < width*0.9; i++) {
  dots.push(Dot());
}

app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/login.html')
});

app.get('/homescreen', function(req, res) {
  
});

app.get('/index.html', function(req, res) {
  res.sendFile(__dirname + '/index.html')
});

app.get('/lost.html', function(req, res) {
  res.sendFile(__dirname + '/lost.html')
});

// app.get('/css/login.css', function(req, res) {
//   res.sendFile(__dirname + '/css/login.css')
// });

var SOCKET_LIST = {};
var WATCHER_LIST = {};

var randomPos = function() {
    var x = Math.random() * (450 + 300) + -300;
    var y = Math.random() * (450 + 300) + -300;
    for (var i in SOCKET_LIST) {
      if (dist(x, y, SOCKET_LIST[i].x, SOCKET_LIST[i].y) < (SOCKET_LIST[i].radius+30)/2) {
        return randomPos();
      }
    }
  return {x: x, y: y};
}

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.id = Math.random();
  var randPos = randomPos();
  socket.x = randPos.x;
  socket.y = randPos.y;
  socket.radius = 25;
  socket.speed = 1;
  socket.color = colors[Math.floor(Math.random()*colors.length)];
  socket["left"] = false;
  socket["right"] = false;
  socket["up"] = false;
  socket["down"] = false;
  socket['space'] = false;
  socket.kills = 0;
  socket.dead = false;
  socket.upDate = function() {
    if (this["left"] && this.x > -width) {
      this.x-=this.speed;
    } 
    if (this["right"] && this.x < width) {
      this.x+=this.speed;
    }
    if (this["up"] && this.y > -height) {
      this.y-=this.speed;
    } 
    if (this["down"] && this.y < height) {
      this.y+=this.speed;
    }
    if (this['space'] && this.radius > 25) {
      this.speed += 0.05;
      this.radius-=0.25;
    } else {
      this.speed = 1;
    }

    
  };
  socket.checkDots = function() {
    var killIndex = getIndex(this.kills, kills);
    var size = sizes[killIndex];
    for (var i = dots.length - 1; i > -1; i--) {
      if (dist(this.x, this.y, dots[i].x, dots[i].y) < (this.radius + 5) && this.radius < size) {
        dots.splice(i, 1);
        this.radius++;
        this.speed *= 0.95;
        dots.push(Dot())
      }
    }  
  };
  socket.on('name', function(name) {
    socket.name = name;
  })

  socket.emit("socketId", socket.id);
  
  socket.on('keys', function(data) {
    socket[data.key] = data.bool;
  });

  
  SOCKET_LIST[socket.id] = socket;

	
	socket.on('killMe', function() {
		delete SOCKET_LIST[socket.id];
		WATCHER_LIST[socket.id] = socket;
	});

  socket.on("disconnect", function() {
    delete SOCKET_LIST[socket.id];
  });
  
});

setInterval(function() {
  var pack = [];
  for (var i in SOCKET_LIST) {
    var socket = SOCKET_LIST[i];
    socket.upDate();
    socket.checkDots();
    pack.push({
      id: socket.id,
      x: socket.x,
      y: socket.y,
      r: socket.radius,
      color: socket.color,
      name: socket.name
    });
  }

  for (var i in SOCKET_LIST) {
    var socketOne = SOCKET_LIST[i];
    for (var j in SOCKET_LIST) {
      var socketTwo = SOCKET_LIST[j];
      if (i !== j) {
        if (dist(socketOne.x, socketOne.y, socketTwo.x, socketTwo.y) < (socketOne.radius + socketTwo.radius)) {
          if (socketOne.radius >= socketTwo.radius && socketTwo.dead === false) {
            socketTwo.emit('die', socketOne.name);
            socketTwo.dead = true;
            socketOne.kills++;
          } else if (socketOne.radius < socketTwo.radius && socketOne.dead === false) {
            socketOne.emit('die', socketTwo.name);
            socketOne.dead = false;
            socketTwo.kills++;
          }
        }
      }
    }
  }

  for (var i in SOCKET_LIST) {
    io.emit('characters', pack, dots);
  }

	for (var i in WATCHER_LIST) {
    io.emit('characters', pack, dots);
  }
}, 1000/25);

server.listen(3000, () => {
  console.log('listening on *:3000');
});



