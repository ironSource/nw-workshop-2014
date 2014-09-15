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
var downloader, download_form, download_info;

$(function () {
    download_form = $('#download_form');
    download_info = $('#download_info');
    var totalLength;

    $('#download_btn', download_form).click(function () {
        var downloadLink = $('#download_link').val();
        if(!downloadLink) {
            downloadLink = 'http://torrent.fedoraproject.org/torrents/Fedora-20-x86_64-DVD.torrent';
        }

        var targetFolder = $('#target_folder').val();
        if(!targetFolder) {
            targetFolder = '/tmp';
        }

        downloader = new TorrentDownloader(downloadLink, targetFolder);

        $('#download_status').text('Starting download...');

        downloader.on('start', function () {
            $('#download_status').text('Downloading...');
        });

        downloader.on('info', function (info) {
            //
            totalLength = info.length;

            $('#filelist_toggle .total_files').text(info.files.length);
            $(info.files).each(function (index, file) {
                var li = $('<li />').text(humanize.filesize(file.length) + ' // ' + file.path);
                $('.filelist').append(li);
            });
        });

        downloader.on('progress', function (pct) {
            //log.info('progress: ' + pct + '%');
            $('.progress .bar').css('width', pct + '%');
            $('.progress .percent').text((Math.round(pct * 100) / 100) + '%' + ' | ' + humanize.filesize(downloadSize * pct) + '/' + humanize.filesize(downloadSize));
        });

        downloader.start();

        download_form.hide();
        download_info.css('display', 'flex');
    });

    $('#stop_download', download_info).click(function () {
        downloader.stop();
        downloader = null;
        download_info.hide();
        download_form.css('display', 'flex');
    });

    $('#filelist_toggle').click(function () {
        $('.filelist').toggle();

        $('#filelist_toggle .label').text($('.filelist').is(':visible') ? '- Hide file list' : '+ Show file list')
    });
});