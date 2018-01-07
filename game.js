// input: mouse
// script: js

const MAP_PIECE_START = 225;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GRASS = 1;
const TILE_WATER = 2;
const TILE_FLOOR = 3;

const TILE_SOLID = 16;

const TILE_WALL = 17;
const TILE_MOLASSES = 18;

const SPRITE_DROPLET = 19;

const maps = [
    { x: 30, y: 0 },
];

const entities = [];
for (var x = 0; x < 30; x++) {
    entities[x] = [];
    for (var y = 0; y < 17; y++) {
	entities[x][y] = null;
    }
}

var globals = {
    mapId: 0,
};

var currentState = null;
var buildState = BuildState();
var molassesState = MolassesState(6);

// round states
// 1. build
// 2. transition
// 3. molasses spread & droplets
// 4. transition
// 5. defend

function jtrace(obj, pretty) {
    if (pretty) {
	trace(JSON.stringify(obj, null, 1));
    } else {
	trace(JSON.stringify(obj));
    }
}

function TransitionState(time, message, nextState) {
    var self = {
	time: time,
	message: message,
    };

    self.update = function() {
	if (self.time > 0) {
	    self.time--;
	} else {
	    currentState = nextState;
	}
    }

    self.draw = function() {
	cls(0);

	// print message offscreen, print returns the width of the printed text
	const width = print(self.message, 0, -6);
	print(self.message, (240 - width) / 2, (136 - 6) / 2);
    }

    return self;
}

function BuildState() {
    var self = {
	currentPiece: null,
	piecesRemaining: 8,
	placementTimer: 0,
	filled: {},
    };

    const shadowColour = 15;
    const invalidShadowColour = 6;
    const flashShadowColour = 14;

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
		const mx = x + piece.sx/8;
		const my = y + piece.sy/8;
		const mapTile = mget(mx, my);

		if (tile > 0) {
		    if (mapTile != TILE_GRASS
			|| mx < 1 || mx >= 29
			|| my < 1 || my >= 16
		    ) {
			return false;
		    }
		}
	    }
	}
	return true;
    };

    self.checkFloodTile = function(x,  y) {
	return x >= 0 && x < 30
	    && y >= 0 && y < 17
	    && (mget(x, y) <= TILE_SOLID || mget(x, y) === TILE_MOLASSES)
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

		    if (node.y > 0 && self.checkFloodTile(x, node.y - 1)) {
			if (!self.filled[x][node.y - 1]) {
			    newq.push({ x, y: node.y - 1 });
			}
		    }

		    if (node.y < 17 && self.checkFloodTile(x, node.y + 1)) {
			if (!self.filled[x][node.y + 1]) {
			    newq.push({ x, y: node.y + 1 });
			}
		    }
		}
	    }
	    q = newq;
	}

	// now set the tiles
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 17; y++) {
		if (!(self.filled[x] && self.filled[x][y]) && mget(x, y) !== TILE_WALL) {
		    mset(x, y, TILE_FLOOR);
		} else if (mget(x, y) === TILE_FLOOR) {
		    resetMapTile(globals.mapId, x, y);
		}
	    }
	}
    };

    self.placeCurrentPiece = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		if (tile) {
		    const mx = x + piece.sx/8;
		    const my = y + piece.sy/8;
		    mset(mx, my, tile);
		    if (entities[mx][my]) {
			entities[mx][my] = null;
		    }
		}
	    }
	}
    }

    self.update = function() {
	if (self.currentPiece === null) {
	    self.currentPiece = self.getRandomPiece();
	}

	if (self.piecesRemaining === 0 && time() > self.placementTimer) {
	    molassesState.roundReset();
	    currentState = new TransitionState(120, 'here come the molasses', molassesState);
	    self.piecesRemaining = 5;
	}

	const m = mouse();
	self.currentPiece.sx = m[0] - MAP_PIECE_WIDTH * 4;
	self.currentPiece.sy = m[1] - MAP_PIECE_HEIGHT * 4;

	// snap
	self.currentPiece.sx -= self.currentPiece.sx % 8;
	self.currentPiece.sy -= self.currentPiece.sy % 8;

	self.floodFill();

	self.validPlacement = self.checkValidPlacement();
	if (m[2] && self.validPlacement && time() > self.placementTimer) {
	    self.placeCurrentPiece()
	    self.currentPiece = null;
	    self.piecesRemaining--;
	    self.placementTimer = time() + 200;
	}
    };

    self.drawShadow = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		if (tile) {
		    var c = shadowColour;
		    if (!self.validPlacement) {
			c = invalidShadowColour;
		    } else if (self.piecesRemaining === 1) {
			c = time() % 250 < 125 ? shadowColour : flashShadowColour;
		    } else {
			c = shadowColour;
		    }
		    rectb(x * 8 + piece.sx, y * 8+ piece.sy, 8, 8, c);
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
	drawMap();
	drawEntities();

	// self.drawFlood();
	if (self.currentPiece && self.piecesRemaining > 0) {
	    self.drawShadow();
	}
	print(self.piecesRemaining);
    };

    self.floodFill();

    return self;
}

