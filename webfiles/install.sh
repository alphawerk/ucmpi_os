#!/bin/bash
# Quickstart Script for UCM/Pi Node-Red Installation
# (c) 2019,2020,2021 alphaWerk Ltd

SCRIPTVERSION=2.1.0.5
NODEVERSION=v16.13.0
DISTRO="linux-$(uname -m)"
LOCALIP="$(hostname -I | xargs)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
error_exit()
{
	echo -e "${RED}An error occurred, cancelling operation"
	echo -e "please report this error to matt.brain@alphawerk.co.uk including the output above and error message(s) below${NC}"
	echo -e "script version ${SCRIPTVERSION}"
	echo -e "$1" 1>&2
	exit 0
}

error_warn()
{
	echo -e "${RED}A warning was raised, but it isn't terminal${NC}"
	echo -e "$1" 1>&2
}

no_npm()
{
	echo -e "${GREEN}installing NPM{NC}"
	#sudo apt install npm || error_exit "Unable to install NPM"
}

echo -e "${GREEN}Starting QuickStart for UCM/Pi Node-Red Installation${NC}"
echo -e "${GREEN}Distro ${DISTRO} Script Version ${SCRIPTVERSION} Local IP ${LOCALIP}"
echo -e "${GREEN}Updating package manager${NC}"
sudo apt update -y --allow-releaseinfo-change || error_exit "Unable to update package manager"

echo -e "${GREEN}Upgrading O/S ${NC}"
sudo apt-get upgrade -qq -y || error_exit "Unable to update package manager"

echo -e "${GREEN}Installing node.js${NC}"
cd ~ || error_exit "Unable to change to home directory"

echo -e "${GREEN} downloading node.js${NC}"
curl -o node_source.tar.xz https://nodejs.org/dist/$NODEVERSION/node-$NODEVERSION-$DISTRO.tar.xz || error_exit "Unable to download node package"
sudo mkdir -p /usr/local/lib/nodejs || error_exit "Unable to create destination dir"

echo -e "${GREEN} unpacking node.js${NC}"
sudo tar -xJf node_source.tar.xz -C /usr/local/lib/nodejs || error_exit "Unable to untar node into place"

echo -e "${GREEN} setting up node.js environment${NC}"
if test -h /usr/bin/node; then
	sudo rm /usr/bin/node || error_exit "Unable to remove old /usr/bin/node symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/node /usr/bin/node || error_exit "Unable to create symlink for node"

if test -h /usr/bin/npm; then
	sudo rm /usr/bin/npm || error_exit "Unable to remove old /usr/bin/npm symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/npm /usr/bin/npm || error_exit "Unable to create symlink for npm"

if test -h /usr/bin/npx; then
	sudo rm /usr/bin/npx || error_exit "Unable to remove old /usr/bin/npx symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/npx /usr/bin/npx || error_exit "Unable to create symlink for npx"

if test -h /usr/lib/node_modules; then
	sudo rm /usr/lib/node_modules || error_exit "Unable to remove old /usr/lib/node_modules symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/lib/node_modules /usr/lib/node_modules || error_exit "Unable to create symlink for libs"

#if grep -q
#echo -e "NODEVERSION=$NODEVERSION\nDISTRO=$DISTRO\nexport PATH=/usr/local/lib/nodejs/node-\$NODEVERSION-\$DISTRO/bin:\$PATH" >> ~/.profile
#export PATH=/usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin:$PATH
echo -e "${GREEN} cleaning up${NC}"

rm node_source.tar.xz

echo -e "${GREEN} checking for node or npm${NC}"
node -v || error_exit "Failed to install node.js"
npm -v  || error_exit "Failed tocd / install npm"

echo -e "${GREEN}Installing build tools${NC}"
sudo apt-get install -qq -y gcc g++ make > /dev/null 2>&1 || error_exit "Unable to install node.js or other dependancies"

