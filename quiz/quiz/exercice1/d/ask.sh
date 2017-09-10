#!/bin/bash

name="$1"

total=$(wc -l < questions)

q=$(echo "$name" | sha1sum | sed -r 's/[a-z]//g' | awk '{print $1}')
n=$(echo "$q % $total" | bc)

hexa=$(sed "${n}q;d" questions)

decimal=$(echo 'console.log('$hexa')' | node)

echo "Donnez le nombre $decimal exprimé avec la notation hexadécimale de JS."
echo "Servez vous de codeBoot pour vérifier votre réponse."