function MolassesState(updates) {
    var self = {
	nextUpdate: 0,
	droplets: [],
	updates,
    };

    self.roundReset = function() {
	self.updates = updates;
	forAllEntities(function(x, y, entity) {
	    if (entity.type === 'DROPLET') {
		entities[x][y] = null;
		mset(x, y, TILE_MOLASSES);
	    }
	});
    }

    self.lerpDroplets = function() {
	const tm = time();
	self.droplets = self.droplets.filter(function(drop) {
	    const px = Math.floor(drop.pos.x/8);
	    const py = Math.floor(drop.pos.y/8);

	    if (mget(px, py) === TILE_WALL) {
		// destroy the wall and disappear
		mset(px, py, mget(px + 30, py));
		return false;
	    }

	    if (tm > drop.time) {
		entities[drop.target.x/8][drop.target.y/8] = {
		    type: 'DROPLET',
		    sprite: SPRITE_DROPLET,
		};
		return false;
	    }
	    const t = (tm - drop.startTime) / (drop.time - drop.startTime);
	    trace(tm);
	    trace(t);
	    drop.pos.x = drop.pos.x + t * (drop.target.x - drop.pos.x);
	    drop.pos.y = drop.pos.y + t * (drop.target.y - drop.pos.y);
	    return true;
	});
    };

    self.spread = function() {
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 30; y++) {
		if (mget(x, y) != TILE_MOLASSES) continue;
		if (Math.random() > 0.5) continue;

		const direction = Math.floor(Math.random() * 4);
		var nextX;
		var nextY;

		switch (direction) {
		    case 0: nextX = x + 1; nextY = y;     break;
		    case 1: nextX = x;     nextY = y + 1; break;
		    case 2: nextX = x - 1; nextY = y;     break;
		    case 3: nextX = x;     nextY = y - 1; break;
		}

		if (mget(nextX, nextY) <= TILE_SOLID) {
		    mset(nextX, nextY, TILE_MOLASSES);
		}

		// droplets, very low chance
		if (Math.random() < 0.1) {
		    const distance = 12;
		    const dropX = Math.floor(Math.random() * distance) - (distance/2) + x;
		    const dropY = Math.floor(Math.random() * distance) - (distance/2) + y;
		    if (mget(dropX, dropY) === TILE_MOLASSES
			|| dropX < 0 || dropY < 0 || dropX >= 30 || dropY >= 17
		       ) continue;
		    const t = time();
		    self.droplets.push({
			pos: { x: x * 8, y: y * 8 },
			target: { x: dropX * 8, y: dropY * 8 },
			time: t + 500,
			startTime: t,
		    });
		}
	    }
	}
    };

    self.update = function() {
	if (time() > self.nextUpdate && self.droplets.length === 0) {
	    if (self.updates === 0) {
		currentState = buildState;
		return;
	    }
	    self.spread();
	    self.nextUpdate = time() + 250;
	    self.updates--;
	}
	self.lerpDroplets();
    };

    self.draw = function() {
	drawMap();
	drawEntities();
	print(self.droplets.length);
	self.droplets.forEach(function(drop) {
	    spr(SPRITE_DROPLET, drop.pos.x, drop.pos.y, 0);
	});
    };
    
    return self;
}

// ---------------------------------------------------
function copyMap(mapId) {
    const map = maps[mapId];
    for (var i = 0; i < 17; i++) {
	// TODO support maps not at y = 0
	const rowStart = 0x8000 + (i * 30 * 8);
	memcpy(rowStart, rowStart + map.x, 30); 
    }
}

function resetMapTile(mapId, x, y) {
    // TODO support maps that aren't on y = 0
    const map = maps[mapId];
    mset(x, y, mget(x + maps.x, y));
}

function drawMap() {
    map(0, 0, 30, 17, 0, 0);
}

function forAllEntities(fn) {
    for (var x = 0; x < 30; x++) {
	for (var y = 0; y < 17; y++) {
	    if (entities[x][y]) {
		fn(x, y, entities[x][y]);
	    }
	}
    }
}

function drawEntities() {
    forAllEntities(function(x, y, entity) {
	spr(entity.sprite, x*8, y*8, 0);
    });
}

// ---------------------------------------------------
function init() {
    currentState = buildState;
    copyMap(globals.mapId);
    mset(29, 0, TILE_MOLASSES);
}
init()

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
    currentState.draw();
}

function TIC() {
    update();
    draw();
}
