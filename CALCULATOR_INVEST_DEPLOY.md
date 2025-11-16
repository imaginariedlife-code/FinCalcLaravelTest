# Deployment Instructions: Calculator-Invest

## Overview

Calculator-Invest is a Laravel-based investment strategy comparison tool that uses real MOEX (Moscow Exchange) historical data to compare 5 different investment strategies.

## Prerequisites

- PHP 8.1+
- Composer
- SQLite (for database)
- Cron access (for daily data updates)

## Initial Setup

### 1. Install Dependencies

```bash
composer install
```

### 2. Configure Environment

```bash
cp .env.example .env
php artisan key:generate
```

Ensure `.env` has:
```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite
```

### 3. Database Setup

```bash
# Create database file
touch database/database.sqlite

# Run migrations
php artisan migrate

# Seed deposit rates
php artisan db:seed --class=DepositRateSeeder
```

### 4. Import Initial Data

You have two options:

#### Option A: Import from CSV (faster for initial setup)
```bash
# Place IMOEX.csv in the root directory, then:
php artisan moex:import-csv IMOEX.csv
```

#### Option B: Fetch from MOEX API
```bash
# Fetch all tickers for a specific period
php artisan moex:fetch-historical --from=2010-01-01 --to=2024-12-31

# Or fetch a specific ticker
php artisan moex:fetch-historical SBER --from=2020-01-01
```

## Setting Up Daily Cron Job

The application needs to fetch fresh MOEX data daily. The schedule is already configured in `routes/console.php` to run at 3:00 AM Moscow time.

### Production Server Setup

Add this line to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project)
* * * * * cd /path/to/your/project && php artisan schedule:run >> /dev/null 2>&1
```

This will run Laravel's scheduler every minute, which will then execute the MOEX data update at the scheduled time (3:00 AM Moscow time).

### Local Testing

To test the scheduler locally:

```bash
# Run the scheduler in the foreground (useful for testing)
php artisan schedule:work

# Or manually trigger the scheduled command
php artisan schedule:run
```

### Verify Scheduled Tasks

```bash
# List all scheduled tasks
php artisan schedule:list
```

You should see:
```
0 3 * * *  php artisan moex:fetch-historical --from=-30days  Next Due: X hours from now
```

## Deployment Checklist

- [ ] Dependencies installed (`composer install`)
- [ ] Environment configured (`.env` file)
- [ ] Database created and migrated
- [ ] Deposit rates seeded
- [ ] Initial MOEX data imported
- [ ] Cron job configured for daily updates
- [ ] Web server configured (Apache/Nginx)
- [ ] Application key generated
- [ ] File permissions set correctly

## Web Server Configuration

### Apache

Create a virtual host configuration:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/project/public

    <Directory /path/to/project/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/fincalc-error.log
    CustomLog ${APACHE_LOG_DIR}/fincalc-access.log combined
</VirtualHost>
```

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/project/public;

    index index.html index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## File Permissions

```bash
# Storage and cache directories need write permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Database file needs write permissions
chmod 664 database/database.sqlite
chown www-data:www-data database/database.sqlite
```

## Testing the Deployment

### 1. Test API Endpoints

```bash
# Test instruments endpoint
curl http://your-domain.com/api/investment/instruments | python3 -m json.tool

# Test calculation endpoint
curl -X POST http://your-domain.com/api/investment/calculate \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"IMOEX","amount":10000,"frequency":"monthly","start_date":"2024-01-01","end_date":"2024-06-30"}' \
  | python3 -m json.tool
```

### 2. Test Frontend

Navigate to:
- Main page: `http://your-domain.com/`
- Calculator-Invest: `http://your-domain.com/calculator-invest` or `/invest`
- FinTest: `http://your-domain.com/fintest`
- FinCalc: `http://your-domain.com/fincalc`

### 3. Run Test Script

```bash
# Use the provided test script
./test_calculator.sh
```

## Monitoring

### Check Logs

```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Cron job logs (if configured)
tail -f /var/log/syslog | grep CRON
```

### Verify Data Updates

```bash
# Check latest data in database
php artisan tinker --execute="
use App\Models\HistoricalPrice;
\$latest = HistoricalPrice::selectRaw('ticker, MAX(trade_date) as latest_date')
    ->groupBy('ticker')
    ->get();
foreach (\$latest as \$l) {
    echo \$l->ticker . ': ' . \$l->latest_date . PHP_EOL;
}
"
```

## Maintenance

### Update MOEX Data Manually

```bash
# Fetch last 30 days for all tickers
php artisan moex:fetch-historical --from=-30days

# Fetch specific date range
php artisan moex:fetch-historical --from=2024-01-01 --to=2024-12-31
```

### Database Backup

```bash
# Backup SQLite database
cp database/database.sqlite database/database.backup.$(date +%Y%m%d).sqlite

# Or use Laravel's backup if installed
php artisan backup:run
```

## Troubleshooting

### Cron Job Not Running

```bash
# Check crontab is configured
crontab -l

# Check Laravel scheduler is working
php artisan schedule:run -v

# Manually run the MOEX fetch command
php artisan moex:fetch-historical --from=-7days
```

### API Errors

```bash
# Check logs
tail -f storage/logs/laravel.log

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

### Database Issues

```bash
# Check database connection
php artisan tinker --execute="DB::connection()->getPdo();"

# Re-run migrations (WARNING: destroys data)
php artisan migrate:fresh --seed
```

## Production Optimization

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev

# Set environment to production in .env
APP_ENV=production
APP_DEBUG=false
```

## Security Considerations

- Ensure `.env` file is not publicly accessible
- Set `APP_DEBUG=false` in production
- Use HTTPS for API endpoints
- Regularly update dependencies: `composer update`
- Monitor logs for suspicious activity

## Support

For issues or questions:
- Check logs in `storage/logs/laravel.log`
- Review MOEX API documentation: https://www.moex.com/a2193
- Test with the provided `test_calculator.sh` script
- Review `test_manual.md` for manual testing procedures
