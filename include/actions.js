$(document).ready(function() {
    if (!CodeMirror.commands.save) {
        CodeMirror.commands.save = function (cm) {
            if (cm.save) cm.save(cm);
        };
    }
});

CodeBoot.prototype.addAlert = function (text, title, kind) {
    var alertDiv = $("<div/>").addClass("alert");
    if (kind) alertDiv.addClass("alert-" + kind);
    alertDiv.text(text);
    if (title) {
        alertDiv.prepend($("<strong/>").text(title), " ");
    }
    alertDiv.prepend('<button class="close" data-dismiss="alert">&times;</button>');
    $(cb.alerts).append(alertDiv);
};

CodeBoot.prototype.reportError = function (text, title) {
    if (title === undefined) title = "Error!";
    cb.addAlert(text, title, "error");
};

CodeBoot.prototype.reportWarning = function (text, title) {
    if (title === undefined) title = "Warning!";
    cb.addAlert(text, title);
};

CodeBoot.prototype.scrollToEnd = function (editor) {
    editor.scrollIntoView(null, 100); // second parameter avoids line widgets not scrolling into view
};

function removeTrailingNewline(text) {
    var s = String(text);
    if (s.charAt(text.length - 1) === "\n") {
        s = s.slice(0, s.length-1);
    }
    return s;
}

function position_to_line_ch(pos) {
    return { line: position_to_line(pos)-1,
             ch: position_to_column(pos)-1
           };
}

CodeBoot.prototype.codeHighlight = function (loc, cssClass, markEnd) {

    var container = loc.container;
    var editor;

    if (container instanceof SourceContainerInternalFile) {
        var filename = container.toString();
        if (!cb.fs.hasFile(filename)) {
            return null; // the file is not known
        }
        var state = readFileInternal(filename);
        if (container.stamp !== state.stamp) {
            return null; // the content of the editor has changed so can't highlight
        }
        cb.openFile(filename);
        editor = cb.fs.getEditor(filename);
    } else if (container instanceof SourceContainer) {
        editor = cb.transcript.editor;
    } else {
        // unknown source container
        return null;
    }

    var start = { line: position_to_line(loc.end_pos)-1,
                  ch: position_to_column(loc.end_pos)-2
                };
    var end = position_to_line_ch(loc.end_pos);
    var start = position_to_line_ch(loc.start_pos);
    var allMarker = editor.markText(start, end, {'className': cssClass});
    allMarker.cb_editor = editor;

    if (markEnd) {
        start.line = end.line;
        start.ch = end.ch-1;
        var endMarker = editor.markText(start, end, {'className': cssClass+'-end'});
        endMarker.cb_editor = editor;
        return { all: allMarker, end: endMarker };
    } else {
        return { all: allMarker, end: null };
    }
};

CodeBoot.prototype.printedRepresentation_old = function (x) {

    //TODO: avoid infinite loops for circular data!
    //TODO: avoid printing wider than page!
    //TODO: emit HTML markup, so that objects with a toHTML method can be represented specially (such as images)

    if (typeof x === "string") {
        var chars = [];
        chars.push("\"");
        for (var i=0; i<x.length; i++) {
            var c = x.charAt(i);
            if (c === "\"") {
                chars.push("\\\"");
            } else if (c === "\\") {
                chars.push("\\\\");
            } else if (c === "\n") {
                chars.push("\\n");
            } else {
                var n = x.charCodeAt(i);
                if (n <= 31 || n >= 256) {
                    chars.push("\\u" + (n+65536).toString(16).slice(1));
                } else {
                    chars.push(c);
                }
            }
        }
        chars.push("\"");
        return chars.join("");
    } else if (typeof x === "object") {
        if (x === null) {
            return "null";
        } else if (x instanceof Array) {
            var a = [];
            for (var i=0; i<x.length; i++)
                a.push(cb.printedRepresentation(x[i]));
            return "[" + a.join(", ") + "]";
        } else {
            var a = [];
            for (var p in x)
                a.push(cb.printedRepresentation(p)+": "+cb.printedRepresentation(x[p]));
            return "{" + a.join(", ") + "}";
        }
    } else if (typeof x === "undefined") {
        return "undefined";
    } else {
        return String(x);
    }
};

CodeBoot.prototype.printedRepresentation = function (obj, format) {

    if (format === void 0) {
        format = "plain";
    }

    return cb.objectRepresentation(obj, format, 80).text;
};

function escape_HTML(text) {
  return text.replace(/[&<>"'`]/g, function (chr) {
    return '&#' + chr.charCodeAt(0) + ';';
  });
};

function editor_URL(content, filename) {

    var site = document.location.origin +
               document.location.pathname.replace(/\/[^/]*$/g,"");

    return site + "/query.cgi?" + "REPLAY=" +
           btoa(encode_utf8(("@C" +
                             (filename === void 0 ? "" : (filename + "@0")) +
                             content + "@E").replace(/\n/g,"@N")));
}

CodeBoot.prototype.objectRepresentation = function (obj, format, limit) {

    var string_key_required = function (key) {

        return !((Scanner.prototype.is_identifier(key) &&
                  !Scanner.prototype.is_keyword(key)) ||
                 (""+key === ""+(+key) &&
                  +key >= 0));

    };

    var xform = function (str) {
        var text;
        if (format === "HTML") {
            text = escape_HTML(str);
        } else {
            text = str;
        }
        return { text: text, len: str.length };
    };

    if (typeof obj === "object") {

        if (obj === null) {

            return xform("null");

        } else if ("obj_repr" in obj) {

            return obj.obj_repr(format, limit);

        } else if (obj instanceof Array) {

            var a = ["["];
            var len = 1;

            for (var i=0; i<obj.length; i++) {
                if (i > 0) {
                    a.push(", ");
                    len += 2;
                }
                var r = cb.objectRepresentation(obj[i], format, limit-len-1);
                if (len + r.len + 1 > limit) {
                    a.push("...");
                    len += 3;
                    break;
                } else {
                    a.push(r.text);
                    len += r.len;
                }
            }

            a.push("]");
            len += 1;

            return { text: a.join(""), len: len };

        } else {

            var a = ["{"];
            var len = 1;
            var i = 0;

            for (var p in obj) {
                if (i++ > 0) {
                    a.push(", ");
                    len += 2;
                }
                var r1;
                if (string_key_required(p)) {
                    r1 = cb.objectRepresentation(p, format, limit);
                } else {
                    r1 = xform(""+p);
                }
                var r2 = cb.objectRepresentation(obj[p], format, limit-len-r1.len-3);
                if (len + r1.len + r2.len + 3 > limit) {
                    a.push("...");
                    len += 3;
                    break;
                } else {
                    a.push(r1.text);
                    a.push(": ");
                    a.push(r2.text);
                    len += r1.len + 2 + r2.len;
                }
            }

            a.push("}");
            len += 1;

            return { text: a.join(""), len: len };

        }
    } else if (typeof obj === "string") {

        var chars = [];
        chars.push("\"");
        for (var i=0; i<obj.length; i++) {
            var c = obj.charAt(i);
            if (c === "\"") {
                chars.push("\\\"");
            } else if (c === "\\") {
                chars.push("\\\\");
            } else if (c === "\n") {
                chars.push("\\n");
            } else {
                var n = obj.charCodeAt(i);
                if (n <= 31 || n >= 256) {
                    chars.push("\\u" + (n+65536).toString(16).slice(1));
                } else {
                    chars.push(c);
                }
            }
        }
        chars.push("\"");

        return xform(chars.join(""));

    } else if (typeof obj === "undefined") {

        return xform("undefined");

    } else {

        return xform(String(obj));

    }
};

