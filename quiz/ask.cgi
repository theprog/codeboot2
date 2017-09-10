#!/bin/bash

# args
saveIFS=$IFS
IFS='=&'
parm=($QUERY_STRING)
IFS=$saveIFS

for ((i=0; i<${#parm[@]}; i+=2))
do
    declare post_${parm[i]}=$(echo ${parm[i+1]} | sed 's/[^a-zA-Z0-9_]//g') # sanitize everything
done


echo "Content-Type: text/plain"
echo ""

if test -e quiz/$post_quiz/$post_q/ask.sh
then
    cd quiz/$post_quiz/$post_q
    ./ask.sh "$post_student"
fi
