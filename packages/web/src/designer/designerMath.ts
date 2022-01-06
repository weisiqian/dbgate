interface IPoint {
  x: number;
  y: number;
}

interface IBoxBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// export class Vector {
//   constructor(public x: number, public y: number) {}

//   static random() {
//     return new Vector(10.0 * (Math.random() - 0.5), 10.0 * (Math.random() - 0.5));
//   }

//   add(v2: Vector) {
//     return new Vector(this.x + v2.x, this.y + v2.y);
//   }

//   subtract(v2: Vector) {
//     return new Vector(this.x - v2.x, this.y - v2.y);
//   }

//   multiply(n: number) {
//     return new Vector(this.x * n, this.y * n);
//   }

//   divide(n: number) {
//     return new Vector(this.x / n || 0, this.y / n || 0); // Avoid divide by zero errors..
//   }

//   magnitude() {
//     return Math.sqrt(this.x * this.x + this.y * this.y);
//   }

//   normal(n: number) {
//     return new Vector(-this.y, this.x);
//   }

//   normalise() {
//     return this.divide(this.magnitude());
//   }
// }

// helpers for figuring out where to draw arrows
export function intersectLineLine(p1: IPoint, p2: IPoint, p3: IPoint, p4: IPoint): IPoint {
  var denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  // lines are parallel
  if (denom === 0) {
    return null;
  }

  var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null;
  }

  return {
    x: p1.x + ua * (p2.x - p1.x),
    y: p1.y + ua * (p2.y - p1.y),
  };
}

export function intersectLineBox(p1: IPoint, p2: IPoint, box: IBoxBounds): IPoint {
  var tl = { x: box.left, y: box.top };
  var tr = { x: box.right, y: box.top };
  var bl = { x: box.left, y: box.bottom };
  var br = { x: box.right, y: box.bottom };

  var result;
  if ((result = intersectLineLine(p1, p2, tl, tr))) {
    return result;
  } // top
  if ((result = intersectLineLine(p1, p2, tr, br))) {
    return result;
  } // right
  if ((result = intersectLineLine(p1, p2, br, bl))) {
    return result;
  } // bottom
  if ((result = intersectLineLine(p1, p2, bl, tl))) {
    return result;
  } // left

  return null;
}
