FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend files
COPY index.html  /usr/share/nginx/html/index.html
COPY style.css   /usr/share/nginx/html/style.css
COPY app.js      /usr/share/nginx/html/app.js

# nginx runs on port 80 by default
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
