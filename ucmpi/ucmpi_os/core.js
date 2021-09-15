/*	alphawerk UHAI core broker
	(c) 2018, 2021 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

const _version = "2.0.0.0"
const _date = "100921"

var net = require('net');
var fs = require('fs');
var path = require('path');
var serialport = require('serialport');
var modules = require('./modules.js');
var debug = modules.debug;
var send = modules.send;
var sendretain = modules.sendretain;
var notifystatus = modules.notifystatus;
var updatestatus = modules.updatestatus;
var subscribetopic = modules.subscribetopic;


modules.init("core", _version, _date)
var defaultConfig = {
	commType: "ethernet",
	commHost: "192.168.1.196",
	commPort: "1001",
	commUser: "1234",
	commBaud: "38400"
}

// Typical Serial Config
// commType: "serial",
// commHost: "/dev/ttyAMA0",
// commPort: "1001", // Set but not used
// commUser: "1234",
// commBaud: "38400"

// Typical Ethernet Config
//	commType: "ethernet",
//	commHost: "192.168.1.196",
//	commPort: "1001",
//	commUser: "1234",
//	commBaud: "38400" // set but not used


var _config = {};
var configPath = '/etc/ucmpi_os/core/';

//Ensure config path exists
configPath
.split(path.sep)
.reduce((currentPath, folder) => {
    currentPath += folder + path.sep;
    if (!fs.existsSync(currentPath)){
        fs.mkdirSync(currentPath);
    }
    return currentPath;
 }, '');

// If config doesn't exist save the default one
if (!fs.existsSync(configPath + 'config.json')) {
	fs.writeFileSync(configPath + 'config.json', JSON.stringify(defaultConfig));
}

// Config loading
let rawdata = fs.readFileSync(configPath + 'config.json');
try
{
	_config = JSON.parse(rawdata)
	if(!_config || typeof(_config) !== "object")
	{
		_config = defaultConfig
		debug('invalid config saved',3);				
	} else {
		debug('config loaded',1);
	
	}
}
catch (e)
{
	debug('invalid config saved',3);
	_config = defaultConfig;
}


function comfort() {
	var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
	var _this = this;
	var _commType = "";
	var _commHost = "";
	var _commPort = "";
	var _commUser = "";
	var _commBaud = "";
	var _mqtt
	var _connected = false;
	var _waitingConnect = false;
	var client;
	var _inputBuffer = "";
	var _connectedUser = "";
	var _myUCMID = "FF"; // Unknown UCM ID
	var _commsTimeout = 35; // this is how long we wait before assuming the connection is dead
	var _echoTimeout = 30; // this is how long we wait without seeing any data before trying an echo request
	var _commsTimer = "";
	var _echoTimer = "";


	const stx = String.fromCharCode(3);
	const etx = String.fromCharCode(13);

	//modules.callback(function (topic, message) {_this.parseMQTT(topic, message)});
	subscribetopic("uhai/core/raw/send", function (topic, message) {_this.parseMQTT(topic, message)});
	subscribetopic("uhai/core/poll/#", function (topic, message) {_this.parsepoll(topic, message)});
	subscribetopic("uhai/core/request/#", function (topic, message) {_this.parserequest(topic, message)});
	subscribetopic("uhai/core/config/comms", (topic, message) => { _this.parseConfigUpdate(message) })


	this.parseMQTT = function parseMQTT(topic, message) {
		if (topic === "uhai/core/raw/send") {
			this.command(message);
		} else {
			debug("Unexpected Topic recieved by core:"+ topic + ":" + message,3);
		}
	}

	this.parsepoll = function parsepoll (topic, message) {

		var item = topic.split("/");
		switch (item[3]) {
			case "zone":
				if (modules.getelement("zones",item[4])) {
					var id = decimalToHex(item[4],2);
					switch (item[5]) {
						case "bypass":
							_this.command("B?" + id);	
							break;
						case "value":
							_this.command("I?"+id);
							break;
						default:
							debug ("Unable to find element " + item[5] + " from poll request for zone by " + message,3);
					}				
				} else {
					debug ("Unable to find zone " + item[4] + " from poll request by " + message,3);	
				}		
				break;
				
			case "output":
				if (modules.getelement("outputs",item[4])) {
					var id = decimalToHex(item[4],2);
					_this.command("O?"+id);									
				} else {
					debug ("Unable to find output " + item[4] + " from poll request by " + message,3);	
				}		
				break;
			case "flag":
				if (modules.getelement("flags",item[4])) {
					var id = decimalToHex(item[4],2);
					_this.command("F?"+id);									
				} else {
					debug ("Unable to find flag " + item[4] + " from poll request by " + message,3);	
				}		
				break;
			case "counter":
				if (modules.getelement("counters",item[4])) {
					var id = decimalToHex(item[4],2);
					_this.command("C?"+id);									
				} else {
					debug ("Unable to find counter " + item[4] + " from poll request by " + message,3);	
				}		
				break;
			case "sensor":
				if (modules.getelement("sensors",item[4])) {
					var id = decimalToHex(item[4],2);
					_this.command("s?"+id);									
				} else {
					debug ("Unable to find sensor " + item[4] + " from poll request by " + message,3);	
				}
				break;
			case "alarm":
				switch (item[4]) {
					case "mode":
						_this.command("M?");
						break;
					case "type":
						_this.command("a?");
						break;	
					default:
						debug("Unknown status request for alarm: " + item[4],3);
				}
				break;	

			default:
				debug ("Unable to execute poll received for " + item[3] + " by " + message,3);
		}		
	}
	
	this.parserequest = function parserequest (topic, message) {

		var item = topic.split("/");
		switch (item[3]) {
			case "zone":
				if (modules.getelement("zones",item[4])) {
					var id = decimalToHex(item[4],2);
					switch (item[5]) {
						case "bypass":
							if (message=="1") 
							{							
								_this.command("DA4B" + id);	
							} else if(message=="0") {
								_this.command("DA4C" + id);
							} else {
								debug ("Invalid value for bypass:" + message + " on zone " + item[4],4);
								}
							break;
						case "virtualinput":
							if (modules.getelement("zones", item[4]).virtualinput==="true") {
								if (message=="0") {
									_this.command("I!" + id + "00");
								} else if (message=="1") {
									_this.command("I!" + id + "01");
								} else {
									debug ("Invalid value for input:" + message + " on zone " + item[4],4);
								}
										
							} else {
								debug("zone " + item[4] + " is not configured as a virtual zone ");
							}
							break;							
												
						default:
							debug ("Cannot set element " + item[5] + " for zone",3);
					}				
				} else {
					debug ("Unable to find zone " + item[4] + " for set request " + topic,3);	
				}		
				break;
				
			case "output":
				if (modules.getelement("outputs",item[4])) {
					var id = decimalToHex(item[4],2);
						if (message=="1") 
						{							
							_this.command("O!" + id + "01");	
						} else if(message=="0") {
							_this.command("O!" + id + "00");
						} else {
							debug ("Invalid value for output:" + message + " on output " + item[4],4);
						}									
				} else {
					debug ("Unable to find output " + item[4] + " for set request " + topic,3);	
				}		
				break;	
				
			case "flag":
				if (modules.getelement("flags",item[4])) {
					var id = decimalToHex(item[4],2);
						if (message=="1") 
						{							
							_this.command("F!" + id + "01");	
						} else if(message=="0") {
							_this.command("F!" + id + "00");
						} else {
							debug ("Invalid value for flag:" + message + " on flag " + item[4],4);
						}									
				} else {
					debug ("Unable to find flag " + item[4] + " for set request " + topic,3);	
				}		
				break;
				
			case "counter":
				if (modules.getelement("counters",item[4])) {
					var id = decimalToHex(item[4],2);

					if (typeof parseInt(message) == 'number') {

						var value = parseInt(message);
						if ((value>=-32768) && (value<=32767)) {
							_this.command("C!" + id + signedDecimalToCytechHex(message));
						} else {
							debug ("Value out of range for " + message + " on counter " + item[4],4);
						}
					} else {
						debug ("Invalid datatype for counter:" + message + " on flag " + item[4],4);
					}									
				} else {
					debug ("Unable to find counter " + item[4] + " for set request " + topic,3);	
				}		
				break;
				
			case "sensor":
				if (modules.getelement("sensors",item[4])) {
					var id = decimalToHex(item[4],2);

					if (typeof parseInt(message) == 'number') {

						var value = parseInt(message);
						if ((value>=-32768) && (value<=32767)) {
							_this.command("s!" + id + signedDecimalToCytechHex(message));
						} else {
							debug ("Value out of range for " + message + " on sensor " + item[4],4);
						}
					} else {
						debug ("Invalid datatype for sensor:" + message + " on flag " + item[4],4);
					}									
				} else {
					debug ("Unable to find sensor " + item[4] + " for set request " + topic,3);	
				}		
				break;
				
			case "alarm":
				switch (item[4]) {
					case "mode":
						debug ("Message = " + message + ", type of: " + typeof message,1);
						var mode = String(message).split(":");
						if (typeof mode[1] == 'string') {
							var modes = {"off":"00", "away":"01","night":"02","day":"03","vacation":"04"}
							var targetmode = modes[mode[0]]
							if (typeof targetmode == 'string') {
								_this.command("M!" + targetmode + mode[1])
							} else {
								debug("Unable to set alarm mode, cannot determine mode type from " + mode[0],2);						
							}
						} else {
							debug("Unable to set alarm mode, password not provided or in wrong format",3);
						}			
						break;
					default:
						debug ("Unable to execute set request on alarm, unknown type " + item[4],4);
				}
				break;
			case "response":
				if (modules.getelement("responses", item[4])) {
					var id;
					if (parseInt(item[4])>255) {
						// swapping byte order of response number
						id =  decimalToHex(item[4],4).substring(2,4) + decimalToHex(item[4],4).substring(0,2) 
					} else {
					var id = decimalToHex(item[4],2);
					}
					_this.command("R!" + id)
				} else {
					debug("Unable to find response " + item[4] + " to execute");
				}
				break;
			default:
				debug ("Unable to execute set request " + topic,2);
		}
	}

	this.parseConfigUpdate = function parseConfigUpdate (message) {
		try
		{
			config = JSON.parse(message);
			if(!config || typeof(config) !== "object")
			{
				return debug('Invalid config received',3);				
			}

			// Check commType is valid
			if(config.commType !== 'serial' && config.commType !== 'ethernet')
			{
				return debug('commType invalid',3);
			}

			// Check commHost is an IPv4 or IPv6 address
			// Maybe remove to allow for DCHP?
			if(config.commType === 'ethernet' && net.isIP(config.commHost) === 0)
			{
				return debug('commHost invalid address',3);
			}

			// Check commUser is between 4 and 6 digits and only numbers
			if(config.commUser.match(/^[0-9]+$/) === null || (4 > config.commUser.length || config.commUser.length > 6))
			{
				return debug('commUser invalid',3);
			}

			// Check commPort is only numbers
			if(config.commPort.match(/^[0-9]+$/) === null)
			{
				return debug('commPort invalid',3);
			}

			if(config.commBaud.match(/^[0-9]+$/) === null)
			{
				return debug('commBaud invalid',3);
			}
			_config = config;

			doReset();

			fs.writeFile(configPath + 'config.json', JSON.stringify(config), (err) => {
				if(err)
				{
					return debug('Error saving config: ' + err,4)
				}

				debug('Config updated',1);
			})
		}
		catch(e)
		{
			debug('Invalid config received',3);
		}
	}

	this.watchdog = function watchdog() {
		if (_echoTimer) {
			clearTimeout(_echoTimer);
		}
		if (_commsTimer) {
			clearTimeout(_commsTimer)
		} 
		_echoTimer = setTimeout(function() {
			if(!_connected)
			{
				return;
			}
			debug('Sending echo request after ' + _echoTimeout + ' second timeout',1);
			_this.command("??");
		}, _echoTimeout * 1000);
				
		_commsTimer = setTimeout(function() {
			debug('Resetting connection after ' + _commsTimeout + ' second timeout',2);
			doReset();
		}, _commsTimeout * 1000);	

	}

	this.connect = function connect() {
		send('connection/user', "");
		sendretain('connection/status', "Connecting");
		_this.watchdog();
		if (_connected===false) {
			debug('->connect:' + JSON.stringify(_config),1);
			_commType = _config.commType || 'serial';
			_commHost = _config.commHost || '/dev/ttyAMA0';
			_commPort = _config.commPort || '1001';
			_commUser = _config.commUser || '1234';
			_commBaud = parseInt(_config.commBaud || '38400',10);
			if (_commType==="serial") {
				if (client) {
					debug("Closing Connection to reopen");
					client.close(()=>{client.open()});
				} else {
					debug("Creating new serial connection");
					client = new serialport(_commHost, {baudRate: _commBaud});
					client.on('connect', function() {doLogin()});
					client.on('open', function() {doLogin()});
					client.on('data', function(data) {processAlarmData(data)});
					client.on('end', function() {debug('->client.end');_connected=false});
					client.on('error', function(err) {
						debug("Error Trapped in client: " + err,3);
						_connected = false;
						if (_commType==='serial') {
							if (client.isOpen) {
								client.close();
							}
						} else {
							client.end();
						}		
					});
				}
				//client.on('close', function(had_error) {debug('->client.close');_connected=false;doReset(had_error)});
			} else {
				// will connect below
				client = new net.Socket();
				client.on('connect', function() {doLogin()});
				client.on('open', function() {doLogin()});
				client.on('data', function(data) {processAlarmData(data)});
				client.on('end', function() {debug('->client.end');_connected=false});
				client.on('error', function(err) {	
					debug("Error Trapped in client: " + err,3);
					_connected = false;
					if (_commType==='serial') {
						if (client.isOpen) {
							client.close();
						}
					} else {
						client.end();
					}		
				});
			}
			if (_commType === "serial") {
				// already connected above
			} else {
				client.setTimeout(1000000, function() {debug('->client.Timeout -> something happened here');doReset()});
				client.connect(_commPort,_commHost);			
			}
		}
	}

	function doLogin() {
		if (_connected===false) {
			var login = stx + "LI" + _commUser + etx;
			client.write(login);
			debug('->LIxxxx',1);
			_waitingConnect = true;
			sendretain('connection/status', "Logging In");
		}
	}
	
	function doReset() {
		debug("->doReset",2);
		send('connection/user', "");
		sendretain('connection/status', "Resetting");
		if (_connected===true) {
			_this.watchdog();
			if (_commType === "serial") {
				_connected = false;
				if (client.isOpen) {
					client.close();
				}
			} else {
				_connected = false;
				client.end();
			}
		} else {
			_this.connect();
		}
	}
	
	function processAlarmData (data) {
		for (var value of data.values()) {
			if (value===3) {
				//start of packet
				_inputBuffer= "";
			} else if (value===13) {
				_this.watchdog();			
				parseResponse(_inputBuffer);
			} else {
				_inputBuffer = _inputBuffer + String.fromCharCode(value);
			}
		}
	}
		
	function parseResponse(myResponse) {
		debug ('->' + myResponse,1);
		var operator = myResponse.substring(0,2);
		var value = myResponse.substring(2);
		if (operator==="LU") {
			if (value==="00") {
				debug("Login User 00, Disconnected",1);
				send('connection/user', "");
				sendretain('connection/status', "Disconnected");
				_waitingConnect = false;
				_connected = false;
			} else {
				if (_waitingConnect === true) {
					debug("Logged in as "+value+", Connected",1);
					_connected = true;
					_connectedUser = value;
					_waitingConnect = false;
					sendretain('connection/user', value);
					sendretain('connection/status', "Connected");
					_this.postLogin();
				}
			}
		} else if (myResponse.substring(0,2) === "RS") {
				if ((_myUCMID === "FF") || (_myUCMID === myResponse.substring(2,4))) {
					debug('Reset Detected, resetting connection',1);
					send('connection/user', "");
					sendretain('connection/status', "Disconnected");
					_waitingConnect = false;
					_connected = false;
					if(_config.commType === "ethernet")
					{
						client.end();
					}
					else
					{
						client.close();
					}
				}
		} else {
		
		// main logic here
		
			send('raw/received', myResponse);		
			switch(operator) {
				case 'a?':
					// Alarm Information Reply
					// add in type		
					var type = parseInt(value.substring(0,2));
					var status = parseInt(value.substring(2,4));
					var statusTypes = ["idle", "trouble", "alert", "alarm"];
					var data = {alarmtypeindex: type, status: statusTypes[status], parametertype: null, zone: null, id: null, user: null};
					notifystatus("alarm","type","status", data);				
					break;
				case 'A?':
					// Analogue Value Reported
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {analogue_value: zonevalue};
					notifystatus("zone",zone,"analogue_value",data);
					break;
				case 'AL':
					// Alarm Type Report
					var type = parseInt(value.substring(0,2));
					var status = parseInt(value.substring(2,4));
					var parametertype = parseInt(value.substring(8,10));
					var parameter = parseInt(value.substring(10,12));
					var statusTypes = ["idle", "trouble", "alert", "alarm"];
					var parametertypeTypes = ["none", "zone", "user", "id"];

					var data = {alarmtypeindex: type, status: statusTypes[status], parametertype: parametertypeTypes[parametertype]};
					if(parametertype === 1)
					{
						data.zone = parameter;
						data.user = null;
						data.id   = null;
					}
					else if(parametertype == 2)
					{
						data.zone = null;
						data.user = parameter;
						data.id   = null;
					}
					else if(parametertype == 3)
					{
						data.zone = null;
						data.user = null;
						data.id   = parameter;
					}
					else
					{
						data.zone = null;
						data.user = null;
						data.id   = parameter;	
					}
					notifystatus("alarm","type","status", data);				
					break;
				case 'AM':
					// System (Non Detector) Alarm Report
					break;
				case 'AR':
					// System (Non Detector) Alarm Restore
					break;
				case 'b?':
					// Reply to Bypass all zone query
					// remove leading 00
					value = value.substring(2);
					var numbytes = value.length / 2;
					for (var position = 0; position < numbytes; position++)
					{
						var bytehexvalue = value.substring(position*2,(position+1)*2);
						var byteintvalue = parseInt(bytehexvalue, 16);
							for (var output=1; output < 9; output++ ) {
							var mask = 1 << (output-1);
							if ((byteintvalue & mask)!=0) {
								// bit is set
								notifystatus("zone",(output+(position*8)),"value", {value: 1});
							} else {
								notifystatus("zone",(output+(position*8)),"value", {value: 0});	
							}
						}		
					}
					break;
				case 'B?':
					// Reply to Bypass zone query
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {bypass: zonevalue};
					notifystatus("zone",zone,"bypass", data);
					break;
				case 'BP':
					//Beep on speaker report
					break;
				case 'BY':
					// Bypass Zone Report
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {bypass: zonevalue};
					notifystatus("zone",zone,"bypass", data);
					break;
				case 'cc':
					// echo reply to cc command
					//debug(response);
					break;
				case 'C?':
					// Counter value Reply to C? Request
					var counter = parseInt(value.substring(0,2),16);
					var countervalue = signedCytechHexToDecimal(value.substring(2));
					var data = {value: countervalue};
					notifystatus("counter",counter,"value", data);
					break;
				case 'CI':
					// Learned IR code data reply
					break;
				case 'Cs':
					// UCM/Comfort connect status
					if (value=='00') {
						debug("Comfort Connected OK");
					} else if (value=='01') {
						debug("Comfort Id Conflict");
					} else if (value=='02') {
						debug("Comfort BUS disconnected");
					} else {
						debug("Unexpected response from status request " + myResponse);		
					}
					break;	
				case 'CT':
					// counter changed report
					var counter = parseInt(value.substring(0,2),16);
					var countervalue = signedCytechHexToDecimal(value.substring(2));
					var data = {value: countervalue};					
					notifystatus("counter",counter,"value", data);
					break;
				case 'cm':
					// Control Menu reply and report
					break;
				case 'DB':
					// Doorbell Pressed Report
					var id = parseInt(value.substring(0,2),16);
					var data = {value: 1};
					notifystatus("doorbell",id,"value", data);
					break;
				case 'D*':
					// Status reply from DSP to DC command
					break;
				case 'DT':
					// Date and Time report
					break;
				case 'DI':
					// Dial Up Report
					break;
				case 'EV':
					// Event Log Report
					break;
				case 'ER':
					// Alarm Ready / Not Ready Report
					var ready = parseInt(value.substring(0,2),16);
					if (ready==0) {
						var data = {status: "arming"};
						notifystatus("alarm","mode","status", data);
					} else {
						var data = {status: "arming, waiting on zone", zone: ready};
						notifystatus("alarm","mode","status", data);
					}
					break;
				case 'EX':
					// Entry / Exit Delay Started Report
					var ready = parseInt(value.substring(0,2),16);
					if (ready==1) {
					var data = {status: "entry delay", seconds: parseInt(value.substring(2),16)};
						notifystatus("alarm","mode","status", data);
					} else {
						var data = {status: "exit delay", seconds: parseInt(value.substring(2),16)};
						notifystatus("alarm","mode","status", data);
					}
					break;
				case 'f?':
					// reply to query all flags
					// remove leading 00
					value = value.substring(2);
					var numbytes = value.length / 2;
					for (var position = 0; position < numbytes; position++)
					{
						var bytehexvalue = value.substring(position*2,(position+1)*2);
						var byteintvalue = parseInt(bytehexvalue, 16);
							for (var output=1; output < 9; output++ ) {
							var mask = 1 << (output-1);
							if ((byteintvalue & mask)!=0) {
								// bit is set
								notifystatus("zone",(output+(position*8)),"value", {value: 1});
							} else {
								notifystatus("zone",(output+(position*8)),"value", {value: 0});	
							}
						}		
					}
					break;
				case 'F?':
					// reply to Flag Request
					var flag = parseInt(value.substring(0,2),16);
					var flagvalue = parseInt(value.substring(2),16);
					var data = {value: flagvalue};
					notifystatus("flag",flag,"value", data);
		
					break;
				case 'FL':
					// flag status report
					var flag = parseInt(value.substring(0,2),16);
					var flagvalue = parseInt(value.substring(2),16);
					var data = {value: flagvalue};
					notifystatus("flag",flag,"value", data);
					break;
				case 'id':
					// reply to ID command
					break;
				case 'I?':
					//input activation report
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {value: zonevalue};
					notifystatus("zone",zone,"value", data);
					break;
				case 'IP':
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {value: zonevalue};
					notifystatus("zone",zone,"value", data);
					break;
				case 'IR':
					//IR activation report
					break;
				case 'IX':
					// IR Code received report
					break;
				case 'KL':
					// Keypad LEDS status Report
					break;
				case 'Kr':
					// read from KT03 memory reply
					break;
				case 'Kw':
					// write to KT03 acknowledge reply
					break;
				case 'LR':
					// Login Report
					break;
				case 'LU':
					// User Logged in Report
					break;
				case 'NA':
					// Error Response
					break;
				case 'OK':
					// Command Acknowledged Reply
					break;
				case 'O?':
					// Output Status Request Response
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {value: zonevalue};
					notifystatus("output",zone,"value", data);
					break;
				case 'OP':
					// Output Activation Report
					var zone = parseInt(value.substring(0,2),16);
					var zonevalue = parseInt(value.substring(2),16);
					var data = {value: zonevalue};
					notifystatus("output",zone,"value", data);
					break;
				case 'OQ':
					// Virtual Output status request
					break;
				case 'M?':
					// Mode Change Report
					var mode = parseInt(value.substring(0,2),16);
					var user = parseInt(value.substring(2),16);
					var modetype = ["off", "away", "night", "day", "vacation"]
					var status = modetype[mode];
					if (typeof status == 'undefined') {
						status = "unknown";
					}
					var data = {"status": status};
					if (user<17) {
							data.source = "user";
							data.user = user;
					} else if (user<25) {
							data.source = "ucm";
							data.ucm = user-16;
					} else if (user===240) {
							data.source = "keypad";
					} else if (user===245) {
							data.source = "sms";
					} else {
							data.source = "unknown"
							data.unknown = user;		
					}
					notifystatus("alarm","mode","status", data);
					break;
				case 'MD':
					// Mode Change Report
					var mode = parseInt(value.substring(0,2),16);
					var user = parseInt(value.substring(2),16);
					var modetype = ["off", "away", "night", "day", "vacation", "unknown"]
					var data = {status: modetype[mode]};
					if (user<17) {
							data.source = "user";
							data.user = user;
					} else if (user<25) {
							data.source = "ucm";
							data.ucm = user-16;
					} else if (user===240) {
							data.source = "keypad";
					} else if (user===245) {
							data.source = "sms";
					} else {
							data.source = "uknown"
							data.unknown = user;		
					}
					notifystatus("alarm","mode","status", data);
					break;
				case 'PT':
					// Pulse Activation Report
					break;
				case 'r?':
					// Sequential Register Query
					break;
				case 'RA':
					// Return value from DA (Do Action)
					break;
				case 'RP':
					// Phone Ring Report
					break;
				case 'SS':
					// Status report from external UCM
					break;
				case 'SN':
					// Serial Number Reply
					break;
				case 's?':
					// Sensor Query Response
					var sensor = parseInt(value.substring(0,2),16);
					var sensorvalue = signedCytechHexToDecimal(value.substring(2));			
					var data = {value: sensorvalue};
					notifystatus("sensor",sensor,"value", data);
					break;	
				case 'sr':
					// Sensor Register report
					var sensor = parseInt(value.substring(0,2),16);
					var sensorvalue = signedCytechHexToDecimal(value.substring(2));				
					var data = {value: sensorvalue};
					notifystatus("sensor",sensor,"value", data);
					break;
				case 'TT':
					// Monitor external bus communication for special UCMs
					break;
				case 'XF':
					// X10 House/Function Code Report
					break;
				case 'XR':
					// X10 Received Report
					break;
				case 'XT':
					// X10 Transmitted Report
					break;
				case 'XU':
					// X10 house/unit code received Report
					break;
				case 'WE':
					// acknowledge reply from WD command
					break;
				case 'Y?':
					// Reply to Y? request all output status
					var numbytes = value.length / 2;
					for (var position = 0; position < numbytes; position++)
					{
						var bytehexvalue = value.substring(position*2,(position+1)*2);
						var byteintvalue = parseInt(bytehexvalue, 16);
							for (var output=1; output < 9; output++ ) {
							var mask = 1 << (output-1);
							if ((byteintvalue & mask)!=0) {
								// bit is set
								notifystatus("output",(output+(position*8)),"value", {value: 1});
							} else {
								notifystatus("output",(output+(position*8)),"value", {value: 0});	
							}
						}		
					}
					break;
				case 'y?':
					// Reply to y? request all SCS/RIO output status	
				case 'Z?':
					var numbytes = value.length / 2;
					for (var position = 0; position < numbytes; position++)
					{
						var bytehexvalue = value.substring(position*2,(position+1)*2);
						var byteintvalue = parseInt(bytehexvalue, 16);
							for (var output=1; output < 9; output++ ) {
							var mask = 1 << (output-1);
							if ((byteintvalue & mask)!=0) {
								// bit is set
								notifystatus("zone",(output+(position*8)),"value", {value: 1});
							} else {
								notifystatus("zone",(output+(position*8)),"value", {value: 0});	
							}
						}		
					}
					// reply to report all zones
					break;
				case 'z?':
					// reply to report all SCS/RIO zones
					break;
				case '??':
					// checksum error or error in message format
					break;
				default:
					// Something Else Happenedcase "IP":
						
				
			}	

		}
		if (myResponse.substring(0,2) === "U?") {
			_myUCMID = myResponse.substring(8,10);
			debug('Connected UCM ID:'+_myUCMID),1;
		}
	}				
	
	this.postLogin = function postLogin() {
		// post login commands to get status
		_this.command("u?00");
		_this.command("U?");
		_this.command("V?");
		_this.command("v?");
		_this.command("a?");
		_this.command("b?00");
		_this.command("f?00");
		_this.command("M?");
		_this.command("Y?");
		_this.command("Z?");
		_this.command("y?");
		_this.command("z?");		
	}
	
	this.command = function command(message) {

		message=String(message);
		if (message.substring(0,2)==="LI") {
			if (message.substring(2) === _commUser) {
				debug("<-LI**** [Third Party Login, current user]");
				send('raw/received', "LU" + _connectedUser);
			} else {
				debug("<-LI**** [Third Party Login, not current user - simulating logout]",2);
				send('raw/received', "LU00");
			} 
		} else {
			if (_connected===true) {
				debug("<-" + message);
				client.write(stx+message+etx);
				send('raw/sent',message);
			} else {
				debug ("Failed to send " + message + ", not connected",2)
			}	
		}		
	}
	
	function decimalToHex(d, padding) {
		padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

		var result = "";	
    	while (padding--) {
        	result = hex[d & 0xF] + result;
        	d >>= 4;
    	}
    	return result;
    }
		
	function signedDecimalToCytechHex(d, padding) {
		
		padding = typeof (padding) === "undefined" || padding === null ? padding = 4 : padding;

    	var result = decimalToHex(d, padding);
    	
    	// switch byte order
		result = (result.substring(2,4)) + (result.substring(0,2));
		return result;
	}	
	
	function signedCytechHexToDecimal(d) {
		switch (d.length) {
			case 2:
				return parseInt(d,16);
			case 4:
				// switch byte order
				var textvalue = d.substring(2,4) + d.substring (0,2);
				var decvalue = parseInt(textvalue,16);
				if ((decvalue & 0x8000) > 0) {
					decvalue = decvalue - 0x10000;
				};
				return decvalue;
			default:
				return 0;
		}
	}
	
}

var alarm = new comfort();

alarm.connect();
