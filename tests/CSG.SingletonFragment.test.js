import { BufferAttribute, BufferGeometry } from 'three';
import { Brush, Evaluator, HOLLOW_INTERSECTION } from '../src';

function createBrush( positions, indices ) {

	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( new Float64Array( positions ), 3 ) );
	geometry.setIndex( indices );

	const brush = new Brush( geometry );
	brush.updateMatrixWorld( true );
	return brush;

}

function evaluateHollowIntersection( brushA, brushB, useCDTClipping ) {

	const evaluator = new Evaluator();
	evaluator.attributes = [ 'position' ];
	evaluator.useGroups = false;
	evaluator.useCDTClipping = useCDTClipping;
	return evaluator.evaluate( brushA, brushB, HOLLOW_INTERSECTION );

}

function getTriangleCount( brush ) {

	return brush.geometry.index.count / 3;

}

describe.each( [
	[ 'legacy', false ],
	[ 'CDT', true ],
] )( '%s splitter singleton fragments', ( splitterName, useCDTClipping ) => {

	it( 'returns a non-coplanar 1/1 fragment to its half-edge component', () => {

		const brushA = createBrush( [
			0, 0, 0,
			0, - 1, 0,
			1, 0, 0,
			0, 1, 0,
		], [
			0, 1, 2,
			0, 2, 3,
		] );
		const brushB = createBrush( [
			0, 1, 0,
			0, 0, 1,
			1, 0, 1,
		], [ 0, 1, 2 ] );

		const result = evaluateHollowIntersection( brushA, brushB, useCDTClipping );
		expect( getTriangleCount( result ) ).toBe( 0 );

	} );

	it( 'keeps coplanar classification for a coplanar 1/1 fragment', () => {

		const positions = [
			0, 0, 0,
			1, 0, 0,
			0, 1, 0,
		];
		const brushA = createBrush( positions, [ 0, 1, 2 ] );
		const brushB = createBrush( positions, [ 0, 1, 2 ] );

		const result = evaluateHollowIntersection( brushA, brushB, useCDTClipping );
		expect( getTriangleCount( result ) ).toBe( 1 );

	} );

} );
