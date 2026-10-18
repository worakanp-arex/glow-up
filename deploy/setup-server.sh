#!/usr/bin/env bash
# One-time setup for a fresh Oracle Cloud Ubuntu (22.04/24.04, ARM or x86) server.
# Run as the default "ubuntu" user:  bash deploy/setup-server.sh
set -euo pipefail

echo "==> Updating packages"
sudo apt-get update
sudo apt-get -y upgrade

echo "==> Installing Nginx, Git, certbot, firewall persistence"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nginx git curl rsync certbot python3-certbot-nginx iptables-persistent

echo "==> Installing Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v

echo "==> Installing PM2"
sudo npm install -g pm2

echo "==> Opening ports 80 and 443 in the Ubuntu firewall (Oracle images block them by default)"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    # insert just above Oracle's catch-all REJECT rule (or append if there is none)
    reject_line=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [ -n "$reject_line" ]; then
      sudo iptables -I INPUT "$reject_line" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    else
      sudo iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    fi
  fi
done
sudo netfilter-persistent save

echo "==> Adding 2 GB swap (helps npm builds on small machines)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Preparing web root"
sudo mkdir -p /var/www/glow-up
sudo chown "$USER":"$USER" /var/www/glow-up

echo
echo "Done. Next: clone the repo, create backend/.env, then run deploy/deploy.sh"
