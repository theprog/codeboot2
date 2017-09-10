#!/bin/bash

source common.sh

require_vars post_quiz post_q post_student


post_quiz=$(echo "$post_quiz" | sed 's/[^a-zA-Z0-9_]//g')
post_q=$(echo "$post_q" | sed 's/[^a-zA-Z0-9_]//g')
post_student=$(echo "$post_student" | sed 's/[^a-zA-Z0-9_ ]//g')

echo "Content-Type: text/plain"
echo ""

if test -e quiz/$post_quiz/$post_q/correct.sh
then
    ans=$(cd quiz/$post_quiz/$post_q/; ./correct.sh "$post_student" "$post_answer" | tr -d '\n')
    echo "$post_q" "$ans" "$post_answer" >> "answers/$post_quiz/$post_student"
    echo "$ans"
fi
