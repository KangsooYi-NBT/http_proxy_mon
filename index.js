var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var debug = false
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

function console_log(str)
{
    if (debug) {
        console.log(str);
    }
}

app.get('/', function(req, res){
    res.sendfile('index.html');
});

app.get('/assets/default.js', function(req, res){
    res.sendfile('assets/default.js');
});

app.get('/assets/default.css', function(req, res){
    res.sendfile('assets/default.css');
});

app.get('/assets/base64.js', function(req, res){
    res.sendfile('assets/base64.js');
});

io.on('connection', function(socket){
    console_log('a user connected');
    socket.on('disconnect', function(){
        console_log('user disconnected');
    });

    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
        console_log('message: ' + msg);
    });
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        console_log('message: ' + msg);
    });
});

http.listen(port, function(){
    console.log('HTTP-Mon listening on *:' + port);
});
