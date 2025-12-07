#!/bin/bash

DEPLOY_PATH="/opt/gtaskall"

usage() {
    cat << EOF
GTaskALL Deployment Management Script

Usage: $0 [COMMAND]

Commands:
    start       Start all services
    stop        Stop all services
    restart     Restart all services
    status      Show service status
    logs        Show logs (use -f for follow)
    health      Check service health
    backup      Backup current deployment
    rollback    Rollback to previous version
    clean       Clean up old Docker images and containers
    update-env  Reload environment variables

Examples:
    $0 status
    $0 logs -f
    $0 restart
EOF
}

check_deploy_path() {
    if [ ! -d "$DEPLOY_PATH" ]; then
        echo "Error: Deploy path $DEPLOY_PATH does not exist"
        exit 1
    fi
    cd "$DEPLOY_PATH"
}

case "${1:-}" in
    start)
        check_deploy_path
        docker compose up -d
        echo "Services started"
        ;;
    stop)
        check_deploy_path
        docker compose down
        echo "Services stopped"
        ;;
    restart)
        check_deploy_path
        docker compose restart
        echo "Services restarted"
        ;;
    status)
        check_deploy_path
        docker compose ps
        ;;
    logs)
        check_deploy_path
        shift
        docker compose logs "$@"
        ;;
    health)
        check_deploy_path
        echo "=== Container Health ==="
        docker compose ps
        echo ""
        echo "=== Nginx Health Check ==="
        curl -f http://localhost/health || echo "Health check failed"
        ;;
    backup)
        check_deploy_path
        backup_dir="$DEPLOY_PATH/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        docker save gtaskall:latest | gzip > "$backup_dir/image.tar.gz"
        cp docker-compose.yml "$backup_dir/"
        cp -r nginx "$backup_dir/"
        echo "Backup created at $backup_dir"
        ;;
    rollback)
        check_deploy_path
        latest_backup=$(ls -td $DEPLOY_PATH/backups/*/ | head -1)
        if [ -z "$latest_backup" ]; then
            echo "No backups found"
            exit 1
        fi
        echo "Rolling back to $latest_backup"
        docker compose down
        docker load < "${latest_backup}/image.tar.gz"
        docker compose up -d
        echo "Rollback complete"
        ;;
    clean)
        docker system prune -af --volumes
        echo "Cleanup complete"
        ;;
    update-env)
        check_deploy_path
        echo "Restarting services to reload .env..."
        docker compose down
        docker compose up -d
        echo "Environment variables reloaded"
        ;;
    *)
        usage
        exit 1
        ;;
esac
