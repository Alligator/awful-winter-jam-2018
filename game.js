// script: js

const MAP_SCRATCH_X = 210;
const MAP_SCRATCH_Y = 119;
const MAP_PIECE_START = 225;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GRASS = 1;
const TILE_WATER = 2;
const TILE_FLOOR = 9;

const TILE_WALL = 3;
const TILE_WALL_CRACKED = TILE_WALL + 1;
const TILE_MOLASSES = 5;
const TILE_INERT_MOLASSES = 6;

const TYPE_FLOOR = 100;
const TYPE_WALL = 101;
const TYPE_ENCLOSED = 102;
const TYPE_MOLASSES = 103;
const TYPE_SPREADABLE = 104;

const tileTypes = {};
tileTypes[TILE_GRASS]          = TYPE_FLOOR;
tileTypes[TILE_WATER]          = TYPE_SPREADABLE;
tileTypes[TILE_FLOOR]          = TYPE_ENCLOSED;

tileTypes[TILE_WALL]           = TYPE_WALL;
tileTypes[TILE_WALL_CRACKED]   = TYPE_WALL;

tileTypes[TILE_MOLASSES]       = TYPE_MOLASSES;
tileTypes[TILE_INERT_MOLASSES] = TYPE_MOLASSES;

const SPRITE_DROPLET = 17;
const SPRITE_SURVIVOR = 18;

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
    paused: false,
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
var buildState = BuildState(60, 15);
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

            if (x <= 0 || x >= 29 || y <= 0 || y >= 16 || tileTypes[mget(x, y)] !== TYPE_FLOOR) continue;

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
        // gameState.transition(molassesState);
    };

    return self;
}

