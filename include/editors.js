CodeBoot.prototype.initEditor = function (editor, node, history, fileEditor) {
    editor.cb = {};
    editor.cb.node = node;
    editor.cb.history = history;
    editor.cb.fileEditor = fileEditor;
};

CodeBoot.prototype.trackEditorFocus = function (editor, focus) {
    if (focus) {
        cb.lastFocusedEditor = editor;
    }
};

CodeBoot.prototype.initEditorFocusHandling = function (editor) {

    editor.on("focus", function (cm, event) {
        //$("#menu-settings").text("focus");
        //setTimeout(function () { $("#menu-settings").text("xxx"); }, 1000);
        cb.trackEditorFocus(editor, true);
    });

    editor.on("blur", function (cm, event) {
        //$("#menu-settings").text("blur");
        //setTimeout(function () { $("#menu-settings").text("xxx"); }, 1000);
        cb.trackEditorFocus(editor, false);
    });

};

CodeBoot.prototype.initEditorScrollHandling = function (editor) {

    editor.on("scroll", function (cm) {
        cb.updatePopupPos();
    });

};

CodeBoot.prototype.createCodeEditor = function (node, fileEditor) {

    var options = {
        value: "",
        mode:  "javascript",
        indentUnit: 4,       // Indent with 4 spaces
        lineNumbers:  cb.options.showLineNumbers,   // Show line numbers
        matchBrackets: true,
        extraKeys: {

            //TODO: reenable
            //"Ctrl-/" : function (cm) {
            //    var tok = cm.getTokenAt(cm.getCursor(false));
            //    var isComment = tok.className === "comment";
            //    cm.commentRange(!isComment, cm.getCursor(true), cm.getCursor(false));
            // },

            "F5" : function () {
                cb.eventStep();
            },

            "F6" : function () {
                cb.eventAnimate();
            },

            "F7" : function () {
                cb.eventEval();
            }
        },

        onDragEvent: function(cm, event) {
            if (event.type === "drop") {
                event.stopPropagation();
                event.preventDefault();
                var dt = event.dataTransfer;
                var files = dt.files;
                cb.loadFile(cm, files[0]);
                return true;
            } else if (event.type === "dragover") {
                event.stopPropagation();
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
            }
        }
    };

    var editor = CodeMirror(node, options);

    cb.initEditor(editor, node, null, fileEditor);
    cb.initEditorFocusHandling(editor);
    cb.initEditorScrollHandling(editor);

    return editor;
};

cb.loadFile = function (cm, f) {
    if (!cm) return;

    cb_internal_readTextFile(f, function(contents) {
        cm.setValue(contents);
    });
};

function cb_internal_readTextFile(f, callback) {
    if (typeof FileReader === "undefined") {
        cb.reportError("File is reader not supported by the browser");
        return;
    }

    var reader = new FileReader();
    reader.onerror = function (e) {
        cb.reportError("Failed to read file");
    };
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.readAsText(f);
}

// ================================================================================
//                                       REPL
// ================================================================================

function REPLHistoryManager(cm) {
    this.editor = cm;
    this.history = [];
    this.pos = 0;
    this.limit = 100; // TODO: make this configurable
    this.currentLine = undefined;
}

REPLHistoryManager.prototype.setEditorValue = function (v) {
    set_prompt(this.editor, true, v);
    this.editor.refresh();
    CodeMirror.commands.goLineEnd(this.editor);
};

REPLHistoryManager.prototype.resetPos = function () {
    this.pos = this.history.length;
    this.currentLine = undefined;
};

REPLHistoryManager.prototype.add = function (line) {
    this.history.push(line);
    while (this.history.length > this.limit) {
        this.history.shift();
    }
    this.resetPos();
};

REPLHistoryManager.prototype.previous = function () {
    var index = this.pos - 1;
    if (this.pos === this.history.length) {
        // Remember the current line to be able to restore it later, if needed
        this.currentLine = this.editor.getValue();
    }
    if (index >= 0) {
        // Restore previous history item
        this.setEditorValue(this.history[index]);
        this.pos = index;
    }
};

REPLHistoryManager.prototype.serializeState = function () {
    return {
        history: this.history
    };
};

REPLHistoryManager.prototype.restoreState = function (state) {
    this.history = state.history;
    this.resetPos();
};


REPLHistoryManager.prototype.next = function () {
    var index = this.pos + 1;
    if (index < this.history.length) {
        this.setEditorValue(this.history[index]);
        this.pos = index;
    }  else if (index === this.history.length) {
        this.setEditorValue(this.currentLine);
        this.resetPos();
    }
};

CodeBoot.prototype.createREPLTranscript = function () {

    var options = {
        mode:  "javascript",
        indentUnit: 4,         // Indent by 4 spaces
        lineNumbers:  false,   // Show line numbers
        matchBrackets: false,
        gutters: ["CodeMirror-linenumbers", "cb-prompt"],
        readOnly: "nocursor",
        lineWrapping: true
    };

    var node = document.getElementById("repl-transcript");

    var editor = CodeMirror(node, options);

    cb.initEditor(editor, node, null, null);
    cb.initEditorScrollHandling(editor);

    return new CBTranscript(editor);
};

