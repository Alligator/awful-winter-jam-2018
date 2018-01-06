// input: mouse
// script: js

const MAP_PIECE_START = 225;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GRASS = 1;
const TILE_WATER = 2;
const TILE_FLOOR = 3;
const TILE_WALL = 17;

const TILE_SOLID = 16;

const COLOR_US = 1;
const COLOR_THEM = 3;

var globals = {
};

var currentState = null;

function BuildState() {
    var self = {
	currentPiece: null,
	piecesRemaining: 15,
	filled: {},
    };

    self.getRandomPiece = function() {
	const numberOfPieces = (240 - MAP_PIECE_START) / MAP_PIECE_WIDTH;
	const pieceX = Math.floor(Math.random() * numberOfPieces) * MAP_PIECE_WIDTH;
	return { x: pieceX + MAP_PIECE_START, y: 136 - MAP_PIECE_HEIGHT };
    };

    self.checkValidPlacement = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		const mapTile = mget(
		    x + piece.sx/8,
		    y + piece.sy/8
		);
		if (tile > 0 && mapTile != TILE_GRASS) {
		    return false;
		}
	    }
	}
	return true;
    };

    self.checkFloodTile = function(x,  y) {
	return x >= 0 && x < 30
	    && y >= 0 && y < 17
	    && mget(x, y) <= TILE_SOLID
	    && !(self.filled[x] && self.filled[x][y]);
    };

    self.floodFill = function() {
	var q = [{ x: 0, y: 0 }];
	self.filled = {};

	while (q.length) {
	    const newq = [];
	    for (var i = 0; i < q.length; i++) {
		const node = q[i];

		var west = { x: node.x, y: node.y };
		while (self.checkFloodTile(west.x, west.y)) {
		    west.x--;
		}

		var east = { x: node.x, y: node.y };
		while (self.checkFloodTile(east.x, east.y)) {
		    east.x++
		}

		for (var x = west.x + 1; x < east.x; x++) {
		    if (!self.filled[x]) {
			self.filled[x] = {};
		    }
		    self.filled[x][node.y] = true;

		    if (node.y > 0 && mget(x, node.y - 1) <= TILE_SOLID) {
			if (!self.filled[x][node.y - 1]) {
			    newq.push({ x, y: node.y - 1 });
			}
		    }

		    if (node.y < 17 && mget(x, node.y + 1) <= TILE_SOLID) {
			if (!self.filled[x][node.y + 1]) {
			    newq.push({ x, y: node.y + 1 });
			}
		    }
		}
	    }
	    q = newq;
	}
    };

    self.placeCurrentPiece = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		if (tile) {
		    mset(
			x + piece.sx/8,
			y + piece.sy/8,
			tile
		    );
		}
	    }
	}
    }

    self.update = function() {
	if (self.currentPiece === null) {
	    self.currentPiece = self.getRandomPiece();
	}

	const m = mouse();
	self.currentPiece.sx = m[0] - MAP_PIECE_WIDTH * 4;
	self.currentPiece.sy = m[1] - MAP_PIECE_HEIGHT * 4;

	// snap
	self.currentPiece.sx -= self.currentPiece.sx % 8;
	self.currentPiece.sy -= self.currentPiece.sy % 8;

	self.validPlacement = self.checkValidPlacement();
	if (m[2] && self.validPlacement) {
	    self.placeCurrentPiece()
	    self.floodFill();
	    self.currentPiece = null;
	    self.piecesRemaining--;
	}
    };

    self.drawShadow = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		if (tile) {
		    rectb(x * 8 + piece.sx, y * 8+ piece.sy, 8, 8, self.validPlacement ? 15 : 6);
		}
	    }
	}
    };

    self.drawFlood = function() {
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 17; y++) {
		if (!(self.filled[x] && self.filled[x][y]) && mget(x, y) !== TILE_WALL) {
		    rectb(x * 8, y * 8, 8, 8, 13);
		}
	    }
	}
    };

    self.draw = function() {
	const piece = self.currentPiece;
	if (piece) {
	    self.drawShadow();
	}
	print(self.piecesRemaining);
	self.drawFlood();
    };

    self.floodFill();

    return self;
}

function ValidationState() {
    var self = {};

    return self;
}

function init() {
    currentState = BuildState();
    for (var i = 0; i < 17; i++) {
	const rowStart = 0x8000 + (i * 30 * 8);
	memcpy(rowStart, rowStart + 30, 30); 
    }
}
init();

function update() {
    try {
	currentState.update();
    } catch (e) {
	// thanks tic-80
	trace(e.lineNumber + ': ' + e);
	exit();
    }
}

function draw() {
    cls(0);
    drawMap();
    currentState.draw();
}

function TIC() {
    update();
    draw();
}

function drawMap() {
    map(0, 0, 30, 17, 0, 0);
}

