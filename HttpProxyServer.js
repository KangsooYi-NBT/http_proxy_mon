var http = require('http');
var url = require('url');
var zlib = require('zlib');
var print_r = require('print_r').print_r;
var socket = require('socket.io-client')('http://localhost:8080');
var sprintf = require('sprintf').sprintf;
//vsprintf = require('sprintf').vsprintf;

// SOCKET.IO
socket.on('connect', function(){
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        //socket.emit('chat message', msg);
    });

    socket.on('disconnect', function(){});
});

function send_websocket(message)
{
    socket.emit('chat message', JSON.stringify(message));
}

function p(obj)
{
    return console.log(print_r(obj));
    console.log("{");
    for (var k in obj) {
        console.log("    '%s': '%s',", k, obj[k])
    }
    console.log("}\n");
}

function deepCopy(x)
{
    return JSON.parse(JSON.stringify(x));
}





//{ DOMAIN: IP}
var localHosts = {
//    'cashslide.co.kr:80': 'dev.fronto.co:80'
//    'cashslide.co.kr:80': 'naver.com:80',
};

http.createServer(function(request, response) {
    var info = url.parse(request.url);
    var reqInfoOrigin = {
        'host': info['hostname'],
        'ip': info['hostname'],
        'port': (info['port'] ? info['port'] : 80),
        'path': info['path']
    }
    var reqInfo = deepCopy(reqInfoOrigin);

    //localHosts에 매칭되는 도메인:포트가 있으면 목적지 변경!
    source_key = reqInfo['host'] + ':' + reqInfo['port'];
    if (targetHost = localHosts[source_key]) {
        var tmp = url.parse('http://' + targetHost);
        reqInfo['host'] = tmp['hostname'];
        reqInfo['ip'] = tmp['hostname'];
        reqInfo['port'] = tmp['port'];
        request.headers['host'] = tmp['host'];
    }
    delete request.headers['accept-encoding'];

    var is_finter_ok = false;
    var src = reqInfoOrigin['host'] + ':' + reqInfoOrigin['port'];
    var tar = reqInfo['host'] + ':' + reqInfo['port'];
    if (src != tar) {
        is_finter_ok = true;
    }
    is_finter_ok = true;

    var proxy = http.createClient(reqInfo['port'], reqInfo['ip']);
    var proxy_request = proxy.request(request.method, reqInfo['path'], request.headers);
    request._body = '';
    response._body = '';
    proxy_request.addListener('response', function (proxy_response) {

        proxy_response.addListener('data', function(chunk) {
            response._body += chunk;
            response.write(chunk, 'binary');
        });

        proxy_response.addListener('end', function() {
            if (is_finter_ok) {
                result = {
                    'request': {
                        'url': request.url,
                        'path': reqInfo['path'],
                        'method': request.method,
                        'http_version': request.httpVersion,
                        'header': request.headers,
                        'body': request._body
                    },
                    'response': {
                        'status_code': this.statusCode,
                        'header': this.headers,
                        'body': response._body
                    }
                };

                send_websocket(result);
            }

            response.end();

        });
        response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });

    request.addListener('data', function(chunk) {
        request._body+= chunk;
        proxy_request.write(chunk, 'binary');
    });

    request.addListener('end', function() {
        proxy_request.end();
    });
}).listen(8888, function() {
    console.log('listening on *:8888');
});

