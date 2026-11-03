import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "submission-api",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(",")
});

export const kafkaProducer = kafka.producer({ idempotent: true, maxInFlightRequests: 5 });
let connected = false;

export const connectKafka = async () => {
    if (!connected) {
        await kafkaProducer.connect();
        connected = true;
    }
};

export const publishSubmission = async (submission) => {
    try {
        await connectKafka();
        await kafkaProducer.send({
            topic: process.env.KAFKA_TOPIC || "submission-events",
            messages: [{
                key: String(submission.id),
                value: JSON.stringify({
                    event_id: String(submission.id),
                    form_id: submission.form_id,
                    created_at: new Date(submission.createdAt).toISOString(),
                    idempotency_key: submission.idempotency_key
                })
            }]
        });
    } catch (error) {
        console.error("Kafka publish failed:", error.message);
    }
};
