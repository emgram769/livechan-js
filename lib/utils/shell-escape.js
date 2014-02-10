'use_strict';

module.exports = function(name) {
    return '"' + name.replace(/"/g, '\\"') + '"';
};

