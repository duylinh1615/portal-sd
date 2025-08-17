FROM nginx:1.29.1-alpine

WORKDIR /usr/share/nginx/html

COPY index.html ./
COPY main.js ui-home.js ui-dashboard.js ui-unlock.js ui-vm.js ./modules/
COPY nginx.conf   /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx /var/cache/nginx /var/run /var/log/nginx
USER nginx

EXPOSE 8080
