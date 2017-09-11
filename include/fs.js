/* ----- UI helpers ----- */

var NAVBAR_HEIGHT = 40;
var EDITOR_SPACING = 20;

function makeCloseButton() {
    return $("<button/>").addClass("close").append("&times;");
}

function makeMenuSeparator() {
    return $('<li class="divider"></li>');
}

CodeBoot.prototype.scrollTo = function (elementOrSelector) {
    var elementOffset = $(elementOrSelector).position().top; // - NAVBAR_HEIGHT - EDITOR_SPACING;
    $('#cb-editors').animate({scrollTop: elementOffset}, 400);
};

CodeBoot.prototype.getShortURL = function (longUrl) {
    var shortURL;
    $.ajax({
        url: "urlshortener.cgi",
        type: "POST",
        data: {longUrl: longUrl},
        dataType: "json",
        async: false,
        success: function (data) {
	    shortURL = data.id;
        }
    });
    return shortURL;
};

function makeToolbar() {
    var $toolbar = $('<div class="btn-toolbar pull-right"/>');

    return $toolbar;
}

function makeTBGroup() {
    return $('<div class="btn-group"/>');
}

function makeTBButton($contents, props) {
    var $btn = $('<button class="btn"/>');

    for (var key in props) {
        $btn.attr(key, props[key]);
    }

    if ($contents) {
        $btn.append($contents);
    }

    return $btn;
}

function makeDropdown($contents, populateFn) {
    var $group = $('<div class="btn-group"/>');
    var $dropdownBtn = $('<a class="btn dropdown-toggle" data-toggle="dropdown" href="#"/>');
    $dropdownBtn.append($contents);
    $dropdownBtn.append(document.createTextNode(" "));
    $dropdownBtn.append($('<span class="caret"></span>'));

    var $dropdownMenu = $('<ul class="dropdown-menu"/>');
    if (populateFn) populateFn($dropdownMenu);

    $group.append($dropdownBtn);
    $group.append($dropdownMenu);

    return $group;
}

function makeSplitDropdown($contents, populateFn) {
	var $group = $('<div class="btn-group"/>');

	var $btn = $('<button class="btn"/>').appendTo($group);

	$('<a class="btn dropdown-toggle" data-toggle="dropdown"/>')
		.append($('<span class="caret"/>'))
		.appendTo($group);

	var $dropdownMenu = $('<ul class="dropdown-menu"/>').appendTo($group);

    if (typeof $contents === "function") {
		if (populateFn === undefined) {
			$contents($btn, $dropdownMenu);
		} else {
			$contents($btn);
		}
	} else {
		$btn.append($contents);
	}

	if (populateFn) populateFn($dropdownMenu);

    return $group;
}

function makeDropdownItem($contents) {
	var $link = $('<a href="#"/>');
	var $item = $('<li/>').append($link);
	if (typeof $contents === "function") {
		$contents($link);
	} else {
		$link.append($contents);
	}

	return $item;
}

/* ----- Internal file system ----- */

var BUILTIN_FILES = {
        'sample/hello.js' : '// This program prints a famous greeting\n' +
                            '\n' +
                            'print("Hello, world!\\n");\n',
        'sample/fact.js'  : '// This program prints the factorial of 5\n' +
                            '\n' +
                            'var fact = function (n) {\n' +
                            '    if (n <= 1) {\n' +
                            '        return 1;\n' +
                            '    } else {\n' +
                            '        return n * fact(n-1);\n' +
                            '    }\n' +
                            '};\n' +
                            '\n' +
                            'print(fact(5));\n',
        'sample/sqrt2.js' : '// This program computes the square root of 2 without using Math.sqrt\n' +
                            '\n' +
                            'var n = 2;\n' +
                            'var a = n; // approximation of sqrt(n)\n' +
                            '\n' +
                            'do {\n' +
                            '    a = (a + n/a) / 2;\n' +
                            '} while (a != (a + n/a) / 2);\n' +
                            '\n' +
                            'print(a);\n',
};

