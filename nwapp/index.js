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

/**
 * App start
 */
// Get the current window
var win = gui.Window.get();
var downloader,
    totalDownloadLength;

function startDownload() {
    var downloadLink = $('#download_link').val();
    if (!downloadLink) {
        downloadLink = 'http://torrent.fedoraproject.org/torrents/Fedora-20-x86_64-DVD.torrent';
    }

    var targetFolder = $('#target_folder').val();
    if (!targetFolder) {
        targetFolder = '/tmp';
    }

    downloader = new TorrentDownloader(downloadLink, targetFolder);

    // New download started
    $('#download_status').text('Initializing download...');
    $('.progress .percent').html('&infin;');

    // Detect when the download starts
    downloader.on('start', function () {
        $('#download_status').text('Downloading...');
    });

    downloader.on('info', function (info) {
        // Store the total download size for future use
        totalDownloadLength = info.length;

        // Count the number of total files in the download
        $('#filelist_toggle .total_files').text(info.files.length);

        // Populate the files list into the ul element
        $(info.files).each(function (index, file) {
            var li = $('<li />').text(humanize.filesize(file.length) + ' // ' + file.path);
            $('.filelist').append(li);
        });
    });

    // update the progress in the ui elements
    downloader.on('progress', function (percent) {
        // Gui progress bar
        $('.progress .bar').css('width', percent + '%');

        // Gui message
        var sizeMessage = humanize.filesize(totalDownloadLength * percent / 100) + ' / ' + humanize.filesize(totalDownloadLength);
        $('.progress .percent').text((Math.round(percent * 100) / 100) + '%' + ' | ' + sizeMessage);
    });

    downloader.start();

    // Change to the download info screen
    $('#download_form').hide();
    $('#download_info').css('display', 'flex');
}

function stopDownload() {
    // Stop the download
    downloader.stop();
    downloader = null;

    // Change the screen
    $('#download_info').hide();
    $('#download_form').css('display', 'flex');

    // Reset contents for next download
    totalDownloadLength = 0;
    $(".filelist").empty();
    $('.progress .bar').css('width', 0);
    $('.progress .percent').html('&infin;');
}

function pauseDownload() {
    if (downloader) {
        downloader.pause();
    }

    // Replace the buttons
    $('#pause_download').hide();
    $('#resume_download').show();
}

function resumeDownload() {
    if (downloader) {
        downloader.resume();
    }

    // Replace the buttons
    $('#pause_download').show();
    $('#resume_download').hide();
}

function setupTrayMenu() {
    /**
     * Create a tray instance and populate it with MenuItem
     */
}

function setupWindowActions() {
    /**
     * Replace the native window actions with custom ones
     * maximize, unmaximize, minimize and close
     */
}

function dragAndDropSupport() {
    /**
     * Add support for drag & drop to the application
     */
}

function trayProgressAndBadge() {
    /**
     * Reset the progress in the icon on startup and on download stop
     * update the progress in the progress event
     */
}

function openInBrowser(link) {
    gui.Shell.openExternal(link);
}

$(function () {
    // Download controls
    $('#download_btn').click(startDownload);
    $('#stop_download').click(stopDownload);
    $('#pause_download').click(pauseDownload);
    $('#resume_download').click(resumeDownload);

    // Toggle the filelist view
    $('#filelist_toggle').click(function() {
        var filelistUl = $('.filelist');
        filelistUl.toggle();
        $('#filelist_toggle .label').text(filelistUl.is(':visible') ? '- Hide file list' : '+ Show file list');
    });

    /**
     * Node Webkit cool stuff!
     */
    trayProgressAndBadge();
    setupWindowActions();
    dragAndDropSupport();
    setupTrayMenu();
});