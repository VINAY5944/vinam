# Submission API

## Run

```powershell
docker compose up -d --build
npm run db:migrate
```

The API is available at `http://localhost:4000`. Migrations also run automatically in the Docker API container. Flink UI: `http://localhost:8081`.

## API

- `POST /submissions`
- `GET /forms/contact-form/submissions?page=1`

## Redis duplicate protection

Every request checks `submission:<idempotency_key>` in Redis before PostgreSQL. Redis contains the original submission JSON, with a 24-hour TTL. PostgreSQL also has a unique index on `idempotency_key`, so concurrent requests remain correct even if Redis is cold or unavailable.

## Load test

```powershell
node load-test.mjs
```

The script sends 100,000 requests: 80,000 unique keys followed by 20,000 repeats of the first 20,000 keys. It reports created, duplicate, error, and requests-per-second counts.

## Flink aggregation

A Redpanda Kafka topic receives one event only after a submission is inserted. The Flink job tumbling-counts events by `form_id` and event hour and upserts into `submission_hourly_counts` in PostgreSQL.

For crash recovery, Flink checkpoints Kafka offsets together with window state to `file:///flink/checkpoints` using exactly-once checkpointing. Restarting restores both offsets and operator state. Kafka commits offsets atomically with checkpointed state, and PostgreSQL sink primary keys `(form_id, hour_start)` make retransmitted updates idempotent. `COUNT(DISTINCT idempotency_key)` additionally prevents a replayed submission key from incrementing a window twice.

Check results:

```powershell
docker compose exec postgres psql -U vinam -d vinam_db -c "SELECT * FROM submission_hourly_counts ORDER BY hour_start DESC, form_id;"
```
