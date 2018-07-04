import collections
import json
import threading
import time

from kafka import KafkaConsumer
from kafka import TopicPartition
from kafka.errors import NoBrokersAvailable

#TODO: remove hard-coded topics
# The following kafka topics are accessible by the management UI
topics = ['addOffer', 'buyOffer', 'profit', 'updateOffer', 'updates', 'salesPerMinutes',
          'cumulativeAmountBasedMarketshare', 'cumulativeRevenueBasedMarketshare',
          'marketSituation', 'revenuePerMinute', 'revenuePerHour', 'profitPerMinute', 'inventory_level']


class EventSender:
    def __init__(self, kafka_endpoint: str, socketio):
        wait_for_kafka(kafka_endpoint)
        self.consumer = KafkaConsumer(bootstrap_servers=kafka_endpoint)
        self.socketio = socketio
        self.dumps = {}
        end_offset = {}

        for topic in topics:
            self.dumps[topic] = collections.deque(maxlen=100)
            current_partition = TopicPartition(topic, 0)
            self.consumer.assign([current_partition])
            self.consumer.seek_to_end()
            end_offset[topic] = self.consumer.position(current_partition)

        topic_partitions = [TopicPartition(topic, 0) for topic in topics]
        self.consumer.assign(topic_partitions)
        for topic in topics:
            self.consumer.seek(TopicPartition(topic, 0), max(0, end_offset[topic] - 100))

        self.thread = threading.Thread(target=self.run)
        self.thread.daemon = True  # Demonize thread
        self.thread.start()  # Start the execution

    def on_connect(self):
        if self.dumps:
            for msg_topic in self.dumps:
                messages = list(self.dumps[msg_topic])
                self.socketio.emit(msg_topic, messages, namespace='/')

    def run(self):
        for msg in self.consumer:
            try:
                msg_json = json.loads(msg.value.decode('utf-8'))
                if 'http_code' in msg_json and msg_json['http_code'] != 200:
                    continue

                output = {
                    "topic": msg.topic,
                    "timestamp": msg.timestamp,
                    "value": msg_json
                }
                output_json = json.dumps(output)
                self.dumps[str(msg.topic)].append(output)

                self.socketio.emit(str(msg.topic), output_json, namespace='/')
            except Exception as e:
                print('error emit msg', e)

        print('Stop consuming Kafka events')
        self.consumer.close()


def wait_for_kafka(kafka_endpoint, timeout: float = 60) -> None:
    """
    Waits until it is possible to connect to Kafka.
    """
    start = time.time()
    while time.time() - start < timeout:
        try:
            KafkaConsumer(consumer_timeout_ms=1000, bootstrap_servers=kafka_endpoint)
            return
        except NoBrokersAvailable:
            pass
    raise RuntimeError(kafka_endpoint + ' not reachable')
