#!/bin/bash

name="$1"
input="$2"


parsed=$(echo "$input" | sed -r 's/[^0123.+-]//g')

if ! test "$parsed" = "$input"
then
    echo 0
    exit
fi


eval=$(cat valid.js <(echo 'console.log(+!!valid("' $parsed '", '$parsed'))') | node || echo 0)

echo $eval
