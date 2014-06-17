var socket = io();
var logs = {};
var uniq = 0;

// Message Receiver
socket.on('chat message', function(msg) {
    var json = JSON.parse(msg);

    logs[++uniq] = json;
    render(uniq);
});

function render(id, is_append)
{
    var json = logs[id];
    var request = json.request;
    var response = json.response;

    var req = request.reqInfo;
    if (typeof is_append == 'undefined') {
        is_append = true;
    }


    if (is_append) {
//        $('#request_info').append($('<li class="list-group-item font">').html('<a href="#" onclick="show_origin(' + id + '); return false;">' + url + '</a>'));

        var row = '';
        row+= '<tr>';
        row+= '    <td><a href="#" onclick="show_origin(' + id + '); return false;">' + req.protocol + '://' + req.host + req.path + '</a></td>';
        row+= '    <td>' + response.headers.status + '</td>';
        row+= '    <td>' + response.headers['content-type'] + '</td>';
        row+= '   <td>' + response.headers['content-length'] + '</td>';
        row+= '</tr>';
        $('#url_table').append(row);
        //$('<li class="list-group-item font">').html('<a href="#" onclick="show_origin(' + id + '); return false;">' + url + '</a>'));

        $('#url_table').scrollTop($('#url_table').prop('scrollHeight'));
    }

    $('#http_request').html(getRequestOrigin(request.reqInfo, request.headers, request.body));
    $('#http_response').html(getResponseOrigin(response.headers, response.body));
}

function getRequestOrigin(reqInfo, headers, body)
{
    var line = [];
    line.push(reqInfo.method + ' ' +  reqInfo.path + ' HTTP/' + reqInfo.httpVersion);
    for (var k in headers) {
        line.push(k + ': ' + headers[k]);
    }
    line.push('');
    line.push(body);
    line.push('');

    if (reqInfo.method == 'GET') {
        params = '';
    } else {
        params = " -X " + reqInfo.method + " -d '" + body + "'";
    }

    line.push('<blockquote class="font"> curl "' + (reqInfo.protocol + '://' + reqInfo.host + reqInfo.path) + '" ' + params + '</blockquote>');
    return line.join('<br />');
}

function getResponseOrigin(headers, body)
{
    var line = [];
    line.push('HTTP ' + headers.status + ' ' + getStatusText(headers.status));
    for (var k in headers) {
        line.push(k + ': ' + headers[k]);
        if (k == 'content-type') {
        }
    }
    line.push('');

    if (typeof headers['content-type'] == 'undefined') {
        headers['content-type'] = '';
    }

    if (headers['content-type'].match(/^image\//g)) {
        line.push('<img src="' + url + '" />');
    } else {
        if (typeof body == 'undefined') {
            body = '';
        }
//        body = '<xmp>' + body.replace(/\</g, '&lt;') + '</xmp>';
//        body = body.replace(/(\\r\\n|\\n)/g, '\n');
        line.push(body);
    }

    return line.join('<br />');
}

function show_origin(id)
{
    render(id, false);
}

function getStatusText(code)
{
    var statusText = {
        '100': 'Continue'
        , '101': 'Switching Protocols'
        , '200': 'OK'
        , '201': 'Created'
        , '202': 'Accepted'
        , '203': 'Non-Authoritative Information'
        , '204': 'No Content'
        , '205': 'Reset Content'
        , '206': 'Partial Content'
        , '300': 'Multiple Choices'
        , '301': 'Moved Permanently'
        , '302': 'Found'
        , '303': 'See Other'
        , '304': 'Not Modified'
        , '305': 'Use Proxy'
        , '307': 'Temporary Redirect'
        , '400': 'Bad Request'
        , '401': 'Unauthorized'
        , '402': 'Payment Required'
        , '403': 'Forbidden'
        , '404': 'Not Found'
        , '405': 'Method Not Allowed'
        , '406': 'Not Acceptable'
        , '407': 'Proxy Authentication Required'
        , '408': 'Request Time-out'
        , '409': 'Conflict'
        , '410': 'Gone'
        , '411': 'Length Required'
        , '412': 'Precondition Failed'
        , '413': 'Request Entity Too Large'
        , '414': 'Request-URI Too Large'
        , '415': 'Unsupported Media Type'
        , '416': 'Requested range not satisfiable'
        , '417': 'Expectation Failed'
        , '500': 'Internal Server Error'
        , '501': 'Not Implemented'
        , '502': 'Bad Gateway'
        , '503': 'Service Unavailable'
        , '504': 'Gateway Time-out'
        , '505': 'HTTP Version not supported'
    };

    return statusText[code];
}


