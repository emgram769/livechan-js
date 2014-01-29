function Socket() {
  this.io = null;
}

Object.defineProperty(Socket, 'io', {
  get: function() { return this.io; },
  set: function(io) { this.io = io; }
});

module.exports = new Socket();