#!/bin/bash

name="$1"

total=$(wc -l < questions)

q=$(echo "$name" | sha1sum | sed -r 's/[a-z]//g' | awk '{print $1}')

n=$(echo "$q % $total" | bc)

question=$(sed "${n}q;d" questions)
result=$(echo $question | awk '{print $1}')
numbers=$(echo $question | awk '{print $3}' | sed -r 's/[^0-9]/ /g ; s/ +/ /g' | tr ' ' '\n' | sort -n)


echo "Trouver l'expression la plus petites possible ayant pour résultat" $result en utilisant les nombres $numbers une et une seule fois chacun, les oprateurs '+', '-' et '*' "(autant que nécessaire)" et des parenthèses au besoin
