import { BoxGeometry, BufferAttribute, Matrix4 } from 'three';
import { Brush, Evaluator, INTERSECTION, ADDITION, SUBTRACTION, REVERSE_SUBTRACTION, DIFFERENCE, computeMeshVolume } from '../src';

function box( ArrayType ) {

	const geometry = new BoxGeometry();
	geometry.setAttribute( 'position', new BufferAttribute( new ArrayType( geometry.attributes.position.array ), 3 ) );
	return new Brush( geometry );

}

describe.each( [ false, true ] )( 'mirrored transforms, CDT=%s', useCDTClipping => {

	it.each( [ Float32Array, Float64Array ] )( 'preserves solid operations for %s positions', ArrayType => {

		const evaluator = new Evaluator();
		evaluator.attributes = [ 'position' ];
		evaluator.useGroups = false;
		evaluator.useCDTClipping = useCDTClipping;
		const operations = [ INTERSECTION, ADDITION, SUBTRACTION, REVERSE_SUBTRACTION, DIFFERENCE ];

		for ( const axis of [ 'x', 'y', 'z' ] ) {

			for ( const reflected of [ 'a', 'b', 'both' ] ) {

				for ( const offset of [ 0, 0.2 ] ) {

					for ( const rotation of [ 0, 0.37 ] ) {

						const a = box( ArrayType );
						const b = box( ArrayType );
						if ( reflected !== 'b' ) a.scale[ axis ] = - 1;
						if ( reflected !== 'a' ) b.scale[ axis ] = - 1;
						b.position.x = offset;
						const transform = new Matrix4().makeRotationZ( rotation );
						a.applyMatrix4( transform );
						b.applyMatrix4( transform );
						a.updateMatrixWorld( true );
						b.updateMatrixWorld( true );
						const expected = [ 1 - offset, 1 + offset, offset, offset, 2 * offset ];

						for ( let i = 0; i < operations.length; i ++ ) {

							const result = evaluator.evaluate( a, b, operations[ i ] );
							expect( computeMeshVolume( result ) ).toBeCloseTo( expected[ i ], 6 );

						}

					}

				}

			}

		}

	} );

} );