CodeBoot.prototype.query = function (query) {
    cb.saved_query = query;
    cb.replay_command = "";
    cb.replay_command_index = 0;
    cb.replay_parameters = [];
};

function encode_utf8(str) {
    return unescape(encodeURIComponent(str));
}

function decode_utf8(str) {
    return decodeURIComponent(escape(str));
}

CodeBoot.prototype.handle_query = function () {

    var query = cb.saved_query;

    if (query && query.slice(0, 7) === "replay=") {

        cb.replay_command = decodeURIComponent(query.slice(7));
        cb.replay_command_index = 0;
        cb.replay_syntax = 1;

        setTimeout(function () { cb.replay(); }, 100);
    } else if (query && query.slice(0, 7) === "REPLAY=") {

        cb.replay_command = decode_utf8(atob(query.slice(7)));
        cb.replay_command_index = 0;
        cb.replay_syntax = 2;

        setTimeout(function () { cb.replay(); }, 100);
    } else if (query && query.slice(0, 10) === "replay%25=") {

        cb.replay_command = decodeURIComponent(decodeURIComponent(query.slice(10)));
        cb.replay_command_index = 0;
        cb.replay_syntax = 2;

        setTimeout(function () { cb.replay(); }, 100);
    } else if (query && query.slice(0, 8) === "replay%=") {

        cb.replay_command = decodeURIComponent(query.slice(8));
        cb.replay_command_index = 0;
        cb.replay_syntax = 2;

        setTimeout(function () { cb.replay(); }, 100);
    }
};

CodeBoot.prototype.replay = function () {

    var command = cb.replay_command;
    var i = cb.replay_command_index;

    if (i < command.length) {
        var j = i;
        while (j < command.length &&
               (command.charAt(j) !== "@" ||
                (command.charAt(j+1) === "@" ||
                 (cb.replay_syntax === 2 && command.charAt(j+1) === "N")))) {
            if (command.charAt(j) === "@") {
                j += 2;
            } else {
                j += 1;
            }
        }

        var str;

        if (cb.replay_syntax === 2) {
            str = command.slice(i, j).replace(/@N/g,"\n").replace(/@@/g,"@");
        } else {
            str = command.slice(i, j).replace(/@@/g,"\n");
        }

        if (command.charAt(j) === "@") {
            if (command.charAt(j+1) >= "0" && command.charAt(j+1) <= "9") {
                cb.replay_parameters[+command.charAt(j+1)] = str;
                j += 2;
            } else if (command.charAt(j+1) === "P") {
                if (str !== "") {
                    set_input(cb.replInput, str);
                    cb.replInput.refresh();
                    cb.replInput.focus();
                } else {
                    cb.execEval();
                    j += 2;
                }
            } else if (command.charAt(j+1) === "S") {
                if (str !== "") {
                    set_input(cb.replInput, str);
                    cb.replInput.refresh();
                    cb.replInput.focus();
                } else {
                    cb.execStep();
                    j += 2;
                }
            } else if (command.charAt(j+1) === "A") {
                if (str !== "") {
                    set_input(cb.replInput, str);
                    cb.replInput.refresh();
                    cb.replInput.focus();
                } else {
                    cb.execAnimate();
                    j += 2;
                }
            } else if (command.charAt(j+1) === "E") {
                var default_filename = "scratch";
                var filename = default_filename;
                if (cb.replay_parameters[0] !== void 0) {
                    filename = cb.replay_parameters[0];
                    cb.replay_parameters[0] = void 0;
                }
                var existing = cb.openFileExistingOrNew(filename);
                var editor = cb.fs.getEditor(filename);
                var replace = true;
                if (existing &&
                    filename !== default_filename &&
                    editor.getValue() !== str) {
                    replace = confirm("You are about to replace the file '" + filename + "' with different content.  Are you sure you want to proceed with the replacement and lose your local changes to that file?");
                }
                if (replace) {
                    editor.setValue(str);
                    showTryMeTooltip(filename);
                }
                j += 2;
            } else if (command.charAt(j+1) === "C") {
                cb.closeAll();
                drawing_window.cs();
                j += 2;
            } else {
                // unknown command
                j += 2;
            }
        } else {
            if (str !== "") {
                set_input(cb.replInput, str);
                if (j === command.length) {
                    showTryMeOnButton($("#step-button"));
                }
            }
        }

        cb.replay_command_index = j;

        if (j < command.length) {
            setTimeout(function () { cb.replay(); }, 1);
        }
    }
};

function showTryMeTooltip(filename) {
    var $row = $('.row[data-cb-filename="' + filename + '"]');
    var $btn = $(".action-btn", $row.get(0));
    showTryMeOnButton($btn);
};

