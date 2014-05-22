var geoip = require('geoip');
var City = geoip.City;
var city = new City('GeoLiteCity.dat');

var ip = "2.69.181.19";
city.lookup(ip, function(e,c){
    console.log(e);
    console.log(c);
});

