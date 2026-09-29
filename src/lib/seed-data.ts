// ============================================================
// Seed Data — Realistic Incident History
// ============================================================

import { Incident, MemoryEntry } from './types';

export const SEED_INCIDENTS: Incident[] = [
  {
    id: 'INC-0971',
    title: 'Payment API 502 after deployment',
    service: 'payment-api',
    severity: 'SEV-2',
    status: 'resolved',
    description:
      'Payment API started returning intermittent HTTP 502 errors immediately after deploying v2.14.3. Approximately 12% of requests affected. Customer-facing payment processing was degraded.',
    environment: 'production',
    createdAt: '2026-08-15T14:23:00Z',
    updatedAt: '2026-08-15T16:45:00Z',
    resolvedAt: '2026-08-15T16:45:00Z',
    symptoms: [
      'HTTP 502 errors on /api/payments/* endpoints',
      'Upstream connection timeouts in nginx logs',
      'Connection pool saturation alerts from payment-api pods',
      'Increased p99 latency from 120ms to 8500ms',
    ],
    logs: [
      {
        timestamp: '2026-08-15T14:23:12Z',
        level: 'error',
        service: 'payment-api',
        message:
          'upstream connect error or disconnect/reset before headers. reset reason: overflow',
      },
      {
        timestamp: '2026-08-15T14:23:15Z',
        level: 'error',
        service: 'payment-api',
        message:
          'connection pool exhausted: max_connections=50, active=50, waiting=127',
      },
      {
        timestamp: '2026-08-15T14:24:01Z',
        level: 'warn',
        service: 'nginx',
        message:
          'upstream timed out (110: Connection timed out) while connecting to upstream',
      },
      {
        timestamp: '2026-08-15T14:25:00Z',
        level: 'error',
        service: 'payment-api',
        message:
          'circuit breaker opened for payment-gateway after 15 consecutive failures',
      },
    ],
    timeline: [
      {
        timestamp: '2026-08-15T14:20:00Z',
        action: 'Deployment v2.14.3 completed',
        actor: 'deploy-bot',
        type: 'action',
      },
      {
        timestamp: '2026-08-15T14:23:00Z',
        action: '502 error rate exceeded threshold — PagerDuty alert triggered',
        actor: 'monitoring',
        type: 'detection',
      },
      {
        timestamp: '2026-08-15T14:30:00Z',
        action: 'Identified connection pool config changed in v2.14.3',
        actor: 'eng/sarah.chen',
        type: 'investigation',
      },
      {
        timestamp: '2026-08-15T15:00:00Z',
        action:
          'Rolled back to v2.14.2 — error rate dropped to baseline within 3 minutes',
        actor: 'eng/sarah.chen',
        type: 'resolution',
      },
    ],
    rootCause:
      'Deployment v2.14.3 included a configuration change that reduced the connection pool size from 200 to 50 connections. Under normal load this caused pool exhaustion, leading to upstream timeouts and 502 errors.',
    resolution:
      'Rolled back deployment to v2.14.2 and restored the connection pool configuration. Subsequently fixed the config in v2.14.4 with proper pool sizing and added connection pool utilization to the deployment canary checks.',
    lessonsLearned: [
      'Check connection pool metrics immediately after deployment',
      'Add connection pool utilization to canary analysis',
      'Configuration changes should be reviewed separately from code changes',
      'Set up alerts for connection pool saturation at 70% threshold',
    ],
    commands: [
      'kubectl rollout undo deployment/payment-api -n payments',
      'kubectl get pods -n payments -o wide',
      'curl -s http://payment-api:8080/actuator/health | jq .',
    ],
    memoryRetained: true,
    relatedIncidentIds: [],
  },
  {
    id: 'INC-1018',
    title: 'Checkout latency spike',
    service: 'checkout-service',
    severity: 'SEV-2',
    status: 'resolved',
    description:
      'Checkout service p95 latency spiked from 200ms to 12s during peak hours. Users reported checkout page hanging and timeouts. Cart abandonment rate increased by 340%.',
    environment: 'production',
    createdAt: '2026-09-01T18:15:00Z',
    updatedAt: '2026-09-01T20:30:00Z',
    resolvedAt: '2026-09-01T20:30:00Z',
    symptoms: [
      'Checkout API p95 latency >10s',
      'Redis cluster CPU at 98%',
      'Session cache miss rate jumped from 2% to 67%',
      'Customer complaints about checkout freezing',
    ],
    logs: [
      {
        timestamp: '2026-09-01T18:15:22Z',
        level: 'warn',
        service: 'checkout-service',
        message:
          'Redis operation timeout: GET session:usr_8a3f2 exceeded 5000ms',
      },
      {
        timestamp: '2026-09-01T18:16:00Z',
        level: 'error',
        service: 'checkout-service',
        message:
          'Failed to retrieve cart data: RedisTimeoutError after 3 retries',
      },
      {
        timestamp: '2026-09-01T18:17:30Z',
        level: 'warn',
        service: 'redis-sentinel',
        message:
          'Master node memory usage at 94% — eviction policy triggered',
      },
    ],
    timeline: [
      {
        timestamp: '2026-09-01T18:15:00Z',
        action: 'Latency alert triggered for checkout-service',
        actor: 'monitoring',
        type: 'detection',
      },
      {
        timestamp: '2026-09-01T18:25:00Z',
        action: 'Identified Redis memory pressure as root cause',
        actor: 'eng/michael.ross',
        type: 'investigation',
      },
      {
        timestamp: '2026-09-01T19:00:00Z',
        action:
          'Flushed stale session keys and scaled Redis cluster vertically',
        actor: 'eng/michael.ross',
        type: 'action',
      },
      {
        timestamp: '2026-09-01T20:30:00Z',
        action: 'Latency returned to baseline. Monitoring confirmed stable.',
        actor: 'eng/michael.ross',
        type: 'resolution',
      },
    ],
    rootCause:
      'A missing TTL on promotional session keys caused Redis memory to fill up during a flash sale event. Memory pressure triggered key evictions including active session data, causing cache misses and fallback to database queries under heavy load.',
    resolution:
      'Flushed stale promotional session keys, scaled Redis vertically, and added TTL enforcement for all session key types. Implemented Redis memory usage alerts at 70% and 85% thresholds.',
    lessonsLearned: [
      'All Redis keys must have explicit TTL values',
      'Monitor Redis memory usage relative to capacity during sale events',
      'Implement circuit breaker for Redis fallback to prevent cascading latency',
      'Load test session storage before major promotional events',
    ],
    commands: [
      'redis-cli INFO memory',
      'redis-cli DBSIZE',
      'redis-cli --scan --pattern "promo:session:*" | head -20',
    ],
    memoryRetained: true,
    relatedIncidentIds: [],
  },
  {
    id: 'INC-1029',
    title: 'Auth service database timeout',
    service: 'auth-service',
    severity: 'SEV-1',
    status: 'resolved',
    description:
      'Authentication service experienced complete database connection failures causing all login attempts to fail. Total outage duration was 47 minutes affecting all users.',
    environment: 'production',
    createdAt: '2026-09-10T09:05:00Z',
    updatedAt: '2026-09-10T09:52:00Z',
    resolvedAt: '2026-09-10T09:52:00Z',
    symptoms: [
      'All authentication requests returning 503',
      'PostgreSQL connection pool completely exhausted',
      'Database CPU at 100% on primary',
      'Replication lag exceeded 30 seconds',
    ],
    logs: [
      {
        timestamp: '2026-09-10T09:05:33Z',
        level: 'error',
        service: 'auth-service',
        message:
          'FATAL: remaining connection slots are reserved for non-replication superuser connections',
      },
      {
        timestamp: '2026-09-10T09:06:00Z',
        level: 'error',
        service: 'auth-service',
        message:
          'Connection pool exhausted: cannot acquire connection within 30s timeout',
      },
      {
        timestamp: '2026-09-10T09:07:15Z',
        level: 'error',
        service: 'postgres',
        message:
          'LOG: checkpoints are occurring too frequently (12 second intervals)',
      },
    ],
    timeline: [
      {
        timestamp: '2026-09-10T09:05:00Z',
        action: 'Auth service health check failures detected',
        actor: 'monitoring',
        type: 'detection',
      },
      {
        timestamp: '2026-09-10T09:10:00Z',
        action: 'Identified long-running query from analytics cron job',
        actor: 'eng/priya.sharma',
        type: 'investigation',
      },
      {
        timestamp: '2026-09-10T09:15:00Z',
        action: 'Killed runaway analytics query and blocked analytics user',
        actor: 'eng/priya.sharma',
        type: 'action',
      },
      {
        timestamp: '2026-09-10T09:52:00Z',
        action: 'All connections recovered. Service fully operational.',
        actor: 'eng/priya.sharma',
        type: 'resolution',
      },
    ],
    rootCause:
      'An unoptimized analytics query was running against the production auth database without a statement timeout. The query performed a full table scan on the 200M-row sessions table, consuming all available database connections and CPU.',
    resolution:
      'Terminated the runaway query, implemented statement timeouts (30s max), moved analytics queries to a read replica, and added database connection monitoring with automatic query killing for statements exceeding thresholds.',
    lessonsLearned: [
      'Never run analytics queries against production primary databases',
      'Set statement_timeout on all database connections',
      'Use read replicas for all non-transactional queries',
      'Implement query cost estimation gates in the analytics pipeline',
    ],
    commands: [
      "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;",
      'SELECT pg_terminate_backend(<pid>);',
      "ALTER ROLE analytics SET statement_timeout = '30s';",
    ],
    memoryRetained: true,
    relatedIncidentIds: [],
  },
  {
    id: 'INC-1037',
    title: 'Notification worker queue backlog',
    service: 'notification-service',
    severity: 'SEV-3',
    status: 'resolved',
    description:
      'Notification worker stopped processing messages from the RabbitMQ queue, causing a backlog of 450K undelivered notifications including order confirmations and password resets.',
    environment: 'production',
    createdAt: '2026-09-18T11:30:00Z',
    updatedAt: '2026-09-18T14:00:00Z',
    resolvedAt: '2026-09-18T14:00:00Z',
    symptoms: [
      'RabbitMQ queue depth growing: 450K messages',
      'Zero messages consumed in last 45 minutes',
      'Notification worker pods showing Ready but not processing',
      'Customer complaints about missing order confirmation emails',
    ],
    logs: [
      {
        timestamp: '2026-09-18T11:30:15Z',
        level: 'warn',
        service: 'notification-worker',
        message:
          'Consumer heartbeat missed — last acknowledged message 42 minutes ago',
      },
      {
        timestamp: '2026-09-18T11:31:00Z',
        level: 'error',
        service: 'notification-worker',
        message:
          'Deadlock detected: email template rendering thread blocked on DNS resolution',
      },
      {
        timestamp: '2026-09-18T11:32:00Z',
        level: 'error',
        service: 'rabbitmq',
        message:
          'Queue notifications.email: 450234 messages ready, 0 consumers active',
      },
    ],
    timeline: [
      {
        timestamp: '2026-09-18T11:30:00Z',
        action: 'Queue depth alert triggered',
        actor: 'monitoring',
        type: 'detection',
      },
      {
        timestamp: '2026-09-18T11:45:00Z',
        action:
          'Found all workers in deadlocked state due to DNS resolution failure',
        actor: 'eng/james.kim',
        type: 'investigation',
      },
      {
        timestamp: '2026-09-18T12:00:00Z',
        action: 'Restarted notification workers with DNS cache workaround',
        actor: 'eng/james.kim',
        type: 'action',
      },
      {
        timestamp: '2026-09-18T14:00:00Z',
        action:
          'Queue fully drained. All delayed notifications delivered.',
        actor: 'eng/james.kim',
        type: 'resolution',
      },
    ],
    rootCause:
      'A DNS infrastructure change caused the internal DNS resolver to intermittently fail. The notification workers template rendering engine performed a synchronous DNS lookup for loading remote templates, which blocked the consumer thread. Without a timeout on DNS resolution, all worker threads deadlocked.',
    resolution:
      'Restarted workers with a local DNS cache sidecar. Added async DNS resolution with 5s timeout for template loading. Implemented consumer health checks that detect processing stalls and auto-restart workers.',
    lessonsLearned: [
      'All network operations in workers must have explicit timeouts',
      'Queue consumers should have liveness checks beyond simple health endpoints',
      'DNS resolution should never block message processing threads',
      'Set up alerts for consumer processing rate drops, not just queue depth',
    ],
    commands: [
      'rabbitmqctl list_queues name messages consumers',
      'kubectl rollout restart deployment/notification-worker -n notifications',
      'kubectl logs -f deployment/notification-worker -n notifications --tail=100',
    ],
    memoryRetained: true,
    relatedIncidentIds: [],
  },
  {
    id: 'INC-1044',
    title: 'Order service intermittent 503',
    service: 'order-service',
    severity: 'SEV-2',
    status: 'resolved',
    description:
      'Order service returning sporadic 503 errors during order placement. Approximately 5% of orders failing. Correlated with increased memory usage on order-service pods.',
    environment: 'production',
    createdAt: '2026-09-22T16:10:00Z',
    updatedAt: '2026-09-22T18:30:00Z',
    resolvedAt: '2026-09-22T18:30:00Z',
    symptoms: [
      'Intermittent HTTP 503 on POST /api/orders',
      'Pod memory usage climbing steadily over 6 hours',
      'OOMKilled events in pod history',
      'Garbage collection pauses exceeding 2 seconds',
    ],
    logs: [
      {
        timestamp: '2026-09-22T16:10:45Z',
        level: 'error',
        service: 'order-service',
        message:
          'OutOfMemoryError: Java heap space — failed to allocate 67108864 bytes',
      },
      {
        timestamp: '2026-09-22T16:11:00Z',
        level: 'warn',
        service: 'order-service',
        message:
          'GC pause: 2847ms (full GC). Heap: 1.8GB/2.0GB used',
      },
      {
        timestamp: '2026-09-22T16:12:30Z',
        level: 'error',
        service: 'kubernetes',
        message:
          'Container order-service OOMKilled (exit code 137). Restarting...',
      },
    ],
    timeline: [
      {
        timestamp: '2026-09-22T16:10:00Z',
        action: 'Error rate alert triggered for order-service',
        actor: 'monitoring',
        type: 'detection',
      },
      {
        timestamp: '2026-09-22T16:30:00Z',
        action: 'Memory leak identified in order validation cache',
        actor: 'eng/alex.johnson',
        type: 'investigation',
      },
      {
        timestamp: '2026-09-22T17:00:00Z',
        action: 'Deployed hotfix with cache eviction and increased memory limit',
        actor: 'eng/alex.johnson',
        type: 'action',
      },
      {
        timestamp: '2026-09-22T18:30:00Z',
        action: 'Memory usage stable. No further OOM events.',
        actor: 'eng/alex.johnson',
        type: 'resolution',
      },
    ],
    rootCause:
      'A memory leak in the order validation cache was caused by a HashMap that stored validation results without eviction. Each unique product SKU combination added an entry that was never cleaned up, causing the heap to grow unbounded under load.',
    resolution:
      'Replaced the unbounded HashMap with a Caffeine cache with max size of 10K entries and 5-minute TTL. Increased pod memory limits from 2GB to 3GB as a safety margin. Added JVM heap utilization monitoring.',
    lessonsLearned: [
      'All in-memory caches must have explicit size limits and TTLs',
      'Monitor JVM heap utilization trends, not just instantaneous values',
      'Set up OOMKilled alerts with rapid response escalation',
      'Profile memory allocation during load tests before releases',
    ],
    commands: [
      'kubectl top pods -n orders',
      'kubectl describe pod <pod-name> -n orders | grep -A5 "Last State"',
      'jcmd <pid> GC.heap_info',
    ],
    memoryRetained: true,
    relatedIncidentIds: [],
  },
];