echo -e "${GREEN}Installing Yarn${NC}"
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - > /dev/null 2>&1|| error_exit "Unable to add Yarn public key to repository"
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list || error_exit "Unable to set Yarn repository"
sudo apt-get update -qq -y && sudo apt-get install -qq -y yarn --no-install-recommends || error_exit "Unable to install Yarn"

echo -e "${GREEN}Installing libavahi${NC}"
sudo apt-get install -qq -y libavahi-compat-libdnssd-dev > /dev/null 2>&1 || error_exit "Unable to install libavahi"



echo -e "${GREEN}Installing pm2${NC}"
sudo npm install --silent -g pm2 || error_exit "Unable to install pm2"

if test -h /usr/bin/pm2; then
	sudo rm /usr/bin/pm2 || error_exit "Unable to remove old /usr/bin/pm2 symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/pm2 /usr/bin/pm2 || error_exit "Unable to create symlink for pm2"


echo -e "${GREEN}configuring pm2${NC}"
#sudo pm2 startup || error_exit "Unable to configure pm2 to start at boot"
pm2 startup | tail -1 | sudo -E bash - > /dev/null 2>&1 || error_exit "Unable to configure pm2 to start at boot"

echo -e "${GREEN}Installing Node-Red${NC}"
sudo npm install --silent -g --unsafe-perm node-red@2.1.3 > /dev/null 2>&1 || error_exit "Unable to install node-red"
sudo npm install --silent -g mqtt > /dev/null 2>&1 || error_exit "Unable to install mqtt"

if test -h /usr/bin/node-red; then
	sudo rm /usr/bin/node-red || error_exit "Unable to remove old /usr/bin/node-red symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/node-red /usr/bin/node-red || error_warn "Unable to create symlink for node-red"

if test -h /usr/bin/node-red-pi; then
	sudo rm /usr/bin/node-red-pi || error_exit "Unable to remove old /usr/bin/node-red symlink"
fi
sudo ln -s /usr/local/lib/nodejs/node-$NODEVERSION-$DISTRO/bin/node-red-pi /usr/bin/node-red-pi || error_exit "Unable to create symlink for node-red-pi"

echo -e "${GREEN}Preparing Destination Environment ${NC}"
if test ! -d ~/ucmpi_os; then
	mkdir ~/ucmpi_os || error_exit "Unable to create ucmpi_os home directory"
fi
if test ! -d ~/ucmpi_os/update; then
	mkdir ~/ucmpi_os/update || error_exit "Unable to create update directory"
fi

if test -d ~/ucmpi_os/node_modules; then
	rm -r ~/ucmpi_os/node_modules || error_exit "Unable to remove old node_modules directory"
	if test -f ~/ucmpi_os/package.json; then
		sudo rm ~/ucmpi_os/package.json || error_exit "Unable to remove old package.json"
	fi
	if test -f ~/ucmpi_os/package-lock.json; then
		sudo rm ~/ucmpi_os/package-lock.json || error_exit "Unable to remove old package.json"
	fi
fi

if test ! -d /etc/ucmpi_os; then
	sudo mkdir /etc/ucmpi_os || error_exit "Unable to create ucmpi_os config directory"
fi
sudo chown pi:pi /etc/ucmpi_os || error_exit "Unable to change ownership of ucmpi_os config directory"
if test ! -d /etc/ucmpi_os/core; then
	mkdir /etc/ucmpi_os/core || error_exit "Unable to create ucmpi_os/core config directory"
fi

if test ! -d /usr/lib/node_modules/node-red/node_modules/@node-red/nodes/ucmpi_os; then
	sudo mkdir /usr/lib/node_modules/node-red/node_modules/@node-red/nodes/ucmpi_os || error_exit "Unable to create cytech node directory"
fi

echo -e "${GREEN}Installing dependancies ${NC}"
npm install epoll mqtt serialport@9.2.7 mitt xml2js bcrypt express express-ws express-handlebars@3.0.0 express-handlebars-layouts express-session memorystore body-parser cookie-parser request express-fileupload xml2js fs-extra path uid-safe https rpi-gpio os child_process > /dev/null 2>&1|| error_exit "Error installing dependancies"

