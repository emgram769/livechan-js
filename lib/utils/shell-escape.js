'use_strict';

module.exports = function(name) {
    if (process.platform === "win32") {
        return '"' + name.replace(/"/g, '""') + '"';
    } else {
        return "'" + name.replace(/'/g, "'\\''") + "'";
    }
};

