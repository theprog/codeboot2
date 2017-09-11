/*---------------------------------------------------------------------------*/

/* Get student and document information from Studium */

function stringToDict(str, sep) {

    var cookies = str.split(sep);

    result = {};

    for (i=cookies.length-1; i>=0; i--) {
        var x = cookies[i].split('=');
        result[x[0]] = x[1];
    }

    return result;
}

function getDocumentTitle() {
    /* Works when running in Studium inline page */
    return window.parent.document.title;
}

function getStudentName() {
    /* Works when running in Studium inline page */
    var doc = window.parent.document;
    var logininfo = doc.getElementsByClassName('logininfo');
    if (logininfo.length >= 1) {
        var info = logininfo[0];
        var link = info.querySelector('a');
        if (link) {
            return link.innerText;
        }
    }
    return 'anonyme';
}

function getContextInfo() {
    /* Works when running in Studium inline page */
    var id = null;
    var lastAccess = null;
    var docCookie = document.cookie;
    if (typeof docCookie === 'string') {
        var cookies = stringToDict(docCookie, '; ');
        var session = cookies['UM_SESSION'];
        if (typeof session === 'string') {
            var UM_SESSION = stringToDict(decodeURIComponent(session), '|');
            id = UM_SESSION['id'];
            lastAccess = UM_SESSION['dernierAcces'];
        }
    }
    return { name: getStudentName(),
             id: id,
             lastAccess: lastAccess,
             title: getDocumentTitle()
           };
}

/*---------------------------------------------------------------------------*/

var quizHTML = '<div id="cb-quiz" class="d-flex justify-content-between">\
<div><div><h2 id="cb-quiz-title"></h2></div><div><h5><span id="cb-quiz-student-name"><span></h5></div></div>\
  <div id="cb-quiz-question-choice" class="btn-group" data-toggle="buttons">\
\
  </div>\
</div>\
<div class="row align-items-center">\
<div class="col-sm-8"><p id="cb-quiz-current-question"></p></div>\
<form class="col-sm-4" id="cb-quiz-form" action="" method="">\
  <label>Réponse:<br />\
    <div class="input-group">\
      <input id="cb-quiz-input" type="text" class="form-control" />\
      <span class="input-group-btn">\
        <button class="btn btn-success" type="submit">Soumettre</button>\
      </span>\
      <span class="input-group-btn">\
        <button id="cb-quiz-pass" class="btn btn-secondary" type="button">Passer</button>\
      </span>\
    </div>\
  </label>\
</form>\
</div>';

var quizMenuHTML = '\
      <span id="cb-menu-quiz" class="dropdown">\
          <button class="btn btn-secondary" type="button" id="cb-menu-quiz-btn" data-toggle="dropdown">Quiz</button>\
          <div id="cb-quiz-list" class="dropdown-menu">\
          </div>\
      </span>\
';

var questionHTML = '<label class="btn btn-secondary"><input type="radio" name="cb-current-quiz-question"><div class="title h4"></div><div class="state h2">&nbsp;</div></label>'

CodeBoot.prototype.getStudentName = function () {
    return cb.contextInfo.name;
};


CodeBoot.prototype.currentQuiz = "exercice1";
CodeBoot.prototype.quizQuestions = [];
CodeBoot.prototype.quizAnswers = [];
CodeBoot.prototype.currentQuestion = 0;


CodeBoot.prototype.loadCurrentQuestion = function() {
    var q = cb.quizQuestions[cb.currentQuestion];
    $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/ask.cgi', {
        quiz: cb.currentQuiz,
        q: q,
        student: cb.getStudentName()
    }, function(data) {
        $('#cb-quiz-current-question').text(q + ': ' + data);
    }, "text");

    $('#cb-quiz-input').val(cb.quizAnswers[cb.currentQuestion] || '');
};

CodeBoot.prototype.loadQuestion = function(n) {
    $('#cb-quiz-current-question').fadeOut(500, function() {
        cb.currentQuestion = n;

        $('#cb-quiz-input').removeClass('is-valid').removeClass('is-invalid');

        cb.loadCurrentQuestion();
        $(this).fadeIn('fast');
    });
};

