// codeBoot state

function CodeBoot() {

    this.builtins = {};

    this.globalObject = {};
    //this.globalObject = (function () { return this; })();

    this.programState = null;

    this.currentConsoleLine = undefined;
    this.saveInProgress = false;
    this.lastFocusedEditor = null;
    this.languageLevel = 'novice';
    this.stepDelay = 2000; //20;
    this.options = {
        showLineNumbers: false
    };

    this.lastExecEvent = 'stop';

    this.alerts    = undefined;
    this.replInput = undefined;

    this.lastAST = null;
    this.lastSource = null;
    this.lastResult = null;
    this.lastResultRepresentation = null;
}

var cb = new CodeBoot();

// codeBoot globalObject getter/setter

CodeBoot.prototype.getGlobal = function (name) {
    return cb.globalObject[name];
};

CodeBoot.prototype.setGlobal = function (name, value) {
    cb.globalObject[name] = value;
};

// codeBoot UI events

CodeBoot.prototype.unload = function () {
    console.log('unload');
};

CodeBoot.prototype.menuFile = function () {
    cb.newFile();
};

CodeBoot.prototype.menuSettings = function () {
    console.log('menuSettings');
};

CodeBoot.prototype.menuHelp = function () {
    console.log('menuHelp');
};

var options = [];

$('.dropdown-menu pre').on('click', function (event) {

    var $target = $(event.currentTarget);
    var val = $target.attr('data-value');
    var $inp = $target.find('input');
    var idx;

   if ((idx = options.indexOf(val)) > -1) {
      options.splice(idx, 1);
      setTimeout(function () { $inp.prop('checked', false) }, 0);
   } else {
      options.push( val );
      setTimeout(function () { $inp.prop('checked', true) }, 0);
   }

   $(event.target).blur();
      
   console.log(options);
   return false;
});

// Execution events

CodeBoot.prototype.eventStep = function (event) {
    //TODO:
    //alert(Object.keys($(':focus')));
    //alert(Object.keys($(':focus').prevObject[0]));
    //alert(document.activeElement.tagName);
    cb.execStep();
//    cb.focusLastFocusedEditor();
};

CodeBoot.prototype.eventAnimate = function () {
    cb.execAnimate();
    cb.focusLastFocusedEditor();
};

CodeBoot.prototype.eventEval = function () {
    cb.execEval();
    cb.focusLastFocusedEditor();
};

CodeBoot.prototype.eventStop = function () {
    cb.execStop();
    cb.focusLastFocusedEditor();
};

// Initialize components

$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})

$(function () {
    $('[data-toggle="popover"]').popover()
})


function setStepDelay(delay) {
    cb.stepDelay = delay;
    cb.programState.step_delay = delay;
}

cb.setDevMode = function (devMode) {
    cb.devMode = devMode;
    if (cb.devMode) {
//TODO: reenable
//        setNavbarColor("white");
//        $("#devModeTitle").text(" (dev mode)");
    } else {
        cb.setLanguageLevel(cb.languageLevel);
//TODO: reenable
//        $("#devModeTitle").text("");
    }
};

cb.setLanguageLevel = function (level) {
    var prevLevel = cb.languageLevel;
    cb.languageLevel = level;
    $("body")
        .removeClass("lang-level-" + prevLevel)
        .addClass("lang-level-" + prevLevel);
//TODO: reenable
//    $("#setting-lang-level-" + level).checkItem();
//    $("body").attr("data-lang-level", level);
};

cb.toggleLineNumbers = function () {
    cb.options.showLineNumbers = !cb.options.showLineNumbers;
    cb.fs.each(function (f) {
       if (f.editor) {
           f.editor.setOption("lineNumbers", cb.options.showLineNumbers);
       }
    });
};

cb.toggleDrawingWindow = function () {
    if (showing_drawing_window()) {
      hide_drawing_window();
    } else {
      show_drawing_window();
    }
};

cb.exportDrawingWindow = function () {
    export_drawing_window();
};

function cb_internal_getBounds($element) {
    var offset = $element.offset();
    var w = $element.width();
    var h = $element.height();
    return {
        left: offset.left,
        top: offset.top,
        width: w,
        clientWidth: w,
        height: h,
        clientHeight: h
    };
}

