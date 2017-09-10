(define (valid x)
  (let ((x (string->number x)))
    (and x
         (inexact? x)
         (<= x 10)
         (>= x 1))))

(define (addition-mathematical-ideal? x-str y-str)
  (let* ((x (string->number x-str))
         (y (string->number y-str))
         (x-exact (string->number (string-append "#e" x-str)))
         (y-exact (string->number (string-append "#e" y-str))))
    (string=? (number->string (+ x y))
              (number->string (exact->inexact (+ x-exact y-exact))))))

(define (main a b)
  (println
   (if (and (valid a)
            (valid b)
            (not (addition-mathematical-ideal? a b)))
       1
       0)))

(apply main (cdr (command-line)))
