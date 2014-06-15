var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendfile('index.html');
});

app.get('/assets/default.js', function(req, res){
    res.sendfile('assets/default.js');
});

app.get('/assets/default.css', function(req, res){
    res.sendfile('assets/default.css');
}
);
app.get('/assets/base64.js', function(req, res){
    res.sendfile('assets/base64.js');
});

io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.emit('chat message', msg);

    });

//    socket.broadcast.emit('hi');


});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
    });
});

http.listen(8080, function(){
    console.log('listening on *:8080');
});