function showTryMeOnButton($btn) {

    $btn.tooltip({
        trigger: "manual",
        placement: "left",
        html: true,
        template: '<div class="tooltip tryme"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
    });

    var tooltip = $btn.data('tooltip');
    if (tooltip) {
        tooltip.getTitle = function () {
            // Bootstrap insists on using the title attribute for tooltips, so override
            return 'Try me!';
        };
        $btn.tooltip('show');

        // Auto hide the tooltip after 5 secs
        setTimeout(function () { $btn.tooltip('hide'); }, 5000);

        // Hide the tooltip if the user clicks on the button before 5 secs
        $btn.on("click.codeboot.tryMe", function () {
            $btn.tooltip('hide');
        });
    }
}

CodeBoot.prototype.modeStopped = function () {
    return 'stopped';
};

CodeBoot.prototype.modeAnimating = function () {
    return 'animating';
};

CodeBoot.prototype.modeStepping = function () {
    return 'stepping';
};

CodeBoot.prototype.initProgramState = function () {
    cb.programState = {
        rte: null,
        errorMark: null,
        execPointMark: null,
        execPointBubble: new CBExecPointBubble(),
        value_bubble: null, //TODO: remove
        timeoutId: null,
        step_delay: 0,
        mode: cb.modeStopped(),
        code_queue: []
    };
};

function code_queue_add(code) {
    cb.programState.code_queue.push(code);
    code_queue_check();
}

function code_queue_check() {
    if (cb.programState.mode === cb.modeStopped()) {
        code_queue_service();
    }
}

function code_queue_service() {
    if (cb.programState.code_queue.length > 0) {
        var code = cb.programState.code_queue.shift();
        cb.programState.rte = jev.runSetup(code,
                                           {globalObject: cb.globalObject});
        cb.execute(false);
    }
}

CodeBoot.prototype.showingStepCounter = function () {
    return $('#exec-step-counter').is(':visible');
};

CodeBoot.prototype.showStepCounter = function () {
    var counter = $("#exec-step-counter");
    counter.css("display", "inline");
    counter.text(cb.textStepCounter());
};

CodeBoot.prototype.hideStepCounter = function () {
    var counter = $("#exec-step-counter");
    counter.css("display", "none");
};

CodeBoot.prototype.textStepCounter = function () {
    var count = cb.programState.rte.step_count;
    return + count + " step" + (count>1 ? "s" : "");
};

CodeBoot.prototype.updatePopupPos = function () {
    if (cb.programState.value_bubble !== null) {
        cb.programState.value_bubble.update();
    }
};

CodeBoot.prototype.enterMode = function (newMode) {

    // newMode is one of 'stopped', 'animating', 'stepping'

    if (cb.programState.mode === newMode)
        return false;

    var isStopped   = newMode === cb.modeStopped();
    var isAnimating = newMode === cb.modeAnimating();
    var isStepping  = newMode === cb.modeStepping();

    // Show either play-1, pause or play-pause

    if (isStepping) {
        $("#exec-img-play-1"    ).css("display", "inline");
        $("#exec-img-pause"     ).css("display", "none");
        $("#exec-img-play-pause").css("display", "none");
    } else if (isAnimating) {
        $("#exec-img-play-1"    ).css("display", "none");
        $("#exec-img-pause"     ).css("display", "inline");
        $("#exec-img-play-pause").css("display", "none");
    } else {
        $("#exec-img-play-1"    ).css("display", "none");
        $("#exec-img-pause"     ).css("display", "none");
        $("#exec-img-play-pause").css("display", "inline");
    }

    // Update step counter

    if (cb.showingStepCounter()) {
        if (isAnimating || isStepping) {
            cb.showStepCounter(cb.programState.rte.step_count);
        } else {
            var counter = $('<span class="badge badge-primary badge-pill step-counter"/>');
            counter.text(cb.textStepCounter());
            cb.transcript.addLineWidget(counter.get(0));
            cb.hideStepCounter();
        }
    }

    if (isStopped) {

        cb.focusLastFocusedEditor();
        cb.stopAnimation();
        cb.hideExecPoint();
        cb.programState.rte = null;
        cb.replInput.busy = false;
        set_prompt(cb.replInput);
        cb.replInput.refresh();
        //TODO: interferes?
        //cb.replInput.focus();
    }

    cb.programState.mode = newMode;

    return true;
};

// UI event handling

// Control of execution

CodeBoot.prototype.execStep = function () {
    cb.execEvent('step');
};

CodeBoot.prototype.execAnimate = function () {
    cb.execEvent('animate');
};

CodeBoot.prototype.execEval = function () {
    cb.execEvent('eval');
};

CodeBoot.prototype.execStop = function () {
    cb.execEvent('stop');
};

CodeBoot.prototype.repeatLastExecEvent = function () {
    cb.execEvent(cb.lastExecEvent);
};

CodeBoot.prototype.execStepOrEval = function () {
    if (cb.programState.rte !== null) // currently running code?
        cb.execStep();
    else
        cb.execEval();
};

CodeBoot.prototype.execEvent = function (event) {

    cb.lastExecEvent = event;

    switch (event) {

    case 'step':
        cb.animate(0);
        break;

    case 'animate':
        cb.animate(cb.stepDelay);
        break;

    case 'eval':
        cb.eval();
        break;

    case 'stop':
        cb.stop();
        break;
    }
};

CodeBoot.prototype.animate = function (new_step_delay) {
    var was_animating = cb.stopAnimation();
    cb.programState.step_delay = new_step_delay;
    if (new_step_delay === 0) {
        cb.enterMode(cb.modeStepping());
        if (!was_animating)
            cb.step_or_animate(true);
    } else {
        cb.enterMode(cb.modeAnimating());
        cb.step_or_animate(true);
    }
};

CodeBoot.prototype.eval = function () {
    cb.enterMode(cb.modeAnimating());
    cb.step_or_animate(false);
};

CodeBoot.prototype.step_or_animate = function (single_step) {
    //TODO: interferes?
    //cb.replInput.focus();
    if (cb.programState.rte !== null) // currently running code?
        cb.execute(single_step);
    else
        cb.run(single_step);
};

CodeBoot.prototype.stopAnimation = function () {

    // Stops any time-based animation of the program

    var id = cb.programState.timeoutId

    if (id !== null) {
        clearTimeout(id); // cancel the scheduled execution step
        cb.programState.timeoutId = null;
    }

    return id !== null; // returns true if a time-based animation was cancelled
};

CodeBoot.prototype.stop = function (reason) {

    if (cb.enterMode(cb.modeStopped())) {

        if (reason === void 0) {
            reason = "stopped";
            cb.hideStepCounter();
        }

        if (reason !== null) {
            cb.transcript.addLine(reason, "error-message");
        }
    }
};

