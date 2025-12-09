# 🔵🟢 Blue-Green Deployment Guide

## Overview

This project uses a **Blue-Green Deployment** strategy to achieve **zero-downtime deployments**. Two identical production environments (Blue and Green) run simultaneously, with traffic routed to only one at a time.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        NGINX                             │
│               (Traffic Router)                           │
│          Routes to Active Environment                    │
└──────────────┬──────────────────────────┬────────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐      ┌──────────────────┐
    │   🔵 BLUE        │      │   🟢 GREEN       │
    │   Port 5000      │      │   Port 5001      │
    │   PM2 Instance   │      │   PM2 Instance   │
    └──────────────────┘      └──────────────────┘
    
    Active Environment        Standby Environment
    (Serving Traffic)         (Ready for Rollback)
```

### Deployment Flow

1. **Detect Active Environment** - Script checks which environment is currently serving traffic
2. **Deploy to Inactive** - New code is deployed to the inactive environment
3. **Health Check** - Target environment is tested (3 attempts with retries)
4. **Switch Traffic** - Nginx configuration is updated to route traffic to the new environment
5. **Graceful Reload** - Nginx reloads without dropping connections
6. **Keep Old Running** - Previous environment stays active for instant rollback

### Benefits

✅ **Zero Downtime** - Users never experience service interruption
✅ **Instant Rollback** - Switch back in seconds if issues occur
✅ **Safe Testing** - New version is fully tested before receiving traffic
✅ **Gradual Migration** - Can test new environment before switching
✅ **Reduced Risk** - Always have a working version ready

## Usage

### Deploy New Version

```bash
./deploy-production.sh
```

The script will:
- Pull latest code from `main` branch
- Determine which environment is active (Blue or Green)
- Deploy to the **inactive** environment
- Run health checks
- Switch traffic to the new environment
- Keep old environment running

### Rollback to Previous Version

If you encounter issues with the new deployment:

```bash
./rollback-deployment.sh
```

This will:
- Switch traffic back to the previous environment
- Update nginx configuration
- Gracefully reload nginx
- Confirm the rollback with health checks

**Rollback takes less than 5 seconds!** ⚡

## Manual Operations

### Check Current Status

```bash
pm2 status
```

You should see both environments:
```
┌─────┬────────────────────┬─────────┬──────┬─────────┐
│ id  │ name               │ status  │ port │         │
├─────┼────────────────────┼─────────┼──────┼─────────┤
│ 0   │ spryclips-blue     │ online  │ 5000 │ Active  │
│ 1   │ spryclips-green    │ online  │ 5001 │ Standby │
└─────┴────────────────────┴─────────┴──────┴─────────┘
```

### Check Which Environment is Active

```bash
cat ~/Tiktok_clone/.deployment-state
```

Output: `blue` or `green`

### View Logs

```bash
# Active environment logs
pm2 logs spryclips-blue
pm2 logs spryclips-green

# All logs
pm2 logs
```

### Manual Health Checks

```bash
# Test Blue environment
curl http://127.0.0.1:5000/api/health

# Test Green environment
curl http://127.0.0.1:5001/api/health

# Test current active (via nginx)
curl http://localhost/api/health
```

### Stop Old Environment (After Confirming New One Works)

Once you're confident the new deployment is stable:

```bash
# If Green is active, stop Blue
pm2 stop spryclips-blue

# If Blue is active, stop Green
pm2 stop spryclips-green
```

**Note:** It's recommended to keep both running for at least 24 hours after deployment.

## File Structure

```
Tiktok_clone/
├── deploy-production.sh         # Main deployment script with blue-green logic
├── rollback-deployment.sh       # Quick rollback script
├── .deployment-state            # Tracks which environment is active
└── backend/
    └── index.js                 # Backend app (reads PORT env variable)
```

## Environment Variables

The backend should read the PORT from environment variables:

```javascript
const PORT = process.env.PORT || 5000;
```

## Nginx Configuration

Nginx is dynamically configured to route to the active environment:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;  # or 5001 depending on active env
    # ... other proxy settings
}
```

## Port Allocation

| Environment | Port | PM2 Name          | Status        |
|-------------|------|-------------------|---------------|
| Blue        | 5000 | spryclips-blue    | Active/Standby|
| Green       | 5001 | spryclips-green   | Standby/Active|

## Troubleshooting

### Both Environments Show as Inactive

```bash
# Check PM2 status
pm2 status

# Restart both if needed
pm2 restart spryclips-blue spryclips-green
```

### Deployment Fails Health Check

The deployment will automatically abort if the target environment fails health checks after 3 attempts. The active environment continues serving traffic.

### Need to Manually Switch Environments

```bash
# Switch to Blue (port 5000)
sudo sed -i 's|proxy_pass http://127.0.0.1:5001|proxy_pass http://127.0.0.1:5000|g' /etc/nginx/sites-available/default
sudo systemctl reload nginx
echo 'blue' > ~/Tiktok_clone/.deployment-state

# Switch to Green (port 5001)
sudo sed -i 's|proxy_pass http://127.0.0.1:5000|proxy_pass http://127.0.0.1:5001|g' /etc/nginx/sites-available/default
sudo systemctl reload nginx
echo 'green' > ~/Tiktok_clone/.deployment-state
```

### Check Nginx Current Configuration

```bash
grep "proxy_pass" /etc/nginx/sites-available/default | grep "127.0.0.1"
```

## Best Practices

1. **Monitor Both Environments** - Keep an eye on logs for both Blue and Green
2. **Health Checks** - Always verify health checks pass before switching
3. **Gradual Rollout** - Monitor the new environment for a few hours before stopping the old one
4. **Database Migrations** - Run migrations before deployment to ensure compatibility with both versions
5. **Feature Flags** - Use feature flags for major changes to enable/disable features without redeployment

## Security Notes

- Both environments share the same uploads directory (`/home/reactmaster/uploads`)
- Database connections are shared between environments
- Environment variables should be consistent across both instances
- SSL/TLS termination happens at Nginx level

## Performance Considerations

- **Memory Usage** - Running two environments doubles memory consumption
- **Resource Optimization** - Consider stopping the standby environment during low-traffic periods
- **Database Connections** - Monitor connection pool limits with two active backends
- **Shared Resources** - File system and database are shared, ensure no conflicts

## Future Enhancements

- [ ] Automated smoke tests before traffic switch
- [ ] Gradual traffic migration (canary deployment)
- [ ] Metrics and monitoring dashboards
- [ ] Automated rollback on error threshold
- [ ] Deployment notifications (Slack, Email)

## Support

For issues or questions:
- Check logs: `pm2 logs`
- Review nginx logs: `sudo tail -f /var/log/nginx/spryclips.error.log`
- Contact: Spryclips Team

---

**Last Updated:** November 2025
**Version:** 1.0.0
