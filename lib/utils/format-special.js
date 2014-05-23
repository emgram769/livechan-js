//var ip2cc = require('ip2cc');
//var spawn = require('child_process').spawn;
var geoip = require('geoip');
var City = geoip.City;
var city = new City('GeoLiteCity.dat');
var get_user_ip = require('./get-user-ip');

var default_country = "UN";

var regional_flags = ["PL-77", "GR-25", "SE-21"];
var full_countries = ["US", "AU", "CA"];
function get_country(req, data, callback) {
    /* get IP */
    var user_ip = get_user_ip(req, false);
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
	        if ((full_countries.indexOf(c_data.country_code) > -1) && c_data.region) {
				data.country += "-"+c_data.region;
	        } else if (c_data.region && (regional_flags.indexOf(data.country+"-"+c_data.region) > -1)) {
				data.country += "-"+c_data.region;
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
