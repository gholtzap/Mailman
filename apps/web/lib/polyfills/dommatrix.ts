if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;

    constructor(init?: string | number[]) {
      this.m11 = 1;
      this.m12 = 0;
      this.m13 = 0;
      this.m14 = 0;
      this.m21 = 0;
      this.m22 = 1;
      this.m23 = 0;
      this.m24 = 0;
      this.m31 = 0;
      this.m32 = 0;
      this.m33 = 1;
      this.m34 = 0;
      this.m41 = 0;
      this.m42 = 0;
      this.m43 = 0;
      this.m44 = 1;

      if (Array.isArray(init)) {
        if (init.length === 6) {
          this.m11 = init[0];
          this.m12 = init[1];
          this.m21 = init[2];
          this.m22 = init[3];
          this.m41 = init[4];
          this.m42 = init[5];
        } else if (init.length === 16) {
          this.m11 = init[0];
          this.m12 = init[1];
          this.m13 = init[2];
          this.m14 = init[3];
          this.m21 = init[4];
          this.m22 = init[5];
          this.m23 = init[6];
          this.m24 = init[7];
          this.m31 = init[8];
          this.m32 = init[9];
          this.m33 = init[10];
          this.m34 = init[11];
          this.m41 = init[12];
          this.m42 = init[13];
          this.m43 = init[14];
          this.m44 = init[15];
        }
      }
    }

    get a() {
      return this.m11;
    }
    set a(v: number) {
      this.m11 = v;
    }
    get b() {
      return this.m12;
    }
    set b(v: number) {
      this.m12 = v;
    }
    get c() {
      return this.m21;
    }
    set c(v: number) {
      this.m21 = v;
    }
    get d() {
      return this.m22;
    }
    set d(v: number) {
      this.m22 = v;
    }
    get e() {
      return this.m41;
    }
    set e(v: number) {
      this.m41 = v;
    }
    get f() {
      return this.m42;
    }
    set f(v: number) {
      this.m42 = v;
    }

    get is2D() {
      return (
        this.m13 === 0 &&
        this.m14 === 0 &&
        this.m23 === 0 &&
        this.m24 === 0 &&
        this.m31 === 0 &&
        this.m32 === 0 &&
        this.m33 === 1 &&
        this.m34 === 0 &&
        this.m43 === 0 &&
        this.m44 === 1
      );
    }

    get isIdentity() {
      return (
        this.m11 === 1 &&
        this.m12 === 0 &&
        this.m13 === 0 &&
        this.m14 === 0 &&
        this.m21 === 0 &&
        this.m22 === 1 &&
        this.m23 === 0 &&
        this.m24 === 0 &&
        this.m31 === 0 &&
        this.m32 === 0 &&
        this.m33 === 1 &&
        this.m34 === 0 &&
        this.m41 === 0 &&
        this.m42 === 0 &&
        this.m43 === 0 &&
        this.m44 === 1
      );
    }

    multiply(other: DOMMatrixPolyfill) {
      return DOMMatrixPolyfill.fromMatrix(this).multiplySelf(other);
    }

    multiplySelf(other: DOMMatrixPolyfill) {
      const a11 =
        this.m11 * other.m11 +
        this.m12 * other.m21 +
        this.m13 * other.m31 +
        this.m14 * other.m41;
      const a12 =
        this.m11 * other.m12 +
        this.m12 * other.m22 +
        this.m13 * other.m32 +
        this.m14 * other.m42;
      const a13 =
        this.m11 * other.m13 +
        this.m12 * other.m23 +
        this.m13 * other.m33 +
        this.m14 * other.m43;
      const a14 =
        this.m11 * other.m14 +
        this.m12 * other.m24 +
        this.m13 * other.m34 +
        this.m14 * other.m44;
      const a21 =
        this.m21 * other.m11 +
        this.m22 * other.m21 +
        this.m23 * other.m31 +
        this.m24 * other.m41;
      const a22 =
        this.m21 * other.m12 +
        this.m22 * other.m22 +
        this.m23 * other.m32 +
        this.m24 * other.m42;
      const a23 =
        this.m21 * other.m13 +
        this.m22 * other.m23 +
        this.m23 * other.m33 +
        this.m24 * other.m43;
      const a24 =
        this.m21 * other.m14 +
        this.m22 * other.m24 +
        this.m23 * other.m34 +
        this.m24 * other.m44;
      const a31 =
        this.m31 * other.m11 +
        this.m32 * other.m21 +
        this.m33 * other.m31 +
        this.m34 * other.m41;
      const a32 =
        this.m31 * other.m12 +
        this.m32 * other.m22 +
        this.m33 * other.m32 +
        this.m34 * other.m42;
      const a33 =
        this.m31 * other.m13 +
        this.m32 * other.m23 +
        this.m33 * other.m33 +
        this.m34 * other.m43;
      const a34 =
        this.m31 * other.m14 +
        this.m32 * other.m24 +
        this.m33 * other.m34 +
        this.m34 * other.m44;
      const a41 =
        this.m41 * other.m11 +
        this.m42 * other.m21 +
        this.m43 * other.m31 +
        this.m44 * other.m41;
      const a42 =
        this.m41 * other.m12 +
        this.m42 * other.m22 +
        this.m43 * other.m32 +
        this.m44 * other.m42;
      const a43 =
        this.m41 * other.m13 +
        this.m42 * other.m23 +
        this.m43 * other.m33 +
        this.m44 * other.m43;
      const a44 =
        this.m41 * other.m14 +
        this.m42 * other.m24 +
        this.m43 * other.m34 +
        this.m44 * other.m44;

      this.m11 = a11;
      this.m12 = a12;
      this.m13 = a13;
      this.m14 = a14;
      this.m21 = a21;
      this.m22 = a22;
      this.m23 = a23;
      this.m24 = a24;
      this.m31 = a31;
      this.m32 = a32;
      this.m33 = a33;
      this.m34 = a34;
      this.m41 = a41;
      this.m42 = a42;
      this.m43 = a43;
      this.m44 = a44;
      return this;
    }

    translate(tx: number, ty: number, tz = 0) {
      return DOMMatrixPolyfill.fromMatrix(this).translateSelf(tx, ty, tz);
    }

    translateSelf(tx: number, ty: number, tz = 0) {
      const t = new DOMMatrixPolyfill([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1]);
      return this.multiplySelf(t);
    }

    scale(sx: number, sy?: number, sz = 1) {
      return DOMMatrixPolyfill.fromMatrix(this).scaleSelf(sx, sy, sz);
    }

    scaleSelf(sx: number, sy?: number, sz = 1) {
      if (sy === undefined) sy = sx;
      const s = new DOMMatrixPolyfill([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]);
      return this.multiplySelf(s);
    }

    inverse() {
      return DOMMatrixPolyfill.fromMatrix(this).invertSelf();
    }

    invertSelf() {
      const m = [
        this.m11,
        this.m12,
        this.m13,
        this.m14,
        this.m21,
        this.m22,
        this.m23,
        this.m24,
        this.m31,
        this.m32,
        this.m33,
        this.m34,
        this.m41,
        this.m42,
        this.m43,
        this.m44,
      ];

      const inv = new Array(16);
      inv[0] =
        m[5] * m[10] * m[15] -
        m[5] * m[11] * m[14] -
        m[9] * m[6] * m[15] +
        m[9] * m[7] * m[14] +
        m[13] * m[6] * m[11] -
        m[13] * m[7] * m[10];
      inv[4] =
        -m[4] * m[10] * m[15] +
        m[4] * m[11] * m[14] +
        m[8] * m[6] * m[15] -
        m[8] * m[7] * m[14] -
        m[12] * m[6] * m[11] +
        m[12] * m[7] * m[10];
      inv[8] =
        m[4] * m[9] * m[15] -
        m[4] * m[11] * m[13] -
        m[8] * m[5] * m[15] +
        m[8] * m[7] * m[13] +
        m[12] * m[5] * m[11] -
        m[12] * m[7] * m[9];
      inv[12] =
        -m[4] * m[9] * m[14] +
        m[4] * m[10] * m[13] +
        m[8] * m[5] * m[14] -
        m[8] * m[6] * m[13] -
        m[12] * m[5] * m[10] +
        m[12] * m[6] * m[9];
      inv[1] =
        -m[1] * m[10] * m[15] +
        m[1] * m[11] * m[14] +
        m[9] * m[2] * m[15] -
        m[9] * m[3] * m[14] -
        m[13] * m[2] * m[11] +
        m[13] * m[3] * m[10];
      inv[5] =
        m[0] * m[10] * m[15] -
        m[0] * m[11] * m[14] -
        m[8] * m[2] * m[15] +
        m[8] * m[3] * m[14] +
        m[12] * m[2] * m[11] -
        m[12] * m[3] * m[10];
      inv[9] =
        -m[0] * m[9] * m[15] +
        m[0] * m[11] * m[13] +
        m[8] * m[1] * m[15] -
        m[8] * m[3] * m[13] -
        m[12] * m[1] * m[11] +
        m[12] * m[3] * m[9];
      inv[13] =
        m[0] * m[9] * m[14] -
        m[0] * m[10] * m[13] -
        m[8] * m[1] * m[14] +
        m[8] * m[2] * m[13] +
        m[12] * m[1] * m[10] -
        m[12] * m[2] * m[9];
      inv[2] =
        m[1] * m[6] * m[15] -
        m[1] * m[7] * m[14] -
        m[5] * m[2] * m[15] +
        m[5] * m[3] * m[14] +
        m[13] * m[2] * m[7] -
        m[13] * m[3] * m[6];
      inv[6] =
        -m[0] * m[6] * m[15] +
        m[0] * m[7] * m[14] +
        m[4] * m[2] * m[15] -
        m[4] * m[3] * m[14] -
        m[12] * m[2] * m[7] +
        m[12] * m[3] * m[6];
      inv[10] =
        m[0] * m[5] * m[15] -
        m[0] * m[7] * m[13] -
        m[4] * m[1] * m[15] +
        m[4] * m[3] * m[13] +
        m[12] * m[1] * m[7] -
        m[12] * m[3] * m[5];
      inv[14] =
        -m[0] * m[5] * m[14] +
        m[0] * m[6] * m[13] +
        m[4] * m[1] * m[14] -
        m[4] * m[2] * m[13] -
        m[12] * m[1] * m[6] +
        m[12] * m[2] * m[5];
      inv[3] =
        -m[1] * m[6] * m[11] +
        m[1] * m[7] * m[10] +
        m[5] * m[2] * m[11] -
        m[5] * m[3] * m[10] -
        m[9] * m[2] * m[7] +
        m[9] * m[3] * m[6];
      inv[7] =
        m[0] * m[6] * m[11] -
        m[0] * m[7] * m[10] -
        m[4] * m[2] * m[11] +
        m[4] * m[3] * m[10] +
        m[8] * m[2] * m[7] -
        m[8] * m[3] * m[6];
      inv[11] =
        -m[0] * m[5] * m[11] +
        m[0] * m[7] * m[9] +
        m[4] * m[1] * m[11] -
        m[4] * m[3] * m[9] -
        m[8] * m[1] * m[7] +
        m[8] * m[3] * m[5];
      inv[15] =
        m[0] * m[5] * m[10] -
        m[0] * m[6] * m[9] -
        m[4] * m[1] * m[10] +
        m[4] * m[2] * m[9] +
        m[8] * m[1] * m[6] -
        m[8] * m[2] * m[5];

      let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
      if (det === 0) {
        this.m11 = NaN;
        this.m12 = NaN;
        this.m13 = NaN;
        this.m14 = NaN;
        this.m21 = NaN;
        this.m22 = NaN;
        this.m23 = NaN;
        this.m24 = NaN;
        this.m31 = NaN;
        this.m32 = NaN;
        this.m33 = NaN;
        this.m34 = NaN;
        this.m41 = NaN;
        this.m42 = NaN;
        this.m43 = NaN;
        this.m44 = NaN;
        return this;
      }

      det = 1.0 / det;
      this.m11 = inv[0] * det;
      this.m12 = inv[1] * det;
      this.m13 = inv[2] * det;
      this.m14 = inv[3] * det;
      this.m21 = inv[4] * det;
      this.m22 = inv[5] * det;
      this.m23 = inv[6] * det;
      this.m24 = inv[7] * det;
      this.m31 = inv[8] * det;
      this.m32 = inv[9] * det;
      this.m33 = inv[10] * det;
      this.m34 = inv[11] * det;
      this.m41 = inv[12] * det;
      this.m42 = inv[13] * det;
      this.m43 = inv[14] * det;
      this.m44 = inv[15] * det;
      return this;
    }

    transformPoint(point?: { x?: number; y?: number; z?: number; w?: number }) {
      const x = point?.x ?? 0;
      const y = point?.y ?? 0;
      const z = point?.z ?? 0;
      const w = point?.w ?? 1;
      return {
        x: this.m11 * x + this.m21 * y + this.m31 * z + this.m41 * w,
        y: this.m12 * x + this.m22 * y + this.m32 * z + this.m42 * w,
        z: this.m13 * x + this.m23 * y + this.m33 * z + this.m43 * w,
        w: this.m14 * x + this.m24 * y + this.m34 * z + this.m44 * w,
      };
    }

    toFloat32Array() {
      return new Float32Array([
        this.m11,
        this.m12,
        this.m13,
        this.m14,
        this.m21,
        this.m22,
        this.m23,
        this.m24,
        this.m31,
        this.m32,
        this.m33,
        this.m34,
        this.m41,
        this.m42,
        this.m43,
        this.m44,
      ]);
    }

    toFloat64Array() {
      return new Float64Array([
        this.m11,
        this.m12,
        this.m13,
        this.m14,
        this.m21,
        this.m22,
        this.m23,
        this.m24,
        this.m31,
        this.m32,
        this.m33,
        this.m34,
        this.m41,
        this.m42,
        this.m43,
        this.m44,
      ]);
    }

    static fromMatrix(other: DOMMatrixPolyfill) {
      return new DOMMatrixPolyfill([
        other.m11,
        other.m12,
        other.m13,
        other.m14,
        other.m21,
        other.m22,
        other.m23,
        other.m24,
        other.m31,
        other.m32,
        other.m33,
        other.m34,
        other.m41,
        other.m42,
        other.m43,
        other.m44,
      ]);
    }

    static fromFloat32Array(arr: Float32Array) {
      return new DOMMatrixPolyfill(Array.from(arr));
    }

    static fromFloat64Array(arr: Float64Array) {
      return new DOMMatrixPolyfill(Array.from(arr));
    }
  }

  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
  (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill;
}
