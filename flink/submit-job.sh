#!/bin/bash
set -e
mkdir -p /opt/flink/lib
curl -fL https://repo.maven.apache.org/maven2/org/apache/flink/flink-sql-connector-kafka/3.1.0-1.18/flink-sql-connector-kafka-3.1.0-1.18.jar -o /opt/flink/lib/kafka.jar
curl -fL https://repo.maven.apache.org/maven2/org/apache/flink/flink-connector-jdbc/3.1.2-1.18/flink-connector-jdbc-3.1.2-1.18.jar -o /opt/flink/lib/jdbc.jar
curl -fL https://repo.maven.apache.org/maven2/org/postgresql/postgresql/42.7.3/postgresql-42.7.3.jar -o /opt/flink/lib/postgres.jar

for attempt in $(seq 1 60); do
  if curl -fsS http://jobmanager:8081/overview >/dev/null 2>&1 && timeout 2 bash -c '</dev/tcp/postgres/5432' && timeout 2 bash -c '</dev/tcp/redpanda/29092'; then
    break
  fi
  echo "Waiting for Flink, PostgreSQL, and Redpanda (attempt $attempt/60)..."
  sleep 2
done

/opt/flink/bin/sql-client.sh embedded \
  -Drest.address=jobmanager \
  -Drest.port=8081 \
  -f /opt/flink/jobs/hourly-aggregation.sql
