# File: backend/app.py
import secrets
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import subprocess
import os
import sys
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import threading
import pika
from flask_socketio import SocketIO 
import json

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from the .env file
load_dotenv(dotenv_path='/home/almalinux/Image Classification/backend/.env')

# Read the CORS origins from the environment variable (comma-separated) or provide a fallback
cors_origins = os.getenv('REACT_APP_CORS_ORIGINS', 'https://react-ucabpor.comp0235.condenser.arc.ucl.ac.uk,http://localhost:3501').split(',')

# Ensure localhost is always included in the CORS origins
if 'http://localhost:3501' not in cors_origins:
    cors_origins.append('http://localhost:3501')

logger.info(f"CORS origins: {cors_origins}")

app = Flask(__name__)
# Enable CORS with multiple origins
CORS(app, origins=cors_origins)

# Setup Flask-SocketIO with allowed origins for CORS
socketio = SocketIO(app, cors_allowed_origins=cors_origins)

# Configs
app.config['JWT_SECRET_KEY'] = secrets.token_urlsafe(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Extensions
jwt = JWTManager(app)
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

# Create DB tables and a test user
with app.app_context():
    db.create_all()
    if not User.query.filter_by(username='testuser').first():
        hashed_pw = generate_password_hash('testpass')
        test_user = User(username='testuser', password=hashed_pw)
        db.session.add(test_user)
        db.session.commit()
        logger.info("Test user 'testuser' created with password 'testpass'")

# Set up an upload folder (make sure this directory exists)
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    logger.info(f"Register request received: {data}")
    
    if User.query.filter_by(username=data['username']).first():
        logger.info("Username already exists")
        return jsonify({"msg": "Username already exists"}), 400
    
    hashed_pw = generate_password_hash(data['password'])
    new_user = User(username=data['username'], password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    logger.info(f"User '{data['username']}' registered successfully")
    
    # Create and return a JWT token for automatic login
    token = create_access_token(identity=data['username'])
    return jsonify({"msg": "User registered successfully", "access_token": token}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    logger.info(f"Login attempt: {data['username']}")
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        token = create_access_token(identity=user.username)
        logger.info(f"Login successful for user: {data['username']}")
        return jsonify(access_token=token)
    logger.warning(f"Login failed for user: {data['username']}")
    return jsonify({"msg": "Invalid credentials"}), 401

@app.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    current_user = get_jwt_identity()
    logger.info(f"Protected route accessed by user: {current_user}")

    # Ensure the file is in the request
    if 'file' not in request.files:
        logger.error("No file part in the request")
        return jsonify(msg="No file part"), 400

    file = request.files['file']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify(msg="No selected file"), 400

    # Save the uploaded file in a secure way
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    logger.info(f"File saved at: {file_path}")

    try:
        # Run the spark job, passing the image file path as an argument.
        # Make sure your spark_job.py script is updated to accept an '--image' argument.
        # subprocess.run([sys.executable, 'spark_job.py', '--image', file_path], check=True)
        logger.info("Submitting request to get prediciton")
        put_image_to_hdfs(file_path, "/data/images/")
        cleanup_upload_folder(file_path)
        message_data = {
            'filename': filename,
            'hdfs_path': "/data/images/" + filename
        }

        message = json.dumps(message_data)
        request_publisher(message)
        logger.info("Request sent to RabbitMQ")
        response = response_consumer()
        logger.info("Response received from RabbitMQ")


    except subprocess.CalledProcessError as e:
        logger.error(f"Spark job failed: {e}")
        return jsonify(msg="Prediction failed due to spark job error"), 500

    # You can have your spark_job.py script write out a prediction result file or 
    # capture output in some way. Here we simply return a dummy response.
    result = {
        "Result": response
    }
    return jsonify(result), 200


def put_image_to_hdfs(local_file, hdfs_path):
    # Run the hdfs dfs -put command using subprocess
    try:
        logger.info(f"Uploading {local_file} to HDFS at {hdfs_path}")
        result = subprocess.run(
            ['hdfs', 'dfs', '-put', local_file, hdfs_path],
            check=True,  # This will raise an error if the command fails
            stdout=subprocess.PIPE,  # Capture standard output
            stderr=subprocess.PIPE   # Capture standard error
        )
        print(f"Output: {result.stdout.decode()}")
        logger.info(f"Successfully uploaded {local_file} to HDFS at {hdfs_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr.decode()}")

def cleanup_upload_folder(local_file):
    try:
        os.remove(local_file)
        logger.info(f"Removed local file: {local_file}")
    except Exception as e:
        logger.error(f"Error removing local file: {e}")


credentials = pika.PlainCredentials('myuser', 'mypassword')
# ------------- RabbitMQ Consumer Setup with SocketIO ------------------
def model_tuning_consumer():
    def callback(ch, method, properties, body):
        message = body.decode('utf-8')
        print(" [x] Received message from RabbitMQ: %s" % message)
        # Emit a SocketIO event to the front end with the received message.
        socketio.emit('rabbitmq_message', {'message': message}, broadcast=True)
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='worker1', credentials=credentials))
        channel = connection.channel()
        channel.queue_declare(queue='model_queue', durable=True)
        channel.exchange_declare(exchange='direct_logs', exchange_type='direct')
        channel.queue_bind(exchange='direct_logs', queue='model_queue', routing_key='model_key')
        print("[*] RabbitMQ consumer started, waiting for messages.")
        channel.basic_consume(queue='model_queue', on_message_callback=callback, auto_ack=True)
        channel.start_consuming()
    except Exception as e:
        logger.error("Error in RabbitMQ consumer: %s", e)

# Start the consumer in a background daemon thread.
threading.Thread(target=model_tuning_consumer, daemon=True).start()
# ------------- End RabbitMQ Consumer Setup --------------


def request_publisher(message):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='worker1', credentials=credentials))
        channel = connection.channel()

        # Declare a direct exchange
        channel.exchange_declare(exchange='direct_logs', exchange_type='direct')

        # Declare the queue
        channel.queue_declare(queue='request_queue', durable=True)

        # Bind the queue to the exchange with a specific routing key
        channel.queue_bind(exchange='direct_logs', queue='request_queue', routing_key='request_key')

        # Publish the message to the direct exchange with a routing key
        channel.basic_publish(exchange='direct_logs', 
                            routing_key='request_key', 
                            body=message)
        print("Message sent to RabbitMQ: %s" % message)
        # Close the connection
        connection.close()
    except Exception as e:
        logger.error("Error in RabbitMQ publisher: %s", e)

def response_consumer():
    response_result = {}
    def response_callback(ch, method, properties, body):
        message = body.decode('utf-8')
        print(" [x] Received response from RabbitMQ: %s" % message)
        response_result['message'] = message
        ch.stop_consuming()  # Stop consuming after receiving the first message

    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='worker1', credentials=credentials))
        channel = connection.channel()

        # Declare a direct exchange
        channel.exchange_declare(exchange='direct_logs', exchange_type='direct')

        # Declare the queue
        channel.queue_declare(queue='response_queue', durable=True)

        # Bind the queue to the exchange with a specific routing key
        channel.queue_bind(exchange='direct_logs', queue='response_queue', routing_key='response_key')

        print(' [*] Waiting for messages. To exit press CTRL+C')
        channel.basic_consume(queue='response_queue', on_message_callback=response_callback, auto_ack=True)

        channel.start_consuming()

        connection.close()
        return response_result

    except Exception as e:
        logger.error("Error in RabbitMQ response consumer: %s", e)
        return None

if __name__ == '__main__':
    #app.run(debug=True, host='0.0.0.0', port=3500)
    socketio.run(app, debug=True, host='0.0.0.0', port=3500)