function CBTranscript(editor) {
    this.editor = editor;
    this.is_empty = true;
    this.widgets = [];
}

CBTranscript.prototype.onTranscriptChanged = function () {
    // TODO: make this configurable
    var $console = $("#console");
    var top = $console.offset().top;
    var height = $console.height();
    $("#editors").css("top", top + height);
}

CBTranscript.prototype.clear = function () {
    this.show(); // this seems to avoid initialization problems
    for (var i = 0; i < this.widgets.length; i++) {
        this.editor.removeLineWidget(this.widgets[i]);
    }
    this.editor.setValue("");
    this.editor.refresh();
    this.is_empty = true;
    this.hide();
};

CBTranscript.prototype.show = function () {
    $("#repl-transcript").show();
    $("body").attr("data-has-transcript", "true");
    this.onTranscriptChanged();
};

CBTranscript.prototype.hide = function () {
    $("body").attr("data-has-transcript", "false");
    $("#repl-transcript").hide();
    this.onTranscriptChanged();
};

CBTranscript.prototype.addTextLine = function (text, cssClass) {
    var editor = this.editor;
    text = removeTrailingNewline(text);
    // CodeMirror needs to be visible to the updates to the gutter to work...
    if (this.is_empty) this.show();

    var line;
    if (this.is_empty) {
        line = 0;
    } else {
        text = "\n" + text;
        line = editor.lineCount();
    }

    editor.replaceRange(text, { line: line, ch: 0 });
    editor.markText({ line: line, ch: 0 }, { line: line+1, ch: 0 }, {"className" : cssClass});

    if (editor.lineInfo(line).gutterMarkers) {
        // Oops, CodeMirror moved the gutter down instead of appending a blank line
        // We'll set the gutter back on the previous line (ugly!)
        line -= 1;
    }
    if (cssClass === "transcript-input")
        editor.setGutterMarker(line, "cb-prompt", document.createTextNode(">"));
    this.is_empty = false;

    cb.scrollToEnd(this.editor);

    this.onTranscriptChanged();
};

CBTranscript.prototype.addLineWidget = function (textOrNode, cssClass) {
    // CodeMirror needs to be visible to the updates to the gutter to work...
    if (this.is_empty) this.show();

    var widget;
    if (typeof textOrNode === "string") {
        var text = removeTrailingNewline(textOrNode);
        var $widget = $("<div/>");
        if (cssClass) $widget.addClass(cssClass);
        $widget.text(text);
        widget = $widget.get(0);
    } else {
        widget = textOrNode;
    }
    var w = this.editor.addLineWidget(this.editor.lineCount() - 1, widget);
    this.widgets.push(w);

    cb.scrollToEnd(this.editor);

    this.onTranscriptChanged();
};

CBTranscript.prototype.addLine = function (text, cssClass) {
    var line;

    if (cssClass === "transcript-input") {
        this.addTextLine(text, cssClass);
    } else {
        this.addLineWidget(text, cssClass);
    }
};

var default_prompt = ">";

var set_prompt = function (cm, prompt, str) {

   if (str === void 0) str = "";

   set_input(cm, str);

   if (prompt === void 0) prompt = true;

   if (prompt) {
       cm.setGutterMarker(0, "cb-prompt", document.createTextNode(default_prompt));
       $("#repl").removeClass("busy");
   } else {
       cm.setGutterMarker(0, "cb-prompt", null);
       $("#repl").addClass("busy");
   }
};

var set_input = function (cm, str) {
    cm.setValue(str);
    cm.setCursor(0, str.length);
};

CodeBoot.prototype.createREPLInput = function () {

    var options = {
        mode:  "javascript",
        indentUnit: 4,         // Indent by 4 spaces
        lineNumbers:  false,   // Show line numbers
        matchBrackets: true,
        gutters: ["CodeMirror-linenumbers", "cb-prompt"],
        extraKeys: {
            "Ctrl-C": function (cm) { cb.stop(); },
            "Ctrl-L": function (cm) { cb.reset(); cm.cb.history.resetPos(); },
            "Shift-Enter": function (cm) { cb.execStep(); },
            "Enter": function (cm) { cb.execStepOrEval(); },
            "Up": function (cm) {
                cm.cb.history.previous();
                return true;
            },
            "Down": function (cm) {
                cm.cb.history.next();
                return true;
            },
            "F5" : function (cm) { cb.execStep(); },
            "F6" : function (cm) { cb.execAnimate(); },
            "F7" : function (cm) { cb.execEval(); },
            "F8" : function (cm) { cb.execStop(); },
        },
        onKeyEvent: function (cm, event) {
            if (cm.busy) {
                event.stopPropagation();
                event.preventDefault();
            }
        },
        lineWrapping: true
    };

    var node = document.getElementById("repl-input");

    var editor = CodeMirror(node, options);

    cb.initEditor(editor, node, new REPLHistoryManager(editor), null);
    cb.initEditorFocusHandling(editor);

    editor.busy = false;
    editor.focus();
    set_prompt(editor);

    return editor;
};
