설치 및 실행:
  
  * $ cd {APP_ROOT}
  * $ npm install
  * $ node index.js &
  * $ node http-proxy-server.js -p 8888 -c "default" &

hosts.json:

  * 요청 원본 도메인을 타켓 도메인으로 변환.(Port 포함)
  * http-proxy-server.js 실행 시 "-c" 옵션 지정으로 테스트 환경 변경.

  
Default Port:

  * HTTP Proxy Server PORT(http-proxy-server.js) = 8888
  * HTTP Monitoring Port(index.js) = 8080
  