$(document).ready(function() {

    window.onbeforeunload = function () {
        if (cb.saveInProgress) {
            cb.saveInProgress = false;
            return undefined;
        }
        if (!cb.devMode) {
            return "You codeBoot session will be lost."
        } else {
            return undefined;
        }
    };
    // checkBrowserFeatures();

    $("#setting-speed-normal").click();

    cb.alerts     = document.getElementById("alerts");
    cb.replInput  = cb.createREPLInput();
    cb.transcript = cb.createREPLTranscript();

    cb.transcript.clear();

    cb.setDevMode(false);

    //TODO: deprecated?
    $('#cb-editors').on('scroll', function () {
        var $firstEditor = $('#cb-editors').children().first();
        $('#editors-shadow').toggle($firstEditor.size() > 0 && $firstEditor.position().top < 0);

        cb.updatePopupPos();
    });

    $(window).resize(cb_internal_resizeEditors);
    cb_internal_resizeEditors();

    cb.initFS();

    cb.loadSession();
//TODO: reenable
//    $("#setting-linenums").toggleItem(cb.options.showLineNumbers);

    $('#cb-repl').click(function () {
        cb.focusREPL();
    });

//    $('#about-box').on('hidden.bs.modal', function (e) {
//            cb.focusLastFocusedEditor();
//    });
    $('#about-box').on('shown.bs.modal', function (e) {
        $('#menu-brand-btn').one('focus', function (e) {
            cb.focusLastFocusedEditor();
        });
    });

    cb.handle_query();

    // Stop navigation to '#'
    $('body').on('click.codeboot.restoreFocus', '[data-cb-focus="restore"]', function (e) {
      cb.focusLastFocusedEditor();
    });
    $('body').on('click.codeboot.nonav', '[href="#"]', function (e) {
        e.preventDefault();
    });

    $("#openFileModal").on('show', function () {
        $('#openFileModalOKBtn').attr('disabled', 'disabled');
        var $form = $("#openFileForm");
        $form.empty().append($('<input type="file" id="openFileInput">').change(function (e) {
            $('#openFileModalOKBtn').removeAttr('disabled');
        }));
    });

    $("#openFileModalOKBtn").click(function (e) {
        var files = $("#openFileInput").get(0).files;
        if (!files.length) return;

        var file = files[0];

        var filename = $("#openFileModal").attr('data-cb-filename');
        cb.loadFile(cb.fs.getEditor(filename), file);
    });
});

function cb_internal_resizeEditors() {
    var $console = $('#cb-console');
    var consoleOffset = $console.offset();
    $('#cb-editors')
        .css('left', consoleOffset.left)
        .css('right', consoleOffset.left)
        .css('top', consoleOffset.top + $console.height());
}

function checkBrowserFeatures() {
    var MISSING = 0, EMULATED = 1, SUPPORTED = 2;
    var status = SUPPORTED;

    for (var i = 0; i < window.features.length; i++) {
        var feature = window.features[i];
        var status_label;
        switch (feature.status) {
          case MISSING:
            status_label = 'missing';
            break;
          case EMULATED:
            status_label = 'emulated';
            break;
          default:
            status_label = 'supported';
            break;
        }

        $('#browserIssues ul').append($('<li/>').append($('<a/>').attr('href', feature.url).attr('target', 'new').text(feature.name + ' ' + status_label)));
        status = Math.min(status, feature.status);
    }

    if (status === SUPPORTED) {
        $("#browserStatus").addClass("badge-success");
        $("#browserStatusMsg").text("All features supported");
        $("#browserStatusIcon").addClass("icon-ok");
    } else if (status === EMULATED) {
        $("#browserStatus").addClass("badge-warning");
        $("#browserStatusMsg").text("Some features are emulated");
        $("#browserStatusIcon").addClass("icon-warning-sign");
    } else {
        $("#browserStatus").addClass("badge-important");
        $("#browserStatusMsg").text("Some features are missing");
        $("#browserStatusIcon").addClass("icon-exclamation-sign");
    }
}

CodeBoot.prototype.focusREPL = function () {
    cb.replInput.focus();
};

CodeBoot.prototype.focusDestroyed = function () {
    cb.focusREPL();
};

CodeBoot.prototype.focusLastFocusedEditor = function () {
    if (cb.lastFocusedEditor !== null) {
        cb.lastFocusedEditor.focus();
    }
}

function saveAs(content, filename) {
    $("#form-download-content").val(content);
    $("#form-download-filename").val(filename);
    cb.saveInProgress = true;
    $("#form-download").submit();
}
