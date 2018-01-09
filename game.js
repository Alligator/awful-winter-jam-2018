// input: mouse
// script: js

const MAP_PIECE_START = 225;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;
const MAP_SCRATCH_X = 210;
const MAP_SCRATCH_Y = 119;

const TILE_GRASS = 1;
const TILE_WATER = 2;
const TILE_FLOOR = 3;

const TILE_SOLID = 16;

const TILE_WALL = 17;
const TILE_MOLASSES = 18;
const TILE_INERT_MOLASSES = 34;

const SPRITE_DROPLET = 19;
const SPRITE_SURVIVOR = 20;

const maps = [
    {
	x: 30, y: 0,
	molassesStart: { x: 29, y: 0 },
    },
];

const entities = [];
for (var i = 0; i < 30 * 17; i++) {
    entities[i] = null;
}

var globals = {
    mapId: 0,
};

function GameState() {
    var self = {
	currentState: {},
    };

    self.transition = function(newState) {
	self.maybeCall(self.currentState.onExit);
	self.maybeCall(newState.onEnter);
	self.currentState = newState;
    };

    self.update = function() {
	return self.maybeCall(self.currentState.update);
    }
    self.draw = function() {
	return self.maybeCall(self.currentState.draw);
    }

    self.maybeCall = function(maybeFunction) {
	if (typeof maybeFunction === 'function') {
	    return maybeFunction();
	}
    }
    
    return self;
};

const gameState = GameState();

var populateMapState = PopulateMapState();
var buildState = BuildState(6);
var molassesState = MolassesState(10);

function jtrace(obj, pretty) {
    if (pretty) {
	trace(JSON.stringify(obj, null, 1));
    } else {
	trace(JSON.stringify(obj));
    }
}

function PopulateMapState() {
    var self = { popMapState: true };

    self.onEnter = function() {
	const map = maps[globals.mapId];
	copyMap(globals.mapId);
	mset(map.molassesStart.x, map.molassesStart.y, TILE_MOLASSES);
	self.createSurvivors();
    };

    self.createSurvivors = function() {
	const cooldown = 0;
	const range = 30;
	var numSurvivors = 10;

	while (numSurvivors) {
	    const x = Math.floor(Math.random() * 30);
	    const y = Math.floor(Math.random() * 30);

	    if (x <= 0 || x >= 29 || y <= 0 || y >= 16 || mget(x, y) !== TILE_GRASS) continue;

	    var tooClose = false;

	    forAllEntities(function(entityX, entityY, entity) {
		const dist = Math.sqrt(Math.pow(entityX - x, 2) + Math.pow(entityY - y, 2));
		if (dist < 3) tooClose = true;
	    }, 'SURVIVOR');

	    if (tooClose) continue;

	    setEntity(x, y, {
		type: 'SURVIVOR',
		sprite: SPRITE_SURVIVOR,
	    });
	    numSurvivors--;
	}
    };

    self.update = function() {
	gameState.transition(new TransitionState(60, 'get buildin\'', buildState));
	//gameState.transition(molassesState);
    };

    return self;
}

