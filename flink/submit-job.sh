#!/bin/bash
set -e
mkdir -p /opt/flink/lib
curl -fL https://repo.maven.apache.org/maven2/org/apache/flink/flink-sql-connector-kafka/3.1.0-1.18/flink-sql-connector-kafka-3.1.0-1.18.jar -o /opt/flink/lib/kafka.jar
curl -fL https://repo.maven.apache.org/maven2/org/apache/flink/flink-connector-jdbc/3.1.2-1.18/flink-connector-jdbc-3.1.2-1.18.jar -o /opt/flink/lib/jdbc.jar
curl -fL https://repo.maven.apache.org/maven2/org/postgresql/postgresql/42.7.3/postgresql-42.7.3.jar -o /opt/flink/lib/postgres.jar
/opt/flink/bin/sql-client.sh embedded -f /opt/flink/jobs/hourly-aggregation.sql
