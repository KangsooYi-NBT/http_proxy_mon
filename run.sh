#!/bin/bash

PROXY_GROUP_NAME=$1
if [ "$PROXY_GROUP_NAME" == "" ]; then
    PROXY_GROUP_NAME="default"
fi
TRACKING_ONLY_PROXYING_DOMAIN=t # HTTP Proxy 요청 내역을 보여주는 WEB_CONSOLE에 PROXY_GROUP_NAME에 정의된 도메인만 표시 할 경우 t, 아니면 f
PROXY_RESPONSE_SLEEP=0.0        # HTTP Proxy로 요청된 결과를 반환 할때 의도된 Sleep Time 지정
PROXY_PORT=8888
WEB_CONSOLE_PORT=8080


# -------------------------------------------
ETHERNET_PREFIX="^en"
BRIDGE_PREFIX="^bridge"

ETHERNET_IP=$( ifconfig | grep -A 4 $ETHERNET_PREFIX | grep 'inet ' | awk '{ print $2 }' )
WIFI_GW=$( ifconfig | grep -A 3 $BRIDGE_PREFIX | grep 'inet ' |awk '{ print $2 }')
echo ""
echo "#---------------------------------------------------"
echo "# - ETHERNET_IP = $ETHERNET_IP "
echo "# - WIFI_GW = $WIFI_GW "
echo "#---------------------------------------------------"
echo ""

INDEX_RUNNING=$( ps aux | grep 'node index.js' | grep -v grep | wc -l | awk '{ print $1 }' )
if [ $INDEX_RUNNING -eq 0 ]
then
	node index.js -p ${WEB_CONSOLE_PORT} &
fi

node http-proxy-server.js \
 -c ${PROXY_GROUP_NAME} \
 -p ${PROXY_PORT} \
 -pmon ${WEB_CONSOLE_PORT} \
 -o ${TRACKING_ONLY_PROXYING_DOMAIN} \
 -s ${PROXY_RESPONSE_SLEEP}


INDEX_PID=$( ps aux | grep 'node index.js' | grep -v grep | awk '{ print $2 }' )
kill $INDEX_PID
