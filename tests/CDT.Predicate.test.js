import { createRequire } from 'node:module';
import cdt2d from '../src/libs/cdt2d.js';
import predicate from '../scripts/cdt-incircle.cjs';

const require = createRequire( import.meta.url );
const exact = require( 'robust-in-sphere' )[ 4 ];
const originalCDT = require( 'cdt2d' );

function generator() {

	let seed = 0x1739082;
	return () => {

		seed = ( Math.imul( seed, 1664525 ) + 1013904223 ) >>> 0;
		return seed / 4294967296;

	};

}

it( 'preserves exact predicate signs for scaled, cocircular, collinear and repeated points', () => {

	const random = generator();
	let mismatches = 0;
	for ( let i = 0; i < 100000; i ++ ) {

		const scale = 2 ** [ - 50, - 20, - 6, 0, 20, 50 ][ i % 6 ];
		let points;
		if ( i % 4 === 0 ) {

			points = Array.from( { length: 4 }, () => [ ( random() - 0.5 ) * scale, ( random() - 0.5 ) * scale ] );

		} else if ( i % 4 === 1 ) {

			const shift = 1e6 * scale;
			points = [[ shift + scale, shift ], [ shift, shift + scale ], [ shift - scale, shift ], [ shift, shift - scale * ( 1 + ( i % 3 - 1 ) * Number.EPSILON ) ]];

		} else if ( i % 4 === 2 ) {

			points = Array.from( { length: 4 }, () => {

				const x = random() * scale;
				return [ x, x * ( 1 + ( random() - 0.5 ) * 1e-13 ) ];

			} );

		} else {

			points = Array.from( { length: 3 }, () => [ Math.floor( random() * 8 ) * scale, Math.floor( random() * 8 ) * scale ] );
			points.push( [ ...points[ i % 3 ] ] );

		}

		if ( Math.sign( exact( ...points ) ) !== Math.sign( predicate[ 4 ]( ...points ) ) ) mismatches ++;

	}

	expect( mismatches ).toBe( 0 );

} );

it( 'preserves constrained triangulations in the generated CDT bundle', () => {

	const random = generator();
	for ( let i = 0; i < 300; i ++ ) {

		const points = [[ 0, 0 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ]];
		for ( let j = 0; j < 16; j ++ ) points.push( [ random(), random() ] );
		const edges = [[ 0, 1 ], [ 1, 2 ], [ 2, 3 ], [ 3, 0 ]];
		expect( cdt2d( points, edges ) ).toEqual( originalCDT( points, edges ) );

	}

} );