var NEW_FILE_DEFAULT_CONTENT = "// Enter JavaScript code here";

function CBFile(filename, content, opts) {
    this.filename = filename;
    this.content = (content !== (void 0)) ? content : NEW_FILE_DEFAULT_CONTENT;
    this.cursor = null;
    this.stamp = 0;
    this.editor = undefined;

    if (opts) {
        for (var prop in opts) {
            this[prop] = opts[prop];
        }
    }
}

CBFile.prototype.getContent = function () {
    if (this.editor) {
        return this.editor.getValue();
    }

    return this.content;
};

CBFile.prototype.setContent = function (content) {
    if (this.editor) {
        this.content = content;
        this.editor.setValue(this.content);
    }
};

CBFile.prototype.save = function () {
    if (this.editor) {
        var old_content = this.content;
        var new_content = this.editor.getValue();
        if (new_content !== old_content) {
            this.content = new_content;
            this.stamp += 1;
        }
    }
};

CBFile.prototype.serialize = function () {
    var json = {
        filename: this.filename,
        content: this.getContent(),
        cursor: this.cursor === null ?
                {line: 0, ch: 0} :
                {line: this.cursor.line, ch: this.cursor.ch},
        stamp: this.stamp
    };
    return json;
};

CBFile.prototype.clone = function () {
    var other = new CBFile(this.filename, this.content);
    for (var prop in this) {
        if (this.hasOwnProperty(prop)) {
            other[prop] = this[prop];
        }
    }
    return other;
};

function CBFileManager() {
    this.clear();
}

CBFileManager.prototype.clear = function () {
    this.builtins = {};
    this.files = Object.create(this.builtins);
    this._loadBuiltins();
};

CBFileManager.prototype._loadBuiltins = function () {
    for (var filename in BUILTIN_FILES) {
        var f = new CBFile(filename, BUILTIN_FILES[filename]);
        this.builtins[filename] = f;
    };
};

CBFileManager.prototype._asFilename = function (fileOrFilename) {
    if (typeof fileOrFilename === "string") return fileOrFilename;
    return fileOrFilename.filename;
};

CBFileManager.prototype._asFile = function (fileOrFilename) {
    if (typeof fileOrFilename !== "string") return fileOrFilename;
    return this.getByName(fileOrFilename);
};

CBFileManager.prototype.isBuiltin = function (fileOrFilename) {
    var filename = this._asFilename(fileOrFilename);
    return this.builtins.hasOwnProperty(filename);
};

CBFileManager.prototype.addFile = function (f) {
    this.files[f.filename] = f;
};

CBFileManager.prototype.hasFile = function (fileOrFilename) {
    var filename = this._asFilename(fileOrFilename);
    return this.files.hasOwnProperty(filename) || this.builtins.hasOwnProperty(filename);
};

CBFileManager.prototype.getByName = function (filename) {
    if (!this.hasFile(filename)) {
        throw "File not found: '" + filename + "'";
    }
    var file = this.files[filename];
    if (!this.files.hasOwnProperty(filename)) {
        // This is a builtin file, make an editable copy
        file = file.clone();
        this.files[filename] = file;
    }
    return file;
};

CBFileManager.prototype.deleteFile = function (fileOrFilename) {
    var filename = this._asFilename(fileOrFilename);
    if (this.hasFile(filename)) {
        delete this.files[filename];
        return true;
    }

    return false;
};

CBFileManager.prototype.renameFile = function (fileOrFilename, newFilename) {
    if (this.hasFile(newFilename)) {
        throw "File already exists: " + newFilename;
    }
    var file = this._asFile(fileOrFilename);
    delete this.files[file.filename];
    file.filename = newFilename;
    this.addFile(file);
};

