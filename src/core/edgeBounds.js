// Bounds enclose the *computed* p + (q - p) * t, for clamped t in [0,1].
// p + (q - p) need not equal q in binary64, so include both endpoints.
// No new geometric tolerance: comparisons use the existing squared threshold.
export function writeEdgeBounds( edge, out, i ) {

	const p = edge.start, q = edge.end;
	const ex = p.x + ( q.x - p.x ), ey = p.y + ( q.y - p.y );
	out[ i ] = Math.min( p.x, q.x, ex );
	out[ i + 1 ] = Math.max( p.x, q.x, ex );
	out[ i + 2 ] = Math.min( p.y, q.y, ey );
	out[ i + 3 ] = Math.max( p.y, q.y, ey );

}

export function separatedEdges( bounds, a, b, threshold ) {

	const dx = Math.max( 0, bounds[ a ] - bounds[ b + 1 ], bounds[ b ] - bounds[ a + 1 ] );
	if ( dx * dx >= threshold ) return true;
	const dy = Math.max( 0, bounds[ a + 2 ] - bounds[ b + 3 ], bounds[ b + 2 ] - bounds[ a + 3 ] );
	return dy * dy >= threshold;

}

export function separatedPoint( bounds, a, point, threshold ) {

	const dx = Math.max( 0, bounds[ a ] - point.x, point.x - bounds[ a + 1 ] );
	if ( dx * dx >= threshold ) return true;
	const dy = Math.max( 0, bounds[ a + 2 ] - point.y, point.y - bounds[ a + 3 ] );
	return dy * dy >= threshold;

}
