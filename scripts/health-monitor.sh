#!/bin/bash

DEPLOY_PATH="/opt/gtaskall"
ALERT_EMAIL="admin@example.com"

check_service() {
    local service=$1
    if ! docker ps | grep -q "$service"; then
        echo "ERROR: $service container is not running"
        return 1
    fi
    return 0
}

check_health_endpoint() {
    if ! curl -sf http://localhost/health > /dev/null; then
        echo "ERROR: Health endpoint not responding"
        return 1
    fi
    return 0
}

check_disk_space() {
    local usage=$(df -h $DEPLOY_PATH | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        echo "WARNING: Disk usage is ${usage}%"
        return 1
    fi
    return 0
}

check_docker_health() {
    cd $DEPLOY_PATH
    local unhealthy=$(docker compose ps | grep -c "unhealthy")
    if [ "$unhealthy" -gt 0 ]; then
        echo "ERROR: $unhealthy unhealthy containers"
        return 1
    fi
    return 0
}

main() {
    echo "=== GTaskALL Health Check $(date) ==="

    errors=0

    check_service "gtaskall-nginx" || ((errors++))
    check_service "gtaskall-app" || ((errors++))
    check_health_endpoint || ((errors++))
    check_disk_space || ((errors++))
    check_docker_health || ((errors++))

    if [ $errors -gt 0 ]; then
        echo "❌ Health check failed with $errors error(s)"
        # Send alert (configure your alerting here)
        # mail -s "GTaskALL Health Check Failed" $ALERT_EMAIL < /tmp/health-check.log
        exit 1
    else
        echo "✅ All health checks passed"
        exit 0
    fi
}

main
