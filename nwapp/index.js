var gui = require('nw.gui');
var log = require('./lib/log.js');
var argv = require('./lib/argv.js');
var os = require('os');
var TorrentDownloader = require('./lib/TorrentDownloader.js');
var LogLevel = require('yalla').LogLevel;
var humanize = require('humanize');
var path = require('path');

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
    totalDownloadLength,
    tray,
    trayMenu,
    trayProgressLabel = new gui.MenuItem({ label: 'No active download' }),
    trayToggleDownload = new gui.MenuItem({ label: 'Pause Download', click: pauseDownload });

function submitDownload() {
    totalDownloadLength = 0;

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
}

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
    tray = new gui.Tray({ title: 'Tray', icon: 'img/icon.png' });

    // Give it a menu
    trayMenu = new gui.Menu();
    trayMenu.append(trayProgressLabel);
    trayMenu.append(new gui.MenuItem({ type: 'separator' }));
    trayMenu.append(new gui.MenuItem({ label: 'Exit', click: function() {
        gui.App.quit();
    }}));
    tray.menu = trayMenu;
}

function setupWindowActions() {
    $('#minimize').click(function () {
        win.minimize()
    });
    $('#maximize').click(function () {
        $(this).hide();
        $('#unmaximize').css('display', 'inline-block');
        win.maximize()
    });
    $('#unmaximize').click(function () {
        $(this).hide();
        $('#maximize').css('display', 'inline-block');
        win.unmaximize();
    });
    $('#close').click(function () {
        gui.App.quit();
    });
}

function dragAndDropSupport() {
    // prevent default behavior from changing page on dropped file
    window.ondragover = function (e) {
        e.preventDefault();
        return false;
    };
    window.ondrop = function (e) {
        e.preventDefault();
        return false;
    };

    var holder = document.getElementById('download_form');
    holder.ondragover = function (e) {
        this.className = 'file_hover';
        return false;
    };
    holder.ondragend = function (e) {
        this.className = '';
        return false;
    };
    holder.ondrop = function (e) {
        e.preventDefault();
        this.className = '';
        $('#download_link').val(e.dataTransfer.files[0].path);
        if (path.extname($('#download_link').val()) == '.torrent') {
            submitDownload();
        }
        return false;
    };
}

$(function () {
    download_form = $('#download_form');
    download_info = $('#download_info');

    $('#download_btn', download_form).click(submitDownload);

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
    dragAndDropSupport();
});