/*	alphawerk UHAI support modules
	(c) 2018 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

const _version = "2.0.0.0"
const _date = "100921"

const cp = require('child_process');
const mqttlib = require('mqtt');
const fs = require('fs');
const bcrypt = require('bcrypt');
var path = require('path');
const uid = require('uid-safe');

var thismqtt = new mqtt();

var _serialnum = thismqtt.getserial();

var _debuglevel = {
	'Trace':		0,
	'Info':			1,
	'Minor':		2,
	'Warning':		3,
	'Error':		4,
	'Critical':		5,
	'0':			'Trace',
	'1':			'Info',
	'2':			'Minor',
	'3':			'Warning',
	'4':			'Error',
	'5':			'Critical'
};

var _userrights = {
	'Admin':	1,
	'Node-Red-Read':	2,
	'Node-Red-Write':	4,
	'Remote-Access':	8,
	'UCM-Trace':	16,
	'UCM-Interactive':	32,
	'Alert-Email':	1024,
	'2FA':	2048,
	'Alert-Login-Failure': 4096,
	'Alert-Login-Success': 8192
}

module.exports = {
	init: function(owner, version, builddate) {thismqtt.init(owner, version, builddate)},
	debug: function(message, severity) {thismqtt.debug(message, severity)},
	send: function(topic, message) {thismqtt.send(topic,message)},
	external: function(topic, message) {thismqtt.external(topic,message)},
	sendretain: function (topic, message) {thismqtt.sendretain(topic,message)},
	externalretain: function(topic, message) {thismqtt.externalretain(topic,message)},
	serialNumber: _serialnum,
	callback: function (callbackfunction) {thismqtt.callback(callbackfunction)},
	subscribe: function (topic) {thismqtt.subscribe(topic)},
	subscribetopic: function (topic,callback, name) {thismqtt.subscribetopic(topic, callback, name)},
	unsubscribetopic: function (name) {thismqtt.unsubscribetopic(name)},
	getelement: function (type, id) {return thismqtt.getelement(type, id)},
	getelements: function (type) {return thismqtt.getelements(type)},
	getelementidbyname: function (type,name) {return thismqtt.getelementidbyname(type, name)},
	getstatus: function (type, index, element) {return thismqtt.getstatus(type, index, element)},
	updatestatus: function (type, index, element, data) {thismqtt.updatestatus(type, index, element, data)},
	notifystatus: function (type, index, element, data) {thismqtt.notifystatus(type, index, element, data)},
	requeststatus: function (type, index, element, data) {return thismqtt.requeststatus(type, index, element, data)},
	pollstatus: function (type, index, element) {thismqtt.pollstatus(type, index, element)},
	eventsubscribe: function (type, index, element, nodeid, callbackfunction) {thismqtt.eventsubscribe(type, index, element, nodeid, callbackfunction)},
	eventunsubscribe: function (nodeid) {thismqtt.eventunsubscribe(nodeid)},
	getusers: function () {return thismqtt.getusers()},
	getuserlist: function () {return thismqtt.getuserlist()},
	adduser: function (username, email, password, rights) {return thismqtt.adduser(username, email, password, rights)},
	checkuser: function (username, rights) {return thismqtt.checkuser(username, rights)},
	checkuserpassword: function (username, password, rights) {return thismqtt.checkuserpassword(username, password, rights)},
	checkuserpasswordnoright: function (username, password) {return thismqtt.checkuserpasswordnoright (username, password)},	
	modifyuserpassword: function (username, oldpassword, newpassword) {return thismqtt.modifyuserpassword(username, oldpassword, newpassword)},
	modifyuser: function(username, email, rights) {return thismqtt.modifyuser(username, email, rights)},
	deleteuser: function(username) {return thismqtt.deleteuser(username)},
	getuuid: function() {return thismqtt.getuuid()},
	debuglevel : _debuglevel,
	userrights : _userrights
	};


function mqtt() {
	var _this = this;
	var _client = ""
	var _connected = false;
	var _mqtthost = "mqtt://127.0.0.1";
	var _owner = "undefined";
	var _configuration = {};
	var _status = {};
	var _subscriptions = new Map();
	var _eventsubscriptions = new Map();
	var _configpath = '/etc/ucmpi_os/config/';
	var _defaultuserfile = [];
	const _saltrounds = 10;


	// check to make sure configpath exists	
	_configpath
		.split(path.sep)
		.reduce((currentPath, folder) => {
    		currentPath += folder + path.sep;
    		if (!fs.existsSync(currentPath)){
        		fs.mkdirSync(currentPath);
    		}
    		return currentPath;
 			}, '');
	
	// check to see if a user file exists, and if it doesn't, create one from the default template.
	if (!fs.existsSync(_configpath + 'users.json')) {
		fs.writeFileSync(_configpath + 'users.json', JSON.stringify(_defaultuserfile));
	}



	this.init = function init(owner, version, builddate) {
		_owner = owner;
		_client = new mqttlib.connect(_mqtthost,{clientId: _owner, will: {topic: "uhai/"+_owner+"/connection/status", payload: "Disconnected", retain: true}});
		_client.on('message', function (topic,message) {_this.processcallbacks(topic,message)});
		_client.on('connect', function () {
			_connected = true; 
			_this.debug("MQTT Connected"); 
			_this.sendretain("connection/status","Connected");
			_this.sendretain("version", version);
			_this.sendretain("builddate", builddate);
			_this.subscribetopic("uhai/configuration/comfiguration/#",function(topic,message) {_this.updateconfiguration(topic,message)});
			_this.subscribetopic("uhai/core/status/#",function(topic,message) {_this.setstatus(topic, message)}) 
		});
		
	}
	
	this.callback = function callback(callbackfunction) {
		_client.on('message', function (topic,message) {callbackfunction(topic,message)});
	}

	this.subscribe = function subscribe(topic) {
		_client.subscribe(topic);
	}

	this.subscribetopic = function subscribetopic(topic, callbackfunction, name = false) {
		if (!name) {
			name = topic;
		}
		_subscriptions.set(name,{'topic': topic, 'callback': callbackfunction});
		_client.subscribe(topic);
	}

	this.unsubscribetopic = function unsubscribetopic(name) {
		if (_subscriptions.has(name)) {
			_subscriptions.delete(name);
		}
	}

	this.processcallbacks = function processcallbacks(topic,message) {

		var sourcetopics = topic.split("/");

		for (var [key, value] of _subscriptions) {
			var matched = true;
			var targettopics = value['topic'].split("/");

			if (sourcetopics.length >= targettopics.length) {		
				for (var i in targettopics) {	

					if (!((targettopics[i]===sourcetopics[i]) || (targettopics[i] === "+") || (targettopics[i] === "#"))) {
						matched = false;
					}
									
				}
				if ((matched===true) && (sourcetopics.length != targettopics.length) && (targettopics[targettopics.length-1]!="#")) {
						matched = false;
				}
				if (matched===true) {

					value['callback'](topic,message);
				} else {

				}
			}
		}							
	}


	this.send = function send(topic, message) {			
		this.external(_owner + "/" + topic, message);
	}
	
	this.external = function external(topic, message) {
		if (_connected === true) {
			_client.publish("uhai/" + topic, message);
		}
	
	}
	
	this.sendretain = function sendretain(topic, message) {
		this.externalretain(_owner + "/" + topic, message);
	} 
	
	this.externalretain = function externalretain(topic,message) {
		if (_connected === true) {
			_client.publish("uhai/" + topic, message, {retain: true});
		}
	}
	
	this.debug = function debug(message, severity) {	

		if (typeof message == 'number') {
			message = message.toString();
		}
		if (typeof message == 'object') {
			message = JSON.stringify(message);
		}
		var _severity = severity || 1
		if ((typeof _severity != 'number')||(_severity<0)||(severity>5)) {
			// invalid severity - setting to info but appending note to message
			_severity = 1;
			message += "| Invalid severity in debug statement";
		}
		if (typeof message != 'string') {
			message = 'debug message is ' + typeof message + ", can't send to mqtt";
			if (_severity < 3) {
				_severity = 3;
			}
		} 

		this.external("debug", JSON.stringify({
			'date'		: Date.now(),
			'source'	: _owner || 'Unknown', 
			'message'	: message,
			'severity'	: _severity,
			'severity_text': _debuglevel[_severity]
		}));
	}
	
	this.updateconfiguration = function updateconfiguration(topic, message) {
		_configuration[topic.substring(33)] = JSON.parse(message);
	}
	
	this.getelement = function getelement(type, id) {
		if (_configuration[type + "/" + id]) {
			return _configuration[type + "/" + id];
		} else {
			_this.debug ("Error: unable to find " + type + ":" + id + " in configuration");
		}
	}
	
	this.getelements = function getelements(type) {
		var data = {};
		if (typeof _configuration[type + "/meta/startid"] != 'undefined') {
			var id = _configuration[type + "/meta/startid"];
			while (id <= _configuration[type + "/meta/endid"] ) {
				if (_configuration[type +"/" + id]) {
					data[id]=_configuration[type +"/" + id];
				}
				id++;
			}	
			return data;
		}
		_this.debug("No startid for " + type + " whilst returning all elements");
		return data;
	}
	
	
	this.getelementidbyname = function getelementidbyname(type, name) {
		if (_configuration[type + "/meta/startid"]) {		
			var id = _configuration[type + "/meta/startid"];
			while (id <= _configuration[type + "/meta/endid"] ) {
				if (_configuration[type + "/" + id]) {
					if (_configuration[type +"/" + id].name === name) {
						return id;
						}
					}
					id++;
				}
			this.debug ("Name " + name + " not found in " + type);
			return -1;
		}
		this.debug ("No startid for " + type + " whilst searching for " + name);
	}
	
	this.getstatus = function getstatus(type, index, element) {
		if (_status[type + "/" + index + "/" + element]) {
			return _status[type + "/" + index + "/" + element];
		} else {
			return null;
		}
	}
	
	
	this.setstatus = function setstatus(topic, message) {
		var item = topic.split("/");
		var data = JSON.parse(message);	
		if (_status[item[3]+"/"+item[4]+"/"+item[5]]) {
			delete _status[item[3]+"/"+item[4]+"/"+item[5]].previous;
			data.previous = _status[item[3]+"/"+item[4]+"/"+item[5]];
		}
		_status[item[3]+"/"+item[4] +"/"+item[5]] = data;		
		if (data.notify) {	
			for (var [key, value] of _eventsubscriptions) {	
				if ((value.type===item[3])||(value.type==="*")) {
					if ((value.index===item[4])||(value.index==="*")) {
						if ((value.element===item[5])||(value.element==="*")) {
							_this.debug("Callback from subscription on " + value.type + ":" + value.index + ":" + value.element + "::" + item[3]+":"+item[4]+":"+item[5]);
							value.callback(item[3],item[4],item[5],data);
						}
					}
				}	
			}
		}
	}
	
	this.eventsubscribe = function eventsubscribe(type, index, element, nodeid, callbackfunction) {
		_this.debug("Event Subscribed " + nodeid);
		_eventsubscriptions.set(nodeid,{
			type: type,
			index: index, 
			element: element,
			callback: callbackfunction
		});
	}
	
	this.eventunsubscribe = function eventunsubscribe(nodeid) {
		_this.debug("Event Unsubscribed " + nodeid);
		if (_eventsubscriptions.has(nodeid)) {
			_eventsubscriptions.delete(nodeid);
		} else {
			_this.debug("Unable to find subscription " + nodeid);
		}
	}
	
	
	
	this.requeststatus = function requeststatus(type, index, element, data) {
		if (typeof data != 'string') {
			switch (typeof data) {
				case 'boolean':
					if (data) {
						data = "true";
					} else {
						data = "false";
					}
					break;
				case 'number':
					data = data.toString();
					break;
				default:
					_this.debug ('Unsupported data for ' + type + ":" + index + ":" + element + ":" + typeof data);
					data = undefined;
			}
		}	
		if (typeof data != 'undefined') {
			_this.debug('Request to set ' + type + ":" + index + ":" + element + " to " + data);
			_this.external("core/request/" + type + "/" + index + "/" + element, data);	
		}
	}
		
	this.pollstatus = function pollstatus(type, index, element) {
		_this.debug('Request to poll ' + type + ":" + index + ":" + element);
		_this.external("core/poll/" + type + "/" + index + "/" + element, _owner);	
	}
	
	
	this.notifystatus = function notifystatus (type, index, element, data) {
		data.notify = true;
		data.timestamp = new Date().getTime();
		_this.debug('Setting with notify ' + type + ":" + index + ":" + element + " to " + data);	
		_this.sendretain("status/" + type + "/" + index + "/" + element,JSON.stringify(data));
	}
	
	this.updatestatus = function updatestatus (type, index, element, data) {
		data.notify = false;
		data.timestamp = new Date().getTime();
		_this.debug('Setting without notify ' + type + ":" + index + ":" + element + " to " + data);	
		_this.sendretain("status/" + type + "/" + index + "/" + element,JSON.stringify(data));
	}

	// user management

	this.adduser = function adduser(username, email, password, rights) {
		var userlist = _this.getuserlist();

		for (var i = 0; i< userlist.length; i++) {
			var user = userlist[i];
			if (user.name == username) {
				_this.debug ("Username " + username + " failed to add as user " + user.name + ":" + user.email + " already exists");				
				return false;
			}		
		}
		
		if(typeof(rights) !== "number") {
			_this.debug("Invalid rights for " + username + ":" + rights + ", expected a number");
			return false;
		}
		userlist.push({
			name: username,
			email: email,
			password: bcrypt.hashSync(password, _saltrounds),
			rights: rights
		});
		_this.setuserlist(userlist);
		_this.debug("Added user " + username + " to local userlist");
		return true;
	}

	this.modifyuser = function modifyuser(username, email, rights) {
		if(typeof(rights) !== "number") {
			_this.debug("Invalid rights for " + username + ":" + rights + ", expected a number");
			return false;
		}
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {
				userlist[i].email = email;
				userlist[i].rights = rights
				_this.setuserlist(userlist);
				_this.debug("Modified user " + username + " on local userlist");	
				return true;		
			}		
		}
		_this.debug("Unable to find " + username + " to modify on local userlist");
		return false;
	}
	
	this.modifyuserpassword = function modifyuserpassword (username, oldpassword, newpassword) {
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {
				if (bcrypt.compareSync(oldpassword, userlist[i].password)) {
					userlist[i].password = bcrypt.hashSync(newpassword, _saltrounds);
					_this.setuserlist(userlist);
					_this.debug("Changed password for user " + username + " on local userlist");	
					return true;
				} else {
					_this.debug("Unable to change password for user " + username + " invalid password");
					return false;
				}		
			}		
		}
		_this.debug("Unable to find " + username + " to change password on local userlist");
		return false;
	}
	
	this.deleteuser = function deleteuser (username) {
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {			
				userlist.splice(i,1);
				_this.setuserlist(userlist);
				_this.debug("Deleted user " + username + " on local userlist");
				return true;		
			}		
		}
		_this.debug("Unable to find " + username + " to delete on local userlist");
		return false;	
	}
	
	this.checkuserpassword = function checkuserpassword (username, password, right) {
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {
				if (bcrypt.compareSync(password, userlist[i].password)) {
					if (userlist[i].rights & right) {
						_this.debug("User " + username + " authenticated with right " + right);
						return true;
					} else {
						_this.debug("User " + username + " authenticated with but does not have right " + right);	
						return false;
					}										
				} else {
					_this.debug("User " + username + " failed authentication");
					return false;
				}		
			}		
		}
		_this.debug("Unable to find " + username + " to check rights");
		return false;	
	}
	
	this.checkuserpasswordnoright = function checkuserpasswordnoright (username, password) {
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {
				if (bcrypt.compareSync(password, userlist[i].password)) {	
					_this.debug("User " + username + " authenticated");
					return true;
				} else {
					_this.debug("User " + username + " failed authentication");
					return false;
				}		
			}		
		}
		_this.debug("Unable to find " + username + " to check password");
		return false;	
	}
	
	this.checkuser = function checkuser (username, right) {
		var userlist = _this.getuserlist();		
		for (var i = 0; i< userlist.length; i++) {
			if (userlist[i].name == username) {
	
				if (userlist[i].rights & right) {
					_this.debug("User " + username + " has right " + right);
					return true;
				} else {
					_this.debug("User " + username + " but does not have right " + right);	
					return false;
				}
			}											
		}
		_this.debug("Unable to find " + username + " to check rights");
		return false;
	}
	
	this.getusers = function getusers () {
		var userlist = _this.getuserlist();	
		var returnlist = [];	
			for (var i = 0; i< userlist.length; i++) {
				returnlist.push({
					name: userlist[i].name,
					email: userlist[i].email,
					rights: userlist[i].rights
				});
			}
		return returnlist;
	}
	
	this.getuserlist = function getuserlist () {
		var userlist = _defaultuserfile;
		if (fs.existsSync(_configpath + 'users.json')){
			let rawdata = fs.readFileSync(_configpath + 'users.json');
			try {
				userlist = JSON.parse(rawdata)
				if ((!userlist) || (typeof(userlist) !== "object")) {
				
					_this.debug('Unable to load or parse users.json, returning defaults')
					userlist = _defaultuserfile;
				} else {
					_this.debug('Userlist loaded');
				}		
			}
			catch (e) 
			{
				_this.debug('Error ' + e + ' caught, returning default userlist after failed read');
				userlist = _defaultuserfile;	
				return userlist;
			}
		}
		return userlist; 				
	}

	this.setuserlist = function setuserlist (users) {
		fs.writeFileSync(_configpath + 'users.json', JSON.stringify(users));		
	}
	
	this.getuuid = function getuuid() {
		if (fs.existsSync(_configpath + 'uuid')) {
			let rawdata = fs.readFileSync(_configpath + 'uuid');
			uuid = rawdata.toString();			return uuid;
		
		} else {
			uuid = uid.sync(40);
			fs.writeFileSync(_configpath + 'uuid', uuid);
			return uuid;		
		}
	}
	
	this.getserial = function getserial() {
		if (fs.existsSync(_configpath + 'serial')) {
			let rawdata = fs.readFileSync(_configpath + 'serial');
			var serial = rawdata.toString();
			return serial;
		} else {
			var serial = cp.execSync('cat /proc/cpuinfo | grep Serial | awk \'{print $3}\'').toString().trim() + "_" + uid.sync(20);
			fs.writeFileSync(_configpath + 'serial', serial);
			return serial;		
		}
	}
		
}



