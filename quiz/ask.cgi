#!/bin/bash

# args
saveIFS=$IFS
IFS='=&'
parm=($QUERY_STRING)
IFS=$saveIFS

for ((i=0; i<${#parm[@]}; i+=2))
do
    declare post_${parm[i]}=${parm[i+1]}
done

post_quiz=$(echo "$post_quiz" | ./urldecode.py | sed 's/[^a-zA-Z0-9_]//g')
post_q=$(echo "$post_q" | ./urldecode.py | sed 's/[^a-zA-Z0-9_]//g')
post_student=$(echo "$post_student" | ./urldecode.py | sed 's/[^a-zA-Z0-9_ ]//g')

echo "Content-Type: text/plain"
echo ""

if test -e quiz/$post_quiz/$post_q/ask.sh
then
    cd quiz/$post_quiz/$post_q
    ./ask.sh "$post_student"
fi
