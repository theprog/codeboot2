#!/bin/bash

name="$1"
input=$(echo "$2" | tr '[:upper:]' '[:lower:]')

total=$(wc -l < questions)

q=$(echo "$name" | sha1sum | sed -r 's/[a-z]//g' | awk '{print $1}')
n=$(echo "$q % ($total - 1) + 1" | bc)

hexa=$(sed "${n}q;d" questions)

! test "$hexa" = "$input"
echo $?
