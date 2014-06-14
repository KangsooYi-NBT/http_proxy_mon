var http = require('http');
var url = require('url');
var zlib = require('zlib');
var print_r = require('print_r').print_r;

//{ DOMAIN: IP}
var localHosts = {
  'cashslide.co.kr:8003': 'dev.fronto.co:80',
  // 'cashslide.co.kr:80': 'naver.com:80',

}

function p(obj)
{
  return console.log(print_r(obj));

  console.log("{");
  for (var i in obj) {
    console.log("    '%s': '%s',", i, obj[i])
  }
  console.log("}\n");
}

function deepCopy(x)
{
  return JSON.parse(JSON.stringify(x));
}

http.createServer(function(request, response) {
  var info = url.parse(request.url);
// p(tmp);
// protocol] http:
// [slashes] true
// [auth] null
// [host] cashslide.co.kr:8003
// [port] 8003
// [hostname] cashslide.co.kr
// [hash] null
// [search] null
// [query] null
// [pathname] /check_version
// [path] /check_version
// [href] http://cashslide.co.kr:8003/check_version

  var reqInfoOrigin = {
    'host': info['hostname'],
    'ip': info['hostname'],
    'port': (info['port'] ? info['port'] : 80),
    'path': info['path'],
  }
  var reqInfo = deepCopy(reqInfoOrigin);

  //localHosts에 매칭되는 도메인:포트가 있으면 목적지 변경!
  source_key = reqInfo['host'] + ':' + reqInfo['port'];
  if (targetHost = localHosts[source_key]) {
    //console.log("> >>>>>>>> " + targetHost);
    // p(targetHost);

    var tmp = url.parse('http://' + targetHost);
    
    reqInfo['host'] = tmp['hostname'];
    reqInfo['ip'] = tmp['hostname'];
    reqInfo['port'] = tmp['port'];

    request.headers['host'] = tmp['host'];
  }
  delete request.headers['accept-encoding'];// = '';


  var is_finter_ok = false;
  var src = reqInfoOrigin['host'] + ':' + reqInfoOrigin['port'];
  var tar = reqInfo['host'] + ':' + reqInfo['port'];
  if (src != tar) {
    is_finter_ok = true;
  }
  is_finter_ok = true;

  if (is_finter_ok) {
    p("*** Proxying: [ " + src + " to " + tar + " ]");
    p(request.headers)
  }


  var proxy = http.createClient(reqInfo['port'], reqInfo['ip'])
  var proxy_request = proxy.request(request.method, info['path'], request.headers);

    var message = '';

    proxy_request.addListener('response', function (proxy_response) {

      proxy_response.addListener('data', function(chunk) {
        message+= chunk;
        response.write(chunk, 'binary');
      });
      
      proxy_response.addListener('end', function() {
        response.end();

        // if (this.headers['content-encoding'] == 'gzip') {
        //   p("X1.");
        // } else if (this.headers['content-encoding'] == 'deflate') {
        //   p("X2.");
        // }

        if (is_finter_ok) {
          result = {
            'header': this.headers,
            'body': message,
          }
          p(result);
        }
      });
      
      response.writeHead(proxy_response.statusCode, proxy_response.headers);

  });
  
  request.addListener('data', function(chunk) {
    // console.log("<<< " + chunk);

    proxy_request.write(chunk, 'binary');
  });

  request.addListener('end', function() {
    proxy_request.end();
  });
}).listen(8080);
