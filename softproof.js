// sample token hash/id - REMOVE
let tokenData = "";
for (let i = 0; i < 66; i++) {
	tokenData = tokenData + (Math.floor(Math.random() * 16)).toString(16);
}
//tokenData = tokenData.hash

let R, w, h, m;
let t, h1, h2, h3, h4, s, l, c1, c2, c3, c4, ca, cb, c;

function setup() {
	R = new Random();
	w = window.innerWidth;
	h = window.innerHeight;
	if (h/w > 1.5) {
		h = 1.5 * w;
	} else {
		w = h/1.5;
	}
    m = w/16;
	colorMode(HSL);
	t = 30;
    pickColors();
	while (spread(h1, h3) < t || spread(h2, h4) < t) {
		pickColors();
	}
    s = 100;
	l = 94;
	c1 = color(h1, s, l);
	c2 = color(h2, s, l);
	c3 = color(h3, s, l);
	c4 = color(h4, s, l);
	createCanvas(w, h);
	background(100);
	noStroke();
}

function draw() {
	colorMode(RGB);
	for (let y = 0; y <= h/2 - m; y++) {
		for (let x = 0; x <= w/2 - m; x++) {
			ca = betterLerp(c1, c2, x/(w/2 - m));
			cb = betterLerp(c3, c4, x/(w/2 - m));
			c = betterLerp(ca, cb, y/(h/2 - m));
			fill(c);
			rect(2 * x + m, 2 * y + m, 2, 2);
		}
	}
	noLoop();
}

function pickColors() {
    if (R.random_bool(0.5)) {
        h1 = R.random_int(180, 420) % 360;
    } else {
        h1 = R.random_int(180, 540) % 360;
    }
    if (R.random_bool(0.5)) {
        h2 = R.random_int(180, 420) % 360;
    } else {
        h2 = R.random_int(180, 540) % 360;
    }
    if (R.random_bool(0.5)) {
        h3 = R.random_int(180, 420) % 360;
    } else {
        h3 = R.random_int(180, 540) % 360;
    }
    if (R.random_bool(0.5)) {
        h4 = R.random_int(180, 420) % 360;
    } else {
        h4 = R.random_int(180, 540) % 360;
    }
}

function spread(a, b) {
	let sp = Math.min(abs(a - b), abs(a - b - 360), abs(a - b + 360));
	return sp;
}

function keyTyped() {
  if (key === 's') {
		w = 4800;
		h = 7200;
		resizeCanvas(w, h, true);
		background(100);
		redraw();
		saveCanvas(tokenData, 'png'); //change to tokenId
		setup();
		redraw();
	}
}

function rgbToLab(c) {
  let r = red(c) / 255;
  let g = green(c) / 255;
  let b = blue(c) / 255;
  if (r > 0.04045) {
    r = Math.pow((r + 0.055) / 1.055, 2.4);
  } else {
    r = r / 12.92;
  }
  if (g > 0.04045) {
    g = Math.pow((g + 0.055) / 1.055, 2.4);
  } else {
    g = g / 12.92;
  }
  if (b > 0.04045) {
    b = Math.pow((b + 0.055) / 1.055, 2.4);
  } else {
    b = b / 12.92;
  }
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;
	x = x / 95.047;
	y = y / 100;
	z = z / 108.883;
  if (x > 0.008856) {
    x = Math.pow(x, 1 / 3);
  } else {
    x = (7.787 * x) + 16 / 116;
  }
  if (y > 0.008856) {
    y = Math.pow(y, 1 / 3);
  } else {
    y = (7.787 * y) + 16 / 116;
  }
  if (z > 0.008856) {
    z = Math.pow(z, 1 / 3);
  } else {
    z = (7.787 * z) + 16 / 116;
  }
  let cl = (116 * y) - 16;
  let ca = 500 * (x - y);
  let cb = 200 * (y - z);
  return [cl, ca, cb];
}

function labToRgb(a) {
  let cl = a[0];
  let ca = a[1];
  let cb = a[2];
  let y = (cl + 16) / 116;
  let x = ca / 500 + y;
  let z = y - cb / 200;
  if (Math.pow(y, 3) > 0.008856) {
    y = Math.pow(y, 3);
  } else {
    y = (y - 16 / 116) / 7.787;
  }
  if (Math.pow(x, 3) > 0.008856) {
    x = Math.pow(x, 3);
  } else {
    x = (x - 16 / 116) / 7.787;
  }
  if (Math.pow(z, 3) > 0.008856) {
    z = Math.pow(z, 3);
  } else {
    z = (z - 16 / 116) / 7.787;
  }
  x = x * 95.047;
  y = y * 100;
  z = z * 108.883;
  let r = (x * 3.2406 + y * -1.5372 + z * -0.4986) / 100;
  let g = (x * -0.9689 + y * 1.8758 + z * 0.0415) / 100;
  let b = (x * 0.0557 + y * -0.2040 + z * 1.0570) / 100;
  if (r > 0.0031308) {
    r = 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
  } else {
    r = 12.92 * r;
  }
  if (g > 0.0031308) {
    g = 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
  } else {
    g = 12.92 * g;
  }
  if (b > 0.0031308) {
    b = 1.055 * Math.pow(b, 1 / 2.4) - 0.055;
  } else {
    b = 12.92 * b;
  }
  r = r * 255
  g = g * 255
  b = b * 255
  return color(Math.round(r), Math.round(g), Math.round(b));
}

// thank you easyrgb.com for the conversion formulas

function betterLerp(col1, col2, t) {
  let arr1 = rgbToLab(col1);
  let arr2 = rgbToLab(col2);
  let lab = [];
	lab[0] = arr1[0] + t * (arr2[0] - arr1[0]);
	lab[1] = arr1[1] + t * (arr2[1] - arr1[1]);
	lab[2] = arr1[2] + t * (arr2[2] - arr1[2]);
  return labToRgb(lab);
}

class Random {
  constructor() {
    this.useA = false;
    let sfc32 = function (uint128Hex) {
      let a = parseInt(uint128Hex.substr(0, 8), 16);
      let b = parseInt(uint128Hex.substr(8, 8), 16);
      let c = parseInt(uint128Hex.substr(16, 8), 16);
      let d = parseInt(uint128Hex.substr(24, 8), 16);
      return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    };
    this.prngA = new sfc32(tokenData.substr(2, 32));
    this.prngB = new sfc32(tokenData.substr(34, 32));
    for (let i = 0; i < 1e6; i += 2) {
      this.prngA();
      this.prngB();
    }
  }
  random_dec() {
    this.useA = !this.useA;
    return this.useA ? this.prngA() : this.prngB();
  }
  random_num(a, b) {
    return a + (b - a) * this.random_dec();
  }
  random_int(a, b) {
    return Math.floor(this.random_num(a, b + 1));
  }
  random_bool(p) {
    return this.random_dec() < p;
  }
  random_choice(list) {
    return list[this.random_int(0, list.length - 1)];
  }
}