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

answer=$(echo $post_answer | ./urldecode.py | base64 -d)

if test -e quiz/$post_quiz/$post_q/correct.sh
then
    ans=$(cd quiz/$post_quiz/$post_q/; ./correct.sh "$post_student" "$answer")
    echo "$post_q" $ans "$answer" >> answers/$post_quiz/"$post_student"
    echo "$ans"
fi
