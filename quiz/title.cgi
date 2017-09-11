#!/bin/bash

source common.sh

require_vars post_quiz

post_quiz=$(echo "$post_quiz" | sed 's/[^a-zA-Z0-9_]//g')

if ! test -e "quiz/$post_quiz" || test -z "$post_quiz"
then
    exit
fi


echo "Content-type: text/plain"
echo

cd quiz/$post_quiz/
jsonp < title
