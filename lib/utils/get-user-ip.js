/* get IP of user, taking into account nginx proxy */
module.exports = function(req) {
    var user_ip = req.connection.remoteAddress;
    var ip_addr = req.headers['x-forwarded-for'];
    if (ip_addr && !user_ip) {
        var list = ip_addr.split(',');
        user_ip = list[list.length - 1];
    }
    return user_ip;
};

