/*	alphawerk UHAI UCMEth Emulator
	(c) 2018, 2021 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

const _version = "2.0.0.0"
const _date = "100921"

var net = require('net');
var modules = require('./modules.js');
var debug = modules.debug;
var send = modules.send;
var external = modules.external;

modules.init("UCMEth", _version, _date);


var native_clients = [];
var native_server = null;
var text_clients = [];
var text_server = null;
var trace_clients = [];
var trace_server = null;

modules.subscribetopic("uhai/UCMEth/native/control", function(topic, message) {
	if (message=="start") {
		debug("Native Server start request received");
		if (!native_server) {
			native_server = net.createServer(function (socket) {
				var _inputBuffer = "";
				// Identify this client
				socket.name = socket.remoteAddress + ":" + socket.remotePort;
				// Put this new client in the list
				native_clients.push(socket);
				debug("New UCM Emulator connection from " + socket.remoteAddress + ":" + socket.remotePort);
				// Handle incoming messages from clients.
				socket.on('data', function (data) {
					for (var value of data.values()) {
						if (value===3) {
							_inputBuffer= "";
						} else if (value===13) {
							debug("Sending " + _inputBuffer + " from " + socket.remoteAddress + ":" + socket.remotePort + " connection to UCM Emulator");
							external('core/raw/send',_inputBuffer);
							_inputBuffer= "";
						} else {
							_inputBuffer += String.fromCharCode(value);
						}
					}
					//broadcast(socket.name + "> " + data, socket);
				 });
				// Remove the client from the list when it leaves
				socket.on('end', function () {
					debug("Closed UCM Emulator connection on " + socket.remoteAddress + ":" + socket.remotePort);
					native_clients.splice(native_clients.indexOf(socket), 1);
				});
			}).listen(2001);
			debug("Native Server started");
			modules.sendretain("native/status","started");
		} else {
			debug("Native server already active, start ignored");	
		}
	} else if (message=="stop") {
		debug("Native Server stop request received");
		for (var i in native_clients) {
			if (native_clients[i]) {
				debug("Native server connection " + native_clients[i].remoteAddress + " forced closed");
				native_clients[i].end();
				//native_clients[i].destroy();
			}
		}
		if (native_server) {
			native_server.close(function () {
				debug("Native Server Stopped");
				native_server.unref();
				native_server = null;
				modules.sendretain("native/status","stopped");
			})	
		} else {
			debug("Native server not active, stop ignored");	
		}
	} else if (message=="status") {
		if (native_server) {
			modules.sendretain("native/status","started");
		} else {
			modules.sendretain("native/status","stopped");
		}

	} else {
		debug("Unrecognised command " + message + " for UCMEth Native emulation");
	}
});

modules.subscribetopic("uhai/UCMEth/text/control", function(topic, message) {
 	if (message=="start") {
		debug("Text Server start request received");
		if (!text_server) {
			text_server = net.createServer(function (socket) {   
				socket.username = null;
				socket.authenticated = false;
				text_clients.push(socket);
				// Send a nice welcome message and prompt login
				socket.write('Welcome to the Text UCM Interface!\n')
				socket.write('Please login to continue\n')
				debug("New UCM Text connection from " + socket.remoteAddress + ":" + socket.remotePort);
				socket.write('Username: ');

				// Handle incoming messages from clients.
				socket.on('data', function (data) {
					buffer = '';
					//Remove EOL
					for (var value of data.values()) {
						if ((value!==10) && (value!==13))
						{
							buffer += String.fromCharCode(value);
						}
					}
					//Check if the client is authenticated
					if(!socket.authenticated)
					{
						if(socket.username === null)
						{
							socket.username = buffer;
							socket.write('Password: ');
						}
						else 
						{
							if(modules.checkuserpassword(socket.username, buffer.toString(), modules.userrights['UCM-Interactive'])) {
								debug("UCM Text Connection authenticated by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);
								socket.write('Logged in!\n');
								socket.write('==========\n'); 
								socket.authenticated = true; 
							} else {
								debug("UCM Text Authentication failure by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);     
								socket.username = null;
								socket.write('Incorrect login\n');
								socket.write('Username: ');
							}
						}
					}
					else
					{
						debug("UCM Text Request to send " + buffer + " by " + socket.username + " connected from " + socket.remoteAddress + ":" + socket.remotePort);
						external('core/raw/send', buffer);
					}
				});

				// Remove the client from the list when it leaves
				socket.on('end', function () {
					debug("Closed UCM Text connection by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);
					if(text_clients.indexOf(socket) > -1)
					{
						text_clients.splice(text_clients.indexOf(socket), 1);
					}
				});

			}).listen(2002);
			debug("Text Server started");
			modules.sendretain("text/status","started");
		} else {
			debug("Text server already active, start ignored");
		}
	} else if (message=="stop") {
		debug("Text Server stop request received");
		for (var i in text_clients) {
			if (text_clients[i]) {
				debug("Text server connection " + text_clients[i].remoteAddress + " forced closed");
				text_clients[i].end();
				text_clients[i].destroy();
			}
		}
		if (text_server) {
			text_server.close(function () {
				debug("Text Server Stopped");
				text_server.unref();
				text_server = null;
				modules.sendretain("text/status","stopped");
			})	
		} else {
			debug("Text server not active, stop ignored");	
		}
	} else if (message=="status") {
		if (text_server) {
			modules.sendretain("text/status","started");
		} else {
			modules.sendretain("text/status","stopped");
		}
	} else {
		debug("Unrecognised command " + message + " for UCMEth Text server");
	}
});

modules.subscribetopic("uhai/UCMEth/trace/control", function(topic, message) {
 	if (message=="start") {
		debug("Trace Server start request received");
		if (!trace_server) {
			trace_server = net.createServer(function (socket) {   
				socket.username = null;
				socket.authenticated = false;
				trace_clients.push(socket);
				// Send a nice welcome message and prompt login
				socket.write('Welcome to the Trace UCM Interface!\n')
				socket.write('Please login to continue\n')
				debug("New UCM Trace connection from " + socket.remoteAddress + ":" + socket.remotePort);
				socket.write('Username: ');
				// Handle incoming messages from clients.
				socket.on('data', function (data) {
					buffer = '';
					//Remove EOL
					for (var value of data.values()) {
						if ((value!==10) && (value!==13))
						{
							buffer += String.fromCharCode(value);
						}
					}
					//Check if the client is authenticated
					if(!socket.authenticated)
					{
						if(socket.username === null)
						{
							socket.username = buffer;
							socket.write('Password: ');
						}
						else 
						{
							if(modules.checkuserpassword(socket.username, buffer.toString(), modules.userrights['UCM-Trace'])) {
								debug("UCM Trace Connection authenticated by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);
								socket.write('Logged in!\n');
								socket.write('==========\n'); 
								socket.authenticated = true; 
							} else {
								debug("UCM Trace Authentication failure by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);     
								socket.username = null;
								socket.write('Incorrect login\n');
								socket.write('Username: ');
							}
						}
					}
				});
				// Remove the client from the list when it leaves
				socket.on('end', function () {
					debug("Closed UCM Trace connection by " + socket.username + " on " + socket.remoteAddress + ":" + socket.remotePort);
					if(trace_clients.indexOf(socket) > -1)
					{
						trace_clients.splice(trace_clients.indexOf(socket), 1);
					}
				});
			}).listen(2003);
			debug("Trace Server started");
			modules.sendretain("trace/status","started");
		} else {
			debug("Trace server already active, start ignored");
		}
	} else if (message=="stop") {
		debug("Trace Server stop request received");
		for (var i in trace_clients) {
			if (trace_clients[i]) {
				debug("Trace server connection " + trace_clients[i].remoteAddress + " forced closed");
				trace_clients[i].end();
				trace_clients[i].destroy();
			}
		}
		if (trace_server) {
			trace_server.close(function () {
				debug("Trace Server Stopped");
				trace_server.unref();
				trace_server = null;
				modules.sendretain("trace/status","stopped");
			})	
		} else {
			debug("Trace server not active, stop ignored");	
		}
	} else if (message=="status") {
		if (trace_server) {
			modules.sendretain("trace/status","started");
		} else {
			modules.sendretain("trace/status","stopped");
		}
	} else {
		debug("Unrecognised command " + message + " for UCMEth Trace server");
	}
});



function broadcast(topic, message) {
	if (message.toString().substring(0,2)!="Cs") {
		text_broadcast(message);
		native_broadcast(message);
		trace_broadcast("UCM->" + message);
	}
}

function sentbroadcast(topic, message) {
	if(message != "??") {
		trace_broadcast("UCM<-" + message);
	}
}

function trace_broadcast(message) {
	trace_clients.forEach(function (client) {
		if (client.authenticated) {
			try {
				client.write(message + "\n");
			} catch (error)
			{
				client.end();
			}
		}
	});
}


function text_broadcast(message) {
	text_clients.forEach(function (client) {
		if (client.authenticated) {
			try {
				client.write(message + "\n");
			} catch (error)
			{
				client.end();
			}
		}
    });
}

function native_broadcast(message) {
	native_clients.forEach(function (client) {
		try {
     		client.write(String.fromCharCode(3) + message + String.fromCharCode(13));
     	} catch  (error)
     	{
     		client.end();
     	} 
    });
}

//modules.callback(function (topic, message) {broadcast(topic, message)});
modules.subscribetopic("uhai/core/raw/received",function (topic, message) {broadcast(topic, message)});
modules.subscribetopic("uhai/core/raw/sent", function (topic, message) {sentbroadcast(topic,message)});

