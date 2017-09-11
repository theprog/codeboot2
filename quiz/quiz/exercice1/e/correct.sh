#!/bin/bash

name="$1"
input="$2"

parsed=$(echo "$input" | sed -r 's/[^0-9.+]//g')

numbers=$(echo "$input" | sed -r 's/\+/ /')

a=$(echo $numbers | awk '{print $1}')
b=$(echo $numbers | awk '{print $2}')


if ! [ $(echo "$a" | bc) = $(echo 'console.log('"$a"')' | node) ]
then
    echo 0
    exit
fi

if ! [ $(echo "$b" | bc) = $(echo 'console.log('"$b"')' | node) ]
then
    echo 0
    exit
fi

eval_bc=$(echo "$parsed" | bc)
eval_node=$(echo 'console.log('"$parsed"')' | node)

if [ "$eval_bc" = "$eval_node" ]
then
    echo 0
    exit
fi

echo "$a" '> 1.0 && ' "$a" '< 10.0 && ' "$b" '> 1.0 && ' "$b" '< 10.0' | bc
