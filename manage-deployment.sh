#!/bin/bash

# ============================================
# Deployment Management Menu
# ============================================
# Description: Interactive menu for deployment operations
# Author: Spryclips Team
# Last Updated: November 2025
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
STATE_FILE="$HOME/Tiktok_clone/.deployment-state"
PM2_APP_BLUE="spryclips-blue"
PM2_APP_GREEN="spryclips-green"
PORT_BLUE=5000
PORT_GREEN=5001

# Helper functions
print_header() {
    clear
    echo ""
    echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║${NC}  🚀 SPRYCLIPS DEPLOYMENT MANAGER"
    echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_option() {
    echo -e "${CYAN}  [$1]${NC} $2"
}

print_info() {
    echo -e "${BLUE}  ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}  ✓${NC} $1"
}

print_error() {
    echo -e "${RED}  ✗${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}  ⚠${NC} $1"
}

# Get current deployment status
get_status() {
    echo ""
    echo -e "${BOLD}${CYAN}════════════════ Current Status ════════════════${NC}"
    echo ""
    
    # Check if state file exists
    if [ -f "$STATE_FILE" ]; then
        ACTIVE_ENV=$(cat "$STATE_FILE")
        if [ "$ACTIVE_ENV" == "blue" ]; then
            print_success "Active Environment: ${BOLD}${BLUE}BLUE${NC} (Port: $PORT_BLUE)"
            print_info "Standby Environment: ${BOLD}GREEN${NC} (Port: $PORT_GREEN)"
        else
            print_success "Active Environment: ${BOLD}${GREEN}GREEN${NC} (Port: $PORT_GREEN)"
            print_info "Standby Environment: ${BOLD}BLUE${NC} (Port: $PORT_BLUE)"
        fi
    else
        print_warn "No deployment state found (first deployment)"
    fi
    
    echo ""
    echo -e "${BOLD}PM2 Processes:${NC}"
    echo ""
    pm2 list 2>/dev/null | grep -E "spryclips|Name" || echo "  No PM2 processes found"
    echo ""
    
    # Check git status
    echo -e "${BOLD}Git Status:${NC}"
    cd ~/Tiktok_clone 2>/dev/null || true
    if [ -d ".git" ]; then
        CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
        LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "No commits")
        print_info "Branch: ${BOLD}$CURRENT_BRANCH${NC}"
        print_info "Last Commit: $LAST_COMMIT"
    else
        print_warn "Not a git repository"
    fi
    
    echo ""
    echo -e "${BOLD}${CYAN}═════════════════════════════════════════════════${NC}"
    echo ""
}

# Show menu
show_menu() {
    print_header
    get_status
    
    echo -e "${BOLD}${MAGENTA}What would you like to do?${NC}"
    echo ""
    print_option "1" "🚀 Deploy New Version (Blue-Green Deployment)"
    print_option "2" "⏮️  Rollback to Previous Version"
    print_option "3" "📊 View Detailed Status"
    print_option "4" "📝 View Logs"
    print_option "5" "🔄 Restart Services"
    print_option "6" "🛑 Stop Environment"
    print_option "7" "▶️  Start Environment"
    print_option "8" "🔍 Health Check"
    print_option "9" "📖 View Documentation"
    print_option "0" "❌ Exit"
    echo ""
    echo -ne "${BOLD}Enter your choice [0-9]: ${NC}"
}

# Option 1: Deploy
deploy_new_version() {
    clear
    echo -e "${GREEN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          DEPLOYING NEW VERSION                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ ! -f "./deploy-production.sh" ]; then
        print_error "deploy-production.sh not found!"
        echo ""
        read -p "Press Enter to continue..."
        return
    fi
    
    print_info "Starting deployment process..."
    echo ""
    sleep 1
    
    ./deploy-production.sh
    
    echo ""
    echo -e "${GREEN}${BOLD}Deployment process completed!${NC}"
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 2: Rollback
rollback_version() {
    clear
    echo -e "${RED}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          ROLLBACK TO PREVIOUS VERSION                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ ! -f "./rollback-deployment.sh" ]; then
        print_error "rollback-deployment.sh not found!"
        echo ""
        read -p "Press Enter to continue..."
        return
    fi
    
    print_warn "This will switch traffic back to the previous environment"
    echo ""
    
    ./rollback-deployment.sh
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 3: Detailed Status
detailed_status() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          DETAILED SYSTEM STATUS                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}📊 PM2 Detailed Status:${NC}"
    echo ""
    pm2 status
    echo ""
    
    echo -e "${BOLD}🔧 Nginx Status:${NC}"
    echo ""
    sudo systemctl status nginx --no-pager -l | head -n 15
    echo ""
    
    echo -e "${BOLD}💾 Disk Usage (Uploads):${NC}"
    echo ""
    du -sh /home/reactmaster/uploads 2>/dev/null || echo "  Uploads directory not accessible"
    echo ""
    
    echo -e "${BOLD}🌐 Port Status:${NC}"
    echo ""
    print_info "Blue (Port $PORT_BLUE):"
    curl -I http://127.0.0.1:$PORT_BLUE/api/health 2>/dev/null | head -n 1 || echo "  Not responding"
    echo ""
    print_info "Green (Port $PORT_GREEN):"
    curl -I http://127.0.0.1:$PORT_GREEN/api/health 2>/dev/null | head -n 1 || echo "  Not responding"
    echo ""
    
    read -p "Press Enter to return to menu..."
}

