#!/bin/bash
# Quickstart Script for UCM/Pi Node-Red Update
# (c) 2019,2020,2021 alphaWerk Ltd

SCRIPTVERSION=2.0.0.0
NODEVERSION=v10.16.0
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

echo -e "${GREEN}Starting UCM/Pi Node-Red Upgrade from beta version to open source version${NC}"
echo -e "${GREEN}Distro ${DISTRO} Script Version ${SCRIPTVERSION} Local IP ${LOCALIP}"

echo -e "${GREEN}Checking to see if existing alphawerk directories exist"
NODEROOT="$(npm root -g)" || error_exit "Unable to determine global nodes.js directory"
if test ! -d ~/alphawerk; then
    error_exit "No alphawerk directory found"
fi

if test ! -d ~/ucmpi_os; then
    mkdir ~/ucmpi_os || error_exit "Unable to create new ucmpi_os directory"
fi


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

cp -r ./ucmpi_os-main/ucmpi/absolute/usr/lib/node_modules/node-red/* $NODEROOT/node-red/node_modules/@node-red || error_exit "Unable to copy node-red modules into place"
cp ./ucmpi_os-main/ucmpi/absolute/home/pi/node-red\[hidden\]/* ~/.node-red || error_exit "Unable to copy node-red auth and settings modules into place"

echo -e "${GREEN}Copying existing node modules from legacy to opensource location ${NC}"
cp -r ~/alphawerk/node_modules ~/ucmpi_os/node_modules || error_exit "Unable to copy existing node-modules"

echo -e "${GREEN}Starting Components ${NC}"
cd ~/ucmpi_os || error_exit "Unable to change to home dir"
pm2 stop all || error_warn "Unable to stop existing components"
pm2 delete all || error_warn "Unable to delete existing components"

rm -r $NODEROOT/node-red/node_modules/@node-red/nodes/alphawerk || error_warn "Unable to delete legacy node-red modules"
sudo rm -r /etc/alphawerk || error_warn "Unable to delete legacy configuration variables"

pm2 start core.js configuration.js UCMEth.js manager.js node-red || error_exit "Unable to start components"
#pm2 list
pm2 save  || error_exit "Unable to save pm2 start up script"

touch ~/ucmpi_os/install_$SCRIPTVERSION || error_warn "Unable to write script marker"
echo -e "${RED}All Done!!"
echo -e "${GREEN}You may now connect to HTTP:${LOCALIP}:1080 to access the management console and HTTP://${LOCALIP}:1880 to access Node-Red ${NC}"
echo -e "${GREEN}You will need to create a user account in the management console before accessing Node-Red ${NC}"
exit 0
