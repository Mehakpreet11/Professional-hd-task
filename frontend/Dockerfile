FROM nginx:alpine

# Copy static site
COPY public/ /usr/share/nginx/html/

# Runtime config & server config
COPY config.template.js /usr/share/nginx/html/config.template.js
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
# Default for staging; prod compose overrides to 5002
ENV API_BASE=http://localhost:5001
ENTRYPOINT ["/docker-entrypoint.sh"]
