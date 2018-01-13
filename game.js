// script: js

const MAP_SCRATCH_X = 210;
const MAP_SCRATCH_Y = 119;
const MAP_PIECE_START = 225;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GROUND_MIN = 16;
const TILE_GROUND_MAX = 31;
const TILE_WATER = 2;
const TILE_FLOOR = 9;
const TILE_WALL = 3;
const TILE_WALL_CRACKED = TILE_WALL + 2;
const TILE_INERT_MOLASSES = 80;
const TILE_MOLASSES = 81;
const TILE_MOLASSES_MIN = 80;
const TILE_MOLASSES_MAX = 81;

const TILE_SURVIVOR = 240;

const SPRITE_DROPLET = 256;
const SPRITE_SURVIVOR = 257;
const SPRITE_SURVIVOR_REPAIRING = 258;
const SPRITE_CROSS = 259;

const FLAG_BUILDABLE = 1;
const FLAG_SPREADABLE = 2;
const FLAG_MOLASSES = 4;
const FLAG_WALL = 8;

function tileHasFlag(tile, type) {
    var result = 0;

    if (tile === TILE_WATER) {
        result |= FLAG_SPREADABLE;
    }

    if ((tile >= TILE_GROUND_MIN && tile <= TILE_GROUND_MAX)
       || tile === TILE_FLOOR) {
        result |= FLAG_BUILDABLE | FLAG_SPREADABLE;
    } else if (tile >= TILE_WALL && tile <= TILE_WALL_CRACKED) {
        result |= FLAG_WALL;
    } else if (tile >= TILE_MOLASSES_MIN && tile <= TILE_MOLASSES_MAX) {
        result |= FLAG_MOLASSES;
    }

    return (result & type) > 0;
}

const maps = [
    {
        x: 60, y: 0,
        spreadRate: 15,
        rallyPoint: { x: 8, y: 10 },
    },
    {
        x: 30, y: 0,
        spreadRate: 15,
    },
];

const entities = [];
for (var i = 0; i < 30 * 17; i++) {
    entities[i] = null;
}

var globals = {
    mapId: 0,
    paused: false,
    filled: new Array(30 * 17),
    initialSurviors: 0,
};

// ----------------------------------------------------------------------------
function GameState() {
    var self = {
        currentState: {},
        populateMapState: PopulateMapState(),
        buildState: BuildState(60, 15),
        molassesState: MolassesState(10),
        roundEndState: RoundEndState(),
    };

    self.transition = function(newState) {
        self.maybeCall(self.currentState.onExit);
        self.maybeCall(newState.onEnter);
        self.currentState = newState;
    };

    self.update = function() {
        return self.maybeCall(self.currentState.update);
    };
    self.draw = function() {
        return self.maybeCall(self.currentState.draw);
    };

    self.maybeCall = function(maybeFunction) {
        if (typeof maybeFunction === 'function') {
            return maybeFunction();
        }
    };

    self.reset = function() {
        // TODO hell naw
        self.populateMapState = PopulateMapState();
        self.buildState = BuildState(60, 15),
        self.molassesState = MolassesState();
    };
    
    return self;
};

const gameState = GameState();

function jtrace(obj, pretty) {
    if (pretty) {
        trace(JSON.stringify(obj, null, 1));
    } else {
        trace(JSON.stringify(obj));
    }
}

// ----------------------------------------------------------------------------
function PopulateMapState() {
    var self = { popMapState: true };

    self.onEnter = function() {
        const map = maps[globals.mapId];
        copyMap(globals.mapId);
        //h imset(map.molassesStart.x, map.molassesStart.y, TILE_MOLASSES);
        self.createSurvivors();
    };

    self.createSurvivors = function() {
        const map = maps[globals.mapId];
        var total = 0;
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 30; y++) {
                if (mget(x, y) === TILE_SURVIVOR) {
                    total++;
                    setEntity(x, y, {
                        type: 'SURVIVOR',
                        sprite: SPRITE_SURVIVOR,
                    });
                    mset(x, y, TILE_GROUND_MIN);
                }
            }
        }
        globals.initialSurviors = total;
    };

    self.update = function() {
        gameState.transition(new TransitionState(60, 'get buildin\'', gameState.buildState));
        // gameState.transition(molassesState);
    };

    return self;
}

// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
function BuildState(piecesToPlace, timeToPlace) {
    var self = {
        hasPiece: false,
        piecesRemaining: piecesToPlace,
        placementTimer: 0,
        filled: {},
        rotation: 0,
        mouseTileX: 0,
        mouseTileY: 0,
        endTime: 0,
    };

    const shadowColour = 15;
    const invalidShadowColour = 6;
    const flashShadowColour = 12;

    const placementDelay = 250;

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
                    if (!tileHasFlag(mapTile, FLAG_BUILDABLE)
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

    self.floodFill = function() {
        self.filled = floodFill(0, 0);
        setMapFromFloodFill(self.filled);
    };

    self.isTileFilled = function(x, y) {
        return self.filled[(y + 1) * 32 + (x + 1)];
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
        if (btnp(5) || time() > self.endTime) {// || (self.piecesRemaining <= 0 && time() > self.placementTimer)) {
            gameState.transition(new TransitionState(60, 'here come the molasses', gameState.molassesState));
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
                self.placementTimer = time() + placementDelay;
                self.floodFill();
            } else if (m[4]) {
                self.rotate();
                self.placementTimer = time() + placementDelay;
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
                    } else if (self.endTime - time() < 2000) {
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
        printCentered(tm, 120, 6, 14, 0, 2);
        printCentered(tm, 120, 4, 15, 0, 2);
    };

    self.draw = function() {
        drawMap();
        drawEntities();

        if (self.hasPiece && self.piecesRemaining > 0) {
            self.drawShadow();
        }
        self.drawTime();
        //self.drawFlood();
        //print(self.piecesRemaining);
        //print(self.rotation, 0, 8);
    };

    return self;
}

// ----------------------------------------------------------------------------
function MolassesState(updates) {
    var self = {
        nextUpdate: 0,
        droplets: [],
        deaths: [],
        updates,
    };

    self.onEnter = function() {
        self.updates = maps[globals.mapId].spreadRate;
        forAllEntities(function(x, y, entity) {
            if (entity.type === 'DROPLET') {
                setEntity(x, y, null);
                mset(x, y, TILE_MOLASSES);
            }
        });
    };

    self.removeFlowingMolasses = function() {
        // remove all but the first molasses tiles
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 30; y++) {
                const tile = mget(x, y);
                if (tile > TILE_MOLASSES_MIN && tile <= TILE_MOLASSES_MAX) {
                    resetMapTile(globals.mapId, x, y);
                }
            }
        }
    };

    self.isMolasses = function(x, y) {
        return tileHasFlag(mget(x, y), FLAG_MOLASSES);
    };

    self.isSurrounded = function(x, y) {
        var total = 0;
        if (x > 0 && self.isMolasses(x-1, y)) total++;
        if (x < 30 && self.isMolasses(x+1, y)) total++;
        if (y > 0 && self.isMolasses(x, y-1)) total++;
        if (y < 17 && self.isMolasses(x, y+1)) total++;
        return total >= 3;
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
                if (!tileHasFlag(mget(x, y), FLAG_MOLASSES)) continue;
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

                const tile = mget(nextX, nextY);
                if (tileHasFlag(tile, FLAG_SPREADABLE)) {
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
                        // we killed a man
                        self.deaths.push({ x: nextX * 8, y: nextY * 8 });
                        setEntity(nextX, nextY, null);
                    }
                }

                var dropletChance = 0.15;
                if (tileHasFlag(tile, FLAG_WALL)) {
                    const tile = mget(nextX, nextY);
                    const health = TILE_WALL_CRACKED - tile;
                    if (health > 0) {
                        mset(nextX, nextY, tile + 1);
                    } else {
                        resetMapTile(globals.mapId, nextX, nextY);
                        setMapFromFloodFill(floodFill(0, 0));
                    }
                }
            }
        }
    };

    self.isValidSurvivorMove = function(x, y) {
        const tile = mget(x, y);
        return !getEntity(x, y)
            && x > 0 && x < 29
            && y > 0 && y < 16
            && tileHasFlag(tile, FLAG_BUILDABLE);
    };

    self.moveSurvivors = function() {
        // move away from the molasses, but it could spread randomly
        // so i somehow need to figure out what direction they should
        // run in then do a weighted random chance of them actually
        // running in that x/y direction

        // or they could just search nearby and run away if it's close?
        const rallyPoint = maps[globals.mapId].rallyPoint;

        forAllEntities(function(x, y, entity) {
            const tile = mget(x, y);
            var nextX = x;
            var nextY = y;

            if (tile === TILE_FLOOR) {
                jtrace({ x, y });
                trace('current target:')
                if (entity.target) {
                    jtrace(Object.assign({}, entity.target, {
                        thf: tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL),
                        tw: mget(entity.target.wallX, entity.target.wallY) > TILE_WALL,
                    }), true);
                }
                if (entity.target) {
                    // target still valid
                    trace('enclosed, still have target');
                    const tile = mget(entity.target.wallX, entity.target.wallY);
                    entity.sprite = SPRITE_SURVIVOR;
                    if (tile === TILE_WALL) {
                        trace('repaired, finding new target');
                        // wall is healed
                        entity.target = null;
                    } else if (tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL)) {
                        trace('repairing');
                        mset(entity.target.wallX, entity.target.wallY, mget(entity.target.wallX, entity.target.wallY) - 1);
                        entity.sprite = SPRITE_SURVIVOR_REPAIRING;
                    } else {
                        trace('um help the wall is gone');
                    }
                }

                if (!entity.target) {
                    trace('enclosed, looking for target');
                    // flood fill until we find a cracked wall
                    // right wtf are we doing here
                    // we can find the cracked wall but we want the tile we /came from/
                    var target = null;
                    var prevX = 0;
                    var prevY = 0;
                    entity.target = null;
                    floodFill4(x, y, function(tileX, tileY) {
                        if (target) {
                            return false;
                        }
                        // jtrace({ tileX, tileY, m: mget(tileX, tileY) });

                        if (tileHasFlag(mget(tileX, tileY), FLAG_WALL)) {
                            const tile = mget(tileX, tileY);
                            if (tile > TILE_WALL && !getEntity(tileX, tileY)) {
                                target = { x: prevX, y: prevY, wallX: tileX, wallY: tileY };
                            }
                            return false;
                        }
                        prevX = tileX;
                        prevY = tileY;
                        return mget(tileX, tileY) === TILE_FLOOR;
                    });

                    if (target) {
                        trace('found this:');
                        jtrace(target);
                        entity.target = target;
                        nextX = target.x;
                        nextY = target.y;
                    }
                }
                trace('===============');
            } else {
                const rx = Math.random();
                const ry = Math.random();

                if (rx > 0.75) {
                    // run away
                    nextX = x + (rallyPoint.x > x ? 1 : -1);
                } else {
                    nextX = x + Math.floor(rx * 3) - 1;
                }

                if (ry > 0.75) {
                    // run away
                    nextY = y + (rallyPoint.y > y ? 1 : -1);
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
        if (time() > self.nextUpdate) {
            if (self.updates === 0) {
                self.removeFlowingMolasses();
                self.nextUpdate = time() + 500;
                self.updates--;
                return;
            } else if (self.updates === -1) {
                if (self.deaths.length === 0) {
                    gameState.transition(gameState.roundEndState);
                }
                return;
            }
            self.spread();
            // FIXME garbage
            // if (self.updates % 2 === 0) {
            self.moveSurvivors();
            // }
            self.nextUpdate = time() + 250;
            self.updates--;
        }
    };

    self.drawDeaths = function() {
        self.deaths = self.deaths.filter(function(death) {
            spr(SPRITE_CROSS, death.x, death.y, 0);
            death.y -= 1;
            return death.y >= 0;
        });
    };

    self.draw = function() {
        drawMap();
        drawEntities();
        self.drawDeaths();
    };
    
    return self;
}

// ----------------------------------------------------------------------------
function RoundEndState() {
    var self = {
        nextUpdateTime: 0,
        totalSurvivors: 0,
        enclosedSurvivors: [],
        currentSurvivorIndex: 0,
        won: false,
        lost: false,
        finished: false,
    };

    const winAmount = 0.75;
    const highlightTime = 500;
    const highlightColor = 6;

    self.onEnter = function() {
        self.currentSurvivorIndex = 0;
        self.finished = false;

        self.countSurvivors();
        self.nextUpdateTime = time() + highlightTime;

        self.lost = self.totalSurvivors < (globals.initialSurviors * winAmount);
        self.won = !self.lost && self.enclosedSurvivors.length >= (globals.initialSurviors * winAmount);
    };

    self.countSurvivors = function() {
        self.totalSurvivors = 0;
        self.enclosedSurvivors = [];

        forAllEntities(function(x, y, entity) {
            if (mget(x, y) === TILE_FLOOR) {
                self.enclosedSurvivors.push(Object.assign({}, entity, { x, y }));
            }
            self.totalSurvivors++;
        }, 'SURVIVOR');
    }

    self.update = function() {
        if (time() < self.nextUpdateTime) return;

        if (self.currentSurvivorIndex < self.enclosedSurvivors.length - 1) {
            self.currentSurvivorIndex++;
            self.nextUpdateTime += highlightTime;
        } else if (self.finished) {
            // we outta stuff to display
            if (self.won) {
                globals.mapId++;
                gameState.reset();
                gameState.transition(gameState.populateMapState);
            } else if (self.lost) {
                gameState.reset();
                gameState.transition(gameState.populateMapState);
            } else {
                gameState.transition(gameState.buildState);
            }
        } else {
            self.nextUpdateTime += 2000;
            self.finished = true;
        }
    };

    self.draw = function() {
        drawMap();
        drawEntities();
        rect(120, 20, 80, 78, 0);

        const color = (time() % 8 < 4) ? highlightColor : 14;
        const count = self.enclosedSurvivors.length ? (self.currentSurvivorIndex + 1) : 0;

        printCentered(count, 160, 30, color, 0, 2);
        printCentered('SURVIVORS', 160, 50, 15);
        printCentered('SAFE', 160, 58, 15);

        if (self.finished) {
            if (self.won) {
                printCentered('LETS SCRAM!!', 160, 72, color);
            } else if (self.lost) {
                printCentered('they\'re', 160, 72, color);
                printCentered('all dead.', 160, 80, color);
            } else {
                printCentered('NOT ENOUGH!!', 160, 72, color);
            }
        }

        for (var i = 0; i <= self.currentSurvivorIndex; i++) {
            const survivor = self.enclosedSurvivors[i];
            if (survivor) {
                rectb(survivor.x * 8, survivor.y * 8, 8, 8, color);
            }
        }
    };

    return self;
}

// ----------------------------------------------------------------------------
// FLOOD FILL
function floodFill(x, y) {
    const visited = new Array(32 * 19);
    const filled = [];
    floodFill8Recursive(x, y, filled, visited);
    return filled;
}

function floodFill8Recursive(x, y, filled, visited) {
    if ( x < 0 || x > 31 || y < 0 || y > 18) {
        return;
    }

    if (visited[y * 32 + x]) {
        return;
    }

    visited[y * 32 + x] = true;

    var tileCheck;
    if (x == 0 || x == 31 || y == 0 || y == 18) {
        tileCheck = true;
    } else {
        tileCheck = !tileHasFlag(mget(x-1, y-1), FLAG_WALL);
    }

    if (!tileCheck) {
        return;
    }

    filled[y * 32 + x] = true;

    floodFill8Recursive(x + 1 , y,     filled, visited);
    floodFill8Recursive(x - 1 , y,     filled, visited);
    floodFill8Recursive(x     , y + 1, filled, visited);
    floodFill8Recursive(x     , y - 1, filled, visited);
    floodFill8Recursive(x + 1 , y + 1, filled, visited);
    floodFill8Recursive(x - 1 , y - 1, filled, visited);
    floodFill8Recursive(x - 1 , y + 1, filled, visited);
    floodFill8Recursive(x + 1 , y - 1, filled, visited);
}


function floodFill4(x, y, checkFn) {
    const visited = new Array(30 * 17);
    const filled = {};
    floodFill4Recursive(x, y, filled, visited, checkFn);
    return filled;
}

function floodFill4Recursive(x, y, filled, visited, checkFn) {
    if ( x < 0 || x > 29 || y < 0 || y > 16) {
        return;
    }

    if (visited[y * 30 + x]) {
        return;
    }

    visited[y * 30 + x] = true;

    if (!checkFn(x, y)) {
        return;
    }

    filled[y * 30 + x] = true;
    floodFill4Recursive(x + 1 , y,     filled, visited, checkFn);
    floodFill4Recursive(x - 1 , y,     filled, visited, checkFn);
    floodFill4Recursive(x     , y + 1, filled, visited, checkFn);
    floodFill4Recursive(x     , y - 1, filled, visited, checkFn);
}

function setMapFromFloodFill(filled) {
    for (var x = 0; x < 30; x++) {
        for (var y = 0; y < 17; y++) {
            if (!filled[(y + 1) * 32 + (x + 1)] && !tileHasFlag(mget(x, y), FLAG_WALL)) {
                mset(x, y, TILE_FLOOR);
            } else if (mget(x, y) === TILE_FLOOR) {
                resetMapTile(globals.mapId, x, y);
            }
        }
    }
}


// ----------------------------------------------------------------------------
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
    const tile = mget(x + map.x, y);
    if (tile === TILE_SURVIVOR) {
        mset(x, y, TILE_GROUND_MIN);
    } else {
        mset(x, y, tile);
    }
}

function drawMap() {
    map(0, 0, 30, 17, 0, 0);
}

// ----------------------------------------------------------------------------
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


function printCentered(text, x, y, color, fixed, scale) {
    const width = print(text, -100, 0, 0, fixed, scale);
    print(text, x - (width/2), y, color, fixed, scale);
}

// ----------------------------------------------------------------------------
// TIC STUFF
function init() {
    gameState.transition(gameState.populateMapState);
}
init()

function update() {
    gameState.update();
}

function draw() {
    cls(0);
    gameState.draw();

    const m = mouse();
    const mtx = Math.floor(m[0] / 8);
    const mty = Math.floor(m[1] / 8);
    const bx = m[0] + 8;
    const by = m[1] + 8;
    rect(bx, by, 28, 17);
    print('X: ' + mtx, bx + 2, by + 2)
    print('Y: ' + mty, bx + 2, by + 10)
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
