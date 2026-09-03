import { Box3, BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three';
import { Brush, Evaluator, HOLLOW_INTERSECTION } from '../src';
import { resolveComponentSide, resolveComponentVote } from '../src/core/operations/operations.js';
import { BACK_SIDE, FRONT_SIDE } from '../src/core/operations/operationsUtils.js';

function createBrush( positions, indices ) {

	const geometry = new BufferGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( new Float64Array( positions ), 3 ) );
	geometry.setIndex( indices );

	const brush = new Brush( geometry );
	brush.updateMatrixWorld( true );
	return brush;

}

function createPositionAttribute( positions ) {

	return new BufferAttribute( new Float64Array( positions ), 3 );

}

function createIndexAttribute( indices ) {

	return new BufferAttribute( new Uint16Array( indices ), 1 );

}

function evaluateHollowIntersection( brushA, brushB ) {

	const evaluator = new Evaluator();
	evaluator.attributes = [ 'position' ];
	evaluator.useGroups = false;
	evaluator.useCDTClipping = true;
	return evaluator.evaluate( brushA, brushB, HOLLOW_INTERSECTION );

}

function getTriangleCount( brush ) {

	return brush.geometry.index.count / 3;

}

const componentPositions = [
	0, 0, 0,
	1, 0, 0,
	0, 1, 0,
	- 1, 0, 0,
	0, - 1, 0,
];

const hitTriangle = [ 0, 1, 2 ];
const missTriangleA = [ 0, 2, 3 ];
const missTriangleB = [ 0, 3, 4 ];

describe( 'Component Classification', () => {

	it( 'does not depend on triangle order for a disjoint whole component', () => {

		const target = createBrush( [
			0.1, 0.1, 1,
			0.6, 0.1, 1,
			0.1, 0.6, 1,
		], [ 0, 1, 2 ] );
		const hitFirst = createBrush(
			componentPositions,
			[ ...hitTriangle, ...missTriangleA, ...missTriangleB ],
		);
		const missFirst = createBrush(
			componentPositions,
			[ ...missTriangleB, ...missTriangleA, ...hitTriangle ],
		);

		expect( getTriangleCount( evaluateHollowIntersection( hitFirst, target ) ) ).toBe( 0 );
		expect( getTriangleCount( evaluateHollowIntersection( missFirst, target ) ) ).toBe( 0 );

	} );

	it( 'does not depend on triangle order when resolving a vote', () => {

		const sides = new Map( [
			[ 0, BACK_SIDE ],
			[ 1, FRONT_SIDE ],
			[ 2, FRONT_SIDE ],
		] );
		const classifyTriangle = triangleId => sides.get( triangleId );

		expect( resolveComponentVote( {
			triangleIds: [ 0, 1, 2 ],
			classifyTriangle,
		} ).hitSide ).toBe( FRONT_SIDE );
		expect( resolveComponentVote( {
			triangleIds: [ 2, 1, 0 ],
			classifyTriangle,
		} ).hitSide ).toBe( FRONT_SIDE );

	} );

	it( 'keeps a whole component when BACK_SIDE has an absolute majority', () => {

		const source = createBrush(
			componentPositions,
			[ ...hitTriangle, ...missTriangleA, ...missTriangleB ],
		);
		const target = new Brush( new BoxGeometry( 4, 4, 2 ) );
		target.updateMatrixWorld( true );

		expect( getTriangleCount( evaluateHollowIntersection( source, target ) ) ).toBe( 3 );

	} );

	it( 'skips triangle classification for disjoint component bounds', () => {

		const classifyTriangle = vi.fn( () => BACK_SIDE );
		const result = resolveComponentSide( {
			triangleIds: [ 0 ],
			index: createIndexAttribute( [ 0, 1, 2 ] ),
			position: createPositionAttribute( [
				0, 0, 0,
				1, 0, 0,
				0, 1, 0,
			] ),
			matrix: new Matrix4(),
			targetBounds: new Box3(
				new Vector3( 2, 2, 2 ),
				new Vector3( 3, 3, 3 ),
			),
			classifyTriangle,
		} );

		expect( result ).toMatchObject( {
			hitSide: FRONT_SIDE,
			raycastCount: 0,
			boundsRejected: true,
		} );
		expect( classifyTriangle ).not.toHaveBeenCalled();

	} );

	it( 'evaluates component bounds in the target local frame', () => {

		const classifyTriangle = vi.fn( () => BACK_SIDE );
		const result = resolveComponentSide( {
			triangleIds: [ 0 ],
			index: createIndexAttribute( [ 0, 1, 2 ] ),
			position: createPositionAttribute( [
				0, 0, 0,
				1, 0, 0,
				0, 1, 0,
			] ),
			matrix: new Matrix4().makeTranslation( 10, 0, 0 ),
			targetBounds: new Box3(
				new Vector3( 9.5, - 0.5, - 0.5 ),
				new Vector3( 10.5, 0.5, 0.5 ),
			),
			classifyTriangle,
		} );

		expect( result ).toMatchObject( {
			hitSide: BACK_SIDE,
			raycastCount: 1,
			boundsRejected: false,
		} );
		expect( classifyTriangle ).toHaveBeenCalledExactlyOnceWith( 0 );

	} );

	it( 'keeps touching non-indexed component bounds on the vote path', () => {

		const classifyTriangle = vi.fn( () => FRONT_SIDE );
		const result = resolveComponentSide( {
			triangleIds: [ 0 ],
			index: null,
			position: createPositionAttribute( [
				0, 0, 0,
				1, 0, 0,
				0, 1, 0,
			] ),
			matrix: new Matrix4(),
			targetBounds: new Box3(
				new Vector3( 1, - 1, - 1 ),
				new Vector3( 2, 2, 1 ),
			),
			classifyTriangle,
		} );

		expect( result.boundsRejected ).toBe( false );
		expect( classifyTriangle ).toHaveBeenCalledExactlyOnceWith( 0 );

	} );

	it( 'stops voting after an irreversible strict majority', () => {

		const classifyTriangle = vi.fn( () => BACK_SIDE );
		const result = resolveComponentVote( {
			triangleIds: [ 0, 1, 2, 3, 4 ],
			classifyTriangle,
		} );

		expect( result ).toMatchObject( {
			hitSide: BACK_SIDE,
			raycastCount: 3,
			earlyExit: true,
		} );
		expect( classifyTriangle ).toHaveBeenCalledTimes( 3 );

	} );

	it( 'resolves a tie to FRONT_SIDE', () => {

		const sides = [ BACK_SIDE, FRONT_SIDE, BACK_SIDE, FRONT_SIDE ];
		const result = resolveComponentVote( {
			triangleIds: [ 0, 1, 2, 3 ],
			classifyTriangle: triangleId => sides[ triangleId ],
		} );

		expect( result ).toMatchObject( {
			hitSide: FRONT_SIDE,
			raycastCount: 4,
			earlyExit: false,
		} );

	} );

} );