echo -e "${GREEN}Installing mosquitto ${NC}"
sudo apt-get install -qq -y mosquitto > /dev/null 2>&1|| error_exit "Unable to install mosquitto"
if test -f /etc/mosquitto/conf.d/localhost.conf; then
	sudo rm /etc/mosquitto/conf.d/localhost.conf || error_exit "Unable to delete old mosquitto network configuration"
fi
if test -f /etc/mosquitto/conf.d/auth.conf; then
	sudo rm /etc/mosquitto/conf.d/auth.conf || error_exit "Unable to delete old mosquitto authentication configuration"
fi
sudo service mosquitto start || error_exit "Unable to start mosquitto"
echo "bind_address 127.0.0.1" | sudo tee /etc/mosquitto/conf.d/localhost.conf > /dev/null 2>&1|| error_exit "Unable to write mosquitto network configuration"
echo "allow_anonymous true" | sudo tee /etc/mosquitto/conf.d/auth.conf > /dev/null 2>&1|| error_exit "Unable to write mosquitto authentication configuration"
sudo service mosquitto restart || error_exit "Unable to restart mosquitto"


echo -e "${GREEN}Installing Cytech Modules ${NC}"
echo -e "${GREEN}Getting Packages Cytech Modules ${NC}"
# updated deployment method from github
if test -d ~/ucmpi_os/temp; then
    rm -rf ~/ucmpi_os/temp || error_exit "Unable to delete temp directory"
fi 
mkdir ~/ucmpi_os/temp || error_exit "Unable to create temp directory"
cd ~/ucmpi_os/temp || error_exit "Unable to change directory to temp directory"
wget --quiet https://github.com/alphawerk/ucmpi_os/archive/refs/heads/main.zip || error_exit "Unable to download the package from github"
unzip main.zip || error_exit "Unable to unzip the package from github"
cp -r ./ucmpi_os-main/ucmpi/ucmpi_os/* ~/ucmpi_os || error_exit "Unable to copy core files into place"
cp ./ucmpi_os-main/ucmpi/absolute/etc/ucmpi_os/core/config.json /etc/ucmpi_os/core/config.json || error_exit "Unable to move config.json into place"
NODEROOT="$(npm root -g)" || error_exit "Unable to determine global nodes.js directory"
sudo cp -r ./ucmpi_os-main/ucmpi/absolute/usr/lib/node_modules/node-red/* $NODEROOT/node-red/node_modules/@node-red || error_exit "Unable to copy node-red modules into place"
if test ! -d ~/.node-red; then
    mkdir ~/.node-red || error_exit "Unable to create home directory"
fi 
cp ./ucmpi_os-main/ucmpi/absolute/home/pi/node-red\[hidden\]/* ~/.node-red || error_exit "Unable to copy node-red auth and settings modules into place"


echo -e "${GREEN}Installing Node-Red Modules${NC}"
pm2 start node-red
sleep 10
cd ~/.node-red || error_exit "Unable to change directory to ~/.node-red"
npm install --save --silent node-red-dashboard || error_exit "Unable to install node-red-dashboard"

echo -e "${GREEN}Starting Components ${NC}"
cd ~/ucmpi_os || error_exit "Unable to change to home dir"
pm2 stop all || error_warn "Unable to stop existing components"
pm2 start core.js configuration.js UCMEth.js manager.js node-red || error_exit "Unable to start components"
#pm2 list
pm2 save  || error_exit "Unable to save pm2 start up script"

touch ~/ucmpi_os/install_$SCRIPTVERSION || error_warn "Unable to write script marker"
echo -e "${RED}All Done!!"
echo -e "${GREEN}You may now connect to HTTP:${LOCALIP}:1080 to access the management console and HTTP://${LOCALIP}:1880 to access Node-Red ${NC}"
echo -e "${GREEN}You will need to create a user account in the management console before accessing Node-Red ${NC}"
exit 0
