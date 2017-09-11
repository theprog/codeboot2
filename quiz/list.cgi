#!/bin/bash

source common.sh

echo "Content-type: text/plain"
echo

cd quiz
ls | jsonp
