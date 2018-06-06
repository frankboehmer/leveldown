const fastFuture = require('fast-future')

function Iterator (db, options) {
  this.db = db
  this._ended = false
  this._nexting = false

  this.binding = db.binding.iterator(options)
  this.cache = null
  this.finished = false
  this.fastFuture = fastFuture()
}

Iterator.prototype.next = function (callback) {
  var self = this

  if (typeof callback !== 'function') {
    throw new Error('next() requires a callback argument')
  }

  if (self._ended) {
    process.nextTick(callback, new Error('cannot call next() after end()'))
    return self
  }

  if (self._nexting) {
    process.nextTick(callback, new Error('cannot call next() before previous next() has completed'))
    return self
  }

  self._nexting = true
  self._next(function () {
    self._nexting = false
    callback.apply(null, arguments)
  })

  return self
}

Iterator.prototype.seek = function (target) {
  if (this._ended) {
    throw new Error('cannot call seek() after end()')
  }
  if (this._nexting) {
    throw new Error('cannot call seek() before next() has completed')
  }
  if (typeof target !== 'string' && !Buffer.isBuffer(target)) {
    throw new Error('seek() requires a string or buffer key')
  }
  if (target.length === 0) {
    throw new Error('cannot seek() to an empty key')
  }

  this.cache = null
  this.binding.seek(target)
  this.finished = false
}

Iterator.prototype._next = function (callback) {
  var that = this
  var key
  var value

  if (this.cache && this.cache.length) {
    key = that.db._deserializeKey(this.cache.pop())
    value = that.db._deserializeValue(this.cache.pop())

    this.fastFuture(function () {
      callback(null, key, value);
    })
  } else if (this.finished) {
    this.fastFuture(function () {
      callback()
    })
  } else {
    this.binding.next(function (err, array, finished) {
      if (err) return callback(err)

      that.cache = array
      that.finished = finished
      that._next(callback)
    })
  }

  return this
}

Iterator.prototype.end = function (callback) {
  if (typeof callback !== 'function') {
    throw new Error('end() requires a callback argument')
  }

  if (this._ended) {
    return process.nextTick(callback, new Error('end() already called on iterator'))
  }

  this._ended = true
  this._end(callback)
}

Iterator.prototype._end = function (callback) {
  delete this.cache
  this.binding.end(callback)
}

module.exports = Iterator
