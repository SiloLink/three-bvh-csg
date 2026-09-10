import { createHash } from 'node:crypto';
import { BoxGeometry, BufferAttribute } from 'three';
import { Brush, Evaluator, INTERSECTION } from '../src';
import { Pool } from '../src/core/utils/Pool.js';

function createBrush() {

	const geometry = new BoxGeometry( 2, 2, 2, 2, 2, 2 );
	for ( const key of [ 'position', 'normal' ] ) {

		const source = geometry.getAttribute( key );
		geometry.setAttribute( key, new BufferAttribute( new Float64Array( source.array ), source.itemSize ) );

	}

	return new Brush( geometry );

}

function hashGeometry( geometry ) {

	const hash = createHash( 'sha256' );
	for ( const key of [ 'position', 'normal' ] ) {

		const array = geometry.getAttribute( key ).array;
		hash.update( new Uint8Array( array.buffer, array.byteOffset, array.byteLength ) );

	}

	const index = geometry.index.array;
	hash.update( new Uint8Array( index.buffer, index.byteOffset, index.byteLength ) );
	hash.update( JSON.stringify( { drawRange: geometry.drawRange, groups: geometry.groups } ) );
	return hash.digest( 'hex' );

}

it( 'reuses CDT projection vectors without changing repeated evaluation output', () => {

	const a = createBrush();
	const b = createBrush();
	b.position.set( 0.31, 0.27, 0.23 );
	b.rotation.set( 0.1, 0.2, 0.3 );
	a.updateMatrixWorld( true );
	b.updateMatrixWorld( true );

	const evaluator = new Evaluator();
	evaluator.useGroups = false;
	evaluator.useCDTClipping = true;
	evaluator.attributes = [ 'position', 'normal' ];

	const vectors = new Set();
	const originalGetInstance = Pool.prototype.getInstance;
	Pool.prototype.getInstance = function () {

		const value = originalGetInstance.call( this );
		if ( value?.isVector3 ) vectors.add( value );
		return value;

	};

	const outputHashes = new Set();
	const vectorCounts = [];
	try {

		for ( let i = 0; i < 100; i ++ ) {

			const result = evaluator.evaluate( a, b, INTERSECTION );
			outputHashes.add( hashGeometry( result.geometry ) );
			result.geometry.dispose();
			evaluator.reset();
			vectorCounts.push( vectors.size );

		}

	} finally {

		Pool.prototype.getInstance = originalGetInstance;
		a.geometry.dispose();
		b.geometry.dispose();

	}

	expect( vectorCounts[ 0 ] ).toBeGreaterThan( 0 );
	expect( new Set( vectorCounts ).size ).toBe( 1 );
	expect( outputHashes.size ).toBe( 1 );

} );