CodeBoot.prototype.nextQuestion = function() {
    var n = cb.quizAnswers.indexOf(false, (cb.currentQuestion + 1) % cb.quizAnswers.length);

    // Search from the start
    if(n === -1)
        n = cb.quizAnswers.indexOf(false, (cb.currentQuestion + 1) % cb.quizAnswers.length);

    if(n === -1) {
        // All questions have been answered
        $('#cb-quiz-current-question').text("\u2713 Toutes les questions sont complétées");
        return;
    }

    cb.loadQuestion(n);

    $('#cb-quiz-question-choice .active').removeClass('active');
    $('#cb-question-' + n).addClass('active');
};

CodeBoot.prototype.submitAnswer = function() {
    var q = cb.quizQuestions[cb.currentQuestion];

    $('#cb-quiz-input').focus();

    $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/valid.cgi', {
        quiz: cb.currentQuiz,
        q: q,
        student: cb.getStudentName(),
        answer: $('#cb-quiz-input').val()
    }, function(data) {
        var ok = data.trim() === '1';
        if(ok) {
            cb.quizAnswers[cb.currentQuestion] = $('#cb-quiz-input').val();

            $('.state', '#cb-question-' + cb.currentQuestion).text('\u2713');

            $('#cb-quiz-input').removeClass('is-invalid')
                               .addClass('is-valid')
                               .val('');

            cb.nextQuestion();
        } else {
            console.log(data);
            $('#cb-quiz-input').removeClass('is-invalid').addClass('is-invalid');
        }
    }, "text");
};

CodeBoot.prototype.setupQuiz = function (name) {

    // Setup HTML
    var studentName = cb.getStudentName();

    cb.currentQuiz = name;

    var quiz = $(quizHTML);

    $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/quiz/' + name + '/title', {}, function(data) {
        $('#cb-quiz-title', quiz).text(data);
    });

    // Load questions
    $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/questions.cgi', {
        quiz: name
    }, function(data) {
        cb.quizQuestions = data.trim().split('\n');

        cb.quizAnswers = cb.quizQuestions.map(function() { return false });

        cb.quizQuestions.forEach(function(question, i) {
            var q = $(questionHTML);

            q.attr('id', 'cb-question-' + i);

            $('input', q).attr('value', i);

            $('.title', q).text(question);

            if(i === 0) {
                $('input', q).prop('checked', true);
                q.addClass('active');
            }

            $('#cb-quiz-question-choice', quiz).append(q);
        })

        $(document).on('change', 'input:radio[name=cb-current-quiz-question]', function (event) {
            cb.loadQuestion(+$(this).val());
        });

        $("body").attr("data-cb-theme", "quiz");

        $("#cb-navbar-header").html(quiz);

        $("#cb-quiz-student-name").text("pour " + studentName);

        $('#cb-quiz-form').submit(function() {
            cb.submitAnswer();
            return false;
        });

        $('#cb-quiz-pass').click(function() {
            cb.nextQuestion();
        });
        // Load the first question
        cb.loadCurrentQuestion();
    });
};


CodeBoot.prototype.closeQuiz = function () {
    $("#cb-navbar-header").html('');
    $("body").attr("data-cb-theme", "");
};

CodeBoot.prototype.installQuiz = function() {

    cb.contextInfo = getContextInfo();

    // Add quiz menu
    var quizMenu = document.createElement('span');
    quizMenu.innerHTML = quizMenuHTML;
    document.getElementById('cb-menu').appendChild(quizMenu); 

    // Load questions
    $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/list.cgi', {}, function(data) {
        data.trim().split('\n').forEach(function(name) {
            var element = $('<a class="dropdown-item" href="#"></a>');

            element.click(function() {
                cb.setupQuiz(name);
            });

            $.get('http://www-labs.iro.umontreal.ca/~codeboot/codeboot2/quiz/quiz/' + name + '/title', {}, function(data) {
                element.text(data);
            });

            $('#cb-quiz-list').append(element);
        });
    });
};

cb.installQuiz();
