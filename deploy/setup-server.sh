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

echo "==> Automatic security updates and SSH brute-force protection"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unattended-upgrades fail2ban
sudo systemctl enable --now fail2ban
echo 'APT::Periodic::Update-Package-Lists "1"; APT::Periodic::Unattended-Upgrade "1";' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null

echo "==> Installing Node.js 22"
# Download first, then run: a dropped connection can't execute half a script.
NODESOURCE_SCRIPT="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$NODESOURCE_SCRIPT"
sudo -E bash "$NODESOURCE_SCRIPT"
rm -f "$NODESOURCE_SCRIPT"
sudo apt-get install -y nodejs
node -v

echo "==> Installing PM2"
sudo npm install -g pm2@7.1.1

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
