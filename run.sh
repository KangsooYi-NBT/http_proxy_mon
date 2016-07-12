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

node index.js &
node http-proxy-server.js