# Option 4: View Logs
view_logs() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          VIEW LOGS                                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}Which logs would you like to view?${NC}"
    echo ""
    print_option "1" "PM2 Logs (All)"
    print_option "2" "PM2 Blue Environment"
    print_option "3" "PM2 Green Environment"
    print_option "4" "Nginx Error Log"
    print_option "5" "Nginx Access Log"
    print_option "6" "Back to Menu"
    echo ""
    echo -ne "${BOLD}Enter your choice [1-6]: ${NC}"
    read log_choice
    
    case $log_choice in
        1)
            echo ""
            print_info "Showing last 50 lines of all PM2 logs..."
            echo ""
            pm2 logs --lines 50 --nostream
            ;;
        2)
            echo ""
            print_info "Showing Blue environment logs..."
            echo ""
            pm2 logs $PM2_APP_BLUE --lines 50 --nostream
            ;;
        3)
            echo ""
            print_info "Showing Green environment logs..."
            echo ""
            pm2 logs $PM2_APP_GREEN --lines 50 --nostream
            ;;
        4)
            echo ""
            print_info "Showing last 50 lines of Nginx error log..."
            echo ""
            sudo tail -n 50 /var/log/nginx/spryclips.error.log
            ;;
        5)
            echo ""
            print_info "Showing last 50 lines of Nginx access log..."
            echo ""
            sudo tail -n 50 /var/log/nginx/spryclips.access.log
            ;;
        6)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 5: Restart Services
restart_services() {
    clear
    echo -e "${YELLOW}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          RESTART SERVICES                                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}Which service would you like to restart?${NC}"
    echo ""
    print_option "1" "Restart Blue Environment"
    print_option "2" "Restart Green Environment"
    print_option "3" "Restart Both Environments"
    print_option "4" "Restart Nginx"
    print_option "5" "Back to Menu"
    echo ""
    echo -ne "${BOLD}Enter your choice [1-5]: ${NC}"
    read restart_choice
    
    case $restart_choice in
        1)
            echo ""
            print_info "Restarting Blue environment..."
            pm2 restart $PM2_APP_BLUE
            print_success "Blue environment restarted"
            ;;
        2)
            echo ""
            print_info "Restarting Green environment..."
            pm2 restart $PM2_APP_GREEN
            print_success "Green environment restarted"
            ;;
        3)
            echo ""
            print_info "Restarting both environments..."
            pm2 restart $PM2_APP_BLUE $PM2_APP_GREEN
            print_success "Both environments restarted"
            ;;
        4)
            echo ""
            print_info "Restarting Nginx..."
            sudo systemctl restart nginx
            print_success "Nginx restarted"
            ;;
        5)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 6: Stop Environment
