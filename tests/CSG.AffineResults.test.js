import { BoxGeometry, BufferAttribute, Matrix4, Object3D } from 'three';
import { Brush, Evaluator, INTERSECTION, SUBTRACTION, computeMeshVolume } from '../src';

function box( size, ArrayType, transform ) {

	const geometry = new BoxGeometry( size, size, size );
	geometry.setAttribute( 'position', new BufferAttribute( new ArrayType( geometry.attributes.position.array ), 3 ) );
	const brush = new Brush( geometry );
	brush.matrixAutoUpdate = false;
	brush.matrix.copy( transform );
	brush.updateMatrixWorld( true );
	return brush;

}

describe.each( [ false, true ] )( 'affine results, CDT=%s', useCDTClipping => {

	it.each( [ Float32Array, Float64Array ] )( 'preserves shear through world updates and target reuse with %s', ArrayType => {

		const transform = new Matrix4().set( 1, 1, 0, 3, 0, 1, 0, 2, 0, 0, 1, 1, 0, 0, 0, 1 );
		const a = box( 2, ArrayType, transform );
		const b = box( 1, ArrayType, transform );
		const evaluator = new Evaluator();
		evaluator.attributes = [ 'position' ];
		evaluator.useCDTClipping = useCDTClipping;
		evaluator.useGroups = false;

		for ( const parented of [ false, true ] ) {

			const targets = [ new Brush(), new Brush() ];
			const parent = new Object3D();
			parent.rotation.y = 0.3;
			parent.scale.set( 2, 1, 0.5 );
			if ( parented ) parent.add( ...targets );

			for ( let repeat = 0; repeat < 2; repeat ++ ) {

				parent.position.x += 5;
				evaluator.evaluate( a, b, [ INTERSECTION, SUBTRACTION ], targets );

				for ( let i = 0; i < targets.length; i ++ ) {

					const result = targets[ i ];
					result.updateMatrixWorld( true );
					result.updateWorldMatrix( true, false );
					for ( let element = 0; element < 16; element ++ ) {

						expect( result.matrixWorld.elements[ element ] ).toBeCloseTo( transform.elements[ element ], 12 );

					}

					expect( computeMeshVolume( result ) ).toBeCloseTo( i === 0 ? 1 : 7, 6 );

				}

			}

		}

	} );

	it( 'supports matrix-based repositioning without losing shear', () => {

		const transform = new Matrix4().set( 1, 1, 0, 3, 0, 1, 0, 2, 0, 0, 1, 1, 0, 0, 0, 1 );
		const a = box( 2, Float64Array, transform );
		const b = box( 1, Float64Array, transform );
		const evaluator = new Evaluator();
		evaluator.attributes = [ 'position' ];
		evaluator.useCDTClipping = useCDTClipping;
		evaluator.useGroups = false;

		const result = evaluator.evaluate( a, b, INTERSECTION );
		result.position.set( - 3.5, 2, 3.5 );
		result.matrix.setPosition( result.position );
		result.matrixWorldNeedsUpdate = true;
		result.updateMatrixWorld();

		const expected = transform.clone().setPosition( result.position );
		expect( result.matrixAutoUpdate ).toBe( false );
		for ( let element = 0; element < 16; element ++ ) {

			expect( result.matrixWorld.elements[ element ] ).toBeCloseTo( expected.elements[ element ], 12 );

		}

		expect( computeMeshVolume( result ) ).toBeCloseTo( 1, 6 );

	} );

} );