CodeBoot.prototype.show_error = function (loc) {

    cb.hide_error();

    cb.programState.errorMark = cb.codeHighlight(loc, 'error-code', false);
};

CodeBoot.prototype.hide_error = function () {
    if (cb.programState.errorMark !== null) {
        cb.clearMarker(cb.programState.errorMark);
        cb.programState.errorMark = null;
    }
};

CodeBoot.prototype.clearMarker = function (marker) {
    if (marker.all !== null) {
        marker.all.clear();
    }
    if (marker.end !== null) {
        marker.end.clear();
    }
};

function within(rect, viewport) {
    if (rect.left < viewport.left) return false;
    if (rect.right > viewport.left + viewport.clientWidth) return false;
    if (rect.top < viewport.top) return false;
    if (rect.bottom > viewport.top + viewport.clientHeight) return false;
    return true;
}

function isCharacterVisible(pos, editor) {
    var point = editor.charCoords(pos, "local");
    var scrollInfo = editor.getScrollInfo();
    return within(point, scrollInfo);
}

function isMarkerVisible(marker, editor) {
    if (!editor) editor = marker.cb_editor;
    var range = marker.find();
    if (range) return isCharacterVisible(range.from, editor);

    return false;
}

function scrollToMarker(marker, editor) {
    if (!editor) editor = marker.cb_editor;
    if (!isMarkerVisible(marker, editor)) {
        var range = marker.find();
        if (range) {
            var rect = editor.charCoords(range.from, "local");
            editor.scrollTo(rect.left, rect.bottom);
        }
    }
}

function CBValueBubble(opts) {
    this.opts = {};
    $.extend(this.opts, {
        value : cb.programState.rte.result,
        context : cb.dumpContext(),
        $anchor : function () { return $(".cb-exec-point-code").last(); },
        $container: null,
    }, opts);

    this.closed = false;
    this.$last_anchor = null;
    this.init(this.anchor())
}

CodeBoot.prototype.closeValueBubble = function () {
    if (cb.programState.value_bubble !== null) {
        cb.programState.value_bubble.anchor().popover('hide');
        cb.programState.value_bubble = null;
    }
};

function CBExecPointBubble() {
    this.tip  = null;
    this.elem = null;
};

CBExecPointBubble.prototype.isVisible = function () {

    if (this.tip !== null) {
        var popper = this.tip.getPopperElement(this.elem);
        if (popper !== null) {
            return popper.isVisible();
        }
    }

    return false;
};

CBExecPointBubble.prototype.show = function () {

    if (this.tip !== null) {
        var popper = this.tip.getPopperElement(this.elem);
        if (popper !== null) {
            this.tip.show(popper);
        }
    }

};

CBExecPointBubble.prototype.hide = function () {

    if (this.tip !== null) {
        var popper = this.tip.getPopperElement(this.elem);
        if (popper !== null) {
            this.tip.hide(popper);
        }
    }

};

CBExecPointBubble.prototype.destroy = function () {

    if (this.tip !== null) {
        var popper = this.tip.getPopperElement(this.elem);
        if (popper !== null) {
            this.tip.destroy(popper);
        }
    }

    this.tip  = null;
    this.elem = null;

};

CBExecPointBubble.prototype.replaceContent = function (html) {

    if (this.tip !== null) {
        var popper = this.tip.getPopperElement(this.elem);
        if (popper !== null) {
            var contentElem = popper.querySelector('.tippy-tooltip-content');
            if (contentElem !== null) {
                contentElem.innerHTML = html;
            }
        }
    }

};

CodeBoot.prototype.execPointCodeElement = function () {

    var elems = [].slice.call(document.querySelectorAll('.cb-exec-point-code-end'),-1);

    if (elems.length === 0)
        return null;
    else
        return elems[0];
};

CBExecPointBubble.prototype.attachTo = function (elem, html) {

    if (elem === null) return;

    var _this = this;

    if (this.elem === null || this.elem !== elem) {

        /* create a new bubble */

        if (this.elem !== null)
            this.destroy();

        var tip = tippy(elem, {
            html: '#cb-exec-point-bubble-template',
            theme: 'cb-exec-point-bubble',
            //position: 'bottom-start',
            position: 'bottom',
            trigger: 'manual',
            sticky: 'true',
            arrow: true,
            interactive: true,
            duration: 0,
            popperOptions: {
                modifiers: {
                    flip: {
                        enabled: false
                    }
                }
            }
        });

        this.tip = tip;
        this.elem = elem;
    }

    this.replaceContent(html);

    setTimeout(function () { _this.show(); }, 0);

/*
        //<div class="tippy-tooltip tippy-tooltip--regular leave dark-theme" data-animation="shift" data-interactive="" data-template-id="#cb-exec-point-bubble-template" style="bottom: 0px;"><div class="arrow-regular" x-arrow=""></div><div class="tippy-tooltip-content">foo</div></div>

        setTimeout(function () {
            alert(tip.getPopperElement(elem).innerHTML);
            tip.show(tip.getPopperElement(elem));
        }, 0);
*/

};

CodeBoot.prototype.execPointBubbleHTML = function () {

    var val = cb.programState.rte.result;
    var valHTML = (val === void 0)
                  ? '<i>no value</i>'
                  : cb.printedRepresentation(val, 'HTML');

    var contextHTML = cb.dumpContext();

    if (contextHTML === '') {
        return '<div class="cb-exec-point-bubble-value-no-context">' +
               valHTML +
               '</div>';
    } else {
        return '<div class="cb-exec-point-bubble-value">' +
               valHTML +
               '</div>' +
               '<div class="cb-exec-point-bubble-context">' +
               contextHTML +
               '</div>';
    }
};



