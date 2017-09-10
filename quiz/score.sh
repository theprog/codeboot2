#!/bin/bash

quiz="$1"

cd answers/$quiz/

echo "identifiant,note"

for student in *
do
    echo -n "$student "
    grep -E '^[^ ]+ 1 .*' "$student" | awk '{print $1}' | sort | uniq | wc -l
done
