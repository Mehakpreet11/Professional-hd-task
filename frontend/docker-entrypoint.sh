#!/bin/sh
set -e
: "${API_BASE:=http://localhost:5001}"
sed "s#__API_BASE__#${API_BASE}#g" /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js
exec nginx -g "daemon off;"
