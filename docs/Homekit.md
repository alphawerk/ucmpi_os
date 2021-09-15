# Add Apple Homekit to Node-Red
Installation instructions for adding Apple HomeKit support to Node-Red on the UCM-Pi

## Getting Started

To get started, you will need to have completed the [Quick Start](Quick%20Start.md) process and have logged in to a shell either via SSH or using a keyboard and monitor plugged into the UCM-Pi

## Installing Apple HomeKit Support.

Apple HomeKit support is via a [community managed node-red module](https://github.com/NRCHKB/node-red-contrib-homekit-bridged).

To install it, go to the command line and execute the following commands:

```
curl -sL https://uhai.alphawerk.co.uk/scripts/quickstart_homekit | bash -
```
 
If you want to make use of the RTSP streaming capability, you will also need some other optional components as below (taken from [this](https://github.com/KhaosT/homebridge-camera-ffmpeg/wiki/Raspberry-PI) excellent note)

~~At the time of writing, you will also need the development version of the Homekit libraries, substitute `nrchkb/node-red-contrib-homekit-bridged#dev` for `NRCHKB/node-red-contrib-homekit-bridged` above.~~

Please note, you will need ~ 1.5Gb free to install these components as they need to be compiled. Once installed the source materials are deleted, freeing up much of the working disk space.
```

# install build tools
cd ~
sudo apt-get install git pkg-config autoconf automake libtool libx264-dev

# download and build fdk-aac
git clone https://github.com/mstorsjo/fdk-aac.git
cd fdk-aac
./autogen.sh
./configure --prefix=/usr/local --enable-shared --enable-static
make -j1
sudo make install
sudo ldconfig


# download and build ffmpeg
cd ~
git clone https://github.com/FFmpeg/FFmpeg.git
cd FFmpeg
./configure --prefix=/usr/local --arch=armel --target-os=linux --enable-omx-rpi --enable-nonfree --enable-gpl --enable-libfdk-aac --enable-mmal --enable-libx264 --enable-decoder=h264 --enable-network --enable-protocol=tcp --enable-demuxer=rtsp --extra-ldflags="-latomic"
make -j1
sudo make install

# delete the sources
cd ..
sudo rm -r FFmpeg
sudo rm -r fdk-aac
```
 
