var torrentStream = require('torrent-stream');
var inherits = require('util').inherits
var Downloader = require('./Downloader.js')
var readTorrent = require('read-torrent')
var _ = require('lodash')
var log = require('./log.js')
var inspect = require('util').inspect

module.exports = TorrentDownloader

inherits(TorrentDownloader, Downloader)
function TorrentDownloader(target, downloadPath) {
	if (!(this instanceof TorrentDownloader)) return new TorrentDownloader(target)
	Downloader.call(this, target, downloadPath)
}

TorrentDownloader.prototype._startImpl = function(callback) {
	readTorrent(this.target, _.bind(this._onTorrentRead, this))	
}

TorrentDownloader.prototype._onTorrentRead = function(err, torrent) {
	if (err) return this.emit('error', err)

	this.emit('info', torrent)

	if (log.isSilly())
		log.silly(inspect(torrent))

	var engine = this.engine = torrentStream(torrent, { path: this._downloadPath })
	
	engine.on('ready', _.bind(this.emit, 'start'))

	engine.swarm.on('download', function(downloaded) {
		console.log(downloaded)
	})

	engine.swarm.on('wire', function() {
		console.log(arguments)
	})
}