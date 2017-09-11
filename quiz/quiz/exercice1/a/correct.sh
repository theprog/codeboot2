#!/bin/bash

name="$1"
input="$2"

! test "$input" = "-*+/"
echo $?
