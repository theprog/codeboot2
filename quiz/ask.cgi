#!/bin/bash

source common.sh

require_vars post_quiz post_q post_student


post_quiz=$(echo "$post_quiz" | sed 's/[^a-zA-Z0-9_]//g')
post_q=$(echo "$post_q" | sed 's/[^a-zA-Z0-9_]//g')
post_student=$(echo "$post_student" | sed 's/[^a-zA-Z0-9_ ]//g')

echo "Content-Type: text/plain"
echo ""

if test -e quiz/$post_quiz/$post_q/ask.sh
then
    cd quiz/$post_quiz/$post_q
    ./ask.sh "$post_student" | jsonp
fi
