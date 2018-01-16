// script: js

const MAP_SCRATCH_X = 210;
const MAP_SCRATCH_Y = 119;
const MAP_PIECE_START = 219;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GROUND_MIN = 16;
const TILE_GROUND_MAX = 31;
const TILE_FLOOR = 9;
const TILE_WALL = 3;
const TILE_WALL_CRACKED = TILE_WALL + 2;
const TILE_INERT_MOLASSES = 80;

const TILE_WATER = 2;
const TILE_WATER_EDGE_MIN = 32;
const TILE_WATER_EDGE_MAX = 35;

const TILE_MOLASSES = 81;
const TILE_MOLASSES_MIN = 80;
const TILE_MOLASSES_MAX = 81;

const TILE_SURVIVOR = 240;
const TILE_RALLY_POINT = 241;

const TILE_BUILDING_MIN = 64;
const TILE_BUILDING_MAX = 69;

const SPRITE_DROPLET = 256;
const SPRITE_SURVIVOR = 257;
const SPRITE_SURVIVOR_REPAIRING = 258;
const SPRITE_CROSS = 259;
const SPRITE_FLAG = 260;
const SPRITE_THUMBS_UP = 276;

const SPRITE_HEAD_CHIEF = 272;
const SPRITE_HEAD_NEWSIE = 274;

const FLAG_BUILDABLE = 1;
const FLAG_SPREADABLE = 2;
const FLAG_MOLASSES = 4;
const FLAG_WALL = 8;
const FLAG_SOLID = 16; // basically just for structures on the map

const TXT_BUILDING = "GET BUILDIN'";
const TXT_MOLASSES = "THE MOLASSES IS SPREADING!";

const BUILD_TIMER = 15;

var frameCounter = 0;

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
        result |= FLAG_SOLID;
    } else if (tile >= TILE_BUILDING_MIN && tile <= TILE_BUILDING_MAX) {
        result |= FLAG_SOLID;
    } else if (tile >= TILE_MOLASSES_MIN && tile <= TILE_MOLASSES_MAX) {
        result |= FLAG_MOLASSES;
    }

    return (result & type) > 0;
}

const maps = [
    // TODO be funny
    {
        x: 150, y: 0,
        spreadRate: 0,
        skip: true,
        cutscene: [
            // tutorial
            {
                sprite: TILE_MOLASSES,
                text: "This is molasses. It will break walls and kill people. Do NOT touch.",
                left: true,
                smallSprite: true,
            },
            {
                sprite: SPRITE_SURVIVOR,
                text: "It's one of the boys. Keep enough of 'em safe to win!",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: TILE_WALL,
                text: "This is a wall. Surround boys with these to keep 'em safe.",
                left: true,
                smallSprite: true,
            },
            {
                sprite: TILE_FLOOR,
                text: "When an area is safe it looks like this.",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: TILE_WALL_CRACKED,
                text: "Boys will repair walls they can reach when they're safe.",
                left: true,
                smallSprite: true,
            },
            {
                sprite: SPRITE_FLAG,
                text: "Rally point. Boys will run to this. Save them before the Molasses gets 'em!",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: SPRITE_THUMBS_UP,
                text: "Good luck!!",
                left: true,
                waitForKey: true,
                disableAnimation: true,
            },
        ],
    },
    {
        x: 60, y: 0,
        spreadRate: 10,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "HEY NEWSIE! WE GOT A SITUATION HERE!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "wuuuuuuuuuuuh",
                left: false,
                waitForKey: true,
                voice: 1,
            },
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "THAT DANG MOLASSES TANK FINALLY BURST! IT'S COMIN\' THIS WAY FAST!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "oh",
                left: false,
                waitForKey: true,
                voice: 1,
            },
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "YOU GET BUILDIN\' WALLS AND something something etc",
                left: true,
                voice: 0,
            },
        ],
    },
    {
        x: 90, y: 0,
        spreadRate: 20,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "it's coming to the warehouses etc",
                left: true,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "sardonic reply",
                left: false,
            },
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "very angry reply",
                left: true,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "one word response",
                left: false,
            },
        ],
    },
    {
        x: 120, y: 0,
        spreadRate: 25,
    },
];

