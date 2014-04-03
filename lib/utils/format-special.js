//var ip2cc = require('ip2cc');
//var spawn = require('child_process').spawn;
var geoip = require('geoip');
var City = geoip.City;
var city = new City('GeoLiteCity.dat');
var get_user_ip = require('./get-user-ip');

var default_country = "UN";

function get_country(req, data, callback) {
    /* get IP */
    var user_ip = get_user_ip(req);
    // geoip
    city.lookup(user_ip, function(err, c_data) {
	    if (err) {
		    console.log(err);
		    data.country = default_country;
		    callback();
	    }
	    if (c_data) {
	        data.country = c_data.country_code;
	        data.country_name = c_data.country_name;
	        switch (c_data.country_code) {
		        case "US":
		        	if (c_data.region)
						data.country += "-"+c_data.region;
		        	break;
		        case "AU":
		        	if (c_data.city)
		        		data.country += "-"+c_data.city;
					break;
		        default:
		        	break;
	        }

	        callback();
	    }
	});
    // IP2CC
    /*ip2cc.lookUp(user_ip, function(ipaddress, country) {
	    if (country) {
	        data.country = country;
	        callback();
	    } else {
	        data.country = default_country;
	        callback();
	    }
	});*/
	// ipinfo.io
	/* set up a curl call to ipinfo.io 
	try {
		var command = "curl";
		var args = ["http://api.hostip.info/get_json.php?ip="+user_ip];
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
	        
	
	        var metadata;
	        try {
	            metadata = JSON.parse(json_data);
	        } catch(e) {
	            console.log('command returned unparseable metadata', command, stderr, JSON.stringify(stdout));
	            callback();
	        }

	        data.country = metadata.country_code;
	        console.log(data.country, metadata);
			callback();
	   });
	   
   } catch (e) {
	   console.log('unable to get country', e, user_ip);
	   data.country = default_country;
	   callback();
   }*/
}

module.exports = function(req, data, callback) {
	if (data.special) {
		switch (data.special) {
			case "country":
				return get_country(req, data, callback);
			default:
				break;
		}
	}
	return callback();

};
