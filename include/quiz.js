var quizHTML = '\
\
<div class="d-flex justify-content-between">\
  <div><div><h2>Exercices not&eacute;s #1</h2></div><div><h5><span id="quiz-student-name"><span></h5></div></div>\
  <div class="btn-group" data-toggle="buttons">\
    <label class="btn btn-secondary">\
      <input type="radio" name="options" id="q1" checked>\
      <div class="h6">Question 1</div><div id="q1-state" class="h2">&nbsp;</div>\
    </label>\
    <label class="btn btn-secondary">\
      <input type="radio" name="options" id="q2">\
      <div class="h6">Question 2</div><div id="q2-state" class="h2">&nbsp;</div>\
    </label>\
    <label class="btn btn-secondary">\
      <input type="radio" name="options" id="q3">\
      <div class="h6">Question 3</div><div id="q3-state" class="h2">&#x2714;</div>\
    </label>\
    <label class="btn btn-secondary">\
      <input type="radio" name="options" id="q4">\
      <div class="h6">Question 4</div><div id="q4-state" class="h2">&#x2714;</div>\
    </label>\
    <label class="btn btn-secondary">\
      <input type="radio" name="options" id="q5">\
      <div class="h6">Question 5</div><div id="q5-state" class="h2">&nbsp;</div>\
    </label>\
  </div>\
</div>\
\
<p>\
&Agrave; l\'aide de la console de codeBoot, trouvez la plus petite \
expression (ayant le minimum de caract&egrave;res incluant les parenth&egrave;ses et \
symboles, et pas de blancs) contenant les nombres 2, 3, 5, 10, et 30 \
(exactement une fois chaque), et les op&eacute;rateurs +, - et * (autant de \
fois que vous voulez), dont la valeur est 705 .\
</p>\
';

CodeBoot.prototype.getStudentName = function () {
    return "Annie Brocolli";
};

CodeBoot.prototype.installQuiz = function () {

    var studentName = cb.getStudentName();

    $("body").attr("data-theme", "quiz");
    $("#navbar-header").html(quizHTML);
    $("#quiz-student-name").text("pour "+studentName);

    CodeBoot.prototype.executionHook = function () {

        if (false) {
            alert("source:'" + cb.lastSource + "' " +
                  "result:'" + cb.lastResult + "' " +
                  "resultRepresentation:'" + cb.lastResultRepresentation + "'");
        }

        if (cb.lastSource === "3*((10-2)*30-5)" ||
            cb.lastSource === "3*(30*(10-2)-5)" ||
            cb.lastSource === "((10-2)*30-5)*3" ||
            cb.lastSource === "(30*(10-2)-5)*3") {
            $("#q1-state").html("&#x2714;");
            cb.transcript.addLine("Bravo! C'est la bonne réponse. Passez à une autre question.", "error-message");
        }
    };              
};

//cb.installQuiz();
