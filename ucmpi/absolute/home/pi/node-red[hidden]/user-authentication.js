/*	alphawerk Node-Red User Authentication
	(c) 2018 alphaWerk Ltd
	Version: Check const _version
	Date: Check const _date

	support@alphawerk.co.uk
*/

const _version = "2.0.0.0"
const _date = "140921"

const modules = require('/home/pi/ucmpi_os/modules.js');

module.exports = {
   type: "credentials",
   users: function(username) {
       return new Promise(function(resolve) {
           // Do whatever work is needed to check username is a valid
           // user.
           if (modules.checkuser(username, modules.userrights['Node-Red-Write'])) {
           	var user = { username: username, permissions: "*" };
            resolve(user);
           } else if (modules.checkuser(username, modules.userrights['Node-Red-Read'])) {
            var user = { username: username, permissions: "read" };
            resolve(user);	
           } else {
            resolve(null);
           }
       });
   },
   authenticate: function(username,password) {
       return new Promise(function(resolve) {
           // Do whatever work is needed to check username is a valid
           // user.
           
           if (modules.checkuserpassword(username,password, modules.userrights['Node-Red-Write'])) {
           	var user = { username: username, permissions: "*" };
            resolve(user);
           } else if (modules.checkuserpassword(username,password, modules.userrights['Node-Red-Read'])) {
            var user = { username: username, permissions: "read" };
            resolve(user);	
           } else {
            
           	resolve(null);
           }
       });
   },
   default: function() {
       return new Promise(function(resolve) {
           // Resolve with the user object for the default user.
           // If no default user exists, resolve with null.
           resolve(null);
       });
   }
}