function TransitionState(time, message, nextState) {
    var self = {
	time,
	message: message,
    };

    self.update = function() {
	if (self.time > 0) {
	    self.time--;
	} else {
	    gameState.transition(nextState);
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

function BuildState(piecesToPlace, time) {
    var self = {
	currentPiece: null,
	piecesRemaining: piecesToPlace,
	placementTimer: 0,
	filled: [],
	rotation: 0,
	timeLeft: time,
    };

    const shadowColour = 15;
    const invalidShadowColour = 6;
    const flashShadowColour = 14;

    self.onEnter = function() {
	self.floodFill();
    };

    self.getRandomPiece = function() {
	const numberOfPieces = (240 - MAP_PIECE_START) / MAP_PIECE_WIDTH;
	const pieceX = Math.floor(Math.random() * numberOfPieces) * MAP_PIECE_WIDTH;
	return {
	    x: pieceX + MAP_PIECE_START,
	    y: 136 - MAP_PIECE_HEIGHT,
	};
    };

    self.checkValidPlacement = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		const coords = self.getRotatedCoords(x, y, 0, 0);
		const mx = coords.x + piece.sx/8;
		const my = coords.y + piece.sy/8;
		const mapTile = mget(mx, my);
		const entity = getEntity(mx, my);

		if (tile > 0) {
		    if (mapTile != TILE_GRASS
			|| (entity && entity.type !== 'DROPLET')
			|| mx < 0 || mx > 29
			|| my < 0 || my > 16
		    ) {
			return false;
		    }
		}
	    }
	}
	return true;
    };

    self.checkFloodTile = function(x,  y) {
	return x >= -1 && x <= 30
	    && y >= -1 && y <= 17
	    && (mget(x, y) != TILE_WALL)
	    && !(self.filled[y * 30 + x]);
    };

    self.floodFill8Recursive = function(x, y) {
	if (self.checkFloodTile(x, y)) {
	    self.filled[y * 30 + x] = true;

	    self.floodFill8Recursive(x + 1, y);
	    self.floodFill8Recursive(x - 1, y);
	    self.floodFill8Recursive(x, y + 1);
	    self.floodFill8Recursive(x, y - 1);
	    self.floodFill8Recursive(x + 1, y + 1);
	    self.floodFill8Recursive(x - 1, y - 1);
	    self.floodFill8Recursive(x - 1, y + 1);
	    self.floodFill8Recursive(x + 1, y - 1);
	}
    };

    self.setMapFromFloodFill = function() {
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 17; y++) {
		if (!(self.filled[y * 30 + x]) && mget(x, y) !== TILE_WALL) {
		    mset(x, y, TILE_FLOOR);
		} else if (mget(x, y) === TILE_FLOOR) {
		    resetMapTile(globals.mapId, x, y);
		}
	    }
	}
    };

    self.floodFill = function() {
	self.filled = [];
	self.floodFill8Recursive(0, 0);
	self.setMapFromFloodFill();
    };

    self.placeCurrentPiece = function() {
	const piece = self.currentPiece;

	for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
	    for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
		const tile = mget(piece.x + x, piece.y + y);
		if (tile) {
		    const coords = self.getRotatedCoords(x, y, piece.sx, piece.sy);
		    const mx = coords.x + piece.sx/8;
		    const my = coords.y + piece.sy/8;
		    mset(mx, my, tile);
		    if (getEntity(mx, my)) {
			setEntity(mx, my, null);
		    }
		}
	    }
	}
    }

    self.rotate = function() {
	self.rotation = (self.rotation + 90) % 360;
    }

    self.getRotatedCoords = function(x, y, tx, ty) {
	var rotationMatrix = [1, 0, 0, 1]
	switch (self.rotation) {
	    case  90: rotationMatrix = [0, 1, -1, 0]; break;
	    case 180: rotationMatrix = [-1, 0, 0, -1]; break;
	    case 270: rotationMatrix = [0, -1, 1, 0]; break;
	};

	const newX = (x * rotationMatrix[0] + y * rotationMatrix[1]) - xOffset;
	const newY = (x * rotationMatrix[2] + y * rotationMatrix[3]) - yOffset;

	return {
	    x: newX,
	    y: newY,
	};

	/*
	const xOffset = ((rotationMatrix[0] + rotationMatrix[1]) - 1);
	const yOffset = ((rotationMatrix[2] + rotationMatrix[3]) - 1);

	return {
	    x: newX,
	    y: newY,
	    sx: newX * 8 + sx,
	    sy: newY * 8 + sy,
	};
	*/
    }

    self.update = function() {
	if (self.currentPiece === null) {
	    self.currentPiece = self.getRandomPiece();
	    self.rotation = 0;
	}

	if (self.piecesRemaining <= 0 && time() > self.placementTimer) {
	    gameState.transition(new TransitionState(120, 'here come the molasses', molassesState));
	    self.piecesRemaining = piecesToPlace;
	}

	const m = mouse();
	self.currentPiece.tx = Math.floor(m[0] / 8);
	self.currentPiece.ty = Math.floor(m[1] / 8);
	/*
	self.currentPiece.sx = m[0] - MAP_PIECE_WIDTH * 4;
	self.currentPiece.sy = m[1] - MAP_PIECE_HEIGHT * 4;

	// snap
	self.currentPiece.sx -= self.currentPiece.sx % 8;
	self.currentPiece.sy -= self.currentPiece.sy % 8;
	*/

	self.validPlacement = self.checkValidPlacement();
	if (time() > self.placementTimer) {
	    if (m[2] && self.validPlacement) {
		self.placeCurrentPiece()
		self.currentPiece = null;
		self.piecesRemaining--;
		self.placementTimer = time() + 200;
		self.floodFill();
	    } else if (m[4]) {
		self.rotate();
		self.placementTimer = time() + 200;
	    }
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
		    const coords = self.getRotatedCoords(x, y);
		    //rectb(coords.sx, coords.sy, 8, 8, c);
		}
	    }
	}
    };

    self.drawFlood = function() {
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 17; y++) {
		if (!(self.filled[y * 30 + x]) && mget(x, y) !== TILE_WALL) {
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
	print(self.rotation, 0, 8);
    };

    return self;
}

