var geoip = require('geoip');
var City = geoip.City;
var city = new City('../../GeoLiteCity.dat');
/*city.lookup('121.217.75.53', function(err, c_data) {
    if (err) {
	    console.log(err);
    }
    if (c_data) {
		console.log(c_data, c_data.country_code, c_data.region);
    }
});
city.lookup('202.171.164.211', function(err, c_data) {
    if (err) {
	    console.log(err);
    }
    if (c_data) {
		console.log(c_data, c_data.country_code, c_data.region);
    }
});
*/
city.lookup('81.152.14.98', function(err, c_data) {
    if (err) {
	    console.log(err);
    }
    if (c_data) {
		console.log(c_data, c_data.country_code, c_data.region);
    }
});
