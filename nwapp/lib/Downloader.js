var EventEmitter = require('events').EventEmitter
var uuid = require('node-uuid')
var mkdirp = require('mkdirp')
var path = require('path')
var inherits = require('util').inherits
var log = require('./log.js')

module.exports = Downloader

inherits(Downloader, EventEmitter)
function Downloader(target, downloadPath) {
	if (!(this instanceof Downloader)) return new Downloader(target)
	EventEmitter.call(this)

	this.target = target

	this._downloadPath = path.join(downloadPath, uuid())

	log.debug('Downloader created, downloadPath: %s', this._downloadPath)
}

Downloader.prototype.start = function () {
	var self = this

	mkdirp(this._downloadPath, function(err) {		
		if (err)
			return self.emit('error', err)

		self._startImpl()		
	})
}