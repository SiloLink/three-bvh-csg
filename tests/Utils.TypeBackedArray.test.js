import { TypeBackedArray } from '../src/core/TypeBackedArray.js';

describe( 'TypeBackedArray', () => {

	it( 'should preserve values when expanding the backing storage.', () => {

		const target = new TypeBackedArray( Uint16Array, 2 );
		target.push( 10, 20 );
		target.push( 30 );

		expect( Array.from( target.array.slice( 0, target.length ) ) ).toEqual( [ 10, 20, 30 ] );

	} );

	it( 'should switch to Float64Array after its data has been cleared.', () => {

		const target = new TypeBackedArray( Uint8Array, 1 );
		target.push( 1 );
		target.clear();

		expect( target.array.buffer.byteLength % Float64Array.BYTES_PER_ELEMENT ).toBe( 0 );
		expect( () => target.setType( Float64Array ) ).not.toThrow();
		expect( target.array ).toBeInstanceOf( Float64Array );

	} );

	it( 'should reject type changes while data is in use.', () => {

		const target = new TypeBackedArray( Float32Array, 1 );
		target.push( 1 );

		expect( () => target.setType( Float64Array ) ).toThrow( /Cannot change the type/ );

	} );

} );
