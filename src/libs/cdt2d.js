// Auto-generated ESM bundle of cdt2d
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/binary-search-bounds/search-bounds.js
var require_search_bounds = __commonJS({
  "node_modules/binary-search-bounds/search-bounds.js"(exports, module) {
    "use strict";
    function ge(a, y, c, l, h) {
      var i = h + 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p >= 0) {
          i = m;
          h = m - 1;
        } else {
          l = m + 1;
        }
      }
      return i;
    }
    function gt(a, y, c, l, h) {
      var i = h + 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p > 0) {
          i = m;
          h = m - 1;
        } else {
          l = m + 1;
        }
      }
      return i;
    }
    function lt(a, y, c, l, h) {
      var i = l - 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p < 0) {
          i = m;
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return i;
    }
    function le(a, y, c, l, h) {
      var i = l - 1;
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p <= 0) {
          i = m;
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return i;
    }
    function eq(a, y, c, l, h) {
      while (l <= h) {
        var m = l + h >>> 1, x = a[m];
        var p = c !== void 0 ? c(x, y) : x - y;
        if (p === 0) {
          return m;
        }
        if (p <= 0) {
          l = m + 1;
        } else {
          h = m - 1;
        }
      }
      return -1;
    }
    function norm(a, y, c, l, h, f) {
      if (typeof c === "function") {
        return f(a, y, c, l === void 0 ? 0 : l | 0, h === void 0 ? a.length - 1 : h | 0);
      }
      return f(a, y, void 0, c === void 0 ? 0 : c | 0, l === void 0 ? a.length - 1 : l | 0);
    }
    module.exports = {
      ge: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, ge);
      },
      gt: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, gt);
      },
      lt: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, lt);
      },
      le: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, le);
      },
      eq: function(a, y, c, l, h) {
        return norm(a, y, c, l, h, eq);
      }
    };
  }
});

// node_modules/two-product/two-product.js
var require_two_product = __commonJS({
  "node_modules/two-product/two-product.js"(exports, module) {
    "use strict";
    module.exports = twoProduct;
    var SPLITTER = +(Math.pow(2, 27) + 1);
    function twoProduct(a, b, result) {
      var x = a * b;
      var c = SPLITTER * a;
      var abig = c - a;
      var ahi = c - abig;
      var alo = a - ahi;
      var d = SPLITTER * b;
      var bbig = d - b;
      var bhi = d - bbig;
      var blo = b - bhi;
      var err1 = x - ahi * bhi;
      var err2 = err1 - alo * bhi;
      var err3 = err2 - ahi * blo;
      var y = alo * blo - err3;
      if (result) {
        result[0] = y;
        result[1] = x;
        return result;
      }
      return [y, x];
    }
  }
});

// node_modules/robust-sum/robust-sum.js
var require_robust_sum = __commonJS({
  "node_modules/robust-sum/robust-sum.js"(exports, module) {
    "use strict";
    module.exports = linearExpansionSum;
    function scalarScalar(a, b) {
      var x = a + b;
      var bv = x - a;
      var av = x - bv;
      var br = b - bv;
      var ar = a - av;
      var y = ar + br;
      if (y) {
        return [y, x];
      }
      return [x];
    }
    function linearExpansionSum(e, f) {
      var ne = e.length | 0;
      var nf = f.length | 0;
      if (ne === 1 && nf === 1) {
        return scalarScalar(e[0], f[0]);
      }
      var n = ne + nf;
      var g = new Array(n);
      var count = 0;
      var eptr = 0;
      var fptr = 0;
      var abs = Math.abs;
      var ei = e[eptr];
      var ea2 = abs(ei);
      var fi = f[fptr];
      var fa = abs(fi);
      var a, b;
      if (ea2 < fa) {
        b = ei;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
          ea2 = abs(ei);
        }
      } else {
        b = fi;
        fptr += 1;
        if (fptr < nf) {
          fi = f[fptr];
          fa = abs(fi);
        }
      }
      if (eptr < ne && ea2 < fa || fptr >= nf) {
        a = ei;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
          ea2 = abs(ei);
        }
      } else {
        a = fi;
        fptr += 1;
        if (fptr < nf) {
          fi = f[fptr];
          fa = abs(fi);
        }
      }
      var x = a + b;
      var bv = x - a;
      var y = b - bv;
      var q0 = y;
      var q1 = x;
      var _x, _bv, _av, _br, _ar;
      while (eptr < ne && fptr < nf) {
        if (ea2 < fa) {
          a = ei;
          eptr += 1;
          if (eptr < ne) {
            ei = e[eptr];
            ea2 = abs(ei);
          }
        } else {
          a = fi;
          fptr += 1;
          if (fptr < nf) {
            fi = f[fptr];
            fa = abs(fi);
          }
        }
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
      }
      while (eptr < ne) {
        a = ei;
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
        }
      }
      while (fptr < nf) {
        a = fi;
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
        fptr += 1;
        if (fptr < nf) {
          fi = f[fptr];
        }
      }
      if (q0) {
        g[count++] = q0;
      }
      if (q1) {
        g[count++] = q1;
      }
      if (!count) {
        g[count++] = 0;
      }
      g.length = count;
      return g;
    }
  }
});

// node_modules/two-sum/two-sum.js
var require_two_sum = __commonJS({
  "node_modules/two-sum/two-sum.js"(exports, module) {
    "use strict";
    module.exports = fastTwoSum;
    function fastTwoSum(a, b, result) {
      var x = a + b;
      var bv = x - a;
      var av = x - bv;
      var br = b - bv;
      var ar = a - av;
      if (result) {
        result[0] = ar + br;
        result[1] = x;
        return result;
      }
      return [ar + br, x];
    }
  }
});

// node_modules/robust-scale/robust-scale.js
var require_robust_scale = __commonJS({
  "node_modules/robust-scale/robust-scale.js"(exports, module) {
    "use strict";
    var twoProduct = require_two_product();
    var twoSum = require_two_sum();
    module.exports = scaleLinearExpansion;
    function scaleLinearExpansion(e, scale2) {
      var n = e.length;
      if (n === 1) {
        var ts = twoProduct(e[0], scale2);
        if (ts[0]) {
          return ts;
        }
        return [ts[1]];
      }
      var g = new Array(2 * n);
      var q = [0.1, 0.1];
      var t = [0.1, 0.1];
      var count = 0;
      twoProduct(e[0], scale2, q);
      if (q[0]) {
        g[count++] = q[0];
      }
      for (var i = 1; i < n; ++i) {
        twoProduct(e[i], scale2, t);
        var pq = q[1];
        twoSum(pq, t[0], q);
        if (q[0]) {
          g[count++] = q[0];
        }
        var a = t[1];
        var b = q[1];
        var x = a + b;
        var bv = x - a;
        var y = b - bv;
        q[1] = x;
        if (y) {
          g[count++] = y;
        }
      }
      if (q[1]) {
        g[count++] = q[1];
      }
      if (count === 0) {
        g[count++] = 0;
      }
      g.length = count;
      return g;
    }
  }
});

// node_modules/robust-subtract/robust-diff.js
var require_robust_diff = __commonJS({
  "node_modules/robust-subtract/robust-diff.js"(exports, module) {
    "use strict";
    module.exports = robustSubtract;
    function scalarScalar(a, b) {
      var x = a + b;
      var bv = x - a;
      var av = x - bv;
      var br = b - bv;
      var ar = a - av;
      var y = ar + br;
      if (y) {
        return [y, x];
      }
      return [x];
    }
    function robustSubtract(e, f) {
      var ne = e.length | 0;
      var nf = f.length | 0;
      if (ne === 1 && nf === 1) {
        return scalarScalar(e[0], -f[0]);
      }
      var n = ne + nf;
      var g = new Array(n);
      var count = 0;
      var eptr = 0;
      var fptr = 0;
      var abs = Math.abs;
      var ei = e[eptr];
      var ea2 = abs(ei);
      var fi = -f[fptr];
      var fa = abs(fi);
      var a, b;
      if (ea2 < fa) {
        b = ei;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
          ea2 = abs(ei);
        }
      } else {
        b = fi;
        fptr += 1;
        if (fptr < nf) {
          fi = -f[fptr];
          fa = abs(fi);
        }
      }
      if (eptr < ne && ea2 < fa || fptr >= nf) {
        a = ei;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
          ea2 = abs(ei);
        }
      } else {
        a = fi;
        fptr += 1;
        if (fptr < nf) {
          fi = -f[fptr];
          fa = abs(fi);
        }
      }
      var x = a + b;
      var bv = x - a;
      var y = b - bv;
      var q0 = y;
      var q1 = x;
      var _x, _bv, _av, _br, _ar;
      while (eptr < ne && fptr < nf) {
        if (ea2 < fa) {
          a = ei;
          eptr += 1;
          if (eptr < ne) {
            ei = e[eptr];
            ea2 = abs(ei);
          }
        } else {
          a = fi;
          fptr += 1;
          if (fptr < nf) {
            fi = -f[fptr];
            fa = abs(fi);
          }
        }
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
      }
      while (eptr < ne) {
        a = ei;
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
        eptr += 1;
        if (eptr < ne) {
          ei = e[eptr];
        }
      }
      while (fptr < nf) {
        a = fi;
        b = q0;
        x = a + b;
        bv = x - a;
        y = b - bv;
        if (y) {
          g[count++] = y;
        }
        _x = q1 + x;
        _bv = _x - q1;
        _av = _x - _bv;
        _br = x - _bv;
        _ar = q1 - _av;
        q0 = _ar + _br;
        q1 = _x;
        fptr += 1;
        if (fptr < nf) {
          fi = -f[fptr];
        }
      }
      if (q0) {
        g[count++] = q0;
      }
      if (q1) {
        g[count++] = q1;
      }
      if (!count) {
        g[count++] = 0;
      }
      g.length = count;
      return g;
    }
  }
});

