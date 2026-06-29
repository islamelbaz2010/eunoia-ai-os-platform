# Grafana — Operations Guide

Eunoia AI OS includes a ready-to-import Grafana dashboard that visualises system health, memory trends, and provider status over time.

---

## Dashboard

**File**: `docs/operations/grafana/eunoia-system-health.json`  
**UID**: `eunoia-system-health`  
**Refresh**: 30s (matches `/api/health` readiness cache TTL)  

### Panels

| Panel | Type | Metric |
|-------|------|--------|
| System Health | Stat (HEALTHY/DEGRADED) | `health_system_up` |
| Process Uptime | Stat + sparkline | `process_uptime_seconds` |
| Heap Used | Stat + sparkline | `process_memory_heap_used_bytes` |
| Heap Utilisation | Stat (%) | `heap_used / heap_total` |
| Total Health Checks | Stat | `health_checks_total` |
| Provider Status | Multi-stat (UP/DOWN per provider) | `health_provider_up{provider="…"}` |
| Memory Usage Over Time | Time series | heap/rss/external |
| Heap Utilisation Over Time | Time series | heap % |
| Health Checks: Total vs Healthy | Time series | `increase(health_checks_total[5m])` |
| Provider Status Over Time | Time series | per-provider timeline |

---

## Import Instructions

### Option A — Grafana UI

1. Open Grafana → **Dashboards** → **Import**
2. Click **Upload JSON file**
3. Select `docs/operations/grafana/eunoia-system-health.json`
4. Select your Prometheus datasource when prompted
5. Click **Import**

### Option B — Grafana API

```bash
# Replace GRAFANA_URL and GRAFANA_TOKEN with your values
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d @docs/operations/grafana/eunoia-system-health.json \
  "$GRAFANA_URL/api/dashboards/import"
```

### Option C — Terraform / Grafana Provider

```hcl
resource "grafana_dashboard" "eunoia_system_health" {
  config_json = file("docs/operations/grafana/eunoia-system-health.json")
}
```

---

## Prerequisites

Grafana must be connected to a Prometheus datasource that scrapes `/api/metrics`.

See `docs/operations/prometheus.md` for Prometheus configuration.

---

## Alert Rules

Import the Prometheus alert rules from `docs/operations/prometheus.md` into your Alertmanager:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d '{"namespace": "eunoia", "ruleGroup": {"name": "eunoia-alerts", "interval": "1m", "rules": []}}' \
  "$GRAFANA_URL/api/ruler/grafana/api/v1/rules"
```

Or manage alert rules directly in Grafana UI → **Alerting** → **Alert Rules**.

---

## Self-hosted Setup (Docker Compose)

See the full Docker Compose configuration in `docs/operations/prometheus.md`.

Quick start:
```bash
docker compose -f docs/operations/docker-compose.monitoring.yml up -d
```

Access Grafana at `http://localhost:3001` (default credentials: `admin` / `changeme`).

---

## Recommended Retention

| Data | Prometheus Retention | Reason |
|------|---------------------|--------|
| Metrics (30d) | `--storage.tsdb.retention.time=30d` | Enough for monthly trend analysis |
| Health history (in-memory) | Last 100 checks | Ring buffer — no external storage needed |

---

## Dashboard Customisation

The dashboard JSON uses `${DS_PROMETHEUS}` as a variable for the datasource name. When you import, Grafana maps this to whichever datasource you select. To hardcode:

```json
"datasource": { "type": "prometheus", "uid": "YOUR_DATASOURCE_UID" }
```

Find your datasource UID at Grafana → **Configuration** → **Data sources** → select Prometheus → copy UID from the URL.
