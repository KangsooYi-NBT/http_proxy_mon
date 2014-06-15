var socket = io();
var logs = {};
var uniq = 0;

// Message Receiver
socket.on('chat message', function(msg) {
    var json = JSON.parse(msg);
//    url = json['request']['url'];
//    req = getRequestOrigin(json['request']);
//    resp = getResponseOrigin(json['response']);

    logs[++uniq] = json;
    render(uniq);
});

function render(id, is_append)
{
    json = logs[id];
    url = json['request']['url'];
    req = getRequestOrigin(json['request']);
    resp = getResponseOrigin(json['response']);

    if (typeof is_append == 'undefined') {
        is_append = true;
    }

    if (is_append) {
        $('#request_info').append($('<li class="list-group-item font">').html('<a href="#" onclick="show_origin(' + id + '); return false;">' + url + '</a>'));
        $('#request_info').scrollTop($('#request_info').prop('scrollHeight'));
    }

    $('#http_request').html(req);
    $('#http_response').html(resp, url);
}

function getRequestOrigin(obj)
{
    var line = [];
    line.push(obj['method'] + ' ' +  obj['path'] + ' HTTP/' + obj['http_version']);
    for (var k in obj['header']) {
        line.push(k + ': ' + obj['header'][k]);
    }
    line.push('');
    line.push(obj['body']);
    line.push('');

    if (obj['method'] == 'GET') {
        params = '';
    } else {
        params = " -X " + obj['method']  + " -d '" + obj['body'] + "'";
    }

    line.push('<blockquote class="font"> curl "' + obj['url'] + '" ' + params + '</blockquote>');
    return line.join('<br />');
}

function getResponseOrigin(obj, req_obj)
{
    var line = [];
    line.push('HTTP ' + obj['status_code'] + ' ' + getStatusText(obj['status_code']));
    for (var k in obj['header']) {
        line.push(k + ': ' + obj['header'][k]);

        if (k == 'content-type') {

        }
    }
    line.push('');

    if (obj['header']['content-type'].match(/^image\//g)) {
        line.push('<img src="' + url + '" />');
    } else {
        body = obj['body'];
        if (typeof body == 'undefined') {
            body = '';
        }
        body = '<xmp>' + body.replace(/\</g, '&lt;') + '</xmp>';
        line.push(body);
    }

    return line.join('<br />');
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


function show_origin(id)
{
    render(id, false);
}
