#!/bin/bash

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
	node index.js &
fi

node http-proxy-server.js -o t -s 1.0


INDEX_PID=$( ps aux | grep 'node index.js' | grep -v grep | awk '{ print $2 }' )
kill $INDEX_PID
