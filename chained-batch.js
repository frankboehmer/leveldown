function ChainedBatch (db) {
  this._db = db
  this._operations = []
  this._written = false
  this.binding = db.binding.batch()
}

ChainedBatch.prototype._serializeKey = function (key) {
  return this._db._serializeKey(key)
}

ChainedBatch.prototype._serializeValue = function (value) {
  return this._db._serializeValue(value)
}

ChainedBatch.prototype._checkWritten = function () {
  if (this._written) {
    throw new Error('write() already called on this batch')
  }
}

ChainedBatch.prototype.put = function (key, value) {
  this._checkWritten()

  var err = this._db._checkKey(key, 'key')
  if (err) { throw err }

  key = this._serializeKey(key)
  value = this._serializeValue(value)

  this._put(key, value)

  return this
}

ChainedBatch.prototype._put = function (key, value) {
  this.binding.put(key, value)
}

ChainedBatch.prototype.del = function (key) {
  this._checkWritten()

  var err = this._db._checkKey(key, 'key')
  if (err) { throw err }

  key = this._serializeKey(key)
  this._del(key)

  return this
}

ChainedBatch.prototype._del = function (key) {
  this.binding.del(key)
}

ChainedBatch.prototype.clear = function () {
  this._checkWritten()
  this._operations = []
  this._clear()

  return this
}

ChainedBatch.prototype._clear = function (key) {
  this.binding.clear(key)
}

ChainedBatch.prototype.write = function (options, callback) {
  this._checkWritten()

  if (typeof options === 'function') { callback = options }
  if (typeof callback !== 'function') {
    throw new Error('write() requires a callback argument')
  }
  if (typeof options !== 'object') { options = {} }

  this._written = true

  // @ts-ignore
  if (typeof this._write === 'function') { return this._write(callback) }

  if (typeof this._db._batch === 'function') {
    return this._db._batch(this._operations, options, callback)
  }

  process.nextTick(callback)
}

ChainedBatch.prototype._write = function (options, callback) {
  this.binding.write(options, callback)
}

module.exports = ChainedBatch
