var socket = io();
var logs = {};
var uniq = 0;

Number.prototype.numberFormat = function(decimals, dec_point, thousands_sep) {
    dec_point = typeof dec_point !== 'undefined' ? dec_point : '.';
    thousands_sep = typeof thousands_sep !== 'undefined' ? thousands_sep : ',';

    var parts = this.toFixed(decimals).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands_sep);

    return parts.join(dec_point);
}

$(document).ready(function() {
    localStorage.clear();
});

// Message Receiver
socket.on('chat message', function(msg)
{
    // console.log(msg)
    localStorage.setItem(++uniq, msg);
    render(uniq);
});

function getUrl(req, is_real_domain)
{
    var host = req.host_origin;
    if (is_real_domain == true) {
        host = req.host;
        if (req.port != 80) {
            host+= ':' + req.port;
        }
    }

    if (typeof host == 'undefined') {
        host = req.host + ':' + req.port;
    }
    host = host.replace(/:(80|443)$/, '');

    return req.protocol + '://' + host + req.path
}

function render(id, is_append)
{
    var json = JSON.parse(localStorage.getItem(id));
    var request = json.request;
    var response = json.response;

    if ($('#hidden_image').is(':checked')) {
        if (response.headers['content-type'].match(/^image\//g) || request.reqInfo.path.toLowerCase().match(/\.(jpg|gif|png)$/)) {
            return '';
        }
    }

    if (typeof is_append == 'undefined') {
        is_append = true;
    }

    if (is_append) {
        var isViaProxy = false;
        if (request.headers['x-pmon-server-forwarded']) {
            isViaProxy = true;
        }
        var status = response.headers.status;
        if (status == null || status == '') {
            status = 200;
        }
        if (typeof status == 'number') {
            status = status + ' ' + getStatusText(status)
        }

        var row = '';
        if (isViaProxy) {
            row+= '<tr class="info">';
        } else {
            row+= '<tr style="text-decoration: line-through;">';
        }
        row+= '    <td class="alt"><a href="#" onclick="show_origin(' + id + '); return false;">' + getUrl(request.reqInfo) + '</a></td>';
        row+= '    <td>' + status + '</td>';
        row+= '    <td>' + response.headers['content-type'] + '</td>';
        row+= '    <td class="text-right">' + parseInt(response.headers['content-length']).numberFormat(0) + ' </td>';
        row+= '</tr>';
        $('#url_table').append(row);
        //$('<li class="list-group-item font">').html('<a href="#" onclick="show_origin(' + id + '); return false;">' + url + '</a>'));

        if ($('#http_log_refresh').is(':checked')) {
            $('#url_table').scrollTop($('#url_table').prop('scrollHeight'));
        }
    }

    // HTTP통신 원문 자동 갱신
    if ($('#http_log_refresh').is(':checked') || is_append != true) {
        $('#http_request').html(getRequestOrigin(request.reqInfo, request.headers, request.body));
        $('#http_response').html(getResponseOrigin(request.reqInfo, response.headers, response.body));
    }
}

function getRequestOrigin(reqInfo, headers, body)
{
    var line = [];
    line.push(reqInfo.method + ' ' +  reqInfo.path + ' HTTP/' + reqInfo.httpVersion);
    curl_headers = ''
    for (var k in headers) {
        if (k == 'x-pmon-server-forwarded') {
            var v = headers[k];
            var vs = v.split(',');

            v = '';
            for (var i in vs) {
                if (i > 0 ) {
                    v+= '<span class="glyphicon glyphicon-chevron-right"></span> ';
                }
                v+= '<span class="badge">' + vs[i] + '</span> ';
            }
            line.push(k + ': ' + v);
        } else {
            line.push(k + ': ' + headers[k]);
        }
        curl_headers+= '\\ <br />&nbsp;-H "' + k + ': ' + headers[k] + '" '
    }

    line.push('');
    if (typeof body != 'undefined') {
        body = body.replace(/&/g, '&amp;');

        line.push('<div class="alert alert-success">' + body + '</div>');
        line.push('');
    } else {
        body = ''
    }

    if (reqInfo.method == 'GET') {
        params = '';
    } else {
        params = " -X " + reqInfo.method + " \\<br /> -d '" + body + "'";
    }

    line.push('<blockquote class="font">curl "' + getUrl(reqInfo, true) + '" ' + params + curl_headers + '</blockquote>');
    return line.join('<br />');
}

function getResponseOrigin(reqInfo, headers, body)
{
    var line = [];
    var status = headers.status;
    if (status == null || status == '') {
        status = 200;
    }

    line.push('HTTP/' + reqInfo.httpVersion + ' ' + status + getStatusText(status));
    for (var k in headers) {
        if (k == 'status') {
            continue;
        }
        line.push(k + ': ' + headers[k]);
    }
    line.push('');

    if (typeof headers['content-type'] == 'undefined') {
        headers['content-type'] = '';
    }

    if (headers['content-type'].match(/^image\//g) || reqInfo.path.toLowerCase().match(/\.(jpg|gif|png)$/)) {
        line.push('<img src="' + getUrl(reqInfo) + '" />');
    } else {
        if (typeof body == 'undefined') {
            body = '';
        }
        body = '<xmp>' + body + '</xmp>';
        line.push('<div class="alert alert-danger">' + body + '</div>');
    }

    return line.join('<br />');
}

function show_origin(id)
{
    $('#http_log_refresh').prop('checked', false);
    render(id, false);
}

function getStatusText(code)
{
    if (typeof code == 'string') {
        return ''
    }
    
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

    return ' ' + statusText[code.toString()];
}