// node_modules/robust-orientation/orientation.js
var require_orientation = __commonJS({
  "node_modules/robust-orientation/orientation.js"(exports, module) {
    "use strict";
    var twoProduct = require_two_product();
    var robustSum = require_robust_sum();
    var robustScale = require_robust_scale();
    var robustSubtract = require_robust_diff();
    var NUM_EXPAND = 5;
    var EPSILON = 11102230246251565e-32;
    var ERRBOUND3 = (3 + 16 * EPSILON) * EPSILON;
    var ERRBOUND4 = (7 + 56 * EPSILON) * EPSILON;
    function orientation_3(sum2, prod, scale2, sub) {
      return function orientation3Exact2(m0, m1, m2) {
        var p = sum2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])));
        var n = sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0]));
        var d = sub(p, n);
        return d[d.length - 1];
      };
    }
    function orientation_4(sum2, prod, scale2, sub) {
      return function orientation4Exact2(m0, m1, m2, m3) {
        var p = sum2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))));
        var n = sum2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), sum2(scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))));
        var d = sub(p, n);
        return d[d.length - 1];
      };
    }
    function orientation_5(sum2, prod, scale2, sub) {
      return function orientation5Exact(m0, m1, m2, m3, m4) {
        var p = sum2(sum2(sum2(scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m2[2]), sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), -m3[2]), scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m4[2]))), m1[3]), sum2(scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m3[2]), scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m4[2]))), -m2[3]), scale2(sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m2[2]), scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m4[2]))), m3[3]))), sum2(scale2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), -m4[3]), sum2(scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m3[2]), scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m4[2]))), m0[3]), scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m3[2]), scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), m4[2]))), -m1[3])))), sum2(sum2(scale2(sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m4[2]))), m3[3]), sum2(scale2(sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))), -m4[3]), scale2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), m0[3]))), sum2(scale2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), -m1[3]), sum2(scale2(sum2(scale2(sum2(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))), m2[3]), scale2(sum2(scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))), -m3[3])))));
        var n = sum2(sum2(sum2(scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m2[2]), sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), -m3[2]), scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m4[2]))), m0[3]), scale2(sum2(scale2(sum2(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m3[2]), scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), m4[2]))), -m2[3])), sum2(scale2(sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m2[2]), scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m4[2]))), m3[3]), scale2(sum2(scale2(sum2(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), -m4[3]))), sum2(sum2(scale2(sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m1[2]), sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m2[2]), scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m4[2]))), m0[3]), scale2(sum2(scale2(sum2(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m2[2]), scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m4[2]))), -m1[3])), sum2(scale2(sum2(scale2(sum2(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m4[2]))), m2[3]), scale2(sum2(scale2(sum2(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum2(scale2(sum2(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale2(sum2(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))), -m4[3]))));
        var d = sub(p, n);
        return d[d.length - 1];
      };
    }
    function orientation(n) {
      var fn = n === 3 ? orientation_3 : n === 4 ? orientation_4 : orientation_5;
      return fn(robustSum, twoProduct, robustScale, robustSubtract);
    }
    var orientation3Exact = orientation(3);
    var orientation4Exact = orientation(4);
    var CACHED = [
      function orientation0() {
        return 0;
      },
      function orientation1() {
        return 0;
      },
      function orientation2(a, b) {
        return b[0] - a[0];
      },
      function orientation3(a, b, c) {
        var l = (a[1] - c[1]) * (b[0] - c[0]);
        var r = (a[0] - c[0]) * (b[1] - c[1]);
        var det = l - r;
        var s;
        if (l > 0) {
          if (r <= 0) {
            return det;
          } else {
            s = l + r;
          }
        } else if (l < 0) {
          if (r >= 0) {
            return det;
          } else {
            s = -(l + r);
          }
        } else {
          return det;
        }
        var tol = ERRBOUND3 * s;
        if (det >= tol || det <= -tol) {
          return det;
        }
        return orientation3Exact(a, b, c);
      },
      function orientation4(a, b, c, d) {
        var adx = a[0] - d[0];
        var bdx = b[0] - d[0];
        var cdx = c[0] - d[0];
        var ady = a[1] - d[1];
        var bdy = b[1] - d[1];
        var cdy = c[1] - d[1];
        var adz = a[2] - d[2];
        var bdz = b[2] - d[2];
        var cdz = c[2] - d[2];
        var bdxcdy = bdx * cdy;
        var cdxbdy = cdx * bdy;
        var cdxady = cdx * ady;
        var adxcdy = adx * cdy;
        var adxbdy = adx * bdy;
        var bdxady = bdx * ady;
        var det = adz * (bdxcdy - cdxbdy) + bdz * (cdxady - adxcdy) + cdz * (adxbdy - bdxady);
        var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz) + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz) + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
        var tol = ERRBOUND4 * permanent;
        if (det > tol || -det > tol) {
          return det;
        }
        return orientation4Exact(a, b, c, d);
      }
    ];
    function slowOrient(args) {
      var proc2 = CACHED[args.length];
      if (!proc2) {
        proc2 = CACHED[args.length] = orientation(args.length);
      }
      return proc2.apply(void 0, args);
    }
    function proc(slow, o0, o1, o2, o3, o4, o5) {
      return function getOrientation(a0, a1, a2, a3, a4) {
        switch (arguments.length) {
          case 0:
          case 1:
            return 0;
          case 2:
            return o2(a0, a1);
          case 3:
            return o3(a0, a1, a2);
          case 4:
            return o4(a0, a1, a2, a3);
          case 5:
            return o5(a0, a1, a2, a3, a4);
        }
        var s = new Array(arguments.length);
        for (var i = 0; i < arguments.length; ++i) {
          s[i] = arguments[i];
        }
        return slow(s);
      };
    }
    function generateOrientationProc() {
      while (CACHED.length <= NUM_EXPAND) {
        CACHED.push(orientation(CACHED.length));
      }
      module.exports = proc.apply(void 0, [slowOrient].concat(CACHED));
      for (var i = 0; i <= NUM_EXPAND; ++i) {
        module.exports[i] = CACHED[i];
      }
    }
    generateOrientationProc();
  }
});

// node_modules/cdt2d/lib/monotone.js
var require_monotone = __commonJS({
  "node_modules/cdt2d/lib/monotone.js"(exports, module) {
    "use strict";
    var bsearch = require_search_bounds();
    var orient = require_orientation()[3];
    var EVENT_POINT = 0;
    var EVENT_END = 1;
    var EVENT_START = 2;
    module.exports = monotoneTriangulate;
    function PartialHull(a, b, idx, lowerIds, upperIds) {
      this.a = a;
      this.b = b;
      this.idx = idx;
      this.lowerIds = lowerIds;
      this.upperIds = upperIds;
    }
    function Event(a, b, type, idx) {
      this.a = a;
      this.b = b;
      this.type = type;
      this.idx = idx;
    }
    function compareEvent(a, b) {
      var d = a.a[0] - b.a[0] || a.a[1] - b.a[1] || a.type - b.type;
      if (d) {
        return d;
      }
      if (a.type !== EVENT_POINT) {
        d = orient(a.a, a.b, b.b);
        if (d) {
          return d;
        }
      }
      return a.idx - b.idx;
    }
    function testPoint(hull, p) {
      return orient(hull.a, hull.b, p);
    }
    function addPoint(cells, hulls, points, p, idx) {
      var lo = bsearch.lt(hulls, p, testPoint);
      var hi = bsearch.gt(hulls, p, testPoint);
      for (var i = lo; i < hi; ++i) {
        var hull = hulls[i];
        var lowerIds = hull.lowerIds;
        var m = lowerIds.length;
        while (m > 1 && orient(
          points[lowerIds[m - 2]],
          points[lowerIds[m - 1]],
          p
        ) > 0) {
          cells.push(
            [
              lowerIds[m - 1],
              lowerIds[m - 2],
              idx
            ]
          );
          m -= 1;
        }
        lowerIds.length = m;
        lowerIds.push(idx);
        var upperIds = hull.upperIds;
        var m = upperIds.length;
        while (m > 1 && orient(
          points[upperIds[m - 2]],
          points[upperIds[m - 1]],
          p
        ) < 0) {
          cells.push(
            [
              upperIds[m - 2],
              upperIds[m - 1],
              idx
            ]
          );
          m -= 1;
        }
        upperIds.length = m;
        upperIds.push(idx);
      }
    }
    function findSplit(hull, edge) {
      var d;
      if (hull.a[0] < edge.a[0]) {
        d = orient(hull.a, hull.b, edge.a);
      } else {
        d = orient(edge.b, edge.a, hull.a);
      }
      if (d) {
        return d;
      }
      if (edge.b[0] < hull.b[0]) {
        d = orient(hull.a, hull.b, edge.b);
      } else {
        d = orient(edge.b, edge.a, hull.b);
      }
      return d || hull.idx - edge.idx;
    }
    function splitHulls(hulls, points, event) {
      var splitIdx = bsearch.le(hulls, event, findSplit);
      var hull = hulls[splitIdx];
      var upperIds = hull.upperIds;
      var x = upperIds[upperIds.length - 1];
      hull.upperIds = [x];
      hulls.splice(
        splitIdx + 1,
        0,
        new PartialHull(event.a, event.b, event.idx, [x], upperIds)
      );
    }
    function mergeHulls(hulls, points, event) {
      var tmp = event.a;
      event.a = event.b;
      event.b = tmp;
      var mergeIdx = bsearch.eq(hulls, event, findSplit);
      var upper = hulls[mergeIdx];
      var lower = hulls[mergeIdx - 1];
      lower.upperIds = upper.upperIds;
      hulls.splice(mergeIdx, 1);
    }
    function monotoneTriangulate(points, edges) {
      var numPoints = points.length;
      var numEdges = edges.length;
      var events = [];
      for (var i = 0; i < numPoints; ++i) {
        events.push(new Event(
          points[i],
          null,
          EVENT_POINT,
          i
        ));
      }
      for (var i = 0; i < numEdges; ++i) {
        var e = edges[i];
        var a = points[e[0]];
        var b = points[e[1]];
        if (a[0] < b[0]) {
          events.push(
            new Event(a, b, EVENT_START, i),
            new Event(b, a, EVENT_END, i)
          );
        } else if (a[0] > b[0]) {
          events.push(
            new Event(b, a, EVENT_START, i),
            new Event(a, b, EVENT_END, i)
          );
        }
      }
      events.sort(compareEvent);
      var minX = events[0].a[0] - (1 + Math.abs(events[0].a[0])) * Math.pow(2, -52);
      var hull = [new PartialHull([minX, 1], [minX, 0], -1, [], [], [], [])];
      var cells = [];
      for (var i = 0, numEvents = events.length; i < numEvents; ++i) {
        var event = events[i];
        var type = event.type;
        if (type === EVENT_POINT) {
          addPoint(cells, hull, points, event.a, event.idx);
        } else if (type === EVENT_START) {
          splitHulls(hull, points, event);
        } else {
          mergeHulls(hull, points, event);
        }
      }
      return cells;
    }
  }
});

// node_modules/cdt2d/lib/triangulation.js
var require_triangulation = __commonJS({
  "node_modules/cdt2d/lib/triangulation.js"(exports, module) {
    "use strict";
    var bsearch = require_search_bounds();
    module.exports = createTriangulation;
    function Triangulation(stars, edges) {
      this.stars = stars;
      this.edges = edges;
    }
    var proto = Triangulation.prototype;
    function removePair(list, j, k) {
      for (var i = 1, n = list.length; i < n; i += 2) {
        if (list[i - 1] === j && list[i] === k) {
          list[i - 1] = list[n - 2];
          list[i] = list[n - 1];
          list.length = n - 2;
          return;
        }
      }
    }
    proto.isConstraint = /* @__PURE__ */ (function() {
      var e = [0, 0];
      function compareLex(a, b) {
        return a[0] - b[0] || a[1] - b[1];
      }
      return function(i, j) {
        e[0] = Math.min(i, j);
        e[1] = Math.max(i, j);
        return bsearch.eq(this.edges, e, compareLex) >= 0;
      };
    })();
    proto.removeTriangle = function(i, j, k) {
      var stars = this.stars;
      removePair(stars[i], j, k);
      removePair(stars[j], k, i);
      removePair(stars[k], i, j);
    };
    proto.addTriangle = function(i, j, k) {
      var stars = this.stars;
      stars[i].push(j, k);
      stars[j].push(k, i);
      stars[k].push(i, j);
    };
    proto.opposite = function(j, i) {
      var list = this.stars[i];
      for (var k = 1, n = list.length; k < n; k += 2) {
        if (list[k] === j) {
          return list[k - 1];
        }
      }
      return -1;
    };
    proto.flip = function(i, j) {
      var a = this.opposite(i, j);
      var b = this.opposite(j, i);
      this.removeTriangle(i, j, a);
      this.removeTriangle(j, i, b);
      this.addTriangle(i, b, a);
      this.addTriangle(j, a, b);
    };
    proto.edges = function() {
      var stars = this.stars;
      var result = [];
      for (var i = 0, n = stars.length; i < n; ++i) {
        var list = stars[i];
        for (var j = 0, m = list.length; j < m; j += 2) {
          result.push([list[j], list[j + 1]]);
        }
      }
      return result;
    };
    proto.cells = function() {
      var stars = this.stars;
      var result = [];
      for (var i = 0, n = stars.length; i < n; ++i) {
        var list = stars[i];
        for (var j = 0, m = list.length; j < m; j += 2) {
          var s = list[j];
          var t = list[j + 1];
          if (i < Math.min(s, t)) {
            result.push([i, s, t]);
          }
        }
      }
      return result;
    };
    function createTriangulation(numVerts, edges) {
      var stars = new Array(numVerts);
      for (var i = 0; i < numVerts; ++i) {
        stars[i] = [];
      }
      return new Triangulation(stars, edges);
    }
  }
});