export const SEED_MEMORIES: MemoryEntry[] = SEED_INCIDENTS.map((inc) => ({
  id: `mem-${inc.id}`,
  sourceIncidentId: inc.id,
  sourceIncidentTitle: inc.title,
  service: inc.service,
  keywords: extractKeywords(inc),
  summary: `${inc.title}: ${inc.rootCause}`,
  rootCause: inc.rootCause || '',
  resolution: inc.resolution || '',
  lessonsLearned: inc.lessonsLearned || [],
  severity: inc.severity,
  createdAt: inc.resolvedAt || inc.updatedAt,
  status: 'active' as const,
}));

function extractKeywords(incident: Incident): string[] {
  const keywords = new Set<string>();
  keywords.add(incident.service);
  keywords.add(incident.severity);

  // Extract key terms from description
  const terms = incident.description.toLowerCase();
  if (terms.includes('502')) keywords.add('502');
  if (terms.includes('503')) keywords.add('503');
  if (terms.includes('timeout')) keywords.add('timeout');
  if (terms.includes('deployment')) keywords.add('deployment');
  if (terms.includes('connection pool')) keywords.add('connection-pool');
  if (terms.includes('latency')) keywords.add('latency');
  if (terms.includes('memory')) keywords.add('memory');
  if (terms.includes('database')) keywords.add('database');
  if (terms.includes('queue')) keywords.add('queue');
  if (terms.includes('redis')) keywords.add('redis');
  if (terms.includes('oom')) keywords.add('oom');

  // Extract from root cause
  if (incident.rootCause) {
    const rc = incident.rootCause.toLowerCase();
    if (rc.includes('connection pool')) keywords.add('connection-pool');
    if (rc.includes('memory')) keywords.add('memory-leak');
    if (rc.includes('dns')) keywords.add('dns');
    if (rc.includes('redis')) keywords.add('redis');
    if (rc.includes('deadlock')) keywords.add('deadlock');
    if (rc.includes('cache')) keywords.add('cache');
    if (rc.includes('query')) keywords.add('query');
  }

  return Array.from(keywords);
}
