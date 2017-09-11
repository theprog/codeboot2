#!/bin/bash

name="$1"
input="$2"

parsed=$(echo "$input" | sed -r 's/\+/ /')

a=$(echo $parsed | awk '{print $1}')
b=$(echo $parsed | awk '{print $2}')


./check "$a" "$b"
