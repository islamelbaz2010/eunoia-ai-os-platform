# Prometheus Metrics — Operations Guide

Eunoia AI OS exposes a Prometheus-compatible metrics endpoint at `GET /api/metrics`.

---

## Endpoint

```
GET /api/metrics
Authorization: Bearer <METRICS_TOKEN>   (required when METRICS_TOKEN is set)
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

The endpoint never triggers live infrastructure checks — health provider status is read from the in-memory ring buffer populated by `/api/health` and `/api/admin/system`.

---

## Authentication

| `METRICS_TOKEN` set? | Behaviour |
|---------------------|-----------|
| Not set | Open access (local dev only) |
| Set | Requires `Authorization: Bearer <token>` header |

**Always set `METRICS_TOKEN` in production** to prevent unauthorised access to process metrics.

---

## Available Metrics

### Process

| Metric | Type | Description |
|--------|------|-------------|
| `process_uptime_seconds` | gauge | Seconds since Node.js process started |
| `process_memory_heap_used_bytes` | gauge | Heap memory in use |
| `process_memory_heap_total_bytes` | gauge | Total heap allocated |
| `process_memory_rss_bytes` | gauge | Resident set size |
| `process_memory_external_bytes` | gauge | External C++ object memory |
| `process_memory_array_buffers_bytes` | gauge | ArrayBuffer memory |

### Application

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `app_info` | gauge | `version`, `node_version`, `environment` | Always 1 — read labels for values |

### Health Providers

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `health_provider_up` | gauge | `provider` | 1=ok/configured/disabled, 0=degraded/error |
| `health_system_up` | gauge | — | Overall health (1=healthy, 0=degraded) |
| `health_last_check_timestamp_seconds` | gauge | — | Unix timestamp of last check execution |
| `health_checks_total` | counter | — | Total checks run since last restart |
| `health_checks_healthy_total` | counter | — | Healthy checks since last restart |

**Note on counters**: `health_checks_total` resets on process restart. For PM2/VPS deployments this is stable. For serverless deployments, use the `rate()` function in Prometheus to account for resets.

---

## Sample Output

```
# HELP process_uptime_seconds Number of seconds since the Node.js process started
# TYPE process_uptime_seconds gauge
process_uptime_seconds 7200

# HELP process_memory_heap_used_bytes Heap memory in use
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes 134217728

# HELP app_info Application information (always 1 — read labels for values)
# TYPE app_info gauge
app_info{version="0.1.0",node_version="v24.0.0",environment="production"} 1

# HELP health_provider_up Whether a health provider check succeeded
# TYPE health_provider_up gauge
health_provider_up{provider="environment"} 1
health_provider_up{provider="database"} 1
health_provider_up{provider="auth"} 1
health_provider_up{provider="storage"} 1
health_provider_up{provider="openai"} 1
health_provider_up{provider="email"} 1
health_provider_up{provider="cache"} 0
health_provider_up{provider="queue"} 0

# HELP health_system_up Overall system health (1=healthy, 0=degraded)
# TYPE health_system_up gauge
health_system_up 1

# HELP health_checks_total Total health checks executed since last restart
# TYPE health_checks_total counter
health_checks_total 42

# HELP health_checks_healthy_total Total healthy health checks since last restart
# TYPE health_checks_healthy_total counter
health_checks_healthy_total 41
```

---

## Prometheus Configuration

### `prometheus.yml`

```yaml
global:
  scrape_interval: 30s      # Match /api/health cache TTL
  evaluation_interval: 30s

scrape_configs:
  - job_name: eunoia-ai-os
    scheme: https
    metrics_path: /api/metrics
    bearer_token: "<METRICS_TOKEN>"
    static_configs:
      - targets:
          - yourdomain.com
    tls_config:
      insecure_skip_verify: false
```

### Docker Compose (self-hosted)

```yaml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  grafana-data:
```

---

## Recommended Alert Rules

```yaml
# alerts.yml
groups:
  - name: eunoia
    rules:
      - alert: SystemDegraded
        expr: health_system_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Eunoia AI OS system is degraded"
          description: "health_system_up has been 0 for more than 2 minutes"

      - alert: DatabaseDown
        expr: health_provider_up{provider="database"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database provider is down"

      - alert: HighHeapUsage
        expr: process_memory_heap_used_bytes / process_memory_heap_total_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Heap usage above 85%"

      - alert: ProcessRestarted
        expr: process_uptime_seconds < 60
        labels:
          severity: info
        annotations:
          summary: "Process restarted"
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `METRICS_TOKEN` | Yes (production) | Bearer token for /api/metrics authentication |

---

## Limitations

1. **Counters reset on restart** — Use `increase()` or `rate()` in Prometheus queries, not raw counter values.
2. **No HTTP request metrics** — HTTP request counting requires persistent state not available in serverless. For full HTTP metrics, consider Datadog APM or New Relic.
3. **Single-process** — Metrics reflect one Node.js process. For multi-instance deployments, Prometheus aggregates across all instances automatically.
4. **Provider status is buffered** — `/api/metrics` reads from the ring buffer, not from live infrastructure. If no health checks have run (fresh restart), provider metrics are omitted.
