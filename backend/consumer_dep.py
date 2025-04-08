import pika

def callback(ch, method, properties, body):
    print(" [x] Received %r" % body)

# Use new credentials instead of relying on the default guest account
credentials = pika.PlainCredentials('myuser', 'mypassword')
connection = pika.BlockingConnection(pika.ConnectionParameters(host='management', credentials=credentials))
channel = connection.channel()

channel.queue_declare(queue='task_queue')

print(' [*] Waiting for messages. To exit press CTRL+C')
channel.basic_consume(queue='task_queue', on_message_callback=callback, auto_ack=True)

channel.start_consuming()