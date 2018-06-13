FROM python:3.6-alpine

ENV APP_HOME /management-ui
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD . $APP_HOME

RUN python3 -m pip install flask requests

CMD ["python3", "-u", "server.py"]