CBValueBubble.prototype.init = function ($anchor) {

    cb.closeValueBubble();

    //TODO: reenable
    //if (this._popover)
    //    this._popover.destroy();

    var hasContent = this.opts.context !== "";

    if (false) {
    var reference = document.getElementById('menu-file');
    var popper = document.getElementById('menu-settings');
    var anotherPopper = new Popper(
        reference,
        popper,
        {
            // popper options here
        }
    );

        return;
    }

    if (false) {
        var tip = tippy('#myButton');
        var el = document.querySelector('#myButton');
        var popper = tip.getPopperElement(el);
        tip.show(popper);
    }

    if (false) {
        var elem = [].slice.call(document.querySelectorAll('.cb-exec-point-code'),-1)[0];
        var tip = tippy(elem, {
            html: '#my-template-id', // OR document.querySelector('#my-template-id')
            position: 'bottom-start',
            trigger: 'manual',
            //sticky: 'true',
            arrow: true
        });
        //tip.show();
        //elem.focus();
        //setTimeout(function () { tip.hide(); }, 2000);
        //tip.show();
        //elem.click();
        //tip.show();
        setTimeout(function () {
        if (true) {
            var elem = [].slice.call(document.querySelectorAll('.cb-exec-point-code'),-1)[0];
            var popper = tip.getPopperElement(elem);
            tip.show(popper);
        }
        }, 0);
        return;
    }

    $anchor.popover({
        animation: false,
        placement: "bottom",
        trigger: "manual",
        title: 'title',
        template: '<div class="popover value-bubble' + (hasContent ? ' has-content' : '') + '" data-placement="bottom">'
            + '<div class="arrow"></div>'
            + '<div class="popover-title">'
            + '<span>'
            + this._valueRepr(this.opts.value)
            + '</span>'
            + '<button class="close" onclick="cb.closeValueBubble();">&times;</button>'
            + '</div>'
            + '<div class="popover-content">'
            + this.opts.context
            + '</div>'
            + '</div>',
        html: true,
        padding: 2
    });

    cb.execPointPopover = $anchor;

    this._popover = $anchor.data('bs.popover');

    $anchor.on('show.bs.popover', function() {
    });
    
    $anchor.on('shown.bs.popover', function() {
//        alert('shown');
    });

    $anchor.on('click.bs.popover' , function () {
        alert('close');
        $(this).parents('.popover').popover('hide');
    });
    //_isEnabled,_timeout,_hoverState,_activeTrigger,_popper,element,config,tip
    //this._popover.element.innerHTML="xxx";
    //alert(Object.keys(this._popover._popper));
    //alert(Object.keys(this._popover));
    //_isEnabled,_timeout,_hoverState,_activeTrigger,_popper,element,config,tip
    if (false) {
    // Add close button handler
    // Popovers / tooltips are created lazily, so intercept their creation to install the handler
    var oldShow = this._popover.show;
    var self = this;
    this._popover.show = function () {
        var $tip = this.tip();
        $tip.addClass("value-bubble");
        oldShow.apply(this, arguments);
        $("button.close", $tip).on("click", function() {
            self.closed = true;
            self.hide();
            $(".cb-exec-point-code").one("mouseover", function () {
                if (!self.isOpen()) {
                    self.show();
                }
            });
        });
    }
    }
};

CBValueBubble.prototype.anchor = function () {
    var $anchor = this.opts.$anchor;
    if (typeof $anchor === "function") {
        this.$last_anchor = $anchor();
        if (this._popover && !this.$last_anchor.data('bs.popover')) {
            // We lost the popover, most likely because the anchor
            // changed under our feet. This seems to happen when e.g. the window
            // is resized (observed on Chrome)
            this.init(this.$last_anchor);
        }
        return this.$last_anchor;
    } else {
        return $anchor;
    }
};

CBValueBubble.prototype._valueRepr = function (val) {
    if (val === void 0) return "<i>no value</i>";
    return cb.printedRepresentation(val, "HTML");
};

CBValueBubble.prototype.show = function () {
    this.closed = false;
    if (this.anchor().isInView(this.opts.$container)) {
        // The proper height for the tooltip will only be available after
        // we show it. So, we first display it with visibility:hidden,
        // compute the placement, and finally display it to the user.

        //alert(Object.keys(this._popover));
        //_isEnabled,_timeout,_hoverState,_activeTrigger,_popper,element,config,tip,show
        //alert(this._popover.tip);

        //this._popover.tip().css("visibility", "hidden");
        this.anchor().popover('show');
        this.setPlacement(this._calculatePlacement());
        this.anchor().popover('show');
        //this._popover.tip().css("visibility", "visible");
    }
};

CBValueBubble.prototype._calculatePlacement = function () {

    return "bottom";//TODO: improve

    if (!this.opts.$container) {
        return "bottom";
    }

    var $bubble = this._popover.tip();
    var extra_padding = 5; // Extra padding for safety
    var editorsRect = this.opts.$container.getBounds();
    var anchorRect = this.anchor().getBounds();
    if (anchorRect.bottom + this.height() + extra_padding >= editorsRect.bottom) {
        return "top";
    } else {
        return "bottom";
    }
};

CBValueBubble.prototype.update = function () {
    if (this.closed) return;

    if (this.anchor().isInView(this.opts.$container)) {
        this.setPlacement(this._calculatePlacement());
        this.anchor().popover('show');
    } else {
        this.hide();
    }
};

CBValueBubble.prototype.hide = function () {
    this.anchor().popover('hide');
};

CBValueBubble.prototype.destroy = function () {
    //TODO: reenable
    //this.$last_anchor.popover('destroy');
    //this._popover = null;
    this.anchor().popover('hide');
};

CBValueBubble.prototype.isOpen = function (args) {
    return this._popover.tip().hasClass('in');
};

CBValueBubble.prototype.setPlacement = function (placement) {
    //TODO
    //this._popover.options.placement = placement;
};

CBValueBubble.prototype.height = function () {
    var arrow_height = 10;
    var h = this._popover.tip().height();
    if (h === 0) {
        // Popover hasn't been created yet, so create it
        this._popover.setContent();
        h = this._popover.tip().height();
    }
    return h + arrow_height;
}

CodeBoot.prototype.hideExecPoint = function () {

    cb.programState.execPointBubble.hide();

    if (cb.programState.execPointMark !== null) {
        cb.clearMarker(cb.programState.execPointMark);
        cb.programState.execPointMark = null;
    }

        // Somehow, CodeMirror seems to hold on to the marked elements
        // somewhere, causing problems when displaying the
        // bubble. This kludge should at least prevent the problem
        // from manifesting for the user.
        //TODO: proper fix
//        $(".cb-exec-point-code").removeClass("cb-exec-point-code");
};

