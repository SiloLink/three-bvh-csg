import { areSharedArrayBuffersSupported } from './utils/geometryUtils.js';

function ceilToStride( byteLength, stride ) {

	return Math.ceil( byteLength / stride ) * stride;

}

// Make a new array wrapper class that more easily affords expansion when reaching it's max capacity
export class TypeBackedArray {

	constructor( type, initialSize = 500 ) {

		this.expansionFactor = 1.5;
		this.type = type;
		this.length = 0;
		this.array = null;

		this.setSize( initialSize );

	}

	setType( type ) {

		if ( type === this.type ) {

			return;

		}

		if ( this.length !== 0 ) {

			throw new Error( 'TypeBackedArray: Cannot change the type while there is used data in the buffer.' );

		}

		const buffer = this.array.buffer;
		this.array = new type( buffer );
		this.type = type;

	}

	setSize( size ) {

		if ( this.array && size === this.array.length ) {

			return;

		}

		// Align every buffer to Float64 width so setType can safely replace a
		// smaller typed array after the data has been cleared.
		const type = this.type;
		const bufferType = areSharedArrayBuffersSupported() ? SharedArrayBuffer : ArrayBuffer;
		const byteLength = ceilToStride( size * type.BYTES_PER_ELEMENT, Float64Array.BYTES_PER_ELEMENT );
		const newArray = new type( new bufferType( byteLength ) );
		if ( this.array ) {

			newArray.set( this.array, 0 );

		}

		this.array = newArray;

	}

	expand() {

		const { array, expansionFactor } = this;
		this.setSize( array.length * expansionFactor );

	}

	push( ...args ) {

		let { array, length } = this;
		if ( length + args.length > array.length ) {

			this.expand();
			array = this.array;

		}

		for ( let i = 0, l = args.length; i < l; i ++ ) {

			array[ length + i ] = args[ i ];

		}

		this.length += args.length;

	}

	clear() {

		this.length = 0;

	}

}
