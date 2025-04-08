import pika
import time

time.sleep(5)

credentials = pika.PlainCredentials('myuser', 'mypassword')
connection = pika.BlockingConnection(pika.ConnectionParameters(host='management', credentials=credentials))
channel = connection.channel()

channel.queue_declare(queue='task_queue')

message = "Model tuning completed"
channel.basic_publish(exchange='',
                      routing_key='task_queue',
                      body=message)
print(" [x] Sent %r" % message)

connection.close()