from flask import Flask
from flask import send_from_directory
from flask import request
from flask_socketio import SocketIO
import requests

from event_sender import EventSender

app = Flask(__name__, static_folder='')
socketio = SocketIO(app)

#todo use host from config
sender = EventSender('kafka:9092', socketio)
socketio.on_event('connect', sender.on_connect)

@app.route('/')
@app.route('/index.html')
def index():
    return app.send_static_file('index.html')

@app.route('/env.json')
def environment():
    return app.send_static_file('env.json')

@app.route('/asset/<path:path>')
def asset_files(path):
    return send_from_directory('asset', path)

@app.route('/bower_components/<path:path>')
def bower_files(path):
    return send_from_directory('bower_components', path)

@app.route('/request', methods=['GET', 'POST', 'PUT', 'DELETE'])
def forward_request():
    response = requests.request(request.method, request.args['url'], json=request.get_json())
    return response.text, response.status_code

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=80)