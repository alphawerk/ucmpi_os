/*	alphawerk UHAI manager web interface
	(c) 2018, 2021 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

var userrights = null;
var connection = null;


function convertToK(str){
    var int;
    if (-1 !== str.indexOf('G')){
        int = parseFloat(str) * 1024 * 1024;
    } else if (-1 !== str.indexOf('M')){
        int = parseFloat(str) * 1024;
    } else {
        int = parseFloat(str)
    }

    return int;
}
$(document).ready(function(){

    if (location.hostname !== 'uhai.alphawerk.co.uk') {
        var nodeRed = '<a class="sidebar-link" href="http://' + location.hostname + ':1880/"><img src="../static/img/node-red-icon.svg" height="20px"> <span class="align-middle">Node-Red</span></a>';
        var nodeRedDash = '<a class="sidebar-link" href="http://' + location.hostname + ':1880/ui/"><img src="../static/img/node-red-icon.svg" height="20px"> <span class="align-middle">Node-Red Dashboard</span></a>';
        document.getElementById("node-red").innerHTML = nodeRed;
        document.getElementById("node-red-dash").innerHTML = nodeRedDash;
    }

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    var wslink = 'ws://' + window.location.host + '/ws';
    if (location.hostname === 'uhai.alphawerk.co.uk') {
        wslink = 'wss://' + window.location.host + '/ws';
    }
    connection = new WebSocket(wslink);
    connection.onopen = function () {
        document.getElementById("websocketstatus").innerHTML = "<i class=\"fas fa-circle text-success\"></i> Online";
    }
    connection.onerror = function(error) {
        document.getElementById("websocketstatus").innerHTML = "Connection Lost Retrying <span style=\"color: orange;\"><i class=\"fas fa-spinner fa-spin\"></i></span>";
    }

    connection.onmessage = function(message) {
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log("Invalid data from ws");
            return;
        }
        var sshStr, loadStr, diskStr, memoryStr = '';
        var diskInt, memoryInt = 0;

        switch (json["topic"]) {
            case "serialnumber":
                document.getElementById("serialnumber").innerHTML = json["payload"]["serialnumber"];
                break;
            case "loadindex":
                if (parseFloat(json["payload"]["status"]) < 2) {
                    loadStr = "<i class=\"fas fa-circle text-success\"></i>";
                } else if (parseFloat(json["payload"]["status"]) < 3) {
                    loadStr = "<i class=\"fas fa-circle text-warning\"></i>";
                } else if (parseFloat(json["payload"]["status"]) >= 4) {
                    loadStr = "<i class=\"fas fa-circle text-danger\"></i>";
                } else {
                    loadStr = "<i class=\"fas fa-circle text-danger\"></i>";
                }
                loadStr = loadStr + " " +  json["payload"]["status"];
                document.getElementById("loadindex").innerHTML = loadStr;
                break;
            case "disk":
                diskInt = convertToK(json["payload"]["status"]);

                if (diskInt >= 1048576) {
                    diskStr = "<i class=\"fas fa-circle text-success\"></i>";
                } else if (diskInt >= 524288) {
                    diskStr = "<i class=\"fas fa-circle text-warning\"></i>";
                } else if (diskInt < 524288) {
                    diskStr = "<i class=\"fas fa-circle text-danger\"></i>";
                } else {
                    diskStr = "<i class=\"fas fa-circle text-danger\"></i>";
                }

                diskStr = diskStr + " " +  json["payload"]["status"];
                document.getElementById("disk").innerHTML = diskStr;
                break;
            case "memory":
                memoryInt = convertToK(json["payload"]["status"]);

                if (memoryInt > 50) {
                    memoryStr = "<i class=\"fas fa-circle text-success\"></i>";
                } else if (memoryInt < 50) {
                    memoryStr = "<i class=\"fas fa-circle text-warning\"></i>";
                } else if (memoryInt < 25) {
                    memoryStr = "<i class=\"fas fa-circle text-danger\"></i>";
                } else {
                    memoryStr = "<i class=\"fas fa-circle text-danger\"></i>";
                }

                memoryStr = memoryStr + " " +  json["payload"]["status"];
                document.getElementById("memory").innerHTML = memoryStr;
                break;
            case "uptime":
                document.getElementById("uptime").innerHTML = json["payload"]["status"];
                break;
            case "ssh":
                if (json["payload"]["status"]) {
                    sshStr = "<i class=\"fas fa-circle text-warning\"></i> True";
                } else {
                    sshStr = "<i class=\"fas fa-circle text-success\"></i> False";
                }
                document.getElementById("ssh").innerHTML = sshStr;
                break;
            default:
        }
    }

});
