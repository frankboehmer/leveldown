const xtend = require('xtend')

const AbstractLevelDOWN = require('./abstract-leveldown')
const Iterator = require('./iterator')
const IteratorStream = require('./iterator-stream')

function Snapshot (db, options) {
  this.db = db
  this.binding = db.binding.databaseSnapshot(options)
  this._lockCounter = 1
}

Snapshot.prototype.get = AbstractLevelDOWN.prototype.get
Snapshot.prototype.iterator = AbstractLevelDOWN.prototype.iterator
Snapshot.prototype._setupIteratorOptions = AbstractLevelDOWN.prototype._setupIteratorOptions
Snapshot.prototype._serializeKey = AbstractLevelDOWN.prototype._serializeKey
Snapshot.prototype._serializeValue = AbstractLevelDOWN.prototype._serializeValue
Snapshot.prototype._checkKey = AbstractLevelDOWN.prototype._checkKey

Snapshot.prototype._serializeValue = function(value) {
  return this.db._serializeValue(value)
}

Snapshot.prototype._deserializeValue = function(value) {
  return this.db._deserializeValue(value)
}

Snapshot.prototype._serializeKey = function(key) {
  return this.db._serializeKey(key)
}

Snapshot.prototype._deserializeKey = function(key) {
  return this.db._deserializeKey(key)
}

Snapshot.prototype.begin = function () {
  if (this._lockCounter === 0) throw new Error('Snapshot already closed.')
  this._lockCounter++
}

Snapshot.prototype.end = function () {
  if (this._lockCounter === 0) throw new Error('Inconsistent calls to Snapshot._lock() / Snapshot._unlock().')
  this._lockCounter--
  
  if (this._lockCounter === 0) {
    this.binding.close()
  }
}

Snapshot.prototype._get = function (key, options, callback) {
  if (this._lockCounter === 0) return setImmediate(callback, new Error('Snapshot already closed.'))
  return this.binding.get(key, options, callback)
}

Snapshot.prototype.getSync = function (key) {
  if (this._lockCounter === 0) throw new Error('Snapshot already closed.')
  return this.binding.getSync(key)
}

Snapshot.prototype._iterator = function (options) {
  this.begin()
  options = xtend({ databaseSnapshot: this.binding }, options)
  const iterator = new Iterator(this.db, options)
  iterator._snapshot = this
  iterator._end = endIterator
  return iterator
}

Snapshot.prototype.createReadStream = function (options) {
  if (this._lockCounter === 0) throw new Error('Snapshot already closed.')
  options = xtend({ keys: true, values: true }, options)
  if (typeof options.limit !== 'number') { options.limit = -1 }
  return new IteratorStream(this.iterator(options), options)
}

Snapshot.prototype.createKeyStream = function (options) {
  if (this._lockCounter === 0) throw new Error('Snapshot already closed.')
  options = xtend({ keys: true, values: false }, options)
  if (typeof options.limit !== 'number') { options.limit = -1 }
  return new IteratorStream(this.iterator(options), options)
}

Snapshot.prototype.createValueStream = function (options) {
  if (this._lockCounter === 0) throw new Error('Snapshot already closed.')
  options = xtend({ keys: false, values: true }, options)
  if (typeof options.limit !== 'number') { options.limit = -1 }
  return new IteratorStream(this.iterator(options), options)
}

function endIterator (callback) {
  this._snapshot.end()
  Iterator.prototype._end.call(this, callback)
}

module.exports = Snapshot