CBFileManager.prototype.getContent = function (fileOrFilename) {
    var file = this._asFile(fileOrFilename);
    return file.getContent();
};

CBFileManager.prototype.getEditor = function (fileOrFilename) {
    return this._asFile(fileOrFilename).editor;
};

CBFileManager.prototype.setContent = function (fileOrFilename, content) {
    var file = this._asFile(fileOrFilename);
    return file.setContent(content);
};

CBFileManager.prototype.each = function (callback, selector) {
    if (!selector) selector = function (f) { return true; };
    for (var filename in this.files) {
        if (!this.hasFile(filename)) continue; // Prune Object method name

        var file = this.getByName(filename);
        if (selector(file)) {
            callback(file);
        }
    }
};

CBFileManager.prototype.serialize = function () {
    var json = [];
    var self = this;
    var isUserFile = function (file) {
        return self.files.hasOwnProperty(file.filename);
    };

    this.each(function (file) {
        json.push(file.serialize());
    },
    isUserFile);

    return json;
};

CBFileManager.prototype.restore = function (json) {
    this.clear();
    for (var i = 0; i < json.length; i++) {
        var fileProps = json[i];
        var file = new CBFile(fileProps.filename, fileProps.content, fileProps);
        this.addFile(file);
    }
};

// ----------------------------------------------------------------------

