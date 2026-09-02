import { ADDITION, Brush, DIFFERENCE, Evaluator, INTERSECTION, SUBTRACTION, computeMeshVolume } from '../src';
import { SphereGeometry, BoxGeometry, CylinderGeometry, BufferAttribute } from 'three';

describe( 'Evaluator', () => {

	it( 'should be able to produce two meshes at once.', () => {

		const evaluator = new Evaluator();
		const brush1 = new Brush( new BoxGeometry() );
		brush1.updateMatrixWorld();

		const brush2 = new Brush( new BoxGeometry() );
		brush2.rotation.set( Math.PI / 4, 0, Math.PI / 4 );
		brush2.updateMatrixWorld();

		const result1 = new Brush();
		const result2 = new Brush();
		evaluator.evaluate( brush1, brush2, [ SUBTRACTION, INTERSECTION ], [ result1, result2 ] );

		const vol1 = computeMeshVolume( result1 );
		const vol2 = computeMeshVolume( result2 );
		expect( vol1 + vol2 ).toBeCloseTo( 1, 7 );

	} );

	it( 'should not fail if multiple operations with different buffer types.', () => {

		const geo1 = new SphereGeometry();
		const geo2 = new SphereGeometry();
		geo2.setAttribute(
			'uv',
			new BufferAttribute( new Uint8Array( geo2.attributes.uv.array.length ), 2, true ),
		);

		const brush1A = new Brush( geo1 );
		const brush1B = new Brush( geo1 );

		const brush2A = new Brush( geo2 );
		const brush2B = new Brush( geo2 );

		const evaluator = new Evaluator();
		const result1 = evaluator.evaluate( brush1A, brush1B, SUBTRACTION );
		const result2 = evaluator.evaluate( brush2A, brush2B, SUBTRACTION );

		expect( result1.geometry.attributes.uv.array.constructor ).toBe( Float32Array );
		expect( result2.geometry.attributes.uv.array.constructor ).toBe( Uint8Array );

	} );

	it( 'should evaluate and return Float64 intersection geometry.', () => {

		function createFloat64Box( x ) {

			const geometry = new BoxGeometry( 1, 1, 1 );
			for ( const name of [ 'position', 'normal' ] ) {

				const source = geometry.getAttribute( name );
				geometry.setAttribute(
					name,
					new BufferAttribute( new Float64Array( source.array ), source.itemSize ),
				);

			}

			const brush = new Brush( geometry );
			brush.position.x = x;
			brush.updateMatrixWorld( true );
			return brush;

		}

		const evaluator = new Evaluator();
		evaluator.attributes = [ 'position', 'normal' ];
		evaluator.useGroups = false;
		evaluator.useCDTClipping = true;
		const result = evaluator.evaluate( createFloat64Box( 0 ), createFloat64Box( 0.5 ), INTERSECTION );

		expect( result.geometry.attributes.position.array ).toBeInstanceOf( Float64Array );
		expect( result.geometry.attributes.normal.array ).toBeInstanceOf( Float64Array );
		expect( result.geometry.attributes.position.count ).toBeGreaterThan( 0 );

	} );

	describe( 'Just Touch Cases', () => {

		it( 'case 1', () => {

			const b1 = new Brush( new CylinderGeometry() );
			const b2 = new Brush( new CylinderGeometry() );
			const evaluator = new Evaluator();
			const result = evaluator.evaluate( b1, b2, SUBTRACTION );
			expect( computeMeshVolume( result ) ).toBe( 0 );

		} );

		it( 'case 2', () => {

			const b1 = new Brush( new CylinderGeometry( 1, 1, 1, 100 ) );
			const b2 = new Brush( new CylinderGeometry( 1, 1, 1, 100 ) );
			b2.position.y = 1;
			b2.updateMatrixWorld();

			const evaluator = new Evaluator();
			const result = evaluator.evaluate( b1, b2, ADDITION );
			expect( computeMeshVolume( result ) ).toBeCloseTo( computeMeshVolume( b1 ) + computeMeshVolume( b2 ) );

		} );

		it( 'case 3', () => {

			const b1 = new Brush( new BoxGeometry() );
			b1.position.x = - 0.5;
			b1.updateMatrixWorld();

			const b2 = new Brush( new BoxGeometry() );
			b2.position.x = 0.5;
			b2.updateMatrixWorld();

			const evaluator = new Evaluator();
			const result = evaluator.evaluate( b1, b2, DIFFERENCE );
			expect( computeMeshVolume( result ) ).toBeCloseTo( 2 );

		} );

		it( 'case 4', () => {

			const b1 = new Brush( new BoxGeometry() );
			b1.position.x = - 0.5;
			b1.updateMatrixWorld();

			const b2 = new Brush( new BoxGeometry() );
			b2.position.x = 0.5;
			b2.updateMatrixWorld();

			const evaluator = new Evaluator();
			const result = evaluator.evaluate( b1, b2, INTERSECTION );
			expect( computeMeshVolume( result ) ).toBeCloseTo( 0 );

		} );

	} );

} );
