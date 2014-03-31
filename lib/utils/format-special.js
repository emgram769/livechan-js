var spawn = require('child_process').spawn;

var default_country = "US";

function get_country(req, data, callback) {
    /* get IP */
    var user_ip = req.connection.remoteAddress;
    var ip_addr = req.headers['x-forwarded-for'];
    if (ip_addr) {
        var list = ip_addr.split(',');
        user_ip = list[list.length - 1];
    }
    
	/* set up a curl call to ipinfo.io */
	try {
		var command = "curl";
		var args = ["ipinfo.io/"+user_ip];
		var process = spawn(command, args);
		var stdout = "";
		var stderr = "";
		process.stdout.on("error", function(e) {console.log(e);data.country = default_country;}).on("data", function(ldata) {stdout += ldata});
	    process.stderr.on("error", function(e) {console.log(e);data.country = default_country;}).on("data", function(ldata) {data.country = default_country;});
	    process.on("close", function(code) {
	        if (code !== 0) {
	            console.log('metadata command returned error', code, command, stderr);
	            callback();
	        }
	        var json_data = stdout;
	        
	
	        /* parse JSON */
	        var metadata;
	        try {
	            metadata = JSON.parse(json_data);
	        } catch(e) {
	            console.log('command returned unparseable metadata', command, stderr, JSON.stringify(stdout));
	            callback();
	        }

	        data.country = metadata.country;
	        console.log(data.country, metadata);
			callback();
	   });
	   
   } catch (e) {
	   console.log('unable to get country', e, user_ip);
	   data.country = default_country;
	   callback();
   }
}

module.exports = function(req, data, callback) {
	if (data.special) {
		switch (data.special) {
			case "country":
				console.log("int hit");
				return get_country(req, data, callback);
			default:
				break;
		}
	}
	return callback();

};