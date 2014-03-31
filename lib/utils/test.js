var geoip = require('geoip');
var City = geoip.City;
var city = new City('../../GeoLiteCity.dat');
city.lookup('8.8.8.8', function(err, c_data) {
    if (err) {
	    console.log(err);
    }
    if (c_data) {
		console.log(c_data, c_data.country_code);
    }
});