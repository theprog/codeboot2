var quizHTML = '<div id="quiz" class="d-flex justify-content-between">\
<div><div><h2 id="quiz-title"></h2></div><div><h5><span id="quiz-student-name"><span></h5></div></div>\
  <div id="quiz-question-choice" class="btn-group" data-toggle="buttons">\
\
  </div>\
</div>\
<div class="row align-items-center">\
<div class="col-sm-8"><p id="quiz-current-question"></p></div>\
<form class="col-sm-4" id="quiz-form" action="" method="">\
  <label>Réponse:<br />\
    <div class="input-group">\
      <input id="quiz-input" type="text" class="form-control" />\
      <span class="input-group-btn">\
        <button class="btn btn-success" type="submit">Soumettre</button>\
      </span>\
      <span class="input-group-btn">\
        <button id="quiz-pass" class="btn btn-secondary" type="button">Passer</button>\
      </span>\
    </div>\
  </label>\
</form>\
</div>';

var questionHTML = '<label class="btn btn-secondary"><input type="radio" name="current-quiz-question"><div class="title h4"></div><div class="state h2">&nbsp;</div></label>'

CodeBoot.prototype.getStudentName = function () {
    return "Annie Brocolli";
};


CodeBoot.prototype.currentQuiz = "exercice1";
CodeBoot.prototype.quizQuestions = [];
CodeBoot.prototype.quizAnswers = [];
CodeBoot.prototype.currentQuestion = 0;


CodeBoot.prototype.loadCurrentQuestion = function() {
    var q = cb.quizQuestions[cb.currentQuestion];
    $.get('quiz/ask.cgi', {
        quiz: cb.currentQuiz,
        q: q,
        student: cb.getStudentName()
    }, function(data) {
        $('#quiz-current-question').text(q + ': ' + data);
    }, "text");

    $('#quiz-input').val(cb.quizAnswers[cb.currentQuestion] || '');
};

CodeBoot.prototype.loadQuestion = function(n) {
    $('#quiz-current-question').fadeOut(500, function() {
        cb.currentQuestion = n;

        $('#quiz-input').removeClass('is-valid').removeClass('is-invalid');

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
        $('#quiz-current-question').text("\u2713 Toutes les questions sont complétées");
        return;
    }

    cb.loadQuestion(n);

    $('#quiz-question-choice .active').removeClass('active');
    $('#question-' + n).addClass('active');
};

CodeBoot.prototype.submitAnswer = function() {
    var q = cb.quizQuestions[cb.currentQuestion];

    $('#quiz-input').focus();

    $.get('quiz/valid.cgi', {
        quiz: cb.currentQuiz,
        q: q,
        student: cb.getStudentName(),
        answer: $('#quiz-input').val()
    }, function(data) {
        var ok = data.trim() === '1';
        if(ok) {
            cb.quizAnswers[cb.currentQuestion] = $('#quiz-input').val();

            $('.state', '#question-' + cb.currentQuestion).text('\u2713');

            $('#quiz-input').removeClass('is-invalid')
                            .addClass('is-valid')
                            .val('');

            cb.nextQuestion();
        } else {
            console.log(data);
            $('#quiz-input').removeClass('is-invalid').addClass('is-invalid');
        }
    }, "text");
};

CodeBoot.prototype.setupQuiz = function (name) {

    // Setup HTML
    var studentName = cb.getStudentName();

    cb.currentQuiz = name;

    var quiz = $(quizHTML);

    $.get('quiz/quiz/' + name + '/title', {}, function(data) {
        $('#quiz-title', quiz).text(data);
    });

    // Load questions
    $.get('quiz/questions.cgi', {
        quiz: name
    }, function(data) {
        cb.quizQuestions = data.trim().split('\n');

        cb.quizAnswers = cb.quizQuestions.map(function() { return false });

        cb.quizQuestions.forEach(function(question, i) {
            var q = $(questionHTML);

            q.attr('id', 'question-' + i);

            $('input', q).attr('value', i);

            $('.title', q).text(question);

            if(i === 0) {
                $('input', q).prop('checked', true);
                q.addClass('active');
            }

            $('#quiz-question-choice', quiz).append(q);
        })

        $(document).on('change', 'input:radio[name=current-quiz-question]', function (event) {
            cb.loadQuestion(+$(this).val());
        });

        $("body").attr("data-theme", "quiz");

        $("#navbar-header").html(quiz);

        $("#quiz-student-name").text("pour " + studentName);

        $('#quiz-form').submit(function() {
            cb.submitAnswer();
            return false;
        });

        $('#quiz-pass').click(function() {
            cb.nextQuestion();
        });
        // Load the first question
        cb.loadCurrentQuestion();
    });
};


CodeBoot.prototype.closeQuiz = function () {
    $("#navbar-header").html('');
    $("body").attr("data-theme", "");
};

CodeBoot.prototype.installQuiz = function() {
    // Load questions
    $.get('quiz/list.cgi', {}, function(data) {
        data.trim().split('\n').forEach(function(name) {
            var element = $('<a class="dropdown-item" href="#"></a>');

            element.click(function() {
                cb.setupQuiz(name);
            });

            $.get('quiz/quiz/' + name + '/title', {}, function(data) {
                element.text(data);
            });

            $('#quiz-list').append(element);
        });
    });
};

cb.installQuiz();