stop_environment() {
    clear
    echo -e "${RED}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          STOP ENVIRONMENT                                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}Which environment would you like to stop?${NC}"
    echo ""
    print_option "1" "Stop Blue Environment"
    print_option "2" "Stop Green Environment"
    print_option "3" "Stop Standby Environment (Recommended)"
    print_option "4" "Back to Menu"
    echo ""
    echo -ne "${BOLD}Enter your choice [1-4]: ${NC}"
    read stop_choice
    
    case $stop_choice in
        1)
            echo ""
            print_warn "Stopping Blue environment..."
            pm2 stop $PM2_APP_BLUE
            print_success "Blue environment stopped"
            ;;
        2)
            echo ""
            print_warn "Stopping Green environment..."
            pm2 stop $PM2_APP_GREEN
            print_success "Green environment stopped"
            ;;
        3)
            if [ -f "$STATE_FILE" ]; then
                ACTIVE_ENV=$(cat "$STATE_FILE")
                if [ "$ACTIVE_ENV" == "blue" ]; then
                    echo ""
                    print_warn "Stopping Green (standby) environment..."
                    pm2 stop $PM2_APP_GREEN
                    print_success "Green environment stopped"
                else
                    echo ""
                    print_warn "Stopping Blue (standby) environment..."
                    pm2 stop $PM2_APP_BLUE
                    print_success "Blue environment stopped"
                fi
            else
                print_error "Cannot determine active environment"
            fi
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 7: Start Environment
start_environment() {
    clear
    echo -e "${GREEN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          START ENVIRONMENT                                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}Which environment would you like to start?${NC}"
    echo ""
    print_option "1" "Start Blue Environment"
    print_option "2" "Start Green Environment"
    print_option "3" "Start Both Environments"
    print_option "4" "Back to Menu"
    echo ""
    echo -ne "${BOLD}Enter your choice [1-4]: ${NC}"
    read start_choice
    
    case $start_choice in
        1)
            echo ""
            print_info "Starting Blue environment..."
            pm2 start $PM2_APP_BLUE || print_error "Failed to start Blue"
            print_success "Blue environment started"
            ;;
        2)
            echo ""
            print_info "Starting Green environment..."
            pm2 start $PM2_APP_GREEN || print_error "Failed to start Green"
            print_success "Green environment started"
            ;;
        3)
            echo ""
            print_info "Starting both environments..."
            pm2 start $PM2_APP_BLUE $PM2_APP_GREEN || print_error "Failed to start environments"
            print_success "Both environments started"
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Option 8: Health Check
health_check() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          HEALTH CHECK                                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${BOLD}Running health checks...${NC}"
    echo ""
    
    # Check Blue
    print_info "Blue Environment (Port $PORT_BLUE):"
    if curl -I http://127.0.0.1:$PORT_BLUE/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
        print_success "✓ Healthy"
    else
        print_error "✗ Unhealthy or not responding"
    fi
    echo ""
    
    # Check Green
    print_info "Green Environment (Port $PORT_GREEN):"
    if curl -I http://127.0.0.1:$PORT_GREEN/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
        print_success "✓ Healthy"
    else
        print_error "✗ Unhealthy or not responding"
    fi
    echo ""
    
    # Check via Nginx
    print_info "Frontend (via Nginx):"
    if curl -I http://localhost/ 2>/dev/null | head -n 5 | grep -q "200"; then
        print_success "✓ Responding"
    else
        print_error "✗ Not responding"
    fi
    echo ""
    
    print_info "Backend API (via Nginx):"
    if curl -I http://localhost/api/health 2>/dev/null | head -n 5 | grep -q "200"; then
        print_success "✓ Healthy"
    else
        print_error "✗ Unhealthy or not responding"
    fi
    echo ""
    
    # Check Nginx
    print_info "Nginx Service:"
    if sudo systemctl is-active --quiet nginx; then
        print_success "✓ Running"
    else
        print_error "✗ Not running"
    fi
    echo ""
    
    read -p "Press Enter to return to menu..."
}

# Option 9: Documentation
view_documentation() {
    clear
    echo -e "${BLUE}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          DOCUMENTATION                                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ -f "DEPLOYMENT.md" ]; then
        cat DEPLOYMENT.md | less
    else
        print_error "DEPLOYMENT.md not found"
        echo ""
        print_info "Available documentation:"
        echo ""
        print_option "1" "Blue-Green Deployment: Two environments (Blue & Green)"
        print_option "2" "Deploy: ./deploy-production.sh"
        print_option "3" "Rollback: ./rollback-deployment.sh"
        print_option "4" "Ports: Blue=5000, Green=5001"
        echo ""
    fi
    
    echo ""
    read -p "Press Enter to return to menu..."
}

# Main loop
main() {
    while true; do
        show_menu
        read choice
        
        case $choice in
            1)
                deploy_new_version
                ;;
            2)
                rollback_version
                ;;
            3)
                detailed_status
                ;;
            4)
                view_logs
                ;;
            5)
                restart_services
                ;;
            6)
                stop_environment
                ;;
            7)
                start_environment
                ;;
            8)
                health_check
                ;;
            9)
                view_documentation
                ;;
            0)
                clear
                echo ""
                echo -e "${GREEN}${BOLD}Thank you for using Spryclips Deployment Manager!${NC}"
                echo ""
                exit 0
                ;;
            *)
                clear
                print_error "Invalid choice. Please try again."
                sleep 2
                ;;
        esac
    done
}

# Run main
main
