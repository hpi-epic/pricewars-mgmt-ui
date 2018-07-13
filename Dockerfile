FROM python:3.6

ENV APP_HOME /management-ui
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD . $APP_HOME

RUN python3 -m pip install -r requirements.txt

CMD ["python3", "-u", "server.py"]
