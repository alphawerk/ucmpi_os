# Apple TV Quick Start
Installation instructions for getting started with the UCM-Pi

## What is this all about

This guide is intended to help new users of the UCM-Pi (a Universal Communication Module which supports a Raspberry Pi CM3 compatible single board computer) install the operating system, configure the device, install Node-Red and related code developed by alphaWerk to interface Node-Red to the Cytech Comfort Home Automation and Security System

Note: This guide is still in beta, as is the alphaWerk Node-Red modules and associated code.

## Getting Started

To get started, you will need

1. A Cytech Comfort Alarm system (www.cytech.com)  
2. A UCM-Pi available from Cytech
3. A Raspberry Pi CM3 or compatible device with onboard eMMC storage (min 4Gb)
4. A Windows, Mac or Linux computer

This guide below assumes you have performed the following steps:

1.  Completed the Quickstart process from the [Quickstart](./Quick%20Start.md)


## Installing AppleTV components

Log back into the UCM-Pi and execute the following command

```
curl -sL https://uhai.alphawerk.co.uk/scripts/quickstart_appletv | bash -
```