function MolassesState(updates) {
    var self = {
	nextUpdate: 0,
	droplets: [],
	updates,
    };

    self.onEnter = function() {
	self.updates = updates;
	forAllEntities(function(x, y, entity) {
	    if (entity.type === 'DROPLET') {
		setEntity(x, y, null);
		mset(x, y, TILE_MOLASSES);
	    }
	});
    }

    self.lerpDroplets = function() {
	const tm = time();
	self.droplets = self.droplets.filter(function(drop) {
	    const px = Math.floor(drop.pos.x/8);
	    const py = Math.ceil(drop.pos.y/8);

	    if (mget(px, py) === TILE_WALL) {
		// destroy the wall and disappear
		mset(px, py, mget(px + 30, py));
		return false;
	    }

	    if (tm > drop.time && mget(px, py) !== TILE_FLOOR) {
		setEntity(drop.target.x/8, drop.target.y/8, {
		    type: 'DROPLET',
		    sprite: SPRITE_DROPLET,
		});
		return false;
	    }
	    const t = (tm - drop.startTime) / (drop.time - drop.startTime);
	    drop.pos.x = drop.orig.x + t * (drop.target.x - drop.orig.x);
	    drop.pos.y = drop.orig.y + t * (drop.target.y - drop.orig.y);
	    return true;
	});
    };

    self.isValidDropletPlacement = function(x, y) {
	const tile = mget(x, y);
	const isWithinBounds = x >= 0 && y >= 0 && x < 30 && y < 17;
	return !self.isMolasses(x, y) && isWithinBounds;
    };

    self.isMolasses = function(x, y) {
	const tile = mget(x, y);
	return tile === TILE_MOLASSES || tile === TILE_INERT_MOLASSES;
    }

    self.spread = function() {
	for (var x = 0; x < 30; x++) {
	    for (var y = 0; y < 30; y++) {
		if (mget(x, y) != TILE_MOLASSES) continue;
		if (Math.random() > 0.5) continue;

		if ((x > 0 && self.isMolasses(x-1, y))
		    && (x < 30 && self.isMolasses(x+1, y))
		    && (y > 0 && self.isMolasses(x, y-1))
		    && (y < 17 && self.isMolasses(x, y+1))) {
		    // this tile is entirely surrounded
		    mset(x, y, TILE_INERT_MOLASSES);
		    continue;
		}

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
		    const entity = getEntity(nextX, nextY);
		    if (entity && entity.type === 'DROPLET') {
			setEntity(nextX, nextY, null);
		    }
		}

		var dropletChance = 0.15;
		if (mget(nextX, nextY) === TILE_WALL) {
		    // if the molasses tries to flow into a wall, make
		    // it more likely to create a droplet
		    dropletChance = 0.3;
		}

		// droplets, very low chance
		if (Math.random() < dropletChance) {
		    const distance = 12;
		    const dropX = Math.floor(Math.random() * distance) - (distance/2) + x;
		    const dropY = Math.floor(Math.random() * distance) - (distance/2) + y;
		    if (self.isValidDropletPlacement(dropX, dropY)) {
			const t = time();
			self.droplets.push({
			    pos: {},
			    orig: { x: x * 8, y: y * 8 },
			    target: { x: dropX * 8, y: dropY * 8 },
			    time: t + 500,
			    startTime: t,
			});
		    }
		}
	    }
	}
    };

    self.moveSurvivors = function() {
	// move away from the molasses, but it could spread randomly
	// so i somehow need to figure out what direction they should
	// run in then do a weighted random chance of them actually
	// running in that x/y direction

	// or they could just search nearby and run away if it's close?
	const molassesStart = maps[globals.mapId];
	forAllEntities(function(x, y, entity) {
	    const rx = Math.random();
	    const ry = Math.random();

	    var nextX;
	    if (rx > 0.75) {
		// run away
		nextX = x + (molassesStart.x > x ? -1 : 1);
	    } else {
		nextX = x + Math.floor(rx * 3) - 1;
	    }

	    var nextY;
	    if (ry > 0.75) {
		// run away
		nextY = y + (molassesStart.y > y ? -1 : 1);
	    } else {
		nextY = y + Math.floor(ry * 3) - 1;
	    }

	    const tile = mget(nextX, nextY);
	    if (!getEntity(nextX, nextY)
		&& nextX > 0 && nextX < 29
		&& nextY > 0 && nextY < 16
		&& (tile === TILE_GRASS || tile === TILE_FLOOR)) {
		setEntity(x, y, null);
		setEntity(nextX, nextY, entity);
	    }
	}, 'SURVIVOR');
    };

    self.update = function() {
	if (time() > self.nextUpdate && self.droplets.length === 0) {
	    if (self.updates === 0) {
		gameState.transition(buildState);
		return;
	    }
	    self.spread();
	    // FIXME garbage
	    if (self.updates % 2 === 0) {
		self.moveSurvivors();
	    }
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
// MAP
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

// ---------------------------------------------------
// ENTITIES
function forAllEntities(fn, filter) {
    const tm = Math.floor(time());

    for (var i = 0; i < 30 * 17; i++) {
	const x = i % 30;
	const y = Math.floor(i / 30);
	if (entities[i]) {
	    if (entities[i].updated !== tm && (!filter || entities[i].type === filter)) {
		fn(x, y, entities[i]);
	    }
	}
    }
}

function getEntity(x, y) {
    return entities[y * 30 + x];
}

function setEntity(x, y, entity) {
    if (entity) {
	entity.updated = Math.floor(time());
    }
    entities[y * 30 + x] = entity;
}

function drawEntities() {
    forAllEntities(function(x, y, entity) {
	spr(entity.sprite, x*8, y*8, 0);
    });
}

// ---------------------------------------------------
// TIC STUFF
function init() {
    gameState.transition(populateMapState);
}
init()

function update() {
    gameState.update();
}

function draw() {
    cls(0);
    gameState.draw();
}

function TIC() {
    try {
	update();
	draw();
    } catch (e) {
	// thanks tic-80
	trace(e.lineNumber + ': ' + e);
	exit();
    }
}