// node_modules/robust-predicates/esm/util.js
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function sum_three(alen, a, blen, b, clen, c, tmp, out) {
  return sum(sum(alen, a, blen, b, tmp), tmp, clen, c, out);
}
function scale(elen, e, b, h) {
  let Q, sum2, hh, product1, product0;
  let bvirt, c, ahi, alo, bhi, blo;
  c = splitter * b;
  bhi = c - (c - b);
  blo = b - bhi;
  let enow = e[0];
  Q = enow * b;
  c = splitter * enow;
  ahi = c - (c - enow);
  alo = enow - ahi;
  hh = alo * blo - (Q - ahi * bhi - alo * bhi - ahi * blo);
  let hindex = 0;
  if (hh !== 0) {
    h[hindex++] = hh;
  }
  for (let i = 1; i < elen; i++) {
    enow = e[i];
    product1 = enow * b;
    c = splitter * enow;
    ahi = c - (c - enow);
    alo = enow - ahi;
    product0 = alo * blo - (product1 - ahi * bhi - alo * bhi - ahi * blo);
    sum2 = Q + product0;
    bvirt = sum2 - Q;
    hh = Q - (sum2 - bvirt) + (product0 - bvirt);
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    Q = product1 + sum2;
    hh = sum2 - (Q - product1);
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function negate(elen, e) {
  for (let i = 0; i < elen; i++) e[i] = -e[i];
  return elen;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}
var epsilon, splitter, resulterrbound;
var init_util = __esm({
  "node_modules/robust-predicates/esm/util.js"() {
    epsilon = 11102230246251565e-32;
    splitter = 134217729;
    resulterrbound = (3 + 8 * epsilon) * epsilon;
  }
});

// node_modules/robust-predicates/esm/orient2d.js
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  B[2] = _j - (u32 - bvirt) + (_i - bvirt);
  B[3] = u32;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}
function orient2dfast(ax, ay, bx, by, cx, cy) {
  return (ay - cy) * (bx - cx) - (ax - cx) * (by - cy);
}
var ccwerrboundA, ccwerrboundB, ccwerrboundC, B, C1, C2, D, u;
var init_orient2d = __esm({
  "node_modules/robust-predicates/esm/orient2d.js"() {
    init_util();
    ccwerrboundA = (3 + 16 * epsilon) * epsilon;
    ccwerrboundB = (2 + 12 * epsilon) * epsilon;
    ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
    B = vec(4);
    C1 = vec(8);
    C2 = vec(12);
    D = vec(16);
    u = vec(4);
  }
});

// node_modules/robust-predicates/esm/orient3d.js
function finadd(finlen, alen, a) {
  finlen = sum(finlen, fin, alen, a, fin2);
  const tmp = fin;
  fin = fin2;
  fin2 = tmp;
  return finlen;
}
function tailinit(xtail, ytail, ax, ay, bx, by, a, b) {
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _k, _0, s1, s0, t1, t0, u32, negate2;
  if (xtail === 0) {
    if (ytail === 0) {
      a[0] = 0;
      b[0] = 0;
      return 1;
    }
    negate2 = -ytail;
    s1 = negate2 * ax;
    c = splitter * negate2;
    ahi = c - (c - negate2);
    alo = negate2 - ahi;
    c = splitter * ax;
    bhi = c - (c - ax);
    blo = ax - bhi;
    a[0] = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    a[1] = s1;
    s1 = ytail * bx;
    c = splitter * ytail;
    ahi = c - (c - ytail);
    alo = ytail - ahi;
    c = splitter * bx;
    bhi = c - (c - bx);
    blo = bx - bhi;
    b[0] = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    b[1] = s1;
    return 2;
  }
  if (ytail === 0) {
    s1 = xtail * ay;
    c = splitter * xtail;
    ahi = c - (c - xtail);
    alo = xtail - ahi;
    c = splitter * ay;
    bhi = c - (c - ay);
    blo = ay - bhi;
    a[0] = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    a[1] = s1;
    negate2 = -xtail;
    s1 = negate2 * by;
    c = splitter * negate2;
    ahi = c - (c - negate2);
    alo = negate2 - ahi;
    c = splitter * by;
    bhi = c - (c - by);
    blo = by - bhi;
    b[0] = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    b[1] = s1;
    return 2;
  }
  s1 = xtail * ay;
  c = splitter * xtail;
  ahi = c - (c - xtail);
  alo = xtail - ahi;
  c = splitter * ay;
  bhi = c - (c - ay);
  blo = ay - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = ytail * ax;
  c = splitter * ytail;
  ahi = c - (c - ytail);
  alo = ytail - ahi;
  c = splitter * ax;
  bhi = c - (c - ax);
  blo = ax - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  a[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  a[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  a[2] = _j - (u32 - bvirt) + (_i - bvirt);
  a[3] = u32;
  s1 = ytail * bx;
  c = splitter * ytail;
  ahi = c - (c - ytail);
  alo = ytail - ahi;
  c = splitter * bx;
  bhi = c - (c - bx);
  blo = bx - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = xtail * by;
  c = splitter * xtail;
  ahi = c - (c - xtail);
  alo = xtail - ahi;
  c = splitter * by;
  bhi = c - (c - by);
  blo = by - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  b[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  b[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  b[2] = _j - (u32 - bvirt) + (_i - bvirt);
  b[3] = u32;
  return 4;
}
function tailadd(finlen, a, b, k, z) {
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _k, _0, s1, s0, u32;
  s1 = a * b;
  c = splitter * a;
  ahi = c - (c - a);
  alo = a - ahi;
  c = splitter * b;
  bhi = c - (c - b);
  blo = b - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  c = splitter * k;
  bhi = c - (c - k);
  blo = k - bhi;
  _i = s0 * k;
  c = splitter * s0;
  ahi = c - (c - s0);
  alo = s0 - ahi;
  u2[0] = alo * blo - (_i - ahi * bhi - alo * bhi - ahi * blo);
  _j = s1 * k;
  c = splitter * s1;
  ahi = c - (c - s1);
  alo = s1 - ahi;
  _0 = alo * blo - (_j - ahi * bhi - alo * bhi - ahi * blo);
  _k = _i + _0;
  bvirt = _k - _i;
  u2[1] = _i - (_k - bvirt) + (_0 - bvirt);
  u32 = _j + _k;
  u2[2] = _k - (u32 - _j);
  u2[3] = u32;
  finlen = finadd(finlen, 4, u2);
  if (z !== 0) {
    c = splitter * z;
    bhi = c - (c - z);
    blo = z - bhi;
    _i = s0 * z;
    c = splitter * s0;
    ahi = c - (c - s0);
    alo = s0 - ahi;
    u2[0] = alo * blo - (_i - ahi * bhi - alo * bhi - ahi * blo);
    _j = s1 * z;
    c = splitter * s1;
    ahi = c - (c - s1);
    alo = s1 - ahi;
    _0 = alo * blo - (_j - ahi * bhi - alo * bhi - ahi * blo);
    _k = _i + _0;
    bvirt = _k - _i;
    u2[1] = _i - (_k - bvirt) + (_0 - bvirt);
    u32 = _j + _k;
    u2[2] = _k - (u32 - _j);
    u2[3] = u32;
    finlen = finadd(finlen, 4, u2);
  }
  return finlen;
}
function orient3dadapt(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, permanent) {
  let finlen;
  let adxtail, bdxtail, cdxtail;
  let adytail, bdytail, cdytail;
  let adztail, bdztail, cdztail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _k, _0, s1, s0, t1, t0, u32;
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  const adz = az - dz;
  const bdz = bz - dz;
  const cdz = cz - dz;
  s1 = bdx * cdy;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cdx * bdy;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bc[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bc[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  bc[2] = _j - (u32 - bvirt) + (_i - bvirt);
  bc[3] = u32;
  s1 = cdx * ady;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = adx * cdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ca[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ca[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ca[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ca[3] = u32;
  s1 = adx * bdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bdx * ady;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ab[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ab[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ab[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ab[3] = u32;
  finlen = sum(
    sum(
      scale(4, bc, adz, _8),
      _8,
      scale(4, ca, bdz, _8b),
      _8b,
      _16
    ),
    _16,
    scale(4, ab, cdz, _8),
    _8,
    fin
  );
  let det = estimate(finlen, fin);
  let errbound = o3derrboundB * permanent;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - adx;
  adxtail = ax - (adx + bvirt) + (bvirt - dx);
  bvirt = bx - bdx;
  bdxtail = bx - (bdx + bvirt) + (bvirt - dx);
  bvirt = cx - cdx;
  cdxtail = cx - (cdx + bvirt) + (bvirt - dx);
  bvirt = ay - ady;
  adytail = ay - (ady + bvirt) + (bvirt - dy);
  bvirt = by - bdy;
  bdytail = by - (bdy + bvirt) + (bvirt - dy);
  bvirt = cy - cdy;
  cdytail = cy - (cdy + bvirt) + (bvirt - dy);
  bvirt = az - adz;
  adztail = az - (adz + bvirt) + (bvirt - dz);
  bvirt = bz - bdz;
  bdztail = bz - (bdz + bvirt) + (bvirt - dz);
  bvirt = cz - cdz;
  cdztail = cz - (cdz + bvirt) + (bvirt - dz);
  if (adxtail === 0 && bdxtail === 0 && cdxtail === 0 && adytail === 0 && bdytail === 0 && cdytail === 0 && adztail === 0 && bdztail === 0 && cdztail === 0) {
    return det;
  }
  errbound = o3derrboundC * permanent + resulterrbound * Math.abs(det);
  det += adz * (bdx * cdytail + cdy * bdxtail - (bdy * cdxtail + cdx * bdytail)) + adztail * (bdx * cdy - bdy * cdx) + bdz * (cdx * adytail + ady * cdxtail - (cdy * adxtail + adx * cdytail)) + bdztail * (cdx * ady - cdy * adx) + cdz * (adx * bdytail + bdy * adxtail - (ady * bdxtail + bdx * adytail)) + cdztail * (adx * bdy - ady * bdx);
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  const at_len = tailinit(adxtail, adytail, bdx, bdy, cdx, cdy, at_b, at_c);
  const bt_len = tailinit(bdxtail, bdytail, cdx, cdy, adx, ady, bt_c, bt_a);
  const ct_len = tailinit(cdxtail, cdytail, adx, ady, bdx, bdy, ct_a, ct_b);
  const bctlen = sum(bt_len, bt_c, ct_len, ct_b, bct);
  finlen = finadd(finlen, scale(bctlen, bct, adz, _16), _16);
  const catlen = sum(ct_len, ct_a, at_len, at_c, cat);
  finlen = finadd(finlen, scale(catlen, cat, bdz, _16), _16);
  const abtlen = sum(at_len, at_b, bt_len, bt_a, abt);
  finlen = finadd(finlen, scale(abtlen, abt, cdz, _16), _16);
  if (adztail !== 0) {
    finlen = finadd(finlen, scale(4, bc, adztail, _12), _12);
    finlen = finadd(finlen, scale(bctlen, bct, adztail, _16), _16);
  }
  if (bdztail !== 0) {
    finlen = finadd(finlen, scale(4, ca, bdztail, _12), _12);
    finlen = finadd(finlen, scale(catlen, cat, bdztail, _16), _16);
  }
  if (cdztail !== 0) {
    finlen = finadd(finlen, scale(4, ab, cdztail, _12), _12);
    finlen = finadd(finlen, scale(abtlen, abt, cdztail, _16), _16);
  }
  if (adxtail !== 0) {
    if (bdytail !== 0) {
      finlen = tailadd(finlen, adxtail, bdytail, cdz, cdztail);
    }
    if (cdytail !== 0) {
      finlen = tailadd(finlen, -adxtail, cdytail, bdz, bdztail);
    }
  }
  if (bdxtail !== 0) {
    if (cdytail !== 0) {
      finlen = tailadd(finlen, bdxtail, cdytail, adz, adztail);
    }
    if (adytail !== 0) {
      finlen = tailadd(finlen, -bdxtail, adytail, cdz, cdztail);
    }
  }
  if (cdxtail !== 0) {
    if (adytail !== 0) {
      finlen = tailadd(finlen, cdxtail, adytail, bdz, bdztail);
    }
    if (bdytail !== 0) {
      finlen = tailadd(finlen, -cdxtail, bdytail, adz, adztail);
    }
  }
  return fin[finlen - 1];
}
function orient3d(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  const adz = az - dz;
  const bdz = bz - dz;
  const cdz = cz - dz;
  const bdxcdy = bdx * cdy;
  const cdxbdy = cdx * bdy;
  const cdxady = cdx * ady;
  const adxcdy = adx * cdy;
  const adxbdy = adx * bdy;
  const bdxady = bdx * ady;
  const det = adz * (bdxcdy - cdxbdy) + bdz * (cdxady - adxcdy) + cdz * (adxbdy - bdxady);
  const permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz) + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz) + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
  const errbound = o3derrboundA * permanent;
  if (det > errbound || -det > errbound) {
    return det;
  }
  return orient3dadapt(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, permanent);
}
function orient3dfast(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  const adz = az - dz;
  const bdz = bz - dz;
  const cdz = cz - dz;
  return adx * (bdy * cdz - bdz * cdy) + bdx * (cdy * adz - cdz * ady) + cdx * (ady * bdz - adz * bdy);
}
var o3derrboundA, o3derrboundB, o3derrboundC, bc, ca, ab, at_b, at_c, bt_c, bt_a, ct_a, ct_b, bct, cat, abt, u2, _8, _8b, _16, _12, fin, fin2;
var init_orient3d = __esm({
  "node_modules/robust-predicates/esm/orient3d.js"() {
    init_util();
    o3derrboundA = (7 + 56 * epsilon) * epsilon;
    o3derrboundB = (3 + 28 * epsilon) * epsilon;
    o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon;
    bc = vec(4);
    ca = vec(4);
    ab = vec(4);
    at_b = vec(4);
    at_c = vec(4);
    bt_c = vec(4);
    bt_a = vec(4);
    ct_a = vec(4);
    ct_b = vec(4);
    bct = vec(8);
    cat = vec(8);
    abt = vec(8);
    u2 = vec(4);
    _8 = vec(8);
    _8b = vec(8);
    _16 = vec(16);
    _12 = vec(12);
    fin = vec(192);
    fin2 = vec(192);
  }
});

// node_modules/robust-predicates/esm/incircle.js
function finadd2(finlen, a, alen) {
  finlen = sum(finlen, fin3, a, alen, fin22);
  const tmp = fin3;
  fin3 = fin22;
  fin22 = tmp;
  return finlen;
}
function incircleadapt(ax, ay, bx, by, cx, cy, dx, dy, permanent) {
  let finlen;
  let adxtail, bdxtail, cdxtail, adytail, bdytail, cdytail;
  let axtbclen, aytbclen, bxtcalen, bytcalen, cxtablen, cytablen;
  let abtlen, bctlen, catlen;
  let abttlen, bcttlen, cattlen;
  let n1, n0;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  s1 = bdx * cdy;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cdx * bdy;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bc2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bc2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  bc2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  bc2[3] = u32;
  s1 = cdx * ady;
  c = splitter * cdx;
  ahi = c - (c - cdx);
  alo = cdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = adx * cdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * cdy;
  bhi = c - (c - cdy);
  blo = cdy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ca2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ca2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ca2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ca2[3] = u32;
  s1 = adx * bdy;
  c = splitter * adx;
  ahi = c - (c - adx);
  alo = adx - ahi;
  c = splitter * bdy;
  bhi = c - (c - bdy);
  blo = bdy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bdx * ady;
  c = splitter * bdx;
  ahi = c - (c - bdx);
  alo = bdx - ahi;
  c = splitter * ady;
  bhi = c - (c - ady);
  blo = ady - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ab2[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ab2[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ab2[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ab2[3] = u32;
  finlen = sum(
    sum(
      sum(
        scale(scale(4, bc2, adx, _82), _82, adx, _162),
        _162,
        scale(scale(4, bc2, ady, _82), _82, ady, _16b),
        _16b,
        _32
      ),
      _32,
      sum(
        scale(scale(4, ca2, bdx, _82), _82, bdx, _162),
        _162,
        scale(scale(4, ca2, bdy, _82), _82, bdy, _16b),
        _16b,
        _32b
      ),
      _32b,
      _64
    ),
    _64,
    sum(
      scale(scale(4, ab2, cdx, _82), _82, cdx, _162),
      _162,
      scale(scale(4, ab2, cdy, _82), _82, cdy, _16b),
      _16b,
      _32
    ),
    _32,
    fin3
  );
  let det = estimate(finlen, fin3);
  let errbound = iccerrboundB * permanent;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - adx;
  adxtail = ax - (adx + bvirt) + (bvirt - dx);
  bvirt = ay - ady;
  adytail = ay - (ady + bvirt) + (bvirt - dy);
  bvirt = bx - bdx;
  bdxtail = bx - (bdx + bvirt) + (bvirt - dx);
  bvirt = by - bdy;
  bdytail = by - (bdy + bvirt) + (bvirt - dy);
  bvirt = cx - cdx;
  cdxtail = cx - (cdx + bvirt) + (bvirt - dx);
  bvirt = cy - cdy;
  cdytail = cy - (cdy + bvirt) + (bvirt - dy);
  if (adxtail === 0 && bdxtail === 0 && cdxtail === 0 && adytail === 0 && bdytail === 0 && cdytail === 0) {
    return det;
  }
  errbound = iccerrboundC * permanent + resulterrbound * Math.abs(det);
  det += (adx * adx + ady * ady) * (bdx * cdytail + cdy * bdxtail - (bdy * cdxtail + cdx * bdytail)) + 2 * (adx * adxtail + ady * adytail) * (bdx * cdy - bdy * cdx) + ((bdx * bdx + bdy * bdy) * (cdx * adytail + ady * cdxtail - (cdy * adxtail + adx * cdytail)) + 2 * (bdx * bdxtail + bdy * bdytail) * (cdx * ady - cdy * adx)) + ((cdx * cdx + cdy * cdy) * (adx * bdytail + bdy * adxtail - (ady * bdxtail + bdx * adytail)) + 2 * (cdx * cdxtail + cdy * cdytail) * (adx * bdy - ady * bdx));
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  if (bdxtail !== 0 || bdytail !== 0 || cdxtail !== 0 || cdytail !== 0) {
    s1 = adx * adx;
    c = splitter * adx;
    ahi = c - (c - adx);
    alo = adx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = ady * ady;
    c = splitter * ady;
    ahi = c - (c - ady);
    alo = ady - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    aa[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    aa[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    aa[2] = _j - (u32 - bvirt) + (_i - bvirt);
    aa[3] = u32;
  }
  if (cdxtail !== 0 || cdytail !== 0 || adxtail !== 0 || adytail !== 0) {
    s1 = bdx * bdx;
    c = splitter * bdx;
    ahi = c - (c - bdx);
    alo = bdx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = bdy * bdy;
    c = splitter * bdy;
    ahi = c - (c - bdy);
    alo = bdy - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    bb[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    bb[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    bb[2] = _j - (u32 - bvirt) + (_i - bvirt);
    bb[3] = u32;
  }
  if (adxtail !== 0 || adytail !== 0 || bdxtail !== 0 || bdytail !== 0) {
    s1 = cdx * cdx;
    c = splitter * cdx;
    ahi = c - (c - cdx);
    alo = cdx - ahi;
    s0 = alo * alo - (s1 - ahi * ahi - (ahi + ahi) * alo);
    t1 = cdy * cdy;
    c = splitter * cdy;
    ahi = c - (c - cdy);
    alo = cdy - ahi;
    t0 = alo * alo - (t1 - ahi * ahi - (ahi + ahi) * alo);
    _i = s0 + t0;
    bvirt = _i - s0;
    cc[0] = s0 - (_i - bvirt) + (t0 - bvirt);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 + t1;
    bvirt = _i - _0;
    cc[1] = _0 - (_i - bvirt) + (t1 - bvirt);
    u32 = _j + _i;
    bvirt = u32 - _j;
    cc[2] = _j - (u32 - bvirt) + (_i - bvirt);
    cc[3] = u32;
  }
  if (adxtail !== 0) {
    axtbclen = scale(4, bc2, adxtail, axtbc);
    finlen = finadd2(finlen, sum_three(
      scale(axtbclen, axtbc, 2 * adx, _162),
      _162,
      scale(scale(4, cc, adxtail, _82), _82, bdy, _16b),
      _16b,
      scale(scale(4, bb, adxtail, _82), _82, -cdy, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (adytail !== 0) {
    aytbclen = scale(4, bc2, adytail, aytbc);
    finlen = finadd2(finlen, sum_three(
      scale(aytbclen, aytbc, 2 * ady, _162),
      _162,
      scale(scale(4, bb, adytail, _82), _82, cdx, _16b),
      _16b,
      scale(scale(4, cc, adytail, _82), _82, -bdx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (bdxtail !== 0) {
    bxtcalen = scale(4, ca2, bdxtail, bxtca);
    finlen = finadd2(finlen, sum_three(
      scale(bxtcalen, bxtca, 2 * bdx, _162),
      _162,
      scale(scale(4, aa, bdxtail, _82), _82, cdy, _16b),
      _16b,
      scale(scale(4, cc, bdxtail, _82), _82, -ady, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (bdytail !== 0) {
    bytcalen = scale(4, ca2, bdytail, bytca);
    finlen = finadd2(finlen, sum_three(
      scale(bytcalen, bytca, 2 * bdy, _162),
      _162,
      scale(scale(4, cc, bdytail, _82), _82, adx, _16b),
      _16b,
      scale(scale(4, aa, bdytail, _82), _82, -cdx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (cdxtail !== 0) {
    cxtablen = scale(4, ab2, cdxtail, cxtab);
    finlen = finadd2(finlen, sum_three(
      scale(cxtablen, cxtab, 2 * cdx, _162),
      _162,
      scale(scale(4, bb, cdxtail, _82), _82, ady, _16b),
      _16b,
      scale(scale(4, aa, cdxtail, _82), _82, -bdy, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (cdytail !== 0) {
    cytablen = scale(4, ab2, cdytail, cytab);
    finlen = finadd2(finlen, sum_three(
      scale(cytablen, cytab, 2 * cdy, _162),
      _162,
      scale(scale(4, aa, cdytail, _82), _82, bdx, _16b),
      _16b,
      scale(scale(4, bb, cdytail, _82), _82, -adx, _16c),
      _16c,
      _32,
      _48
    ), _48);
  }
  if (adxtail !== 0 || adytail !== 0) {
    if (bdxtail !== 0 || bdytail !== 0 || cdxtail !== 0 || cdytail !== 0) {
      s1 = bdxtail * cdy;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * cdy;
      bhi = c - (c - cdy);
      blo = cdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdx * cdytail;
      c = splitter * bdx;
      ahi = c - (c - bdx);
      alo = bdx - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      s1 = cdxtail * -bdy;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * -bdy;
      bhi = c - (c - -bdy);
      blo = -bdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdx * -bdytail;
      c = splitter * cdx;
      ahi = c - (c - cdx);
      alo = cdx - ahi;
      c = splitter * -bdytail;
      bhi = c - (c - -bdytail);
      blo = -bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      bctlen = sum(4, u3, 4, v, bct2);
      s1 = bdxtail * cdytail;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdxtail * bdytail;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      bctt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      bctt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      bctt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      bctt[3] = u32;
      bcttlen = 4;
    } else {
      bct2[0] = 0;
      bctlen = 1;
      bctt[0] = 0;
      bcttlen = 1;
    }
    if (adxtail !== 0) {
      const len = scale(bctlen, bct2, adxtail, _16c);
      finlen = finadd2(finlen, sum(
        scale(axtbclen, axtbc, adxtail, _162),
        _162,
        scale(len, _16c, 2 * adx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(bcttlen, bctt, adxtail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * adx, _162),
        _162,
        scale(len2, _82, adxtail, _16b),
        _16b,
        scale(len, _16c, adxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (bdytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, cc, adxtail, _82), _82, bdytail, _162), _162);
      }
      if (cdytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, bb, -adxtail, _82), _82, cdytail, _162), _162);
      }
    }
    if (adytail !== 0) {
      const len = scale(bctlen, bct2, adytail, _16c);
      finlen = finadd2(finlen, sum(
        scale(aytbclen, aytbc, adytail, _162),
        _162,
        scale(len, _16c, 2 * ady, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(bcttlen, bctt, adytail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * ady, _162),
        _162,
        scale(len2, _82, adytail, _16b),
        _16b,
        scale(len, _16c, adytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  if (bdxtail !== 0 || bdytail !== 0) {
    if (cdxtail !== 0 || cdytail !== 0 || adxtail !== 0 || adytail !== 0) {
      s1 = cdxtail * ady;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * ady;
      bhi = c - (c - ady);
      blo = ady - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = cdx * adytail;
      c = splitter * cdx;
      ahi = c - (c - cdx);
      alo = cdx - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      n1 = -cdy;
      n0 = -cdytail;
      s1 = adxtail * n1;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * n1;
      bhi = c - (c - n1);
      blo = n1 - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adx * n0;
      c = splitter * adx;
      ahi = c - (c - adx);
      alo = adx - ahi;
      c = splitter * n0;
      bhi = c - (c - n0);
      blo = n0 - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      catlen = sum(4, u3, 4, v, cat2);
      s1 = cdxtail * adytail;
      c = splitter * cdxtail;
      ahi = c - (c - cdxtail);
      alo = cdxtail - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adxtail * cdytail;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * cdytail;
      bhi = c - (c - cdytail);
      blo = cdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      catt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      catt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      catt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      catt[3] = u32;
      cattlen = 4;
    } else {
      cat2[0] = 0;
      catlen = 1;
      catt[0] = 0;
      cattlen = 1;
    }
    if (bdxtail !== 0) {
      const len = scale(catlen, cat2, bdxtail, _16c);
      finlen = finadd2(finlen, sum(
        scale(bxtcalen, bxtca, bdxtail, _162),
        _162,
        scale(len, _16c, 2 * bdx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(cattlen, catt, bdxtail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * bdx, _162),
        _162,
        scale(len2, _82, bdxtail, _16b),
        _16b,
        scale(len, _16c, bdxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (cdytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, aa, bdxtail, _82), _82, cdytail, _162), _162);
      }
      if (adytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, cc, -bdxtail, _82), _82, adytail, _162), _162);
      }
    }
    if (bdytail !== 0) {
      const len = scale(catlen, cat2, bdytail, _16c);
      finlen = finadd2(finlen, sum(
        scale(bytcalen, bytca, bdytail, _162),
        _162,
        scale(len, _16c, 2 * bdy, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(cattlen, catt, bdytail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * bdy, _162),
        _162,
        scale(len2, _82, bdytail, _16b),
        _16b,
        scale(len, _16c, bdytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  if (cdxtail !== 0 || cdytail !== 0) {
    if (adxtail !== 0 || adytail !== 0 || bdxtail !== 0 || bdytail !== 0) {
      s1 = adxtail * bdy;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * bdy;
      bhi = c - (c - bdy);
      blo = bdy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = adx * bdytail;
      c = splitter * adx;
      ahi = c - (c - adx);
      alo = adx - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      u3[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      u3[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u3[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u3[3] = u32;
      n1 = -ady;
      n0 = -adytail;
      s1 = bdxtail * n1;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * n1;
      bhi = c - (c - n1);
      blo = n1 - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdx * n0;
      c = splitter * bdx;
      ahi = c - (c - bdx);
      alo = bdx - ahi;
      c = splitter * n0;
      bhi = c - (c - n0);
      blo = n0 - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 + t0;
      bvirt = _i - s0;
      v[0] = s0 - (_i - bvirt) + (t0 - bvirt);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 + t1;
      bvirt = _i - _0;
      v[1] = _0 - (_i - bvirt) + (t1 - bvirt);
      u32 = _j + _i;
      bvirt = u32 - _j;
      v[2] = _j - (u32 - bvirt) + (_i - bvirt);
      v[3] = u32;
      abtlen = sum(4, u3, 4, v, abt2);
      s1 = adxtail * bdytail;
      c = splitter * adxtail;
      ahi = c - (c - adxtail);
      alo = adxtail - ahi;
      c = splitter * bdytail;
      bhi = c - (c - bdytail);
      blo = bdytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = bdxtail * adytail;
      c = splitter * bdxtail;
      ahi = c - (c - bdxtail);
      alo = bdxtail - ahi;
      c = splitter * adytail;
      bhi = c - (c - adytail);
      blo = adytail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      abtt[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      abtt[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      abtt[2] = _j - (u32 - bvirt) + (_i - bvirt);
      abtt[3] = u32;
      abttlen = 4;
    } else {
      abt2[0] = 0;
      abtlen = 1;
      abtt[0] = 0;
      abttlen = 1;
    }
    if (cdxtail !== 0) {
      const len = scale(abtlen, abt2, cdxtail, _16c);
      finlen = finadd2(finlen, sum(
        scale(cxtablen, cxtab, cdxtail, _162),
        _162,
        scale(len, _16c, 2 * cdx, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(abttlen, abtt, cdxtail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * cdx, _162),
        _162,
        scale(len2, _82, cdxtail, _16b),
        _16b,
        scale(len, _16c, cdxtail, _32),
        _32,
        _32b,
        _64
      ), _64);
      if (adytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, bb, cdxtail, _82), _82, adytail, _162), _162);
      }
      if (bdytail !== 0) {
        finlen = finadd2(finlen, scale(scale(4, aa, -cdxtail, _82), _82, bdytail, _162), _162);
      }
    }
    if (cdytail !== 0) {
      const len = scale(abtlen, abt2, cdytail, _16c);
      finlen = finadd2(finlen, sum(
        scale(cytablen, cytab, cdytail, _162),
        _162,
        scale(len, _16c, 2 * cdy, _32),
        _32,
        _48
      ), _48);
      const len2 = scale(abttlen, abtt, cdytail, _82);
      finlen = finadd2(finlen, sum_three(
        scale(len2, _82, 2 * cdy, _162),
        _162,
        scale(len2, _82, cdytail, _16b),
        _16b,
        scale(len, _16c, cdytail, _32),
        _32,
        _32b,
        _64
      ), _64);
    }
  }
  return fin3[finlen - 1];
}
function incircle(ax, ay, bx, by, cx, cy, dx, dy) {
  const adx = ax - dx;
  const bdx = bx - dx;
  const cdx = cx - dx;
  const ady = ay - dy;
  const bdy = by - dy;
  const cdy = cy - dy;
  const bdxcdy = bdx * cdy;
  const cdxbdy = cdx * bdy;
  const alift = adx * adx + ady * ady;
  const cdxady = cdx * ady;
  const adxcdy = adx * cdy;
  const blift = bdx * bdx + bdy * bdy;
  const adxbdy = adx * bdy;
  const bdxady = bdx * ady;
  const clift = cdx * cdx + cdy * cdy;
  const det = alift * (bdxcdy - cdxbdy) + blift * (cdxady - adxcdy) + clift * (adxbdy - bdxady);
  const permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * alift + (Math.abs(cdxady) + Math.abs(adxcdy)) * blift + (Math.abs(adxbdy) + Math.abs(bdxady)) * clift;
  const errbound = iccerrboundA * permanent;
  if (det > errbound || -det > errbound) {
    return det;
  }
  return incircleadapt(ax, ay, bx, by, cx, cy, dx, dy, permanent);
}
function incirclefast(ax, ay, bx, by, cx, cy, dx, dy) {
  const adx = ax - dx;
  const ady = ay - dy;
  const bdx = bx - dx;
  const bdy = by - dy;
  const cdx = cx - dx;
  const cdy = cy - dy;
  const abdet2 = adx * bdy - bdx * ady;
  const bcdet = bdx * cdy - cdx * bdy;
  const cadet = cdx * ady - adx * cdy;
  const alift = adx * adx + ady * ady;
  const blift = bdx * bdx + bdy * bdy;
  const clift = cdx * cdx + cdy * cdy;
  return alift * bcdet + blift * cadet + clift * abdet2;
}
var iccerrboundA, iccerrboundB, iccerrboundC, bc2, ca2, ab2, aa, bb, cc, u3, v, axtbc, aytbc, bxtca, bytca, cxtab, cytab, abt2, bct2, cat2, abtt, bctt, catt, _82, _162, _16b, _16c, _32, _32b, _48, _64, fin3, fin22;
var init_incircle = __esm({
  "node_modules/robust-predicates/esm/incircle.js"() {
    init_util();
    iccerrboundA = (10 + 96 * epsilon) * epsilon;
    iccerrboundB = (4 + 48 * epsilon) * epsilon;
    iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon;
    bc2 = vec(4);
    ca2 = vec(4);
    ab2 = vec(4);
    aa = vec(4);
    bb = vec(4);
    cc = vec(4);
    u3 = vec(4);
    v = vec(4);
    axtbc = vec(8);
    aytbc = vec(8);
    bxtca = vec(8);
    bytca = vec(8);
    cxtab = vec(8);
    cytab = vec(8);
    abt2 = vec(8);
    bct2 = vec(8);
    cat2 = vec(8);
    abtt = vec(4);
    bctt = vec(4);
    catt = vec(4);
    _82 = vec(8);
    _162 = vec(16);
    _16b = vec(16);
    _16c = vec(16);
    _32 = vec(32);
    _32b = vec(32);
    _48 = vec(48);
    _64 = vec(64);
    fin3 = vec(1152);
    fin22 = vec(1152);
  }
});

// node_modules/robust-predicates/esm/insphere.js
function sum_three_scale(a, b, c, az, bz, cz, out) {
  return sum_three(
    scale(4, a, az, _83),
    _83,
    scale(4, b, bz, _8b2),
    _8b2,
    scale(4, c, cz, _8c),
    _8c,
    _163,
    out
  );
}
function liftexact(alen, a, blen, b, clen, c, dlen, d, x, y, z, out) {
  const len = sum(
    sum(alen, a, blen, b, _482),
    _482,
    negate(sum(clen, c, dlen, d, _48b), _48b),
    _48b,
    _96
  );
  return sum_three(
    scale(scale(len, _96, x, _192), _192, x, _384x),
    _384x,
    scale(scale(len, _96, y, _192), _192, y, _384y),
    _384y,
    scale(scale(len, _96, z, _192), _192, z, _384z),
    _384z,
    _768,
    out
  );
}
function insphereexact(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez) {
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  s1 = ax * by;
  c = splitter * ax;
  ahi = c - (c - ax);
  alo = ax - ahi;
  c = splitter * by;
  bhi = c - (c - by);
  blo = by - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bx * ay;
  c = splitter * bx;
  ahi = c - (c - bx);
  alo = bx - ahi;
  c = splitter * ay;
  bhi = c - (c - ay);
  blo = ay - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ab3[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ab3[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ab3[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ab3[3] = u32;
  s1 = bx * cy;
  c = splitter * bx;
  ahi = c - (c - bx);
  alo = bx - ahi;
  c = splitter * cy;
  bhi = c - (c - cy);
  blo = cy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cx * by;
  c = splitter * cx;
  ahi = c - (c - cx);
  alo = cx - ahi;
  c = splitter * by;
  bhi = c - (c - by);
  blo = by - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bc3[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bc3[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  bc3[2] = _j - (u32 - bvirt) + (_i - bvirt);
  bc3[3] = u32;
  s1 = cx * dy;
  c = splitter * cx;
  ahi = c - (c - cx);
  alo = cx - ahi;
  c = splitter * dy;
  bhi = c - (c - dy);
  blo = dy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = dx * cy;
  c = splitter * dx;
  ahi = c - (c - dx);
  alo = dx - ahi;
  c = splitter * cy;
  bhi = c - (c - cy);
  blo = cy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  cd[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  cd[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  cd[2] = _j - (u32 - bvirt) + (_i - bvirt);
  cd[3] = u32;
  s1 = dx * ey;
  c = splitter * dx;
  ahi = c - (c - dx);
  alo = dx - ahi;
  c = splitter * ey;
  bhi = c - (c - ey);
  blo = ey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = ex * dy;
  c = splitter * ex;
  ahi = c - (c - ex);
  alo = ex - ahi;
  c = splitter * dy;
  bhi = c - (c - dy);
  blo = dy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  de[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  de[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  de[2] = _j - (u32 - bvirt) + (_i - bvirt);
  de[3] = u32;
  s1 = ex * ay;
  c = splitter * ex;
  ahi = c - (c - ex);
  alo = ex - ahi;
  c = splitter * ay;
  bhi = c - (c - ay);
  blo = ay - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = ax * ey;
  c = splitter * ax;
  ahi = c - (c - ax);
  alo = ax - ahi;
  c = splitter * ey;
  bhi = c - (c - ey);
  blo = ey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ea[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ea[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ea[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ea[3] = u32;
  s1 = ax * cy;
  c = splitter * ax;
  ahi = c - (c - ax);
  alo = ax - ahi;
  c = splitter * cy;
  bhi = c - (c - cy);
  blo = cy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cx * ay;
  c = splitter * cx;
  ahi = c - (c - cx);
  alo = cx - ahi;
  c = splitter * ay;
  bhi = c - (c - ay);
  blo = ay - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ac[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ac[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ac[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ac[3] = u32;
  s1 = bx * dy;
  c = splitter * bx;
  ahi = c - (c - bx);
  alo = bx - ahi;
  c = splitter * dy;
  bhi = c - (c - dy);
  blo = dy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = dx * by;
  c = splitter * dx;
  ahi = c - (c - dx);
  alo = dx - ahi;
  c = splitter * by;
  bhi = c - (c - by);
  blo = by - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bd[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bd[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  bd[2] = _j - (u32 - bvirt) + (_i - bvirt);
  bd[3] = u32;
  s1 = cx * ey;
  c = splitter * cx;
  ahi = c - (c - cx);
  alo = cx - ahi;
  c = splitter * ey;
  bhi = c - (c - ey);
  blo = ey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = ex * cy;
  c = splitter * ex;
  ahi = c - (c - ex);
  alo = ex - ahi;
  c = splitter * cy;
  bhi = c - (c - cy);
  blo = cy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ce[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ce[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  ce[2] = _j - (u32 - bvirt) + (_i - bvirt);
  ce[3] = u32;
  s1 = dx * ay;
  c = splitter * dx;
  ahi = c - (c - dx);
  alo = dx - ahi;
  c = splitter * ay;
  bhi = c - (c - ay);
  blo = ay - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = ax * dy;
  c = splitter * ax;
  ahi = c - (c - ax);
  alo = ax - ahi;
  c = splitter * dy;
  bhi = c - (c - dy);
  blo = dy - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  da[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  da[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  da[2] = _j - (u32 - bvirt) + (_i - bvirt);
  da[3] = u32;
  s1 = ex * by;
  c = splitter * ex;
  ahi = c - (c - ex);
  alo = ex - ahi;
  c = splitter * by;
  bhi = c - (c - by);
  blo = by - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bx * ey;
  c = splitter * bx;
  ahi = c - (c - bx);
  alo = bx - ahi;
  c = splitter * ey;
  bhi = c - (c - ey);
  blo = ey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  eb[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  eb[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  eb[2] = _j - (u32 - bvirt) + (_i - bvirt);
  eb[3] = u32;
  const abclen = sum_three_scale(ab3, bc3, ac, cz, az, -bz, abc);
  const bcdlen = sum_three_scale(bc3, cd, bd, dz, bz, -cz, bcd);
  const cdelen = sum_three_scale(cd, de, ce, ez, cz, -dz, cde);
  const dealen = sum_three_scale(de, ea, da, az, dz, -ez, dea);
  const eablen = sum_three_scale(ea, ab3, eb, bz, ez, -az, eab);
  const abdlen = sum_three_scale(ab3, bd, da, dz, az, bz, abd);
  const bcelen = sum_three_scale(bc3, ce, eb, ez, bz, cz, bce);
  const cdalen = sum_three_scale(cd, da, ac, az, cz, dz, cda);
  const deblen = sum_three_scale(de, eb, bd, bz, dz, ez, deb);
  const eaclen = sum_three_scale(ea, ac, ce, cz, ez, az, eac);
  const deterlen = sum_three(
    liftexact(cdelen, cde, bcelen, bce, deblen, deb, bcdlen, bcd, ax, ay, az, adet),
    adet,
    liftexact(dealen, dea, cdalen, cda, eaclen, eac, cdelen, cde, bx, by, bz, bdet),
    bdet,
    sum_three(
      liftexact(eablen, eab, deblen, deb, abdlen, abd, dealen, dea, cx, cy, cz, cdet),
      cdet,
      liftexact(abclen, abc, eaclen, eac, bcelen, bce, eablen, eab, dx, dy, dz, ddet),
      ddet,
      liftexact(bcdlen, bcd, abdlen, abd, cdalen, cda, abclen, abc, ex, ey, ez, edet),
      edet,
      cddet,
      cdedet
    ),
    cdedet,
    abdet,
    deter
  );
  return deter[deterlen - 1];
}
function liftadapt(a, b, c, az, bz, cz, x, y, z, out) {
  const len = sum_three_scale(a, b, c, az, bz, cz, _24);
  return sum_three(
    scale(scale(len, _24, x, _482), _482, x, xdet),
    xdet,
    scale(scale(len, _24, y, _482), _482, y, ydet),
    ydet,
    scale(scale(len, _24, z, _482), _482, z, zdet),
    zdet,
    _192,
    out
  );
}
function insphereadapt(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez, permanent) {
  let ab32, bc32, cd3, da3, ac3, bd3;
  let aextail, bextail, cextail, dextail;
  let aeytail, beytail, ceytail, deytail;
  let aeztail, beztail, ceztail, deztail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0;
  const aex = ax - ex;
  const bex = bx - ex;
  const cex = cx - ex;
  const dex = dx - ex;
  const aey = ay - ey;
  const bey = by - ey;
  const cey = cy - ey;
  const dey = dy - ey;
  const aez = az - ez;
  const bez = bz - ez;
  const cez = cz - ez;
  const dez = dz - ez;
  s1 = aex * bey;
  c = splitter * aex;
  ahi = c - (c - aex);
  alo = aex - ahi;
  c = splitter * bey;
  bhi = c - (c - bey);
  blo = bey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = bex * aey;
  c = splitter * bex;
  ahi = c - (c - bex);
  alo = bex - ahi;
  c = splitter * aey;
  bhi = c - (c - aey);
  blo = aey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ab3[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ab3[1] = _0 - (_i + bvirt) + (bvirt - t1);
  ab32 = _j + _i;
  bvirt = ab32 - _j;
  ab3[2] = _j - (ab32 - bvirt) + (_i - bvirt);
  ab3[3] = ab32;
  s1 = bex * cey;
  c = splitter * bex;
  ahi = c - (c - bex);
  alo = bex - ahi;
  c = splitter * cey;
  bhi = c - (c - cey);
  blo = cey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cex * bey;
  c = splitter * cex;
  ahi = c - (c - cex);
  alo = cex - ahi;
  c = splitter * bey;
  bhi = c - (c - bey);
  blo = bey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bc3[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bc3[1] = _0 - (_i + bvirt) + (bvirt - t1);
  bc32 = _j + _i;
  bvirt = bc32 - _j;
  bc3[2] = _j - (bc32 - bvirt) + (_i - bvirt);
  bc3[3] = bc32;
  s1 = cex * dey;
  c = splitter * cex;
  ahi = c - (c - cex);
  alo = cex - ahi;
  c = splitter * dey;
  bhi = c - (c - dey);
  blo = dey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = dex * cey;
  c = splitter * dex;
  ahi = c - (c - dex);
  alo = dex - ahi;
  c = splitter * cey;
  bhi = c - (c - cey);
  blo = cey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  cd[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  cd[1] = _0 - (_i + bvirt) + (bvirt - t1);
  cd3 = _j + _i;
  bvirt = cd3 - _j;
  cd[2] = _j - (cd3 - bvirt) + (_i - bvirt);
  cd[3] = cd3;
  s1 = dex * aey;
  c = splitter * dex;
  ahi = c - (c - dex);
  alo = dex - ahi;
  c = splitter * aey;
  bhi = c - (c - aey);
  blo = aey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = aex * dey;
  c = splitter * aex;
  ahi = c - (c - aex);
  alo = aex - ahi;
  c = splitter * dey;
  bhi = c - (c - dey);
  blo = dey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  da[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  da[1] = _0 - (_i + bvirt) + (bvirt - t1);
  da3 = _j + _i;
  bvirt = da3 - _j;
  da[2] = _j - (da3 - bvirt) + (_i - bvirt);
  da[3] = da3;
  s1 = aex * cey;
  c = splitter * aex;
  ahi = c - (c - aex);
  alo = aex - ahi;
  c = splitter * cey;
  bhi = c - (c - cey);
  blo = cey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = cex * aey;
  c = splitter * cex;
  ahi = c - (c - cex);
  alo = cex - ahi;
  c = splitter * aey;
  bhi = c - (c - aey);
  blo = aey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  ac[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  ac[1] = _0 - (_i + bvirt) + (bvirt - t1);
  ac3 = _j + _i;
  bvirt = ac3 - _j;
  ac[2] = _j - (ac3 - bvirt) + (_i - bvirt);
  ac[3] = ac3;
  s1 = bex * dey;
  c = splitter * bex;
  ahi = c - (c - bex);
  alo = bex - ahi;
  c = splitter * dey;
  bhi = c - (c - dey);
  blo = dey - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = dex * bey;
  c = splitter * dex;
  ahi = c - (c - dex);
  alo = dex - ahi;
  c = splitter * bey;
  bhi = c - (c - bey);
  blo = bey - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  bd[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  bd[1] = _0 - (_i + bvirt) + (bvirt - t1);
  bd3 = _j + _i;
  bvirt = bd3 - _j;
  bd[2] = _j - (bd3 - bvirt) + (_i - bvirt);
  bd[3] = bd3;
  const finlen = sum(
    sum(
      negate(liftadapt(bc3, cd, bd, dez, bez, -cez, aex, aey, aez, adet), adet),
      adet,
      liftadapt(cd, da, ac, aez, cez, dez, bex, bey, bez, bdet),
      bdet,
      abdet
    ),
    abdet,
    sum(
      negate(liftadapt(da, ab3, bd, bez, dez, aez, cex, cey, cez, cdet), cdet),
      cdet,
      liftadapt(ab3, bc3, ac, cez, aez, -bez, dex, dey, dez, ddet),
      ddet,
      cddet
    ),
    cddet,
    fin4
  );
  let det = estimate(finlen, fin4);
  let errbound = isperrboundB * permanent;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - aex;
  aextail = ax - (aex + bvirt) + (bvirt - ex);
  bvirt = ay - aey;
  aeytail = ay - (aey + bvirt) + (bvirt - ey);
  bvirt = az - aez;
  aeztail = az - (aez + bvirt) + (bvirt - ez);
  bvirt = bx - bex;
  bextail = bx - (bex + bvirt) + (bvirt - ex);
  bvirt = by - bey;
  beytail = by - (bey + bvirt) + (bvirt - ey);
  bvirt = bz - bez;
  beztail = bz - (bez + bvirt) + (bvirt - ez);
  bvirt = cx - cex;
  cextail = cx - (cex + bvirt) + (bvirt - ex);
  bvirt = cy - cey;
  ceytail = cy - (cey + bvirt) + (bvirt - ey);
  bvirt = cz - cez;
  ceztail = cz - (cez + bvirt) + (bvirt - ez);
  bvirt = dx - dex;
  dextail = dx - (dex + bvirt) + (bvirt - ex);
  bvirt = dy - dey;
  deytail = dy - (dey + bvirt) + (bvirt - ey);
  bvirt = dz - dez;
  deztail = dz - (dez + bvirt) + (bvirt - ez);
  if (aextail === 0 && aeytail === 0 && aeztail === 0 && bextail === 0 && beytail === 0 && beztail === 0 && cextail === 0 && ceytail === 0 && ceztail === 0 && dextail === 0 && deytail === 0 && deztail === 0) {
    return det;
  }
  errbound = isperrboundC * permanent + resulterrbound * Math.abs(det);
  const abeps = aex * beytail + bey * aextail - (aey * bextail + bex * aeytail);
  const bceps = bex * ceytail + cey * bextail - (bey * cextail + cex * beytail);
  const cdeps = cex * deytail + dey * cextail - (cey * dextail + dex * ceytail);
  const daeps = dex * aeytail + aey * dextail - (dey * aextail + aex * deytail);
  const aceps = aex * ceytail + cey * aextail - (aey * cextail + cex * aeytail);
  const bdeps = bex * deytail + dey * bextail - (bey * dextail + dex * beytail);
  det += (bex * bex + bey * bey + bez * bez) * (cez * daeps + dez * aceps + aez * cdeps + (ceztail * da3 + deztail * ac3 + aeztail * cd3)) + (dex * dex + dey * dey + dez * dez) * (aez * bceps - bez * aceps + cez * abeps + (aeztail * bc32 - beztail * ac3 + ceztail * ab32)) - ((aex * aex + aey * aey + aez * aez) * (bez * cdeps - cez * bdeps + dez * bceps + (beztail * cd3 - ceztail * bd3 + deztail * bc32)) + (cex * cex + cey * cey + cez * cez) * (dez * abeps + aez * bdeps + bez * daeps + (deztail * ab32 + aeztail * bd3 + beztail * da3))) + 2 * ((bex * bextail + bey * beytail + bez * beztail) * (cez * da3 + dez * ac3 + aez * cd3) + (dex * dextail + dey * deytail + dez * deztail) * (aez * bc32 - bez * ac3 + cez * ab32) - ((aex * aextail + aey * aeytail + aez * aeztail) * (bez * cd3 - cez * bd3 + dez * bc32) + (cex * cextail + cey * ceytail + cez * ceztail) * (dez * ab32 + aez * bd3 + bez * da3)));
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  return insphereexact(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez);
}
function insphere(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez) {
  const aex = ax - ex;
  const bex = bx - ex;
  const cex = cx - ex;
  const dex = dx - ex;
  const aey = ay - ey;
  const bey = by - ey;
  const cey = cy - ey;
  const dey = dy - ey;
  const aez = az - ez;
  const bez = bz - ez;
  const cez = cz - ez;
  const dez = dz - ez;
  const aexbey = aex * bey;
  const bexaey = bex * aey;
  const ab4 = aexbey - bexaey;
  const bexcey = bex * cey;
  const cexbey = cex * bey;
  const bc4 = bexcey - cexbey;
  const cexdey = cex * dey;
  const dexcey = dex * cey;
  const cd2 = cexdey - dexcey;
  const dexaey = dex * aey;
  const aexdey = aex * dey;
  const da2 = dexaey - aexdey;
  const aexcey = aex * cey;
  const cexaey = cex * aey;
  const ac2 = aexcey - cexaey;
  const bexdey = bex * dey;
  const dexbey = dex * bey;
  const bd2 = bexdey - dexbey;
  const alift = aex * aex + aey * aey + aez * aez;
  const blift = bex * bex + bey * bey + bez * bez;
  const clift = cex * cex + cey * cey + cez * cez;
  const dlift = dex * dex + dey * dey + dez * dez;
  const det = clift * (dez * ab4 + aez * bd2 + bez * da2) - dlift * (aez * bc4 - bez * ac2 + cez * ab4) + (alift * (bez * cd2 - cez * bd2 + dez * bc4) - blift * (cez * da2 + dez * ac2 + aez * cd2));
  const aezplus = Math.abs(aez);
  const bezplus = Math.abs(bez);
  const cezplus = Math.abs(cez);
  const dezplus = Math.abs(dez);
  const aexbeyplus = Math.abs(aexbey) + Math.abs(bexaey);
  const bexceyplus = Math.abs(bexcey) + Math.abs(cexbey);
  const cexdeyplus = Math.abs(cexdey) + Math.abs(dexcey);
  const dexaeyplus = Math.abs(dexaey) + Math.abs(aexdey);
  const aexceyplus = Math.abs(aexcey) + Math.abs(cexaey);
  const bexdeyplus = Math.abs(bexdey) + Math.abs(dexbey);
  const permanent = (cexdeyplus * bezplus + bexdeyplus * cezplus + bexceyplus * dezplus) * alift + (dexaeyplus * cezplus + aexceyplus * dezplus + cexdeyplus * aezplus) * blift + (aexbeyplus * dezplus + bexdeyplus * aezplus + dexaeyplus * bezplus) * clift + (bexceyplus * aezplus + aexceyplus * bezplus + aexbeyplus * cezplus) * dlift;
  const errbound = isperrboundA * permanent;
  if (det > errbound || -det > errbound) {
    return det;
  }
  return -insphereadapt(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez, permanent);
}
function inspherefast(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez) {
  const aex = ax - ex;
  const bex = bx - ex;
  const cex = cx - ex;
  const dex = dx - ex;
  const aey = ay - ey;
  const bey = by - ey;
  const cey = cy - ey;
  const dey = dy - ey;
  const aez = az - ez;
  const bez = bz - ez;
  const cez = cz - ez;
  const dez = dz - ez;
  const ab4 = aex * bey - bex * aey;
  const bc4 = bex * cey - cex * bey;
  const cd2 = cex * dey - dex * cey;
  const da2 = dex * aey - aex * dey;
  const ac2 = aex * cey - cex * aey;
  const bd2 = bex * dey - dex * bey;
  const abc2 = aez * bc4 - bez * ac2 + cez * ab4;
  const bcd2 = bez * cd2 - cez * bd2 + dez * bc4;
  const cda2 = cez * da2 + dez * ac2 + aez * cd2;
  const dab = dez * ab4 + aez * bd2 + bez * da2;
  const alift = aex * aex + aey * aey + aez * aez;
  const blift = bex * bex + bey * bey + bez * bez;
  const clift = cex * cex + cey * cey + cez * cez;
  const dlift = dex * dex + dey * dey + dez * dez;
  return clift * dab - dlift * abc2 + (alift * bcd2 - blift * cda2);
}
var isperrboundA, isperrboundB, isperrboundC, ab3, bc3, cd, de, ea, ac, bd, ce, da, eb, abc, bcd, cde, dea, eab, abd, bce, cda, deb, eac, adet, bdet, cdet, ddet, edet, abdet, cddet, cdedet, deter, _83, _8b2, _8c, _163, _24, _482, _48b, _96, _192, _384x, _384y, _384z, _768, xdet, ydet, zdet, fin4;
var init_insphere = __esm({
  "node_modules/robust-predicates/esm/insphere.js"() {
    init_util();
    isperrboundA = (16 + 224 * epsilon) * epsilon;
    isperrboundB = (5 + 72 * epsilon) * epsilon;
    isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon;
    ab3 = vec(4);
    bc3 = vec(4);
    cd = vec(4);
    de = vec(4);
    ea = vec(4);
    ac = vec(4);
    bd = vec(4);
    ce = vec(4);
    da = vec(4);
    eb = vec(4);
    abc = vec(24);
    bcd = vec(24);
    cde = vec(24);
    dea = vec(24);
    eab = vec(24);
    abd = vec(24);
    bce = vec(24);
    cda = vec(24);
    deb = vec(24);
    eac = vec(24);
    adet = vec(1152);
    bdet = vec(1152);
    cdet = vec(1152);
    ddet = vec(1152);
    edet = vec(1152);
    abdet = vec(2304);
    cddet = vec(2304);
    cdedet = vec(3456);
    deter = vec(5760);
    _83 = vec(8);
    _8b2 = vec(8);
    _8c = vec(8);
    _163 = vec(16);
    _24 = vec(24);
    _482 = vec(48);
    _48b = vec(48);
    _96 = vec(96);
    _192 = vec(192);
    _384x = vec(384);
    _384y = vec(384);
    _384z = vec(384);
    _768 = vec(768);
    xdet = vec(96);
    ydet = vec(96);
    zdet = vec(96);
    fin4 = vec(1152);
  }
});

// node_modules/robust-predicates/index.js
var robust_predicates_exports = {};
__export(robust_predicates_exports, {
  incircle: () => incircle,
  incirclefast: () => incirclefast,
  insphere: () => insphere,
  inspherefast: () => inspherefast,
  orient2d: () => orient2d,
  orient2dfast: () => orient2dfast,
  orient3d: () => orient3d,
  orient3dfast: () => orient3dfast
});
var init_robust_predicates = __esm({
  "node_modules/robust-predicates/index.js"() {
    init_orient2d();
    init_orient3d();
    init_incircle();
    init_insphere();
  }
});

// scripts/cdt-incircle.cjs
var require_cdt_incircle = __commonJS({
  "scripts/cdt-incircle.cjs"(exports, module) {
    "use strict";
    var { incircle: incircle2 } = (init_robust_predicates(), __toCommonJS(robust_predicates_exports));
    module.exports = {
      4: (a, b, c, d) => incircle2(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1])
    };
  }
});

// node_modules/cdt2d/lib/delaunay.js
var require_delaunay = __commonJS({
  "node_modules/cdt2d/lib/delaunay.js"(exports, module) {
    "use strict";
    var inCircle = require_cdt_incircle()[4];
    var bsearch = require_search_bounds();
    module.exports = delaunayRefine;
    function testFlip(points, triangulation, stack, a, b, x) {
      var y = triangulation.opposite(a, b);
      if (y < 0) {
        return;
      }
      if (b < a) {
        var tmp = a;
        a = b;
        b = tmp;
        tmp = x;
        x = y;
        y = tmp;
      }
      if (triangulation.isConstraint(a, b)) {
        return;
      }
      if (inCircle(points[a], points[b], points[x], points[y]) < 0) {
        stack.push(a, b);
      }
    }
    function delaunayRefine(points, triangulation) {
      var stack = [];
      var numPoints = points.length;
      var stars = triangulation.stars;
      for (var a = 0; a < numPoints; ++a) {
        var star = stars[a];
        for (var j = 1; j < star.length; j += 2) {
          var b = star[j];
          if (b < a) {
            continue;
          }
          if (triangulation.isConstraint(a, b)) {
            continue;
          }
          var x = star[j - 1], y = -1;
          for (var k = 1; k < star.length; k += 2) {
            if (star[k - 1] === b) {
              y = star[k];
              break;
            }
          }
          if (y < 0) {
            continue;
          }
          if (inCircle(points[a], points[b], points[x], points[y]) < 0) {
            stack.push(a, b);
          }
        }
      }
      while (stack.length > 0) {
        var b = stack.pop();
        var a = stack.pop();
        var x = -1, y = -1;
        var star = stars[a];
        for (var i = 1; i < star.length; i += 2) {
          var s = star[i - 1];
          var t = star[i];
          if (s === b) {
            y = t;
          } else if (t === b) {
            x = s;
          }
        }
        if (x < 0 || y < 0) {
          continue;
        }
        if (inCircle(points[a], points[b], points[x], points[y]) >= 0) {
          continue;
        }
        triangulation.flip(a, b);
        testFlip(points, triangulation, stack, x, a, y);
        testFlip(points, triangulation, stack, a, y, x);
        testFlip(points, triangulation, stack, y, b, x);
        testFlip(points, triangulation, stack, b, x, y);
      }
    }
  }
});

// node_modules/cdt2d/lib/filter.js
var require_filter = __commonJS({
  "node_modules/cdt2d/lib/filter.js"(exports, module) {
    "use strict";
    var bsearch = require_search_bounds();
    module.exports = classifyFaces;
    function FaceIndex(cells, neighbor, constraint, flags, active, next, boundary) {
      this.cells = cells;
      this.neighbor = neighbor;
      this.flags = flags;
      this.constraint = constraint;
      this.active = active;
      this.next = next;
      this.boundary = boundary;
    }
    var proto = FaceIndex.prototype;
    function compareCell(a, b) {
      return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    }
    proto.locate = /* @__PURE__ */ (function() {
      var key = [0, 0, 0];
      return function(a, b, c) {
        var x = a, y = b, z = c;
        if (b < c) {
          if (b < a) {
            x = b;
            y = c;
            z = a;
          }
        } else if (c < a) {
          x = c;
          y = a;
          z = b;
        }
        if (x < 0) {
          return -1;
        }
        key[0] = x;
        key[1] = y;
        key[2] = z;
        return bsearch.eq(this.cells, key, compareCell);
      };
    })();
    function indexCells(triangulation, infinity) {
      var cells = triangulation.cells();
      var nc = cells.length;
      for (var i = 0; i < nc; ++i) {
        var c = cells[i];
        var x = c[0], y = c[1], z = c[2];
        if (y < z) {
          if (y < x) {
            c[0] = y;
            c[1] = z;
            c[2] = x;
          }
        } else if (z < x) {
          c[0] = z;
          c[1] = x;
          c[2] = y;
        }
      }
      cells.sort(compareCell);
      var flags = new Array(nc);
      for (var i = 0; i < flags.length; ++i) {
        flags[i] = 0;
      }
      var active = [];
      var next = [];
      var neighbor = new Array(3 * nc);
      var constraint = new Array(3 * nc);
      var boundary = null;
      if (infinity) {
        boundary = [];
      }
      var index = new FaceIndex(
        cells,
        neighbor,
        constraint,
        flags,
        active,
        next,
        boundary
      );
      for (var i = 0; i < nc; ++i) {
        var c = cells[i];
        for (var j = 0; j < 3; ++j) {
          var x = c[j], y = c[(j + 1) % 3];
          var a = neighbor[3 * i + j] = index.locate(y, x, triangulation.opposite(y, x));
          var b = constraint[3 * i + j] = triangulation.isConstraint(x, y);
          if (a < 0) {
            if (b) {
              next.push(i);
            } else {
              active.push(i);
              flags[i] = 1;
            }
            if (infinity) {
              boundary.push([y, x, -1]);
            }
          }
        }
      }
      return index;
    }
    function filterCells(cells, flags, target) {
      var ptr = 0;
      for (var i = 0; i < cells.length; ++i) {
        if (flags[i] === target) {
          cells[ptr++] = cells[i];
        }
      }
      cells.length = ptr;
      return cells;
    }
    function classifyFaces(triangulation, target, infinity) {
      var index = indexCells(triangulation, infinity);
      if (target === 0) {
        if (infinity) {
          return index.cells.concat(index.boundary);
        } else {
          return index.cells;
        }
      }
      var side = 1;
      var active = index.active;
      var next = index.next;
      var flags = index.flags;
      var cells = index.cells;
      var constraint = index.constraint;
      var neighbor = index.neighbor;
      while (active.length > 0 || next.length > 0) {
        while (active.length > 0) {
          var t = active.pop();
          if (flags[t] === -side) {
            continue;
          }
          flags[t] = side;
          var c = cells[t];
          for (var j = 0; j < 3; ++j) {
            var f = neighbor[3 * t + j];
            if (f >= 0 && flags[f] === 0) {
              if (constraint[3 * t + j]) {
                next.push(f);
              } else {
                active.push(f);
                flags[f] = side;
              }
            }
          }
        }
        var tmp = next;
        next = active;
        active = tmp;
        next.length = 0;
        side = -side;
      }
      var result = filterCells(cells, flags, target);
      if (infinity) {
        return result.concat(index.boundary);
      }
      return result;
    }
  }
});

// node_modules/cdt2d/cdt2d.js
var require_cdt2d = __commonJS({
  "node_modules/cdt2d/cdt2d.js"(exports, module) {
    var monotoneTriangulate = require_monotone();
    var makeIndex = require_triangulation();
    var delaunayFlip = require_delaunay();
    var filterTriangulation = require_filter();
    module.exports = cdt2d;
    function canonicalizeEdge(e) {
      return [Math.min(e[0], e[1]), Math.max(e[0], e[1])];
    }
    function compareEdge(a, b) {
      return a[0] - b[0] || a[1] - b[1];
    }
    function canonicalizeEdges(edges) {
      return edges.map(canonicalizeEdge).sort(compareEdge);
    }
    function getDefault(options, property, dflt) {
      if (property in options) {
        return options[property];
      }
      return dflt;
    }
    function cdt2d(points, edges, options) {
      if (!Array.isArray(edges)) {
        options = edges || {};
        edges = [];
      } else {
        options = options || {};
        edges = edges || [];
      }
      var delaunay = !!getDefault(options, "delaunay", true);
      var interior = !!getDefault(options, "interior", true);
      var exterior = !!getDefault(options, "exterior", true);
      var infinity = !!getDefault(options, "infinity", false);
      if (!interior && !exterior || points.length === 0) {
        return [];
      }
      var cells = monotoneTriangulate(points, edges);
      if (delaunay || interior !== exterior || infinity) {
        var triangulation = makeIndex(points.length, canonicalizeEdges(edges));
        for (var i = 0; i < cells.length; ++i) {
          var f = cells[i];
          triangulation.addTriangle(f[0], f[1], f[2]);
        }
        if (delaunay) {
          delaunayFlip(points, triangulation);
        }
        if (!exterior) {
          return filterTriangulation(triangulation, -1);
        } else if (!interior) {
          return filterTriangulation(triangulation, 1, infinity);
        } else if (infinity) {
          return filterTriangulation(triangulation, 0, infinity);
        } else {
          return triangulation.cells();
        }
      } else {
        return cells;
      }
    }
  }
});
export default require_cdt2d();
