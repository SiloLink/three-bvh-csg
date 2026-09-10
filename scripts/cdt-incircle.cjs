const { incircle } = require( 'robust-predicates' );

// cdt2d consumes the four-point predicate from robust-in-sphere's indexed API.
module.exports = {
	4: ( a, b, c, d ) => incircle( a[ 0 ], a[ 1 ], b[ 0 ], b[ 1 ], c[ 0 ], c[ 1 ], d[ 0 ], d[ 1 ] ),
};
