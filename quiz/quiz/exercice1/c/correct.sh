#!/bin/bash

name="$1"
input="$2"

total=$(wc -l < questions)

q=$(echo "$name" | sha1sum | sed -r 's/[a-z]//g' | awk '{print $1}')

n=$(echo "$q % $total" | bc)

question=$(sed "${n}q;d" questions)

result=$(echo $question | awk '{print $1}')

grep "^$result" questions | fgrep -x "$result = $input" questions | wc -l