CodeBoot.prototype.showExecPoint = function () {

    cb.showStepCounter();

    cb.hideExecPoint();

    var loc = cb.programState.rte.ast.loc;
    cb.programState.execPointMark = cb.codeHighlight(loc, 'cb-exec-point-code', true);
    scrollToMarker(cb.programState.execPointMark.end);

    var value = cb.programState.rte.result;
    var $container;
    if (loc.container instanceof SourceContainerInternalFile) {
        $container = $('#cb-editors');
    } else {
        $container = null; /* use whole document */
    }

    if (!$(".cb-exec-point-code-end").last().isInView($container)) {
        var filename = loc.container.toString();
        cb.scrollTo(cb.getContainerFor(filename));
    }

    if (true) {
        cb.programState.execPointBubble.attachTo(
            cb.execPointCodeElement(),
            cb.execPointBubbleHTML());
    } else {

    cb.programState.value_bubble = new CBValueBubble({
        $container: $container
    });

        cb.programState.value_bubble.show();
    }
};

CodeBoot.prototype.dumpContext = function () {

    var rte = cb.programState.rte;
    var f = rte.frame;
    var cte = f.cte;
    var result = [];
    var seen = {};

    var add = function (id, val) {
        if (seen[id] === void 0) {
            if (val !== void 0) { // don't show undefined variables
                result.push('<div class="cb-exec-point-bubble-binding"><span class="cb-code-font">' + id + '</span>: ' + cb.printedRepresentation(val, 'HTML') + '</div>');
            }
            seen[id] = true;
        }
    };

    while (cte !== null) {
        for (var id_str in cte.params) {
            var i = cte.params[id_str];
            add(id_str, f.params[i]);
        }
        for (var id_str in cte.locals) {
            if (cte.parent !== null) {
                var i = cte.locals[id_str];
                add(id_str, f.locals[i]);
            } else {
                if (uninteresting_global[id_str] === void 0) {
                    add(id_str, rte.glo[id_str]);
                }
            }
        }
        if (cte.callee !== null) {
            add(cte.callee, f.callee);
        }
        cte = cte.parent;
        f = f.parent;
    }

    return result.join('');
};

var uninteresting_global = {};
uninteresting_global["print"] = true;
uninteresting_global["alert"] = true;
uninteresting_global["prompt"] = true;
uninteresting_global["println"] = true;
uninteresting_global["pause"] = true;
uninteresting_global["assert"] = true;
uninteresting_global["load"] = true;
uninteresting_global["Math"] = true;
uninteresting_global["Date"] = true;
uninteresting_global["String"] = true;
uninteresting_global["Array"] = true;
uninteresting_global["Number"] = true;
uninteresting_global["setScreenMode"] = true;
uninteresting_global["getScreenWidth"] = true;
uninteresting_global["getScreenHeight"] = true;
uninteresting_global["setPixel"] = true;
uninteresting_global["exportScreen"] = true;
uninteresting_global["cs"] = true;
uninteresting_global["st"] = true;
uninteresting_global["ht"] = true;
uninteresting_global["pu"] = true;
uninteresting_global["pd"] = true;
uninteresting_global["fd"] = true;
uninteresting_global["bk"] = true;
uninteresting_global["lt"] = true;
uninteresting_global["rt"] = true;
uninteresting_global["setpc"] = true;
uninteresting_global["setpw"] = true;
uninteresting_global["drawtext"] = true;

CodeBoot.prototype.execute = function (single_step) {
    if (false && cb.hideExecPoint()) { //TODO: find a better way... this causes too much flicker
        // give some time for the browser to refresh the page
        setTimeout(function () { cb.execute2(single_step); }, 10);
    } else {
        // step was not shown, so no need to wait
        cb.execute2(single_step);
    }
};

CodeBoot.prototype.execute2 = function (single_step) {

    var newMode = cb.modeStopped();
    cb.stopAnimation();

    var rte = cb.programState.rte;

    if (rte !== null && !rte.finished()) {

        try {
            rte.step(single_step ? 1 : 51151);
        }
        catch (e) {
            if (e !== false)
                cb.stop(String(e));
            else
                cb.stop(null);
            return;
        }

        if (cb.programState.mode === cb.modeStepping()) {
            single_step = true;
        }

        if (!rte.finished()) {
            newMode = cb.modeStepping();
            if (single_step) {
                cb.showExecPoint();
                if (cb.programState.step_delay > 0) {
                    newMode = cb.modeAnimating();
                    cb.programState.timeoutId = setTimeout(function ()
                                                           { cb.execute(true); },
                                                           cb.programState.step_delay);
                }
            } else {
                cb.showStepCounter();
                newMode = cb.modeAnimating();
                cb.programState.timeoutId = setTimeout(function ()
                                                       { cb.execute(false); },
                                                       1);
            }
        } else {

            if (rte.error !== null) {
                cb.displayError(cb.programState.rte.ast.loc, null, String(rte.error));
            } else {
                cb.executionEndedWithResult(rte.getResult());
            }

            cb.stop(null);
        }
    }

    cb.enterMode(newMode);

    code_queue_check();
};

CodeBoot.prototype.executionEndedWithResult = function (result) {

    cb.lastResult = result;
    cb.lastResultRepresentation = cb.printedRepresentation(result);

    if (result !== void 0) {
        cb.transcript.addLine(cb.lastResultRepresentation, "transcript-result");
    }

    cb.executionHook();
};

CodeBoot.prototype.executionHook = function () {
};              

CodeBoot.prototype.run = function (single_step) {

    var code_gen;
    var source;

    if (cb.lastFocusedEditor === cb.replInput) {

        /* running REPL input */

        source = cb.replInput.getValue();

        if (false && source.trim() === "") {
            if (cb.programState.rte !== null) {
                cb.execute(true);
                return;
            }
            if (single_step) {
                set_prompt(cb.replInput);
                cb.replInput.refresh();
                cb.enterMode(cb.modeStopped());
                code_queue_check();
                return;
            }
        }

        var line;

        if (cb.transcript.is_empty) {
            line = 0;
        } else {
            line = cb.transcript.editor.lineCount();
        }

        code_gen = function () {
            return cb.compile_repl_expression(source, line, 0);
        };

    } else {

        /* running file */

        var filename = cb.lastFocusedEditor.cb.fileEditor.filename;

        source = "load(\"" + filename + "\");";

        drawing_window.cs(); /* clear drawing window when running file */

        code_gen = function () {
            return cb.compile_internal_file(filename);
        };
    }

    set_prompt(cb.replInput, false);
    cb.replInput.refresh();

    if (source.trim() !== "")
        cb.replInput.cb.history.add(source);

    cb.transcript.addLine(source, "transcript-input");

    cb.run_setup_and_execute(code_gen, single_step);
};

