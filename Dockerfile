FROM nginx:latest

ADD nginx.conf /etc/nginx

ADD . /usr/share/nginx/html
RUN mv -f /usr/share/nginx/html/env.docker.json /usr/share/nginx/html/env.json
