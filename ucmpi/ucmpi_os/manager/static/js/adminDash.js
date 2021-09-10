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
    //console.log("Hostname: " + window.location.host);
    var wslink = 'ws://' + window.location.host + '/ws';
    if (location.hostname === 'uhai.alphawerk.co.uk') {
        wslink = 'wss://' + window.location.host + '/ws';
    }
    connection = new WebSocket(wslink);
    connection.onopen = function () {
        if (null !== document.getElementById("websocketstatus")){
            document.getElementById("websocketstatus").innerHTML = "<i class=\"fas fa-circle text-success\"></i> Online";
        }

        $("#watchdog_run").click(function(){
            console.log("Run Requested");
            connection.send(JSON.stringify({'topic':'watchdog','payload':{'control':'run'}}));
        });
        $("#watchdog_pause").click(function(){
            connection.send(JSON.stringify({'topic':'watchdog','payload':{'control':'pause'}}));
        });
        $("#watchdog_reboot").click(function(){
            connection.send(JSON.stringify({'topic':'watchdog','payload':{'control':'reboot'}}));
        });
        $("#userbutton_push").click(function(){
            connection.send(JSON.stringify({'topic':'functionbutton','payload':{'control':'tap'}}));
        });
        $("#userbutton_5").click(function(){
            connection.send(JSON.stringify({'topic':'functionbutton','payload':{'control':'5sec'}}));
        });
        $("#userbutton_15").click(function(){
            connection.send(JSON.stringify({'topic':'functionbutton','payload':{'control':'15sec'}}));
        });
        $("#userbutton_30").click(function(){
            connection.send(JSON.stringify({'topic':'functionbutton','payload':{'control':'30sec'}}));
        });
        $("#changecomfortpin").click(function(){
            connection.send(JSON.stringify({'topic':'updatepin','payload':{'data':$('#comfortpin').val()}}));
            $('#comfortpin').val("");
        });
        $("#changefriendlyname").click(function(){
            connection.send(JSON.stringify({'topic':'changefriendlyname','payload':{'friendlyname':$('#friendlyname').val()}}));
        });
        $("#remotescriptgo").click(function(){
            connection.send(JSON.stringify({'topic':'remotescript','payload':{'remotescript':$('#remotescript').val()}}));
        });
        $("body #enable_ssh").click(function(){
            connection.send(JSON.stringify({'topic':'ssh','payload':{'control':'start'}}));
        });
        $("body #disable_ssh").click(function(){
            connection.send(JSON.stringify({'topic':'ssh','payload':{'control':'stop'}}));
        });
        $("body #flush_logs").click(function(){
            connection.send(JSON.stringify({'topic':'flush','payload':{'control':'flush'}}));
        });
        $("#changepassword").click(function(){
            connection.send(JSON.stringify({'topic':'pipassword','payload':{'password':$('#pipassword').val()}}));
        });


        if (null !== document.getElementById("watchdog_run")){
            document.getElementById("watchdog_run").disabled = false;
        }
        if (null !== document.getElementById("watchdog_pause")){
            document.getElementById("watchdog_pause").disabled = false;
        }
        if (null !== document.getElementById("watchdog_reboot")){
            document.getElementById("watchdog_reboot").disabled = false;
        }
        if (null !== document.getElementById("userbutton_push")){
            document.getElementById("userbutton_push").disabled = false;
        }
        if (null !== document.getElementById("userbutton_5")){
            document.getElementById("userbutton_5").disabled = false;
        }
        if (null !== document.getElementById("userbutton_15")){
            document.getElementById("userbutton_15").disabled = false;
        }
        if (null !== document.getElementById("userbutton_30")){
            document.getElementById("userbutton_30").disabled = false;
        }
        if (null !== document.getElementById("changecomfortpin")){
            document.getElementById("changecomfortpin").disabled = false;
        }
        if (null !== document.getElementById("flush_logs")){
            document.getElementById("flush_logs").disabled = false;
        }
        if (null !== document.getElementById("enable_ssh")){
            document.getElementById("enable_ssh").disabled = false;
        }
        if (null !== document.getElementById("disable_ssh")){
            document.getElementById("disable_ssh").disabled = false;
        }
        if (null !== document.getElementById("changepassword")){
            document.getElementById("changepassword").disabled = false;
        }
    }

    connection.onerror = function(error) {
        document.getElementById("websocketstatus").innerHTML = "Connection Lost Retrying <span style=\"color: orange;\"><i class=\"fas fa-spinner fa-spin\"></i></span>";

        document.getElementById("watchdogled").innerHTML = "Unknown";
        document.getElementById("serialnumber").innerHTML = "Unknown";
        document.getElementById("watchdogstatus").innerHTML = "Unknown";
        document.getElementById("watchdog_run").disabled = true;
        document.getElementById("watchdog_pause").disabled = true;
        document.getElementById("watchdog_reboot").disabled = true;
        document.getElementById("userbutton_push").disabled = true;
        document.getElementById("userbutton_5").disabled = true;
        document.getElementById("userbutton_15").disabled = true;
        document.getElementById("userbutton_30").disabled = true;
        document.getElementById("changecomfortpin").disabled = true;
        document.getElementById("flush_logs").disabled = true;
        document.getElementById("enable_ssh").disabled = true;
        document.getElementById("disable_ssh").disabled = true;
        document.getElementById("changepassword").disabled = true;
    }


    connection.onmessage = function(message) {
        console.log(message);
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log("Invalid data from ws");
            return;
        }

        var sshStr, loadStr, diskStr, memoryStr, watchdogInStr, watchdogOutStr, watchdogStatusStr, traceTxt, newTxt = '';
        var diskInt, memoryInt, traceLines, lineCountount = 0;
        var traceDebugTxtArea = $('#tracedebugtext');

        switch (json["topic"]) {
            case "serialnumber":
                if (null !== document.getElementById("serialnumber")){
                    document.getElementById("serialnumber").innerHTML = json["payload"]["serialnumber"];
                }
                break;
            case "loadindex":
                if (null !== document.getElementById("loadindex")){
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
                }

                break;
            case "disk":
                if (null !== document.getElementById("disk")) {
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

                    diskStr = diskStr + " " + json["payload"]["status"];
                    document.getElementById("disk").innerHTML = diskStr;
                }
                break;
            case "memory":
                if (null !== document.getElementById("memory")) {
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

                    memoryStr = memoryStr + " " + json["payload"]["status"];
                    document.getElementById("memory").innerHTML = memoryStr;
                }
                break;
            case "uptime":
                if (null !== document.getElementById("uptime")) {
                    document.getElementById("uptime").innerHTML = json["payload"]["status"];
                }
                break;
            case "ssh":
                if (null !== document.getElementById("ssh")) {
                    if (json["payload"]["status"] === "true") {
                        sshStr = "<i class=\"fas fa-circle text-warning\"></i> True";
                    } else {
                        sshStr = "<i class=\"fas fa-circle text-success\"></i> False";
                    }
                    document.getElementById("ssh").innerHTML = sshStr;
                }
                break;
            case "watchdog/pinout":
                if (null !== document.getElementById("watchdogled")) {
                    if (json["payload"]["status"] === 'low') {
                        watchdogInStr = "<i class=\"fas fa-circle text-success\"></i> Low";
                    } else {
                        watchdogInStr = "<i class=\"fas fa-circle text-success\"></i> High";
                    }
                    document.getElementById("watchdogled").innerHTML = watchdogInStr;
                }
                break;
            case "watchdog/warning":
                if (null !== document.getElementById("watchdoginput")) {
                    if (json["payload"]["status"] === 'low') {
                        watchdogOutStr = "<i class=\"fas fa-circle text-warning\"></i> Low";
                    } else {
                        watchdogOutStr = "<i class=\"fas fa-circle text-success\"></i> High";
                    }
                    document.getElementById("watchdoginput").innerHTML = watchdogOutStr;
                }
                break;
            case "watchdog":
                if (null !== document.getElementById("watchdogstatus")) {
                    if (json["payload"]["status"] === 'running') {
                        watchdogOutStr = "<i class=\"fas fa-circle text-success\"></i> Running";
                    } else if (json["payload"]["status"] === 'paused') {
                        watchdogOutStr = "<i class=\"fas fa-circle text-warning\"></i> Paused";
                    } else if (json["payload"]["status"] === 'rebooting') {
                        watchdogOutStr = "<i class=\"fas fa-circle text-danger\"></i> Rebooting";
                    } else {
                        watchdogOutStr = "<i class=\"fas fa-circle text-warning\"></i> " + json["payload"]["status"];
                    }
                    document.getElementById("watchdogstatus").innerHTML = watchdogOutStr;
                }
                break;
            case "tracetx":
                if (traceDebugTxtArea.length) {
                    traceDebugTxtArea.append("UCM TX:" + json["payload"]["status"] + "\r");
                    checkscroll();

                    traceTxt = traceDebugTxtArea.val();
                    traceLines = traceTxt.split(/\r|\r\n|\n/);
                    if (traceLines.length > 1000){
                        newTxt = traceDebugTxtArea.val().replace(/^.*\n/g,"");
                        traceDebugTxtArea.val(newTxt);
                    }
                }
                break;
            case "tracerx":
                if (traceDebugTxtArea.length) {
                    traceDebugTxtArea.append("UCM RX:" + json["payload"]["status"] + "\r");
                    checkscroll();

                    traceTxt = traceDebugTxtArea.val();
                    traceLines = traceTxt.split(/\r|\r\n|\n/);
                    if (traceLines.length > 1000){
                        newTxt = traceDebugTxtArea.val().replace(/^.*\n/g,"");
                        traceDebugTxtArea.val(newTxt);
                    }
                }
                break;
            case "debug":
                if (traceDebugTxtArea.length) {
                    traceDebugTxtArea.append(json["payload"]["source"] + ":" + Date(json["payload"]["date"]) + ":" + json["payload"]["severity"] + ":" + json["payload"]["message"] + "\r");
                    checkscroll();

                    traceTxt = traceDebugTxtArea.val();
                    traceLines = traceTxt.split(/\r|\r\n|\n/);
                    if (traceLines.length > 1000){
                        newTxt = traceDebugTxtArea.val().replace(/^.*\n/g,"");
                        traceDebugTxtArea.val(newTxt);
                    }
                }
                break;
            case "message":
                alert(json["payload"]["status"]);
                break;
            case "userrights":
                userrights = json["payload"];
                break;
            case "userlisttable":
                if(json["payload"]["success"] === "true") {
                    $("#user_table_div").empty().prepend(json["payload"]["html"]);
                } else {
                    alert(json["payload"]["error"]);
                }
                break;
            case "friendlyname":
                if(json["payload"]["success"] === "true") {
                    if (null !== document.getElementById("friendlyname")) {
                        document.getElementById("friendlyname").value = json["payload"]["friendlyname"];
                        document.getElementById("friendlyname").disabled = false;
                    }
                    if (null !== document.getElementById("changefriendlyname")) {
                        document.getElementById("changefriendlyname").disabled = false;
                    }
                    if (null !== document.getElementById("friendlynameerror")) {
                        document.getElementById("friendlynameerror").innerHTML = "OK";
                    }
                } else {
                    if (null !== document.getElementById("friendlynameerror")) {
                        document.getElementById("friendlynameerror").innerHTML = json["payload"]["error"];
                    }
                    if (null !== document.getElementById("friendlyname")) {
                        document.getElementById("friendlyname").disabled = true;
                    }
                    if (null !== document.getElementById("changefriendlyname")) {
                        document.getElementById("changefriendlyname").disabled = true;
                    }
                }
                break;
            case "UCMEthNative":
                if (null !== document.getElementById("ucmeth")) {
                    if (json["payload"]["status"] === "started") {
                        document.getElementById("ucmeth").checked = true;
                    } else if (json["payload"]["status"] === "stopped") {
                        document.getElementById("ucmeth").checked = false;
                    }
                }
                break;
            case "UCMEthText":
                if (null !== document.getElementById("ucmhuman")) {
                    if (json["payload"]["status"] === "started") {
                        document.getElementById("ucmhuman").checked = true;
                    } else if (json["payload"]["status"] === "stopped") {
                        document.getElementById("ucmhuman").checked = false;
                    }
                }
                break;
            case "UCMEthTrace":
                if (null !== document.getElementById("ucmtrace")) {
                    if (json["payload"]["status"] === "started") {
                        document.getElementById("ucmtrace").checked = true;
                    } else if (json["payload"]["status"] === "stopped") {
                        document.getElementById("ucmtrace").checked = false;
                    }
                }
                break;
            case "diags":
            case "backupcomf":
            case "backupflow":
                if (null !== document.getElementById(json["topic"])) {
                    if (json["payload"]["status"] === "started") {
                        document.getElementById(json["topic"]).checked = true;
                    } else if (json["payload"]["status"] === "stopped") {
                        document.getElementById(json["topic"]).checked = false;
                    }
                }
                break;
            default:
        }
    }

    $('#trace').click(function () {
        if($('#trace').is(':checked')) {
            connection.send(JSON.stringify({'topic':'trace','payload':{'control':'true'}}));
        } else {
            connection.send(JSON.stringify({'topic':'trace','payload':{'control':'false'}}));
        }
    });
    $('#debug').click(function () {
        if($('#debug').is(':checked')) {
            connection.send(JSON.stringify({'topic':'debug','payload':{'control':'true'}}));
        } else {
            connection.send(JSON.stringify({'topic':'debug','payload':{'control':'false'}}));
        }
    });
    $('#comfortfile').click(function () {
        console.log('ComfortFile Clicked ' + $('#comfortfile').val())
    });


    $("#textclear").click(function(){
        $('#tracedebugtext').val("");
    });

    $('#ucmeth').click(function () {
        if ($('#ucmeth').is(':checked')) {
            connection.send(JSON.stringify({'topic': 'UCMEthNative', 'payload': {'control': 'start'}}));
        } else {
            connection.send(JSON.stringify({'topic': 'UCMEthNative', 'payload': {'control': 'stop'}}));
        }
    });

    $('#ucmhuman').click(function () {
        if ($('#ucmhuman').is(':checked')) {
            connection.send(JSON.stringify({'topic': 'UCMEthText', 'payload': {'control': 'start'}}));
        } else {
            connection.send(JSON.stringify({'topic': 'UCMEthText', 'payload': {'control': 'stop'}}));
        }
    });

    $('#ucmtrace').click(function () {
        if ($('#ucmtrace').is(':checked')) {
            connection.send(JSON.stringify({'topic': 'UCMEthTrace', 'payload': {'control': 'start'}}));
        } else {
            connection.send(JSON.stringify({'topic': 'UCMEthTrace', 'payload': {'control': 'stop'}}));
        }
    });

    $('#diags').click(function () {
        if($('#diags').is(':checked')) {
            connection.send(JSON.stringify({'topic':'diags','payload':{'control':'start'}}));
        } else {
            connection.send(JSON.stringify({'topic':'diags','payload':{'control':'stop'}}));
        }
    });

    $('#backupcomf').click(function () {
        if($('#backupcomf').is(':checked')) {
            connection.send(JSON.stringify({'topic':'backupcomf','payload':{'control':'start'}}));
        } else {
            connection.send(JSON.stringify({'topic':'backupcomf','payload':{'control':'stop'}}));
        }
    });

    $('#backupflow').click(function () {
        if($('#backupflow').is(':checked')) {
            connection.send(JSON.stringify({'topic':'backupflow','payload':{'control':'start'}}));
        } else {
            connection.send(JSON.stringify({'topic':'backupflow','payload':{'control':'stop'}}));
        }
    });
});

function checkscroll() {
    if ($('#autoscroll').is(':checked')) {
        $('#tracedebugtext').scrollTop($('#tracedebugtext')[0].scrollHeight);
    }
}

function user_delete(username) {
    connection.send(JSON.stringify({'topic':'deleteuser','payload':username}));
}

function user_update(username) {
    var user = {};
    user['user'] = username;
    user['email'] = document.getElementById(username+'_email').innerHTML;
    var rights = 0;
    for (var key in userrights) {
        if ($('#' + key + '_' + username).is(':checked'))
            rights += userrights[key];
    }
    user['rights'] = rights;

    connection.send(JSON.stringify({'topic':'updateuser','payload':user}));
}

function addnewuser() {
    var newuser = {};
    newuser['user'] = $('#newusername').val();
    newuser['password'] = $('#newuserpassword').val();
    newuser['email'] = $('#newuseremail').val();
    var rights = 0;
    for (var key in userrights) {
        if ($('#' + key + '_newuser').is(':checked'))
            rights += userrights[key];
    }
    newuser['rights'] = rights;
    connection.send(JSON.stringify({'topic':'adduser','payload':newuser}));
}

$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});