const entities = [];
for (var i = 0; i < 30 * 17; i++) {
    entities[i] = null;
}

var globals = {
    mapId:00,
    paused: false,
    filled: new Array(30 * 17),
    initialSurviors: 0,
    rallyPoint: {},
};

// ----------------------------------------------------------------------------
function GameState() {
    var self = {
        currentState: {},
        populateMapState: PopulateMapState(),
        buildState: BuildState(60, BUILD_TIMER),
        molassesState: MolassesState(),
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
        self.buildState = BuildState(60, BUILD_TIMER),
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
        entities = [];
        self.createSurvivors();
    };

    self.createSurvivors = function() {
        const map = maps[globals.mapId];
        var total = 0;
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                switch(mget(x, y)) {
                case TILE_SURVIVOR:
                    total++;
                    setEntity(x, y, {
                        type: 'SURVIVOR',
                        sprite: SPRITE_SURVIVOR,
                    });
                    mset(x, y, TILE_GROUND_MIN);
                    break;
                case TILE_RALLY_POINT:
                    globals.rallyPoint = { x, y };
                    mset(x, y, TILE_GROUND_MIN);
                    entities[y * 30 + x] = { sprite: SPRITE_FLAG };
                    break;
                }
            }
        }
        globals.initialSurviors = total;
    };

    self.update = function() {
        const cutscene = maps[globals.mapId].cutscene;
        if (cutscene) {
            const nextState = new TransitionState(60, TXT_BUILDING, gameState.buildState);
            gameState.transition(new CutsceneState(cutscene, nextState));
        } else {
            gameState.transition(new TransitionState(60, TXT_BUILDING, gameState.buildState));
        }
    };

    self.draw = function() {
        cls(0);
    };

    return self;
}

