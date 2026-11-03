SET 'execution.checkpointing.mode' = 'EXACTLY_ONCE';
SET 'execution.checkpointing.interval' = '10s';
SET 'state.checkpoints.dir' = 'file:///tmp/flink/checkpoints';

ADD JAR 'file:///opt/flink/lib/kafka.jar';
ADD JAR 'file:///opt/flink/lib/jdbc.jar';
ADD JAR 'file:///opt/flink/lib/postgres.jar';

CREATE TABLE submission_events (
  event_id STRING,
  form_id STRING,
  idempotency_key STRING,
  created_at STRING,
  event_time AS TO_TIMESTAMP(created_at, 'yyyy-MM-dd''T''HH:mm:ss.SSS''Z'''),
  WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'submission-events',
  'properties.bootstrap.servers' = 'redpanda:29092',
  'properties.group.id' = 'submission-hourly-aggregation',
  'scan.startup.mode' = 'earliest-offset',
  'format' = 'json',
  'json.ignore-parse-errors' = 'false'
);

CREATE TABLE submission_hourly_counts (
  form_id STRING,
  hour_start TIMESTAMP(3),
  submission_count BIGINT,
  updated_at TIMESTAMP(3),
  PRIMARY KEY (form_id, hour_start) NOT ENFORCED
) WITH (
  'connector' = 'jdbc',
  'url' = 'jdbc:postgresql://postgres:5432/vinam_db',
  'table-name' = 'submission_hourly_counts',
  'username' = 'vinam',
  'password' = 'vinam123'
);

INSERT INTO submission_hourly_counts
SELECT form_id,
       TUMBLE_START(event_time, INTERVAL '1' HOUR) AS hour_start,
       COUNT(DISTINCT idempotency_key) AS submission_count,
       CURRENT_TIMESTAMP AS updated_at
FROM submission_events
GROUP BY form_id, TUMBLE(event_time, INTERVAL '1' HOUR);
