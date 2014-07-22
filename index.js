var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 8080;
if (p = getArgValue('-p')) {
    port = p;
}

function getArgValue(arg_name)
{
    for (var argn = 2; argn < process.argv.length; argn++) {
        if (process.argv[argn] === arg_name) {
            return parseInt(process.argv[argn + 1]);
        }
        argn++;
    }
    return '';
}

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

http.listen(port, function(){
    console.log('HTTP-Mon listening on *:' + port);
});
