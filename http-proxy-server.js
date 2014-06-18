/**
 * HTTP/HTTPS Proxy
 *
 * @see http://newspaint.wordpress.com/2012/11/05/node-js-http-and-https-proxy/
 */

var http = require('http');
var net = require('net');
var socket = require('socket.io-client')('http://localhost:8080');
var print_r = require('print_r').print_r;
var url = require('url');
var fs = require('fs');

var debugging = 1;

var regex_hostport = /^([^:]+)(:([0-9]+))?$/;

var localHosts = require(__dirname + '/hosts.json');
var HOSTS = localHosts['cashslide-test'];

function p(obj)
{
    return console.log(print_r(obj));
    console.log("{");
    for (var k in obj) {
        console.log("    '%s': '%s',", k, obj[k])
    }
    console.log("}\n");
}

// SOCKET.IO
socket.on('connect', function(){
    socket.on('chat message', function(msg){
        if (debugging) {
            console.log('message: ' + msg);
        }
        //socket.emit('chat message', msg);
    });

    socket.on('disconnect', function(){});
});
function send_websocket(message) {
    socket.emit('chat message', JSON.stringify(message));
}



function getHostPortFromString(hostString, defaultPort) {
    var host = hostString;
    var port = defaultPort;

    var result = regex_hostport.exec(hostString);
    if (result != null) {
        host = result[1];
        if (result[2] != null) {
            port = result[3];
        }
    }

    return( [ host, port ] );
}

// handle a HTTP proxy request
function httpUserRequest(userRequest, userResponse) {
    var httpVersion = userRequest['httpVersion'];
    var hostport = getHostPortFromString(userRequest.headers['host'], 80);

    // have to extract the path from the requested URL
    var path = userRequest.url;
    result = /^[a-zA-Z]+:\/\/[^\/]+(\/.*)?$/.exec(userRequest.url);
    if (result) {
        if (result[1].length > 0) {
            path = result[1];
        } else {
            path = "/";
        }
    }

    var options = {
        'host': hostport[0],
        'port': hostport[1],
        'method': userRequest.method,
        'path': path,
        'agent': userRequest.agent,
        'auth': userRequest.auth,
        'headers': userRequest.headers
    };

    try {
        userRequest._info = {};
        userResponse._info = {};

        //localHosts에 매칭되는 도메인:포트가 있으면 목적지 변경!
        var srcHostPort = options.host + ':' + options.port
        if (targetHost = HOSTS[srcHostPort]) {
            var tmp = url.parse('http://' + targetHost);
            options.host = tmp['hostname'];
            options.port = tmp['port'];
            options.headers.host = tmp['host'];
            options.host_origin = srcHostPort;

            options.headers['host'] = options.host_origin; // options.host_origin + ', ' + options.host + ':' + options.port;
            options.headers['x-pmon-server-forwarded'] = options.host_origin + ', ' + options.host + ':' + options.port;
        }
    } catch(e) {
        console.log("Exception: " + e.message);
    }
    delete options.headers['accept-encoding'];

    userRequest._info.reqInfo = {};
    for (var k in options) {
        if (k == 'headers') {
            continue;
        }
        userRequest._info.reqInfo[k] = options[k];
    }
    userRequest._info.reqInfo.httpVersion = userRequest.httpVersion;
    userRequest._info.reqInfo.protocol = 'http';
    userRequest._info.headers = options['headers'];


    var proxyRequest = http.request(
        options,
        function (proxyResponse) {
            userResponse.writeHead(proxyResponse.statusCode, proxyResponse.headers);
            userResponse._info.headers = proxyResponse.headers;

            // GET Method로 호출 시 Response에 status 가 없음
            if (proxyRequest.method == 'GET') {
                userResponse._info.headers.status = proxyResponse.statusCode;
            }

            proxyResponse.on('data', function (chunk) {
                    if (typeof userResponse._info.body == 'undefined') {
                        userResponse._info.body = '';
                    }
                    userResponse._info.body += chunk;

                    if (debugging) {
                        console.log("<<< " + chunk);
                    }
                    userResponse.write(chunk);
                }
            );

            proxyResponse.on('end',
                function () {
                    userResponse.end();

                    var msg = {
                        'request': userRequest._info,
                        'response': userResponse._info
                    }
                    send_websocket(msg);
                }
            );
        }
    );

    proxyRequest.on('error', function (error) {
            userResponse.writeHead(500);
            userResponse.write(
                    "<h1>500 Error</h1>\r\n<p>Error was <pre>" + error + "</pre></p>\r\n</body></html>\r\n"
            );
            userResponse.end();
        }
    );

    userRequest.addListener('data', function (chunk) {
            if (debugging) {
                console.log(">>> " + chunk);
            }
            if (typeof userRequest._info.body == 'undefined') {
                userRequest._info.body = '';
            }
            userRequest._info.body += chunk;
            proxyRequest.write(chunk);
        }
    );

    userRequest.addListener('end', function () {
            proxyRequest.end();
        }
    );
}

function main() {
    var port = 8888; // default port if none on command line

    // check for any command line arguments
    for (var argn = 2; argn < process.argv.length; argn++) {
        if (process.argv[argn] === '-p') {
            port = parseInt(process.argv[argn + 1]);
            argn++;
            continue;
        }

        if (process.argv[argn] === '-d') {
            debugging = 1;
            continue;
        }
    }

    console.log('server listening on port ' + port);

    // start HTTP server with custom request handler callback function
    var server = http.createServer(httpUserRequest).listen(port);

    server.addListener('checkContinue', function (request, response){
        response.writeContinue();
    });

    // add handler for HTTPS (which issues a CONNECT to the proxy)
    server.addListener(
        'connect',
        function (request, socketRequest, bodyhead) {
            var url = request.url;
            var httpVersion = request.httpVersion;
            var hostport = getHostPortFromString(url, 443);

            // set up TCP connection
            var proxySocket = new net.Socket();

            proxySocket.connect(
                parseInt(hostport[1]), hostport[0],
                function () {
                    console.log("HTTPS ProxySocket: " + hostport[1] + " | " + hostport[0]);
                    proxySocket.write(bodyhead);

                    // tell the caller the connection was successfully established
                    socketRequest.write("HTTP/" + httpVersion + " 200 Connection established\r\n\r\n");
                }
            );

            proxySocket.on('data', function (chunk) {
                    socketRequest.write(chunk);
                }
            );

            proxySocket.on('end', function () {
                    socketRequest.end();
                }
            );

            socketRequest.on('data', function (chunk) {
                    proxySocket.write(chunk);
                }
            );

            socketRequest.on('end', function () {
                    proxySocket.end();
                }
            );

            proxySocket.on('error', function (err) {
                    socketRequest.write("HTTP/" + httpVersion + " 500 Connection error\r\n\r\n");
                    socketRequest.end();
                }
            );

            socketRequest.on('error', function (err) {
                    proxySocket.end();
                }
            );
        }
    ); // HTTPS connect listener
}

main();