function TransitionState(delay, message, nextState) {
    var self = {
        delay,
        message: message,
    };

    self.update = function() {
        if (self.delay > 0) {
            self.delay--;
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

function BuildState(piecesToPlace, timeToPlace) {
    var self = {
        hasPiece: false,
        piecesRemaining: piecesToPlace,
        placementTimer: 0,
        filled: [],
        visited: {},
        rotation: 0,
        mouseTileX: 0,
        mouseTileY: 0,
        endTime: 0,
    };

    const shadowColour = 15;
    const invalidShadowColour = 6;
    const flashShadowColour = 12;

    const filledWidth = 32;
    const filledHeight = 19;

    self.onEnter = function() {
        self.endTime = time() + timeToPlace * 1000;
        self.floodFill();
    };

    self.getRandomPiece = function() {
        const numberOfPieces = (240 - MAP_PIECE_START) / MAP_PIECE_WIDTH;
        const pieceX = Math.floor(Math.random() * numberOfPieces) * MAP_PIECE_WIDTH;
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_PIECE_START + pieceX + x, (136 - MAP_PIECE_HEIGHT) + y);
                mset(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y, tile ? TILE_WALL : 0);
            }
        }
    };

    self.checkValidPlacement = function() {
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                const mx = x + self.mouseTileX;
                const my = y + self.mouseTileY;
                const mapTile = mget(mx, my);
                const entity = getEntity(mx, my);

                if (tile > 0) {
                    if ((tileTypes[mapTile] != TYPE_FLOOR && tileTypes[mapTile] !== TYPE_ENCLOSED)
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
        if (x == 0 || x == 31 || y == 0 || y == 18) {
            return true;
        }
        
        return tileTypes[mget(x-1, y-1)] != TYPE_WALL;
    };

    self.floodFill8Recursive = function(x, y, visited) {
        if ( x < 0 || x > 31 || y < 0 || y > 18) {
            return;
        }

        if (self.visited[y * 32 + x]) {
            return;
        }

        self.visited[y * 32 + x] = true;

        if (!self.checkFloodTile(x, y)) {
            return
        }

        self.filled[y * 32 + x] = true;

        self.floodFill8Recursive(x + 1, y);
        self.floodFill8Recursive(x - 1, y);
        self.floodFill8Recursive(x, y + 1);
        self.floodFill8Recursive(x, y - 1);
        self.floodFill8Recursive(x + 1, y + 1);
        self.floodFill8Recursive(x - 1, y - 1);
        self.floodFill8Recursive(x - 1, y + 1);
        self.floodFill8Recursive(x + 1, y - 1);
    };

    self.getFilled = function(x, y) {
        return self.filled[(y + 1) * filledWidth + (x + 1)];
    };

    self.setMapFromFloodFill = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                if (!self.getFilled(x, y) && tileTypes[mget(x, y)] !== TYPE_WALL) {
                    mset(x, y, TILE_FLOOR);
                } else if (tileTypes[mget(x, y)] === TYPE_ENCLOSED) {
                    resetMapTile(globals.mapId, x, y);
                }
            }
        }
    };

    self.floodFill = function() {
        self.visited = {};
        self.filled = new Array(filledWidth * filledHeight);
        self.floodFill8Recursive(0, 0, []);
        self.setMapFromFloodFill();
    };

    self.placeCurrentPiece = function() {
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                if (tile) {
                    const mx = x + self.mouseTileX;
                    const my = y + self.mouseTileY;
                    mset(mx, my, tile);
                    if (getEntity(mx, my)) {
                        setEntity(mx, my, null);
                    }
                }
            }
        }
    }

    self.rotate = function() {
        // just rotate 90, duh
        const newTiles = [];

        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const rotateX = (-y) + 2;
                const rotateY = x;
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                if (tile) {
                    newTiles.push({
                        x: MAP_SCRATCH_X + rotateX,
                        y: MAP_SCRATCH_Y + rotateY,
                        tile,
                    });
                    mset(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y, 0);
                }
            }
        }

        for (var i = 0; i < newTiles.length; i++) {
            mset(newTiles[i].x, newTiles[i].y, newTiles[i].tile);
        }
    }

    self.update = function() {
        if (time() > self.endTime) {// || (self.piecesRemaining <= 0 && time() > self.placementTimer)) {
            gameState.transition(new TransitionState(120, 'here come the molasses', molassesState));
            self.piecesRemaining = piecesToPlace;
        }

        if (!self.hasPiece) {
            self.getRandomPiece();
            self.hasPiece = true;
            self.rotation = 0;
        }

        const m = mouse();
        self.mouseTileX = Math.floor(m[0] / 8) - 1;
        self.mouseTileY = Math.floor(m[1] / 8) - 1;

        self.validPlacement = self.checkValidPlacement();
        if (time() > self.placementTimer) {
            if (m[2] && self.validPlacement) {
                self.placeCurrentPiece()
                self.hasPiece = false;
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
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                if (tile) {
                    var c = shadowColour;
                    if (!self.validPlacement) {
                        c = invalidShadowColour;
                    } else if (self.endTime - time() < 5000) {
                        c = time() % 250 < 125 ? shadowColour : flashShadowColour;
                    } else {
                        c = shadowColour;
                    }
                    rectb((self.mouseTileX + x) * 8, (self.mouseTileY + y) * 8, 8, 8, c);
                }
            }
        }
    };

    self.drawFlood = function() {
        var len = self.filled.length
        for (var i = 0; i < self.filled.length; i++) {
            pix(44 + (i % 32), 44 + Math.floor(i / 32), self.filled[i] === true ? 13 : 3);
        }
    };

    self.drawTime = function() {
        const tm = ((self.endTime - time()) / 1000).toFixed(0);
        print(tm, 10, 0, 15, 1, 2);
    };

    self.draw = function() {
        drawMap();
        drawEntities();

        if (self.hasPiece && self.piecesRemaining > 0) {
            self.drawShadow();
        }
        self.drawTime();

        self.drawFlood();
        //print(self.piecesRemaining);
        //print(self.rotation, 0, 8);
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

            if (tileTypes[mget(px, py)] === TYPE_WALL) {
                // destroy the wall and disappear
                const tile = mget(px, py);
                const health = tile - TILE_WALL;
                if (health === 1) {
                    mset(px, py, mget(px + 30, py));
                } else {
                    mset(px, py, tile - 1);
                }
                return false;
            }

            if (tm > drop.time && tileTypes[mget(px, py)] !== TYPE_FLOOR) {
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
        const tile = tileTypes[mget(x, y)];
        return tile === TYPE_MOLASSES;
    };

    self.isSurrounded = function(x, y) {
        return ((x > 0 && self.isMolasses(x-1, y))
                && (x < 30 && self.isMolasses(x+1, y))
                && (y > 0 && self.isMolasses(x, y-1))
                && (y < 17 && self.isMolasses(x, y+1)));
    };

    self.forNeighbours = function(x, y, fn) {
        if (x > 0)  fn(x-1, y);
        if (x < 30) fn(x+1, y);
        if (y > 0)  fn(x, y+1);
        if (y < 17) fn(x, y-1);
    };

    self.spread = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 30; y++) {
                if (tileTypes[mget(x, y)] != TYPE_MOLASSES) continue;
                if (Math.random() > 0.5) continue;

                if (self.isSurrounded(x, y)) {
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

                const t = tileTypes[mget(nextX, nextY)];
                if (t === TYPE_FLOOR || t === TYPE_SPREADABLE) {
                    mset(nextX, nextY, TILE_MOLASSES);

                    self.forNeighbours(x, y, function(nx, ny) {
                        if (self.isSurrounded(nx, ny)) {
                            mset(nx, ny, TILE_INERT_MOLASSES);
                        }
                    });

                    const entity = getEntity(nextX, nextY);
                    if (entity && entity.type === 'DROPLET') {
                        setEntity(nextX, nextY, null);
                    } else if (entity && entity.type === 'SURVIVOR') {
                        setEntity(nextX, nextY, null);
                    }
                }

                var dropletChance = 0.15;
                if (t === TYPE_WALL) {
                    const tile = mget(nextX, nextY);
                    const health = TILE_WALL_CRACKED - tile;
                    if (health > 0) {
                        mset(nextX, nextY, tile + 1);
                    } else {
                        resetMapTile(globals.mapId, nextX, nextY);
                    }
                }

                // droplets, very low chance
                /*
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
                */
            }
        }
    };

    self.isValidSurvivorMove = function(x, y) {
        const tile = mget(x, y);
        return !getEntity(x, y)
            && x > 0 && x < 29
            && y > 0 && y < 16
            && (tileTypes[tile] === TYPE_FLOOR || tileTypes[tile] === TYPE_ENCLOSED);
    };

    self.moveSurvivors = function() {
        // move away from the molasses, but it could spread randomly
        // so i somehow need to figure out what direction they should
        // run in then do a weighted random chance of them actually
        // running in that x/y direction

        // or they could just search nearby and run away if it's close?
        const molassesStart = maps[globals.mapId];

        forAllEntities(function(x, y, entity) {
            const tile = mget(x, y);
            var nextX = x;
            var nextY = y;

            if (tileTypes[tile] === TYPE_ENCLOSED) {
                var shouldFindTarget = true;
                jtrace({ entity, x, y }, true);
                // when a survivor is in an enclosed area, they pick a
                // cracked wall and run towards it
                // this is probably a bad idea
                if (entity.target) {
                    trace('have target');
                    if (mget(entity.target.x, entity.target.y) === TILE_WALL_CRACKED) {
                        trace('target is cracked wall');
                        const dist = Math.sqrt(Math.pow(entity.target.x - x, 2) + Math.pow(entity.target.y - y, 2));
                        trace('dist: ' + dist.toString());
                        if (dist <= 2) {
                            trace('repairing');
                            // repair
                            mset(entity.target.x, entity.target.y, TILE_WALL);
                        } else {
                            trace('moving to');
                            nextX = x + (entity.target.x > x ? 1 : -1);
                            nextY = y + (entity.target.y > y ? 1 : -1);
                            shouldFindTarget = false;
                        }
                    }
                }

                if (shouldFindTarget) {
                    trace('finding new target');
                    var count = 0;
                    var target = null;

                    for (var x = 0; x < 30; x++) {
                        for (var y = 0; y < 17; y++) {
                            const tile = mget(x, y);

                            if (tile === TILE_WALL_CRACKED) {
                                count++;
                                if (Math.floor(Math.random() * count) === 0) {
                                    target = { x, y };
                                }
                            }

                        }
                    }

                    entity.target = target;
                }
                trace('---------');
            } else {
                const rx = Math.random();
                const ry = Math.random();

                if (rx > 0.75) {
                    // run away
                    nextX = x + (molassesStart.x > x ? -1 : 1);
                } else {
                    nextX = x + Math.floor(rx * 3) - 1;
                }

                if (ry > 0.75) {
                    // run away
                    nextY = y + (molassesStart.y > y ? -1 : 1);
                } else {
                    nextY = y + Math.floor(ry * 3) - 1;
                }
            }

            if (self.isValidSurvivorMove(nextX, nextY)) {
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

    for (var x = 0; x < 30; x++) {
        for (var y = 0; y < 17; y++) {
            mset(x, y, mget(x + map.x, y + map.y));
        }
    }
}

function resetMapTile(mapId, x, y) {
    // TODO support maps that aren't on y = 0
    const map = maps[mapId];
    mset(x, y, mget(x + map.x, y));
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
        if (btnp(4)) {
            globals.paused = !globals.paused;
        }

        if (!globals.paused) {
            update();
            draw();
        }
    } catch (e) {
        // thanks tic-80
        trace(e.lineNumber + ': ' + e);
        trace(e.stack);
        exit();
    }
}
