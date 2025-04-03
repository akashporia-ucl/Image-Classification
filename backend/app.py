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

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

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
    return jsonify({"msg": "User registered successfully"}), 201

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
        subprocess.run([sys.executable, 'spark_job.py', '--image', file_path], check=True)
        logger.info("Spark job executed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Spark job failed: {e}")
        return jsonify(msg="Prediction failed due to spark job error"), 500

    # You can have your spark_job.py script write out a prediction result file or 
    # capture output in some way. Here we simply return a dummy response.
    result = {
        "prediction": "dummy_value",  # Replace with actual prediction output
        "details": "Spark job finished processing"
    }
    return jsonify(result), 200

@app.route('/run-spark', methods=['GET'])
@jwt_required()
def run_spark():
    current_user = get_jwt_identity()
    logger.info(f"Spark job triggered by user: {current_user}")
    from pyspark.sql import SparkSession
    spark = SparkSession.builder.appName("FlaskSparkApp").getOrCreate()
    data = [(1, 'Alice'), (2, 'Bob')]
    df = spark.createDataFrame(data, ['id', 'name'])
    result = df.collect()
    return jsonify(data=[row.asDict() for row in result])

if __name__ == '__main__':
    app.run(debug=True, port=3500)