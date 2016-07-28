/**
 * HTTP/HTTPS Proxy
 *
 * @see http://newspaint.wordpress.com/2012/11/05/node-js-http-and-https-proxy/
 */

var out_bound_ip = '1.2.3.4';
var index_port = getArgValue('-pmon');
if (index_port == '') {
    index_port = 8080;
}

var http = require('http');
var net = require('net');
var socket = require('socket.io-client')('http://localhost:' + index_port);
var print_r = require('print_r').print_r;
var url = require('url');
var fs = require('fs');
var debugging = 0;
var regex_hostport = /^([^:]+)(:([0-9]+))?$/;
var HOSTS = [];
var TRACKING_ONLY_VIA_PROXY = false;

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
    userRequest['httpVersion'] = '1.1';

    var httpVersion = userRequest['httpVersion'];
    var hostPort = getHostPortFromString(userRequest.headers['host'], 80);

    // have to extract the path from the requested URL
    var path = userRequest.url;
    result = /^[a-zA-Z]+:\/\/[^\/]+(\/.*)?$/.exec(userRequest.url);
    if (result) {
        try {
            if (result[1].length > 0) {
                path = result[1];
            } else {
                path = "/";
            }
        } catch (e) {
            path = "/";
        }
    }

    var options = {
        'host': hostPort[0],
        'port': hostPort[1],
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
            if (options.port == 80) {
                options.host_origin = options.host;
            } else {
                options.host_origin = srcHostPort;
            }

            options.headers['host'] = options.host_origin; // options.host_origin + ', ' + options.host + ':' + options.port;
            options.headers['x-pmon-server-forwarded'] = srcHostPort + ', ' + options.host + ':' + options.port;
        }
        options.headers['x-forwarded-for'] = [userRequest.connection.remoteAddress, out_bound_ip].join(", ");
    } catch(e) {
        //console.log("Exception: " + e.message);
    }
    delete options.headers['accept-encoding'];
//    options.headers['accept-encoding'] = 'gzip';

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

    reqInfo = userRequest._info.reqInfo
    port = reqInfo['port']
    port = (port == '80') ? '' : ':' + port
    console.log("HTTP ProxySocket: " + reqInfo['protocol'] + '://' + reqInfo['host'] + port + reqInfo['path'])
    // console.log(reqInfo)

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
                    try {
                        if (typeof userResponse._info.body == 'undefined') {
                            userResponse._info.body = '';
                        }

                        if (getArrayValue(userResponse._info.headers, 'content-type').match(/^image\//g) ||
                            userRequest._info.reqInfo.path.toLowerCase().match(/\.(jpg|gif|png)$/)) {
                            //
                        } else {
                            userResponse._info.body += chunk;
                        }

                        if (debugging) {
                            console.log("<<< " + chunk);
                        }
                        userResponse.write(chunk);
                    } catch (e) {
                        console.log(e.message)
                    }
                }
            );

            proxyResponse.on('end',
                function () {
                    try {
                        userResponse.end();

                        // Content-Encoding
                        if (getArrayValue(userResponse._info.headers, 'content-encoding') == 'gzip') {
                            //
                        }

                        try {
                            if (getArrayValue(userResponse._info.headers, 'content-length') == '') {
                                userResponse._info.headers['content-length'] = userResponse._info.body.length;
                            }
                        } catch (e) {
                            userResponse._info.headers['content-length'] = -1;
                        }

                        var msg = {
                            'request': userRequest._info,
                            'response': userResponse._info
                        }

                        if (TRACKING_ONLY_VIA_PROXY) {
                            if (typeof(options.headers['x-pmon-server-forwarded']) != 'undefined') {
                                send_websocket(msg);
                            }
                        } else {
                            send_websocket(msg);
                        }
                    } catch (e) {
                        console.log(e.message)
                    }
                }
            );
        }
    );

    proxyRequest.on('error', function (error) {
            try {
                userResponse.writeHead(500);
                userResponse.write(
                    "<h1>500 Error</h1>\r\n<p>Error was <pre>" + error + "</pre></p>\r\n</body></html>\r\n"
                );
                userResponse.end();
            } catch (e) {
                console.log(e.message)
            }
        }
    );

    userRequest.addListener('data', function (chunk) {
            try {
                if (debugging) {
                    console.log(">>> " + chunk);
                }
                if (typeof userRequest._info.body == 'undefined') {
                    userRequest._info.body = '';
                }
                userRequest._info.body += chunk;
                proxyRequest.write(chunk);
            } catch (e) {
                console.log(e.message)
            }
        }
    );

    userRequest.addListener('end', function () {
            try {
                proxyRequest.end();
            } catch (e) {
                console.log(e.message)
            }
        }
    );
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

function main() {
    var port = 8888; // default port if none on command line
    var caseId = 'default';

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

        if (process.argv[argn] === '-c') {
            caseId = process.argv[argn + 1].toString();
            argn++;
            continue;
        }

        if (process.argv[argn] === '-o') { // 목적지가 변경된 경우만 추적을 원한다면 't'
            TRACKING_ONLY_VIA_PROXY = process.argv[argn + 1].toString() == 't' ? true : false
        }
    }

    refreshLocalHosts(caseId);

    console.log('HTTP-Proxy listening on port ' + port);
    console.log('HTTP-Mon sending on port ' + index_port);
    console.log('localHostsCaseId: ' + caseId);
    console.log('TRACKING_ONLY_VIA_PROXY: ' + (TRACKING_ONLY_VIA_PROXY ? 'TRUE' : 'FALSE'));

    // start HTTP server with custom request handler callback function
    var server = http.createServer(httpUserRequest).listen(port);

    server.addListener('checkContinue', function (request, response){
        response.writeContinue();
    });

    // add handler for HTTPS (which issues a CONNECT to the proxy)
    server.addListener(
        'connect',
        function (request, socketRequest, bodyHead) {
            var url = request.url;
            var httpVersion = request.httpVersion;
            var hostPort = getHostPortFromString(url, 443);

            // set up TCP connection
            var proxySocket = new net.Socket();

            try {
                proxySocket.connect(
                    parseInt(hostPort[1]), hostPort[0],
                    function () {
                        console.log("HTTPS ProxySocket: " + url)
                        proxySocket.write(bodyHead);

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
            } catch (e) {
                console.log(e.message)
            }
        }
    ); // HTTPS connect listener
}

function refreshLocalHosts(caseId)
{
    try {
        var localHosts = require(__dirname + '/hosts.json');
        HOSTS = localHosts[caseId];
    } catch (e) {
        console.log(e.message);
    }
}

function getArrayValue(arr, key)
{
    if (typeof arr[key] == 'undefined') {
        return '';
    }
    return  arr[key];
}

main();