CodeBoot.prototype.addFileToMenu = function (fileOrFilename) {
    var file = cb.fs._asFile(fileOrFilename);
    var filename = file.filename;

    var $file_item = $('<a class="dropdown-item file-item" href="#"/>');
    $file_item.attr("data-cb-filename", filename);
    $file_item.click(function () {
        cb.openFile(filename);
    });

    var $file_name = $('<div class="file-name"/>');
    $file_name.append(filename);

    $file_item.append($file_name);

    if (true || !cb.fs.isBuiltin(file)) {
        var $deleteButton = $('<button type="button" class="close delete-btn" data-dismiss="modal">&times;</button>');
        $file_item.append($deleteButton);
        $deleteButton.click(function (event) {
            var reallyDelete = confirm("Delete file '" + filename + "'? This cannot be undone.");
            if (reallyDelete) {
                cb.deleteFile(filename);
            } else {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    // Keep the menu sorted
    var $children = $("#file-list").children();
    for (var i = 0; i < $children.length; i++) {
        var $element = $($children.get(i));
        var element_filename = $element.attr('data-cb-filename');
        if (filename < element_filename) {
            $file_item.insertBefore($element);
            return;
        }
    }

    $("#file-list").append($file_item);
};

CodeBoot.prototype.rebuildFileMenu = function () {

    $("#file-list").empty();

    $("#file-list").append($('<a class="dropdown-item" href="#"><strong>New</strong></a>'));
    $("#file-list").append($('<div class="dropdown-divider"></div>'));

    cb.fs.each(function (file) {
        cb.addFileToMenu(file);
    });
};

CodeBoot.prototype.initFS = function () {
    cb.fs = new CBFileManager();
    cb.rebuildFileMenu();
};

CodeBoot.prototype.generateUniqueFilename = function () {
    var prefix = "script";
    for (var index = 1; ; index++) {
        var candidateName = prefix + index;
        if (!cb.fs.hasFile(candidateName)) {
            return candidateName;
        }
    }
};

CodeBoot.prototype.getContainerFor = function (fileOrFilename) {
    var filename = cb.fs._asFilename(fileOrFilename);
    return $('.file-editor[data-cb-filename="' + filename + '"]').get(0);
};

CodeBoot.prototype.openFile = function (filename) {
    var container = cb.getContainerFor(filename);
    if (!container) {
        cb.newTab(filename);
    }
};

CodeBoot.prototype.closeFile = function (fileOrFilename) {

    var file = cb.fs._asFile(fileOrFilename);

    file.save();

    var $container = $(cb.getContainerFor(file));

    if ($(".exec-point-code", $container).length > 0) {
	// Current file editor contains some highlighted code
	cb.hideExecPoint();
    }

    if (cb.lastFocusedEditor === file.editor)
        cb.focusDestroyed();

    file.editor = null;

    $container.remove();

    cb.updatePopupPos();
};

CodeBoot.prototype.closeAll = function () {
    $("[data-cb-filename]").each(function () {
        var filename = $(this).attr('data-cb-filename');
        cb.closeFile(filename);
    });
};

CodeBoot.prototype.deleteFile = function (filename) {
    $('[data-cb-filename="' + filename + '"]').remove();
    cb.fs.deleteFile(filename);
};

function basename(filename) {
    return filename.replace(/\\/g,'/').replace( /.*\//, '');
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

//TODO: implement some other way
cb.makeLHSEditorToolbar = function (file) {
    var $toolbar = makeToolbar();
    var $group = makeTBGroup();
    $group.appendTo($toolbar);

    var $saveButton = makeTBButton($('<i class="icon-download-alt"/>'), {"title" : "Download"});
    $saveButton.click(function () {
        var name = basename(file.filename);
        if (!endsWith(name, ".js")) {
            name = name + ".js";
        }
        saveAs(cb.fs.getContent(file), name);
    });
    $saveButton.appendTo($group);

    if (typeof FileReader !== "undefined") {
        // FileReader supported, add an open button
        var $openButton = makeTBButton($('<i class="icon-folder-open"/>'), {"title" : "Upload"});
        $openButton.click(function () {
            $("#openFileModal").attr("data-cb-filename", file.filename).modal('show');
        });
        $openButton.appendTo($group);
    }

    var $btnShare = makeDropdown($('<i class="icon-share"/>'), function ($menu) {
		$menu.append(makeDropdownItem("Email public link").click(function () {
			var content = cb.fs.getContent(file);
			var url = editor_URL(content, file.filename);
			var shortURL = cb.getShortURL(url);
            if (!shortURL) {
                alert("Failed to generate short URL");
                return;
            }

			var subject = encodeURIComponent("codeBoot link");
			var body = encodeURIComponent(shortURL);
		    var href = "mailto:?subject=" + subject + "&body=" + body;
			var w = window.open(href, "_blank");
			if (w) w.close();
		}));

		$menu.append(makeDropdownItem("Generate public link").click(function () {
			var content = cb.fs.getContent(file);
			var url = editor_URL(content, file.filename);
			var shortURL = cb.getShortURL(url);
			if (shortURL) {
				$("#urlModal-body").text(shortURL);
                $("#urlModal-clippy").empty().clippy({clippy_path: "clippy.swf", text: shortURL});
				$("#urlModal").modal('show');
			} else {
			    alert("Failed to generate short URL");
			}
		}));

		$menu.append(makeDropdownItem("Generate private link").click(function () {
			var content = cb.fs.getContent(file);
			var url = editor_URL(content, file.filename);
			$("#urlModal-body").text(url);
            $("#urlModal-clippy").empty().clippy({clippy_path: "clippy.swf", text: url});
			$("#urlModal").modal('show');
		}));
    }, {"title" : "Share contents"});

    $btnShare.appendTo($group);

    return $toolbar;
};

var SAVE_DELAY = 300; // length of window (in ms) during which changes will be buffered

CodeBoot.prototype.createFileEditor = function (node, file) {

    var editor = cb.createCodeEditor(node, file);

    file.editor = editor;

    editor.setValue(file.content);

    if (file.cursor) {
        editor.setCursor(file.cursor);
    }

    var saveHandler = function () {
        file.save();
        editor.currentSaveTimeout = (void 0);
    };

    editor.on("change", function (cm, change) {
        if (editor.currentSaveTimeout !== (void 0)) {
            // extend the window
            clearTimeout(editor.currentSaveTimeout);
        }
        editor.currentSaveTimeout = setTimeout(saveHandler, SAVE_DELAY);
    });

    editor.on("cursorActivity", function () {
        file.cursor = editor.getCursor();
    });

    return editor;
};

function cb_internal_onTabDblClick(event) {
    var $element = $(event.target);

    var oldFilename = $element.text();
    var $inputBox = $('<input type="text" class="rename-box span2"/>');
    $inputBox.val(oldFilename);
    $element.empty();
    $element.append($inputBox);

    var resetTab = function () {
        $inputBox.remove();
        $element.text(oldFilename);
    };

    $inputBox.focusout(resetTab);

    $inputBox.keydown(function (event) {
        if (event.keyCode == 13) {
            // Enter pressed, perform renaming
            var newFilename = $inputBox.val();
            if (cb.fs.hasFile(newFilename)) {
                alert("Filename already in use");
                resetTab();
                return;
            }

            cb.fs.renameFile(oldFilename, newFilename);
            $inputBox.remove();
            $element.text(newFilename);
            $('[data-cb-filename="' + oldFilename + '"]').attr("data-cb-filename", newFilename);

            cb.rebuildFileMenu(); // TODO: inefficient
        } else if (event.keyCode == 27) {
            // Escape pressed, reset
            resetTab();
        }
    });

    $inputBox.focus();
}

CodeBoot.prototype.newTab = function (fileOrFilename) {

    /*
        <div class="file-editor">
          <ul class="nav nav-tabs">
            <li class="nav-item">
              <a class="nav-link active" href="#" data-toggle="tab">Untitled.js<button class="close">&times;</button></a>
            </li>
          </ul>
          <div class="file-editor-content"></div>
        </div>
    */

    var file = cb.fs._asFile(fileOrFilename);
    var filename = file.filename;

    var fileEditor = $('<div class="file-editor"/>');
    fileEditor.attr("data-cb-filename", filename);

    var nav = $('<ul class="nav nav-tabs"/>');

    var $closeButton = makeCloseButton();
    $closeButton.click(function () {
        cb.closeFile(file);
    });

    var $tab_text_container = $('<span class="tab-label"/>').text(filename);
    var $tab_label = $('<span/>').append($tab_text_container).append($closeButton);

    nav.append($('<li class="nav-link active"/>').append($tab_label));
    fileEditor.append(nav);

    // Support renaming
    $tab_text_container.dblclick(cb_internal_onTabDblClick);

    var content = $('<div class="tab-content file-editor-content"/>');
    fileEditor.append(content);

    $('#cb-editors').prepend(fileEditor);

    var editor = cb.createFileEditor(content.get(0), file);

    cb.scrollTo(fileEditor.get(0));

    if (false) { //TODO: reenable
    // Make editor resizable
    $(".CodeMirror", fileEditor).resizable({
          handles: "s",
          minHeight: 100,
          stop: function() {
            $(".CodeMirror", fileEditor).css("width", "auto");
            editor.refresh();
          },
          resize: function() {
            $(".CodeMirror-scroll", fileEditor).height($(this).height());
            $(".CodeMirror-scroll", fileEditor).width($(this).width());
            editor.refresh();
          }
    });
    }

    //editor.setCursor(editor.lineCount(), 0);

    editor.focus();

    cb.updatePopupPos();
};

CodeBoot.prototype.newFile = function () {
    var filename = cb.generateUniqueFilename();
    var file = new CBFile(filename);
    cb.fs.addFile(file);

    cb.addFileToMenu(file);
    cb.newTab(file);
    return filename;
};

CodeBoot.prototype.openFileExistingOrNew = function (filename) {

    if (cb.fs.hasFile(filename)) {
        cb.openFile(filename);
        return true;
    } else {
        var file = new CBFile(filename);
        cb.fs.addFile(file);

        cb.addFileToMenu(file);
        cb.newTab(file);
        return false;
    }
};
