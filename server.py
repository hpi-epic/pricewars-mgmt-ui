from flask import Flask
from flask import send_from_directory
app = Flask(__name__, static_folder='')

@app.route('/')
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)