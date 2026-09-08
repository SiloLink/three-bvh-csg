import { Box3, BoxGeometry, BufferAttribute, BufferGeometry, Triangle } from 'three';
import { Brush, Evaluator, HOLLOW_INTERSECTION, INTERSECTION, SUBTRACTION, computeMeshVolume } from '../src';

function createBrush( geometry, ArrayType ) {

	const position = geometry.attributes.position;
	geometry.setAttribute( 'position', new BufferAttribute( new ArrayType( position.array ), 3 ) );

	const brush = new Brush( geometry );
	brush.updateMatrixWorld( true );
	return brush;

}

function getTriangleCount( brush ) {

	const { index, attributes, drawRange } = brush.geometry;
	const count = index ? index.count : attributes.position.count;
	return Math.min( drawRange.count, count - drawRange.start ) / 3;

}

function expectSurface( brush, expectedArea, minX, maxX ) {

	const { index, attributes, drawRange } = brush.geometry;
	const position = attributes.position;
	const bounds = new Box3();
	const triangle = new Triangle();
	const end = drawRange.start + getTriangleCount( brush ) * 3;
	let area = 0;

	for ( let i = drawRange.start; i < end; i += 3 ) {

		triangle.a.fromBufferAttribute( position, index ? index.getX( i ) : i );
		triangle.b.fromBufferAttribute( position, index ? index.getX( i + 1 ) : i + 1 );
		triangle.c.fromBufferAttribute( position, index ? index.getX( i + 2 ) : i + 2 );
		bounds.expandByPoint( triangle.a );
		bounds.expandByPoint( triangle.b );
		bounds.expandByPoint( triangle.c );
		area += triangle.getArea();

	}

	expect( area ).toBeCloseTo( expectedArea, 6 );
	expect( bounds.min.x ).toBeCloseTo( minX, 6 );
	expect( bounds.max.x ).toBeCloseTo( maxX, 6 );
	expect( bounds.min.y ).toBeCloseTo( - 0.5, 6 );
	expect( bounds.max.y ).toBeCloseTo( 0.5, 6 );
	expect( bounds.min.z ).toBeCloseTo( - 0.5, 6 );
	expect( bounds.max.z ).toBeCloseTo( 0.5, 6 );

}

describe.each( [
	[ 'legacy', false ],
	[ 'CDT', true ],
] )( '%s splitter singleton fragments', ( splitterName, useCDTClipping ) => {

	describe.each( [
		[ 'Float32', Float32Array ],
		[ 'Float64', Float64Array ],
	] )( '%s positions', ( precisionName, ArrayType ) => {

		function createEvaluator() {

			const evaluator = new Evaluator();
			evaluator.attributes = [ 'position' ];
			evaluator.useGroups = false;
			evaluator.useCDTClipping = useCDTClipping;
			return evaluator;

		}

		it.each( [
			[ 'point', [ 1, 1, 1 ]],
			[ 'edge', [ 1, 1, 0 ]],
			[ 'face', [ 1, 0, 0 ]],
		] )( 'does not create an intersection for closed boxes with %s contact', ( contactName, offset ) => {

			// The clipping brush is closed, as required for both solid and hollow operations.
			const brushA = createBrush( new BoxGeometry( 1, 1, 1 ), ArrayType );
			const brushB = createBrush( new BoxGeometry( 1, 1, 1 ), ArrayType );
			brushB.position.fromArray( offset );
			brushB.updateMatrixWorld( true );

			const evaluator = createEvaluator();
			expect( getTriangleCount( evaluator.evaluate( brushA, brushB, INTERSECTION ) ) ).toBe( 0 );
			expect( getTriangleCount( evaluator.evaluate( brushA, brushB, HOLLOW_INTERSECTION ) ) ).toBe( 0 );

			const remainder = evaluator.evaluate( brushA, brushB, SUBTRACTION );
			expect( computeMeshVolume( remainder ) ).toBeCloseTo( 1, 6 );
			expectSurface( remainder, 6, - 0.5, 0.5 );

		} );

		it( 'keeps coplanar classification for a coplanar 1/1 fragment', () => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new ArrayType( [
				0, 0, 0,
				1, 0, 0,
				0, 1, 0,
			] ), 3 ) );
			geometry.setIndex( [ 0, 1, 2 ] );

			const brushA = createBrush( geometry, ArrayType );
			const brushB = createBrush( geometry.clone(), ArrayType );

			const result = createEvaluator().evaluate( brushA, brushB, HOLLOW_INTERSECTION );
			expect( getTriangleCount( result ) ).toBe( 1 );

		} );

		function evaluateHalfBox( operation ) {

			// The x = 0 cutting plane follows existing edges in the subdivided source box.
			const brushA = createBrush( new BoxGeometry( 1, 1, 1, 2, 2, 2 ), ArrayType );
			const brushB = createBrush( new BoxGeometry( 2, 2, 2 ), ArrayType );
			brushB.position.x = 1;
			brushB.updateMatrixWorld( true );

			return createEvaluator().evaluate( brushA, brushB, operation );

		}

		it.each( [
			[ 'intersection', INTERSECTION, 0, 0.5 ],
			[ 'subtraction', SUBTRACTION, - 0.5, 0 ],
		] )( 'preserves an existing edge as a boundary for %s', ( operationName, operation, minX, maxX ) => {

			const result = evaluateHalfBox( operation );
			expectSurface( result, 4, minX, maxX );

			// The two splitters can triangulate the same half-box surface differently.
			expect( computeMeshVolume( result ) ).toBeCloseTo( 0.5, 6 );

		} );

		it( 'preserves an existing edge as a boundary for hollow intersection', () => {

			const result = evaluateHalfBox( HOLLOW_INTERSECTION );
			expectSurface( result, 3, 0, 0.5 );
			expect( getTriangleCount( result ) ).toBe( 24 );

		} );

	} );

} );
