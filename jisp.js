Array.prototype.toString = function() {
	return '(' + this.join(' ') + ')';
};

function pushEnv(env) {
    var newEnv = function() {};
    newEnv.prototype = env;
    return new newEnv;
};

function evaluate(expr, env) {
    env = pushEnv(env);
    if (typeof(expr) === 'string') {
        var value;
        if (!isNaN((value = parseFloat(expr))))
            return [ value, env ];

        if (expr === 'true')
            return [ true, env ];

        if (expr === 'false')
            return [ false, env ];

        if (expr === 'null')
            return [ null, env ];

        return [ env[expr], env ];
    }

    var fn = expr[0];
    var args = expr.slice(1);

    if (fn === 'define') {
        var r = evaluate(args[1], env);
        env = r[1];
        env[args[0]] = r[0];
        return [ null, env ];
    }
	
	if (fn === 'list') {
		args = args.map(function(arg) {
			return evaluate(arg, env).shift();
		});
		return [ args, env ];
	}

    if (fn === 'lambda') {
        var lArgs = args[0];
        var code = args[1];
        return [ [ 'closure', lArgs, code, env ], env ];
    }

    if (fn === 'if') {
        var cond = evaluate(args[0], env).shift();
        if (cond === true)
            return [ evaluate(args[1], env), env ];

        return [ evaluate(args[2], env), env ];
    }

    fn = evaluate(fn, env).shift();
    args = args.map(function(arg) {
        return evaluate(arg, env).shift();
    });

    return apply(fn, args, env);
};

function merge(t, o) {
    if (o)
        for (var k in o)
            if (t[k] === undefined)
                t[k] = o[k];

    return t;
};

function combine(keys, values) {
    var result = {};
    for (var key in keys)
        if (values[key] !== undefined)
            result[keys[key]] = values[key];

    return result;
};

function apply(fn, args, env) {
    // fn[0] must be equal to 'closure', but not sure tho
    var lArgs = fn[1];
    var code = fn[2];
    var cEnv = fn[3];

    if (typeof(code) === 'function')
        return code.apply(null, [ args, env ]);

    return evaluateCode(code, merge(combine(lArgs, args), merge(env, cEnv)));
};

function evaluateCode(code, env, multipleResults) {
    env = env || {};
	multipleResults = multipleResults || false;
    var results = [];
    code.forEach(function(codeInstruction) {
        var r = evaluate(codeInstruction, env);
		results.push(r[0]);
        env = r[1];
    });

	if (multipleResults)
		return results;
		
	return results[results.length - 1];
};

function closure(fn) {
    return [
        'closure',
        null,
        function(args, env) {
            return [
                fn.apply(null, args),
                env
            ];
        },
        []
    ];
};

var env = {};
env['<'] = closure(function(a, b) { return a < b; });
env['='] = closure(function(a, b) { return a == b; });
env['!='] = closure(function(a, b) { return a != b; });
env['<='] = closure(function(a, b) { return a <= b; });
env['!'] = closure(function(a) { return !a; });
env['>'] = closure(function(a, b) { return a > b; });
env['>='] = closure(function(a, b) { return a >= b; });
env['+'] = closure(function(a, b) { if (b === undefined) return +a; return a + b; });
env['-'] = closure(function(a, b) { if (b === undefined) return -a; return a - b; });
env['/'] = closure(function(a, b) { return a / b; });
env['*'] = closure(function(a, b) { return a * b; });
env['car'] = closure(function(list) { return list.length > 0 ? list[0] : null; });
env['cdr'] = closure(function(list) { return list.length > 1 ? list.slice(1) : null; });

/*
var fib = [
    [ 'define', 'fib', [ 'lambda', [ 'n' ],
        [[ 'if', [ '<', 'n', '2' ],
            'n',
            [ '+',
                [ 'fib', [ '-', 'n', '1' ]],
                [ 'fib', [ '-', 'n', '2' ]]
            ]
        ]]
    ]],
    [ 'fib', '12' ]
];

(define fib (lambda n
    ((if (< n 2)
        n
        (+
            (fib (- n 1))
            (fib (- n 2))
        )
    ))
))
(fib 12)
*/

var parenthesize = function(input, list) {
    if (list === undefined) {
      return parenthesize(input, []);
    } else {
      var token = input.shift();
      if (token === undefined) {
        return list;
      } else if (token === "(") {
        list.push(parenthesize(input, []));
        return parenthesize(input, list);
      } else if (token === ")") {
        return list;
      } else {
        return parenthesize(input, list.concat(token));
      }
    }
  };

  var tokenize = function(input) {
    return input.split('"')
                .map(function(x, i) {
                   if (i % 2 === 0) { // not in string
                     return x.replace(/\(/g, ' ( ')
                             .replace(/\)/g, ' ) ');
                   } else { // in string
                     return x.replace(/ /g, "!whitespace!");
                   }
                 })
                .join('"')
                .trim()
                .split(/\s+/)
                .map(function(x) {
                  return x.replace(/!whitespace!/g, " ");
                });
  };

  var parse = function(input) {
    return parenthesize(tokenize(input));
  };