CodeBoot.prototype.run_setup_and_execute = function (code_gen, single_step) {

    cb.hide_error();

    cb.replInput.busy = true;

    try {
        var code = code_gen();
        if (code === null) {
            cb.stop(null);
            return;
        } else {
            cb.programState.rte = jev.runSetup(code,
                                               {globalObject: cb.globalObject});
        }
    }
    catch (e) {
        if (e !== false)
            cb.stop(String(e));
        else
            cb.stop(null);
        return;
    }

    cb.execute(single_step);

    //TODO: interferes?
    //cb.replInput.focus();
};

function abort_fn_body(rte, result, msg) {

    cb.enterMode(cb.modeStepping());

    if (msg !== void 0) {
        cb.transcript.addLine(msg, "error-message");
    }

    cb.programState.step_delay = 0;
    rte.step_limit = rte.step_count; // exit trampoline

    return return_fn_body(rte, result);
}

function return_fn_body(rte, result) {

    var cont = rte.stack.cont;

    rte.frame = rte.stack.frame;
    rte.stack = rte.stack.stack;

    return cont(rte, result);
}

function builtin_pause(filename) {
    throw "unimplemented";///////////////////////////
}

builtin_pause._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        var delay = params[0];

        if (params.length === 0) {
            delay = Infinity;
        } else if (typeof delay !== "number" || !(delay >= 0)) {
            return abort_fn_body(rte, void 0, "delay parameter of pause must be a non-negative number");
        }

        if (delay !== Infinity) {
            cb.stopAnimation();
            cb.programState.timeoutId = setTimeout(function ()
                                                   {
                                                       cb.repeatLastExecEvent();
                                                   },
                                                   delay*1000);
        }

        return abort_fn_body(rte, void 0);
    };

    return exec_fn_body(code,
                        builtin_pause,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_assert(condition) {
    throw "unimplemented";///////////////////////////
}

builtin_assert._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        if (!params[0]) {
            return abort_fn_body(rte,
                                 "THIS ASSERTION FAILED",
                                 params[1]);
        }

        return return_fn_body(rte, void 0);
    };

    return exec_fn_body(code,
                        builtin_assert,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_setScreenMode(width, height) {
    throw "unimplemented";///////////////////////////
}

builtin_setScreenMode._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        if (params.length !== 2) {
            return abort_fn_body(rte, void 0, "setScreenMode expects 2 parameters");
        }

        var width = params[0];
        var height = params[1];

        if (typeof width !== "number" ||
            Math.floor(width) !== width ||
            width < 1 ||
            width > 300) {
            return abort_fn_body(rte, void 0, "width parameter of setScreenMode must be a positive integer no greater than 300");
        }

        if (typeof height !== "number" ||
            Math.floor(height) !== height ||
            height < 1) {
            return abort_fn_body(rte, void 0, "height parameter of setScreenMode must be a positive integer no greater than 200");
        }

        var pixSize = Math.min(10, Math.floor(450 / width + 1));

        var divNode = document.createElement("div");

        var pixels = new cb.output.PixelGrid(divNode, {
            rows: height,
            cols: width,
            pixelSize: (pixSize >= 3) ? pixSize-1 : pixSize,
            borderWidth: (pixSize >= 3) ? 1 : 0,
        });


        pixels.clear(pixels.black);

        cb.transcript.addLineWidget(divNode);
        cb.screenPixels = pixels;
        cb.screenWidth = width;
        cb.screenHeight = height;

        return return_fn_body(rte, void 0);
    };

    return exec_fn_body(code,
                        builtin_setScreenMode,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

cb.screenWidth = 0;

function builtin_getScreenWidth() {
    throw "unimplemented";///////////////////////////
}

builtin_getScreenWidth._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {
        return return_fn_body(rte, cb.screenWidth);
    };

    return exec_fn_body(code,
                        builtin_getScreenWidth,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

cb.screenHeight = 0;

function builtin_getScreenHeight() {
    throw "unimplemented";///////////////////////////
}

builtin_getScreenHeight._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {
        return return_fn_body(rte, cb.screenHeight);
    };

    return exec_fn_body(code,
                        builtin_getScreenHeight,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_setPixel(x, y, color) {
    throw "unimplemented";///////////////////////////
}

builtin_setPixel._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        if (params.length !== 3) {
            return abort_fn_body(rte, void 0, "setPixel expects 3 parameters");
        }

        var x = params[0];
        var y = params[1];
        var color = params[2];

        if (typeof x !== "number" ||
            Math.floor(x) !== x ||
            x < 0 ||
            x >= cb.screenWidth) {
            return abort_fn_body(rte, void 0, "x parameter of setPixel must be a positive integer less than " + cb.screenWidth);
        }

        if (typeof y !== "number" ||
            Math.floor(y) !== y ||
            y < 0 ||
            y >= cb.screenHeight) {
            return abort_fn_body(rte, void 0, "y parameter of setPixel must be a positive integer less than " + cb.screenHeight);
        }

        if (typeof color !== "object" ||
            color === null ||
            !("r" in color) ||
            typeof color.r !== "number" ||
            Math.floor(color.r) !== color.r ||
            color.r < 0 || color.r > 255 ||
            !("g" in color) ||
            typeof color.g !== "number" ||
            Math.floor(color.g) !== color.g ||
            color.g < 0 || color.g > 255 ||
            !("b" in color) ||
            typeof color.b !== "number" ||
            Math.floor(color.b) !== color.b ||
            color.b < 0 || color.b > 255) {
            return abort_fn_body(rte, void 0, "color parameter of setPixel must be a RGB structure");
        }

        cb.screenPixels.setPixel(x,
                                 y,
                                 "#" +
                                 (256+color.r).toString(16).slice(1) +
                                 (256+color.g).toString(16).slice(1) +
                                 (256+color.b).toString(16).slice(1));

        return return_fn_body(rte, void 0);
    };

    return exec_fn_body(code,
                        builtin_setPixel,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_exportScreen() {
    throw "unimplemented";///////////////////////////
}

builtin_exportScreen._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {
        if (!('screenPixels' in cb)) {
            return return_fn_body(rte, null);
        }
        
        var pixels = [];
        
        for(var i = 0; i<cb.screenHeight; i++) {
            pixels.push([]);
            for(var j = 0; j<cb.screenWidth; j++) {
                pixels[i].push(cb.screenPixels.pixels[i][j]);
            }
        }
        
        return return_fn_body(rte, pixels.map(function(e) { return e.join(''); }).join('\n'));
    };

    return exec_fn_body(code,
                        builtin_exportScreen,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_load(filename) {
    throw "unimplemented";///////////////////////////
}

builtin_load._apply_ = function (rte, cont, this_, params) {

    var filename = params[0];
    var code = cb.compile_file(filename);

    if (code === null) {
        code = function (rte, cont) {
            return return_fn_body(rte, void 0);
        };
    }

    return exec_fn_body(code,
                        builtin_load,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_readFile(filename) {
    throw "unimplemented";///////////////////////////
}

builtin_readFile._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        if (params.length !== 1) {
            return abort_fn_body(rte, void 0, "readFile expects 1 parameter");
        }

        var filename = params[0];

        if (typeof filename !== "string") {
            return abort_fn_body(rte, void 0, "filename parameter of readFile must be a string");
        }

        var state;

        try {
            state = readFileInternal(filename);
        }
        catch (e) {
            return abort_fn_body(rte, void 0, String(e));
        }

        return return_fn_body(rte, state.content);
    };

    return exec_fn_body(code,
                        builtin_readFile,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

function builtin_writeFile(filename, content) {
    throw "unimplemented";///////////////////////////
}

builtin_writeFile._apply_ = function (rte, cont, this_, params) {

    var code = function (rte, cont) {

        if (params.length !== 2) {
            return abort_fn_body(rte, void 0, "writeFile expects 2 parameters");
        }

        var filename = params[0];
        var content = params[1];

        if (typeof filename !== "string") {
            return abort_fn_body(rte, void 0, "filename parameter of writeFile must be a string");
        }

        if (typeof content !== "string") {
            return abort_fn_body(rte, void 0, "content parameter of writeFile must be a string");
        }

        try {
            writeFileInternal(filename, content);
        }
        catch (e) {
            return abort_fn_body(rte, void 0, String(e));
        }

        return return_fn_body(rte, void 0);
    };

    return exec_fn_body(code,
                        builtin_writeFile,
                        rte,
                        cont,
                        this_,
                        params,
                        [],
                        null,
                        null);
};

CodeBoot.prototype.compile_repl_expression = function (source, line, ch) {
    return cb.compile(source,
                      new SourceContainer(source, "<REPL>", line+1, ch+1));
};

CodeBoot.prototype.compile_file = function (filename) {
    if (/^http:\/\//.test(filename)) {
        return cb.compile_url_file(filename);
    } else {
        return cb.compile_internal_file(filename);
    }
};

CodeBoot.prototype.urlGet = function (url) {
    var content;
    $.ajax({
        url: "urlget.cgi",
        type: "POST",
        data: {url: url},
        dataType: "text",
        async: false,
        success: function (data) {
            content = data;
        },
        error: function (jqXHR, textStatus, errorThrown) {
            cb.transcript.addLine("Failed to load remote ressource", "error-message");
        }
    });
    return content;
};

cb.cacheURL = {};

CodeBoot.prototype.readURL = function (url) {
    if (cb.cacheURL.hasOwnProperty(url)) {
        return cb.cacheURL[url];
    } else {
        var source = cb.urlGet(url);
        if (source !== (void 0)) cb.cacheURL[url] = source;
        return source;
    }
};

CodeBoot.prototype.compile_url_file = function (url) {

    var source = cb.readURL(url);
    if (source === (void 0)) source = "";

    return cb.compile(source,
                      new SourceContainer(source, url, 1, 1));
};

CodeBoot.prototype.compile_internal_file = function (filename) {

    var state = readFileInternal(filename);
    var source = state.content;

    return cb.compile(source,
                      new SourceContainerInternalFile(source, filename, 1, 1, state.stamp));
};

function readFileInternal(filename) {

    var file = cb.fs.getByName(filename);

    return {
        stamp: file.stamp,
        content: file.getContent(),
    };
}

function writeFileInternal(filename, content) {

    var file;

    if (cb.fs.hasFile(filename)) {
        file = cb.fs.getByName(filename);
    } else {
        file = new CBFile(filename);
        cb.fs.addFile(file);
        cb.addFileToMenu(file);
    }

    file.content = content;
    file.setContent(content);
}

CodeBoot.prototype.compile = function (source, container) {
    return jev.compile(source,
                       {
                           container: container,
                           error: function (loc, kind, msg) {
                               cb.syntaxError(loc, kind, msg);
                           },
                           detectEmpty: true,
                           languageLevel: cb.languageLevel,
                           filterAST: function (ast, source) {
                               return cb.filterAST(ast, source);
                           }
                       });
};

CodeBoot.prototype.filterAST = function (ast, source) {
    cb.lastAST = ast;
    cb.lastSource = source;
    cb.lastResult = null;
    cb.lastResultRepresentation = null;
    return ast;
};

var warnSemicolon = true;

CodeBoot.prototype.syntaxError = function (loc, kind, msg) {

    if (warnSemicolon && msg === "';' missing after this token") {
        cb.displayError(loc, "syntax error", msg);
        throw false;
    }

    if (kind !== "warning") {
        cb.displayError(loc, kind, msg);
        throw false;
    }
};

CodeBoot.prototype.displayError = function (loc, kind, msg) {
    var locText = "";
    if (cb.options.showLineNumbers && loc.container.toString() != "<REPL>") {
        locText = loc.toString("simple") + ": ";
    }
    cb.show_error(loc);
    cb.transcript.addLine(locText + ((kind === null) ? "" : kind + " -- ") + msg, "error-message");
};

CodeBoot.prototype.resetREPL = function () {
    set_prompt(cb.replInput);
    cb.replInput.refresh();
    //TODO: interferes
    //cb.replInput.focus();
};

CodeBoot.prototype.reset = function () {
    cb.stop(null);
    cb.resetREPL();
    cb.transcript.clear();
}

CodeBoot.prototype.undo = function (cm) {
    cm.undo();
};

CodeBoot.prototype.redo = function (cm) {
    cm.redo();
};

cb.initProgramState();
