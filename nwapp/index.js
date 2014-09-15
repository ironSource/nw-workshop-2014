var gui = require('nw.gui');
var log = require('./lib/log.js');
var argv = require('./lib/argv.js');
var os = require('os');
var TorrentDownloader = require('./lib/TorrentDownloader.js');
var LogLevel = require('yalla').LogLevel;
var humanize = require('humanize');

/*
 Bootstrap
 */
argv.init(gui.App.argv); // provide access to process argv to all require()d modules

process.mainModule.exports.init(); // init nodeMain.js

var config = require('./lib/config.js'); // config depends on argv, but cannot access it before we initialize argv module

// set the log level
if (config.logLevel) {
    log.setLevel(config.logLevel)
} else if (config.debug) {
    log.setLevel(LogLevel.DEBUG)
}

log.info('bootstrapping done.');

process.on('uncaughtException', function (err) {
    log.error(err)
});

// Get the current window
var win = gui.Window.get();
var downloader;

$(function () {
    $('#download_form').on('submit', function () {
        downloader = new TorrentDownloader('http://torrent.fedoraproject.org/torrents/Fedora-20-x86_64-DVD.torrent', '/tmp');

        downloader.on('start', function () {
            log.info('download started...')
        });

        downloader.on('info', function (info) {
            log.info('file length is %s', humanize.filesize(info.length))
        });

        downloader.on('progress', function (pct) {
            log.info('progress: ' + pct + '%')
        });
        downloader.start();
    });

    $('#stop_download').click(function () {
        downloader.stop();
        downloader = null;
    });
});