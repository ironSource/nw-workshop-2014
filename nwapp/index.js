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
var downloader,
    download_form,
    download_info,
    tray,
    trayMenu,
    trayProgressLabel = new gui.MenuItem({ label: 'No active download' }),
    trayToggleDownload = new gui.MenuItem({ label: 'Pause Download', click: pauseDownload });

function pauseDownload() {
    if (downloader) {
        downloader.pause();
        trayToggleDownload.label = 'Resume Download';
        trayToggleDownload.click = resumeDownload;
    }
    $('#pause_download').hide();
    $('#resume_download').show();
}

function resumeDownload() {
    if (downloader) {
        downloader.resume();
        trayToggleDownload.label = 'Pause Download';
        trayToggleDownload.click = pauseDownload;
    }
    $('#pause_download').show();
    $('#resume_download').hide();
}

function setupTrayMenu() {
    // Create a tray icon
    tray = new gui.Tray({ title: 'Tray', icon: 'img/icon.png', tooltip: 'try tooltip' });

    // Give it a menu
    trayMenu = new gui.Menu();
    trayMenu.append(trayProgressLabel);
    trayMenu.append(new gui.MenuItem({ type: 'separator' }));
    trayMenu.append(new gui.MenuItem({ type: 'separator' }));
    trayMenu.append(new gui.MenuItem({ label: 'Exit' }));
    tray.menu = trayMenu;
}

function setupWindowActions() {
    $('#minimize').click(function () {
        win.minimize()
    });
    $('#maximize').click(function () {
        win.maximize()
    });
    $('#unmaximize').click(function () {
        win.unmaximize();
    });
    $('#close').click(function () {
        gui.App.quit();
    });
}

$(function () {
    download_form = $('#download_form');
    download_info = $('#download_info');
    var totalDownloadLength;

    $('#download_btn', download_form).click(function () {
        totalLength = 0;

        var downloadLink = $('#download_link').val();
        if (!downloadLink) {
            downloadLink = 'http://torrent.fedoraproject.org/torrents/Fedora-20-x86_64-DVD.torrent';
        }

        var targetFolder = $('#target_folder').val();
        if (!targetFolder) {
            targetFolder = '/tmp';
        }

        downloader = new TorrentDownloader(downloadLink, targetFolder);
        trayMenu.append(trayToggleDownload);

        $('#download_status').text('Starting download...');
        trayProgressLabel.label = 'Starting download...';

        downloader.on('start', function () {
            $('#download_status').text('Downloading...');
            trayProgressLabel.label = 'Download Started!';
        });

        downloader.on('info', function (info) {
            //
            totalDownloadLength = info.length;

            $('#filelist_toggle .total_files').text(info.files.length);
            $(".filelist").empty();
            $(info.files).each(function (index, file) {
                var li = $('<li />').text(humanize.filesize(file.length) + ' // ' + file.path);
                $('.filelist').append(li);
            });
        });

        downloader.on('progress', function (pct) {
            //log.info('progress: ' + pct + '%');
            $('.progress .bar').css('width', pct + '%');

            var sizeMessage = humanize.filesize(totalDownloadLength * pct / 100) + ' / ' + humanize.filesize(totalDownloadLength);
            $('.progress .percent').text((Math.round(pct * 100) / 100) + '%' + ' | ' + sizeMessage);
            trayProgressLabel.label = $('.progress .percent').text();
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
        var filelistUl = $('.filelist');
        filelistUl.toggle();
        $('#filelist_toggle .label').text(filelistUl.is(':visible') ? '- Hide file list' : '+ Show file list')
    });

    $('#pause_download').click(pauseDownload);
    $('#resume_download').click(resumeDownload);


    /**
     * Node Webkit cool stuff!
     */
    setupTrayMenu();
    setupWindowActions();
});