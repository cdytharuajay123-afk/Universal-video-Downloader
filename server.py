from flask import Flask
from flask_socketio import SocketIO, emit, join_room
from typing import Any, Dict

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route('/')
def index() -> str:
    return "Server is running."


# --------------------------
# Socket.IO events
# --------------------------
@socketio.on('connect')
def handle_connect() -> None:
    emit('connected', {'message': 'You are connected to the server!'})


@socketio.on('join')
def handle_join(data: Any) -> None:
    if not isinstance(data, dict):  # ✅ Prevent `.get()` on None
        return
    client_id = data.get('client_id')
    if client_id:
        join_room(client_id)  # type: ignore
        emit('joined', {'message': f'Joined room {client_id}'}, to=client_id)  # ✅ use `to`


@socketio.on('message')
def handle_message(data: Any) -> None:
    if not isinstance(data, dict):
        return
    msg = data.get('message', '')
    emit('message', {'message': msg}, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=False)