function CutsceneState(cutscene, nextState) {
    var self = {
        linePointer: 0,
        textPointer: 0,
        initialYOffset: 68,
        yOffset: 68,
        nextUpdate: null,
        done: false,
        waitingForKey: false,
        initialRmb: mouse()[4],
    };

    const textDelay = 20;
    const lineDelay = 1000;

    self.onEnter = function() {
        setMapFromFloodFill(floodFill(0, 0));
    };

    self.update = function() {
        if (!self.nextUpdate) {
            self.nextUpdate += textDelay;
        }

        if (!mouse()[4]) {
            self.initialRmb = false;
        }

        if ((mouse()[4] && !self.initialRmb) || (self.done && mouse()[2])) {
            if (maps[globals.mapId].skip) {
                globals.mapId++;
                gameState.reset();
                gameState.transition(gameState.populateMapState);
            } else {
                gameState.transition(nextState);
            }
        }

        const line = cutscene[self.linePointer];

        if (time() > self.nextUpdate) {
            self.waitingForKey = false;
            if (self.textPointer < line.text.length) {
                if (self.textPointer === 0 && self.linePointer % 2 === 0 && self.linePointer != 0) {
                    self.yOffset -= 60;
                }

                if (typeof line.voice !== 'undefined') {
                    sfx(line.voice, line.text[self.textPointer].charCodeAt(0)/2, 8, 0, 7);
                } else if (typeof line.sound !== 'undefined') {
                    sfx(line.sound, 28, 2, 0, 4);
                }

                self.textPointer++;
                if (self.textPointer < line.text.length
                    && line.text[self.textPointer - 1]
                    && ['.', ',', '!', '?'].indexOf(line.text[self.textPointer - 1]) >= 0) {
                    self.nextUpdate = time() + textDelay * 30;
                } else {
                    self.nextUpdate = time() + textDelay;
                }
            } else if (line.waitForKey && !mouse()[2]) {
                self.waitingForKey = true;
            } else if (self.linePointer < cutscene.length - 1) {
                self.nextUpdate = time() + (line.waitForKey ? 0 : lineDelay);
                self.linePointer++;
                self.textPointer = 0;
            } else {
                self.done = true;
            }
        }
    };

    self.draw = function() {
        drawMap();
        drawEntities();
        const margin = 32;
        var y = self.yOffset;
        for (var i = 0; i <= self.linePointer; i++) {
            if (y < self.initialYOffset) {
                y += 30;
                continue;
            }

            if (i == self.linePointer && self.textPointer == 0) continue;
            const line = cutscene[i];
            const disableAnimation = self.linePointer !== i || line.smallSprite || line.disableAnimation;
            const sprite = disableAnimation || (frameCounter % 20 < 10) ? line.sprite : line.sprite + 48;
            var textX =  margin + 20;

            rect(margin - 2, y - 2, 240 - margin - 28, 28, 0);
            rectb(margin - 2, y - 2, 240 - margin - 28, 28, 2);

            if (line.smallSprite) {
                spr(sprite, line.left ? margin + 4 : 240 - margin - 16, y + 8, 14);
            } else {
                spr(sprite, line.left ? margin : 240 - margin - 16, y, 14, 1, false, 0, 2, 3);
            }
            if (self.linePointer === i) {
                printWrapped(line.text.slice(0, self.textPointer), textX, y + 1, 240 - (margin + 16) * 2, line.left, line.left ? 15 : 12);
            } else {
                printWrapped(line.text, textX, y + 1, 240 - (margin + 16) * 2, line.left, line.left ? 15 : 12);
            }
            y += 30;
        }

        if (self.done || self.waitingForKey) {
            const color = (frameCounter % 12 < 6) ? 3 : 15;
            printCentered('CLICK TO CONTINUE', 120, 128, color);
        } else {
            printCentered('RIGHT CLICK TO SKIP', 120, 128);
        }
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

    self.checkValidPlacement = function(ignoreWalls) {
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                const mx = x + self.mouseTileX;
                const my = y + self.mouseTileY;
                const mapTile = mget(mx, my);
                const entity = getEntity(mx, my);

                if (tile > 0) {
                    if (!tileHasFlag(mapTile, FLAG_BUILDABLE)
                        || (ignoreWalls && tileHasFlag(mapTile, FLAG_WALL))
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

    self.placeCurrentPiece = function(erase) {
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                if (tile) {
                    const mx = x + self.mouseTileX;
                    const my = y + self.mouseTileY;
                    if (erase) {
                        resetMapTile(globals.mapId, mx, my);
                    } else {
                        mset(mx, my, tile);
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
    };

    self.cleanUpWalls = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                var neighbours = 0;
                if (tileHasFlag(mget(x - 1, y), FLAG_WALL)) neighbours++;
                if (tileHasFlag(mget(x + 1, y), FLAG_WALL)) neighbours++;
                if (tileHasFlag(mget(x, y - 1), FLAG_WALL)) neighbours++;
                if (tileHasFlag(mget(x, y + 1), FLAG_WALL)) neighbours++;
                if (neighbours < 2) {
                    resetMapTile(globals.mapId, x, y);
                }
            }
        }
    };

    self.moveToNextState = function() {
            gameState.transition(new TransitionState(60, TXT_MOLASSES, gameState.molassesState));
            self.piecesRemaining = piecesToPlace;
    };

    self.update = function() {
        if (btnp(5) || (time() > self.endTime && !self.hasPiece)) {// || (self.piecesRemaining <= 0 && time() > self.placementTimer)) {
            self.moveToNextState();
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
            } else if (m[3]) {
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
                        c = frameCounter % 16 < 8 ? shadowColour : flashShadowColour;
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
        const tm = Math.max((self.endTime - time()) / 1000, 0).toFixed(0);
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
        paths: [],
        survivorUpdates: 10,
        updates,
    };

    self.onEnter = function() {
        self.updates = maps[globals.mapId].spreadRate;
        self.calculatePaths();
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
            for (var y = 0; y < 17; y++) {
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
        if (x > 0 && x < 30) fn(x-1, y);
        if (x > 0 && x < 30) fn(x+1, y);
        if (y > 0 && y < 17) fn(x, y+1);
        if (y > 0 && y < 17) fn(x, y-1);
    };

    self.spread = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                if (!tileHasFlag(mget(x, y), FLAG_MOLASSES)) continue;
                if (Math.random() > 0.5) continue;

                if (self.isSurrounded(x, y)) {
                    mset(x, y, TILE_INERT_MOLASSES);
                    continue;
                }

                const direction = Math.floor(Math.random() * 4);
                var nextX;
                var nextY;

                const closest = self.paths[y * 30 + x];
                if (!closest || Math.random() > 0.5) {
                    switch (direction) {
                    case 0: nextX = x + 1; nextY = y;     break;
                    case 1: nextX = x;     nextY = y + 1; break;
                    case 2: nextX = x - 1; nextY = y;     break;
                    case 3: nextX = x;     nextY = y - 1; break;
                    }
                } else {
                    self.forNeighbours(x, y, function(nx, ny) {
                        if (closest > self.paths[ny * 30 + nx]) {
                            nextX = nx;
                            nextY = ny;
                            closest = self.paths[ny * 30 + nx];
                        }
                    });
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

    self.isValidSurvivorMove = function(x, y, ignoreSurvivors) {
        const tile = mget(x, y);
        const buildable = tileHasFlag(tile, FLAG_BUILDABLE);
        return (ignoreSurvivors || !getEntity(x, y))
            && x > 0 && x < 29
            && y > 0 && y < 16
            && buildable;
    };

    self.moveSurvivors = function() {
        // move away from the molasses, but it could spread randomly
        // so i somehow need to figure out what direction they should
        // run in then do a weighted random chance of them actually
        // running in that x/y direction

        // or they could just search nearby and run away if it's close?
        const rallyPoint = globals.rallyPoint;
        const debug = false;

        forAllEntities(function(x, y, entity) {
            const tile = mget(x, y);
            var nextX = x;
            var nextY = y;

            if (tile === TILE_FLOOR) {
                if (debug) {
                    jtrace({ x, y });
                    trace('current target:')
                }
                if (entity.target) {
                    jtrace(Object.assign({}, entity.target, {
                        thf: tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL),
                        tw: mget(entity.target.wallX, entity.target.wallY) > TILE_WALL,
                    }), true);
                }
                if (entity.target) {
                    // target still valid
                    if (debug) trace('enclosed, still have target');
                    const tile = mget(entity.target.wallX, entity.target.wallY);
                    entity.sprite = SPRITE_SURVIVOR;
                    if (tile === TILE_WALL) {
                        if (debug) trace('repaired, finding new target');
                        // wall is healed
                        entity.target = null;
                    } else if (tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL)) {
                        if (debug) trace('repairing');
                        mset(entity.target.wallX, entity.target.wallY, mget(entity.target.wallX, entity.target.wallY) - 1);
                        entity.sprite = SPRITE_SURVIVOR_REPAIRING;
                    } else {
                        if (debug) trace('um help the wall is gone');
                    }
                }

                if (!entity.target) {
                    if (debug) trace('enclosed, looking for target');
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
                        if (debug) trace('found this:');
                        jtrace(target);
                        entity.target = target;
                        nextX = target.x;
                        nextY = target.y;
                    }
                }
                if (debug) trace('===============');
            } else {
                const rnd = Math.random();
                const closest = self.paths[y * 30 + x];
                if (!closest || rnd > 0.5) {
                    nextX = x + (Math.floor(Math.random() * 3) - 1);
                    nextY = y + (Math.floor(Math.random() * 3) - 1);
                } else {
                    self.forNeighbours(x, y, function(nx, ny) {
                        if (closest > self.paths[ny * 30 + nx]) {
                            nextX = nx;
                            nextY = ny;
                            closest = self.paths[ny * 30 + nx];
                        }
                    });
                }
            }

            if (self.isValidSurvivorMove(nextX, nextY)) {
                setEntity(x, y, null);
                setEntity(nextX, nextY, entity);
            }
        }, 'SURVIVOR');
    };

    self.calculatePaths = function() {
        const frontier = [globals.rallyPoint];
        const dist = [];
        dist[globals.rallyPoint.y * 30 + globals.rallyPoint.x] = 0;
        while (frontier.length) {
            const cur = frontier.shift();
            self.forNeighbours(cur.x, cur.y, function(x, y) {
                if (!dist[y * 30 + x] && self.isValidSurvivorMove(x, y, true)) {
                    frontier.push({ x, y });
                    dist[y * 30 + x] = dist[cur.y * 30 + cur.x] + 1;
                }
            });
        }
        self.paths = dist;
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
            self.spread();
            self.calculatePaths();
            self.moveSurvivors();
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

    self.drawPaths = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                const next = self.paths[y * 30 + x];
                for (var i = 0; i < next; i++) {
                    pix(x * 8 + i % 8, y * 8 + Math.floor(i / 8), 15);
                }
            }
        }
    };

    self.draw = function() {
        drawMap();
        drawEntities();
        //self.drawPaths();
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
        rect(120, 20, 80, 98, 0);

        const color = (frameCounter % 12 < 6) ? highlightColor : 14;
        const count = self.enclosedSurvivors.length ? (self.currentSurvivorIndex + 1) : 0;
        var y = 30;

        printCentered(count, 160, y, color, 0, 2);
        y += 20;
        printCentered('SURVIVORS', 160, y, 15);
        y += 8;
        printCentered('SAFE', 160, y, 15);
        y += 16;
        printCentered(Math.ceil(globals.initialSurviors * winAmount) + '       ', 160, y, color, true);
        printCentered('  NEEDED', 160, y, 15, true);

        if (self.finished) {
            y += 16;
            if (self.won) {
                printCentered('LETS SCRAM!!', 160, y, color);
            } else if (self.lost) {
                printCentered('they\'re', 160, y, color);
                y += 8
                printCentered('all dead.', 160, y, color);
            } else {
                printCentered('NOT ENOUGH!!', 160, y, color);
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
        tileCheck = !tileHasFlag(mget(x-1, y-1), FLAG_SOLID);
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
            const tile = mget(x, y);
            if (
                !filled[(y + 1) * 32 + (x + 1)]
                && !tileHasFlag(tile, FLAG_WALL)
                && tile !== TILE_WATER
                && (tile > TILE_WATER_EDGE_MAX || tile < TILE_WATER_EDGE_MIN)
                && (tile > TILE_BUILDING_MAX || tile < TILE_BUILDING_MIN)
            ) {
                mset(x, y, TILE_FLOOR);
            } else if (tile === TILE_FLOOR) {
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

function printWrapped(text, x, y, width, left, color, fixed, scale) {
    var lines = [''];
    text.split(' ').forEach(function(word) {
        const line = lines[lines.length - 1] + word + ' ';
        if (print(line, -100, -100, color, fixed, scale) > width) {
            lines.push(word + ' ');
        } else {
            lines[lines.length - 1] += word + ' ';
        }
    });

    lines.forEach(function(line, index) {
        if (left) {
            print(line, x, y + (index * 8), color, fixed, scale);
        } else {
            const lineWidth = print(line, -100, -100, color, fixed, scale);
            print(line, (x + width) - lineWidth, y + (index * 8), color, fixed, scale);
        }
    });
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

    /*
    const m = mouse();
    const mtx = Math.floor(m[0] / 8);
    const mty = Math.floor(m[1] / 8);
    const bx = m[0] + 8;
    const by = m[1] + 8;
    rect(bx, by, 28, 17);
    print('X: ' + mtx, bx + 2, by + 2)
    print('Y: ' + mty, bx + 2, by + 10)
    */
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
        frameCounter++;
    } catch (e) {
        // thanks tic-80
        trace(e.lineNumber + ': ' + e);
        trace(e.stack);
        exit();
    }
}
