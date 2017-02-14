FROM nginx:latest

ADD . /usr/share/nginx/html
RUN mv -f /usr/share/nginx/html/env.docker.json /usr/share/nginx/html/env.json
