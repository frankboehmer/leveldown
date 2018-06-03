const extend = require('xtend'),
	  IteratorStream = require('level-iterator-stream');

const Iterator = require('./iterator');

function Snapshot (db, options) {
  this.db = db;
  this.binding = db.binding.databaseSnapshot(options)
}

Snapshot.prototype.getSync = function (key) {
  return this.binding.getSync(key);
}

Snapshot.prototype.iterator = function (options) {
  options = this.db._setupIteratorOptions(options);
   console.log(JSON.stringify(options));
  options = extend({ databaseSnapshot: this.binding }, options)
  return new Iterator(this.db, options);
}

Snapshot.prototype.createReadStream = function(options) {
  options = extend({ keys: true, values: true }, options)
  if (typeof options.limit !== 'number') { options.limit = -1 }
  return new IteratorStream(this.iterator(options), options)
}

module.exports = Snapshot