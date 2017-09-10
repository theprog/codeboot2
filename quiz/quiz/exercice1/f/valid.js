function valid(input, eval) {
    return input.split(/[-+]/).filter(function(x) {
        return ['0.1', '0.2', '0.3'].indexOf(x) !== -1;
    }).length && eval === Math.pow(2, -54);
}

