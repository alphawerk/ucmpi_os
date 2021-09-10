/*	alphawerk UHAI configuration manager
	(c) 2018, 2021 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

const _version = "2.0.0.0"
const _date = "100921"

var xml2js = require('xml2js');
var modules = require('./modules.js');
var debug = modules.debug;
var send = modules.send;
var sendretain = modules.sendretain;

modules.init("configuration", _version, _date)
function comfiguration() {

	var _this = this;

	modules.subscribetopic("uhai/comfiguration/content", function (topic, message) {_this.parseComfiguration(topic, message)});

	this.parseComfiguration = function parseComfiguration(topic, message) {
		if (topic != "uhai/comfiguration/content") {
			debug("Unexpected Topic recieved by Comfiguration parser " + topic + ":" + message);
		} 
		var comfortjs = null;
		xmlreader = new xml2js.Parser();
		xmlreader.parseString(message.toString(), function(err,result) {comfortjs=result;})
		
		// get zonetypes
		var id = null;
		try {
			comfortjs.Configuration.ZoneTypes[0].ZoneType.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/zonetypes/meta/startid", item.$.Number);
					}
				id = item.$.Number			
				debug("Loading ZoneType:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					homemode: item.$.HomeMode,
					awaymode: item.$.AwayMode,
					nightmode: item.$.NightMode,
					daymode: item.$.DayMode,
					entrydoor: item.$.EntryDoor,
					normallyopen: item.$.NormallyOpen,
					alarmtypenormal: item.$.AlarmTypeNormal,
					alarmtypetrouble: item.$.AlarmTypeTrouble
					};
				sendretain("comfiguration/zonetypes/" + item.$.Number, JSON.stringify(data));
			});
			sendretain("comfiguration/zonetypes/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Zone Types: " + error);
		}
		// get alarm types
		id = null;
		try {
			comfortjs.Configuration.AlarmTypes[0].AlarmType.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/alarmtypes/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading AlarmType:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					state: item.$.State
					};
				sendretain("comfiguration/alarmtypes/" + item.$.Number, JSON.stringify(data));	
			});
			sendretain("comfiguration/alarmtypes/meta/endid", id);
		} catch (error) {
			debug("Unable to parse AlarmTypes: " + error);
		}
		// get NDAlarms
		id = null;
		try {
			comfortjs.Configuration.NDAlarms[0].NDAlarm.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/ndalarms/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading AlarmType:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					alarmtypename: item.$.AlarmTypeName
					}; 	
				sendretain("comfiguration/ndalarms/" + item.$.Number, JSON.stringify(data));	
			});
			sendretain("comfiguration/ndalarms/meta/endid", id);
		} catch (error) {
			debug("Unable to NDAlarms: " + error);
		}
		// get zones
		id = null;
		try {
			comfortjs.Configuration.Zones[0].Zone.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/zones/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Zone:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					zonetypename: item.$.ZoneTypeName,
					zoneword1: item.$.ZoneWord1,
					zoneword2: item.$.ZoneWord2,
					zoneword3: item.$.ZoneWord3,
					zoneword4: item.$.ZoneWord4,
					entrypath: item.$.EntryPath,
					partition: item.$.Partition,
					virtualinput: item.$.VirtualInput,
					announce: item.$.Announce
					}; 	
				sendretain("comfiguration/zones/" + item.$.Number, JSON.stringify(data));		
			});
			sendretain("comfiguration/zones/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Zones: " + error);
		}
		// get users
		id = null;
		try {
			comfortjs.Configuration.Authorisations[0].Authorisation.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/users/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading User:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					localarm: item.$.LocalArm,
					localdisarm: item.$.LocalDisarm,
					remotearm: item.$.RemoteArm,
					remotedisarm: item.$.RemoteDisarm
					}
				sendretain("comfiguration/users/" + item.$.Number, JSON.stringify(data));
			});
			sendretain("comfiguration/users/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Users: " + error);
		}
		// get counters
		id = null;
		try {
			comfortjs.Configuration.Counters[0].Counter.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/counters/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Counter:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name
					};
				sendretain("comfiguration/counters/" + item.$.Number, JSON.stringify(data));

			});
			sendretain("comfiguration/counters/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Counters: " + error);
		}
		// get flags
		id = null;
		try {
			comfortjs.Configuration.Flags[0].Flag.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/flags/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Flag:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name
					};
				sendretain("comfiguration/flags/" + item.$.Number, JSON.stringify(data));

			});
			sendretain("comfiguration/flags/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Flags: " + error);
		}
		// get outputs
		id = null;
		try {
			comfortjs.Configuration.Outputs[0].Output.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/outputs/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Output:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name
					};
				sendretain("comfiguration/outputs/" + item.$.Number, JSON.stringify(data));

			});
			sendretain("comfiguration/outputs/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Outputs: " + error);
		}
		// get timers
		id = null;
		try {
			comfortjs.Configuration.Timers[0].Timer.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/timers/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Timer:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name
					};
				sendretain("comfiguration/timers/" + item.$.Number, JSON.stringify(data));

			});
			sendretain("comfiguration/timers/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Timers: " + error);
		}
		// get responses
		id = null;
		try {
			comfortjs.Configuration.Responses[0].Response.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/responses/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Response:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					description: item.$.Description
					};
				sendretain("comfiguration/responses/" + item.$.Number, JSON.stringify(data));
			});
			sendretain("comfiguration/responses/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Responses: " + error);
		}
		// get sensors
		id = null;
		try {
			comfortjs.Configuration.SensorResponses[0].SensorResponse.forEach(function (item) {
				if (!id) {
					sendretain("comfiguration/sensors/meta/startid", item.$.Number);
					}
				id = item.$.Number	
				debug("Loading Sensor:" + item.$.Number + ":" + item.$.Name);
				var data = {
					number: item.$.Number,
					name: item.$.Name,
					description: item.$.Description,
					setpointcounternumber: item.$.SetpointCounterNumber,
					maxsetpoint: item.$.MaxSetpoint,
					minsetpoint: item.$.MinSetpoint,
					hysteresis: item.$.Hysteresis,
					calibration: item.$.Calibration,
					scaling: item.$.Scaling,
					scalefactor: item.$.ScaleFactor,
					sensortabunits: item.$.SensorTabUnits,
					virtualinputnumber: item.$.VirtualInputNumber,
					enableflagnumber: item.$.EnableFlagNumber
					};
				sendretain("comfiguration/sensors/" + item.$.Number, JSON.stringify(data));
			});
			sendretain("comfiguration/sensors/meta/endid", id);
		} catch (error) {
			debug("Unable to parse Sensors: " + error);
		}
	}
}


var comfig = new comfiguration();

