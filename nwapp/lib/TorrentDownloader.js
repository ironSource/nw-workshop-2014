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

TorrentDownloader.prototype._startImpl = function (callback) {
    readTorrent(this.target, _.bind(this._onTorrentRead, this))
}

TorrentDownloader.prototype._onTorrentRead = function (err, torrent) {
    if (err) return this.emit('error', err)

    this.emit('info', torrent)

    if (log.isSilly())
        log.silly(inspect(torrent))

    var engine = this.engine = torrentStream(torrent, { path: this._downloadPath })

    engine.on('ready', function () {
        engine.files.forEach(function (file) {
            file.select()
        })
        this.emit('start')
        reportProgress.call(this)
    }.bind(this))

    engine.on('download', _.bind(reportProgress, this))

    function reportProgress() {
        if (torrent.length && torrent.pieceLength) {
            var bytesDownloaded = 0
            var pieceLength = torrent.pieceLength
            var pieceRemainder = (torrent.length % pieceLength) || pieceLength
            for (var i = 0; i < torrent.pieces.length; i++) {
                if (engine.bitfield.get(i)) {
                    bytesDownloaded += (i === torrent.pieces.length - 1) ? pieceRemainder : pieceLength
                }
            }
            var pct = bytesDownloaded / torrent.length * 100
            this.emit('progress', pct)
            if (bytesDownloaded === torrent.length) {
                this.emit('complete')
            }
        }
    }
}
