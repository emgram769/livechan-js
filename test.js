var geoip = require('geoip');
var City = geoip.City;
var city = new City('GeoLiteCity.dat');

var ip = "78.0.121.45";
city.lookup(ip, function(e,c){
    console.log(e);
    console.log(c);
});

