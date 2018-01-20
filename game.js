// script: js

const MAP_SCRATCH_X = 210;
const MAP_SCRATCH_Y = 119;
const MAP_PIECE_START = 219;
const MAP_PIECE_WIDTH = 3;
const MAP_PIECE_HEIGHT = 3;

const TILE_GROUND_MIN = 16;
const TILE_GROUND_MAX = 31;
const TILE_GRASS = 29;
const TILE_FLOOR = 9;
const TILE_WALL = 3;
const TILE_WALL_CRACKED = TILE_WALL + 2;
const TILE_INERT_MOLASSES = 112;
const TILE_TITLE = 219;

const TILE_WATER = 2;
const TILE_WATER_EDGE_MIN = 32;
const TILE_WATER_EDGE_MAX = 35;

const TILE_MOLASSES = 113;
const TILE_MOLASSES_MIN = 112;
const TILE_MOLASSES_MAX = 113;

const TILE_SURVIVOR = 240;
const TILE_RALLY_POINT = 241;

const TILE_BUILDING_MIN = 64;
const TILE_BUILDING_MAX = 69;
const TILE_MORE_BUILDING_MIN = 96;
const TILE_MORE_BUILDING_MAX = 111;

const TILE_MENU_BG = 215;

const SPRITE_DROPLET = 256;
const SPRITE_SURVIVOR = 257;
const SPRITE_SURVIVOR_REPAIRING = 258;
const SPRITE_DUCK = 261;
const SPRITE_DUCK_REPAIRING = 262;
const SPRITE_CROSS = 259;
const SPRITE_FLAG = 260;
const SPRITE_THUMBS_UP = 276;

const SPRITE_HEAD_CHIEF = 272;
const SPRITE_HEAD_NEWSIE = 274;
const SPRITE_HEAD_DUCK = 278;

const FLAG_BUILDABLE = 1;
const FLAG_SPREADABLE = 2;
const FLAG_MOLASSES = 4;
const FLAG_WALL = 8;
const FLAG_SOLID = 16; // basically just for structures on the map

const TXT_BUILDING = "GET BUILDIN'";
const TXT_MOLASSES = "THE MOLASSES IS SPREADING!";
const TXT_ROUND_END = "ROUND END REPORT";

const SFX_BUIDLING = 5;
const SFX_COUNTER = 6;
const SFX_COUNTER_PITCH = 64;

const TRANSITION_TIME = 90;
const BUILD_TIMER = 15;
const SPLASH_TIME = 20;

var frameCounter = 0;
var gameTime = 0;
var lastFrameTime = 0;

var globals = {
    mapId: 0,
    paused: false,
    filled: new Array(30 * 17),
    initialSurviors: 0,
    rallyPoint: {},
    peopleSaved: 0,
    ducksSaved: 0,
};

const maps = [
    // TODO be funny
    //{ x: 30, y: 0 },
    {
        x: 150, y: 0,
        spreadRate: 0,
        skip: true,
        cutscene: [
            // tutorial
            {
                sprite: TILE_MOLASSES,
                text: "Molasses will break walls and kill people. Avoid it at all cost!",
                left: true,
                smallSprite: true,
                voice: 7,
            },
            {
                sprite: TILE_WALL,
                text: "Build walls to hold the molasses back and keep people safe.",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: TILE_FLOOR,
                text: "Surround an area with walls and it will become safe.",
                left: true,
                smallSprite: true,
            },
            {
                sprite: SPRITE_SURVIVOR,
                text: "Get enough people in safe areas to win!",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: TILE_WALL_CRACKED,
                text: "People will repair walls when they're in a safe area.",
                left: true,
                smallSprite: true,
            },
            {
                sprite: SPRITE_FLAG,
                text: "People will run towards the rally point.",
                left: true,
                smallSprite: true,
                waitForKey: true,
            },
            {
                sprite: SPRITE_THUMBS_UP,
                text: "Good luck!",
                left: true,
                waitForKey: true,
                disableAnimation: true,
            },
        ],
    },
    {
        x: 60, y: 0,
        spreadRate: 0.5,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "HEY NEWSIE! WAKE UP! WE GOT A SITUATION HERE!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "Wuuuh?",
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
                sprite: SPRITE_HEAD_CHIEF,
                text: "START BUILIN' WALLS AND I'LL GO GET THE BOYS!",
                left: true,
                voice: 0,
            },
        ],
    },
    {
        x: 90, y: 0,
        spreadRate: 0.6,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "IT'S NEARLY AT THE WAREHOUSES! BUILD FASTER!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "Is it just me or do these walls look like sponges?",
                left: false,
                waitForKey: true,
                voice: 1,
            },
            // beware, the dumbest joke is below
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "YOU LOOK LIKE A SPONGE",
                left: true,
                voice: 0,
            },
            {
                sprite: TILE_WALL,
                text: "Rude",
                left: false,
                smallSprite: true,
                voice: 1,
            },
        ],
    },
    {
        x: 120, y: 0,
        spreadRate: 0.7,
        baseTile: TILE_GRASS,
        survivorSprite: SPRITE_DUCK,
        survivorRepairingSprite: SPRITE_DUCK_REPAIRING,
        survivorName: 'DUCKS',
        survivorCounter: 'ducksSaved',
        survivorBuildingSound: 4,
        winMessage: "LET'S QUACK!",
        cutscene: [
            {
                sprite: SPRITE_HEAD_DUCK,
                text: "Quack quack quack, quack.",
                left: true,
                voice: 4,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "What? Where did these ducks come from?",
                left: false,
                voice: 1,
                waitForKey: true,
            },
            {
                sprite: SPRITE_HEAD_DUCK,
                text: "QUACK! QUACK QUACK! QUAACK QUAAAACK!",
                left: true,
                voice: 4,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "Alright! Geez I guess I should help these ducks.",
                left: false,
                voice: 1,
            },
        ],
    },
    {
        x: 180, y: 0,
        spreadRate: 0.7,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "WHERE HAVE YOU BEEN? IT'S GOTTEN TO MAIN STREET!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "Well there were all these ducks and they were quackin' and-",
                left: false,
                voice: 1,
                waitForKey: true,
            },
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "NEVERMIND, JUST BUILD MORE WALLS!",
                left: true,
                voice: 0,
            },
        ],
    },
    {
        x: 210, y: 0,
        spreadRate: 0.8,
        baseTile: TILE_GRASS,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "IT'S NEARLY AT CITY HALL! ACT FAST!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_NEWSIE,
                text: "More walls comin' right up!",
                left: false,
                voice: 1,
            },
        ],
    },
    {
        x: 0, y: 17,
        skip: true,
        disableCutsceneSkip: true,
        cutscene: [
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "NEWSIE! YOU DID IT! ALL THESE PEOPLE ARE SAFE!",
                left: true,
                voice: 0,
            },
            {
                sprite: SPRITE_HEAD_CHIEF,
                text: "...WHY ARE ALL THESE DUCKS IN HERE?",
                left: true,
                voice: 0,
            },
        ],
    },
];

const entities = [];
for (var i = 0; i < 30 * 17; i++) {
    entities[i] = null;
}

// ----------------------------------------------------------------------------
function GameState() {
    var self = {
        currentState: {},
        populateMapState: PopulateMapState(),
        buildState: BuildState(60, BUILD_TIMER),
        molassesState: MolassesState(),
        roundEndState: RoundEndState(),
        titleScreenState: TitleScreenState(),
        endState: EndState(),
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

function TitleScreenState() {
    var self = {
        frame: 0,
    };

    const molasses = MolassesState(-2, 0.25);

    self.onEnter = function() {
        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                mset(x, y, TILE_MENU_BG);
            }
        }

        mset(15, 16, TILE_INERT_MOLASSES);
        molasses.onEnter();
    };

    self.update = function() {
        if (self.frame > SPLASH_TIME && mouse()[2]) {
            gameState.transition(gameState.populateMapState);
        }
        self.frame++;
        molasses.update();
    };

    self.drawWeirdHistory = function() {
        map(30, 17, 30, 17, 0, 0);
    };

    self.drawTitle = function() {
        //molasses.draw();
        cls(14);
        // left
        spr(408, 0, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 16, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 32, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 40, 40, 14, 2, 0, 0, 1, 6);
        // middle
        spr(400, 56, 40, 14, 2, 0, 0, 8, 6);
        // right
        spr(408, 184, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 200, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 216, 40, 14, 2, 0, 0, 1, 6);
        spr(408, 232, 40, 14, 2, 0, 0, 1, 6);

        for (var x = 0; x < 30; x++) {
            for (var y = 0; y < 17; y++) {
                const tile = mget(x, y);
                if (tile >= TILE_MOLASSES_MIN && tile <= TILE_MOLASSES_MAX) {
                    spr(tile, x * 8, y * 8);
                }
            }
        }

        spr(368, 76, 14, 14, 1, 0, 0, 11, 2);
        spr(368, 76, 13, 14, 1, 0, 0, 11, 2);
        spr(368, 76, 12, 14, 1, 0, 0, 11, 2);

        var y = 40;
        printCentered('A game by alligator', 120, y+1, 0);
        printCentered('A game by alligator', 120, y);
        y+= 10;
        printCentered('for the TIC-80', 120, y+1, 0);
        printCentered('for the TIC-80', 120, y);

        y += 16;
        print(' Left Mouse - Place', 48, y+1, 0, true);
        print(' Left Mouse - Place', 48, y, 15, true);
        y += 10;
        print('Right Mouse - Rotate', 48, y+1, 0, true);
        print('Right Mouse - Rotate', 48, y, 15, true);
        y += 10;
        print('          R - Quick restart', 48, y+1, 0, true);
        print('          R - Quick restart', 48, y, 15, true);
        y += 10;
        print('          P - Pause', 48, y+1, 0, true);
        print('          P - Pause', 48, y, 15, true);

        y += 16;
        printCentered('CLICK TO CONTINUE', 120, y+1, 0);
        printCentered('CLICK TO CONTINUE', 120, y);
        //y += 16;
        printCentered('Awful Winter Jam 2018', 120, 125, 0);
        printCentered('Awful Winter Jam 2018', 120, 124);
    };

    self.draw = function() {
        if (self.frame < SPLASH_TIME) {
            self.drawWeirdHistory();
        } else {
            self.drawTitle();
        }
    };

    return self;
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
                        sprite: map.survivorSprite || SPRITE_SURVIVOR,
                    });
                    mset(x, y, map.baseTile || TILE_GROUND_MIN);
                    break;
                case TILE_RALLY_POINT:
                    globals.rallyPoint = { x, y };
                    mset(x, y, map.baseTile || TILE_GROUND_MIN);
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
            const nextState = new TransitionState(TRANSITION_TIME, TXT_BUILDING, gameState.buildState);
            gameState.transition(new CutsceneState(cutscene, nextState));
        } else {
            gameState.transition(new TransitionState(TRANSITION_TIME, TXT_BUILDING, gameState.buildState));
        }
    };

    self.draw = function() {
        cls(0);
    };

    return self;
}

function goToNextMap() {
    globals.mapId++;
    gameState.reset();
    if (globals.mapId >= maps.length) {
        gameState.transition(gameState.endState);
    } else {
        gameState.transition(new TransitionState(TRANSITION_TIME, "Minutes later...", gameState.populateMapState));
    }
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

        if ((!maps[globals.mapId].disableCutsceneSkip && mouse()[4] && !self.initialRmb) || (self.done && mouse()[2])) {
            if (maps[globals.mapId].skip) {
                goToNextMap();
            } else {
                gameState.transition(nextState);
            }
        }

        const line = cutscene[self.linePointer];

        if (gameTime > self.nextUpdate) {
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
                    self.nextUpdate = gameTime + textDelay * 30;
                } else {
                    self.nextUpdate = gameTime + textDelay;
                }
            } else if (line.waitForKey && !mouse()[2]) {
                self.waitingForKey = true;
            } else if (self.linePointer < cutscene.length - 1) {
                self.nextUpdate = gameTime + (line.waitForKey ? 0 : lineDelay);
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
        const map = maps[globals.mapId];
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
                printWrapped(line.text.slice(0, self.textPointer), textX, y + 1, 240 - (margin + 16) * 2 - 2, line.left, line.left ? 15 : 12);
            } else {
                printWrapped(line.text, textX, y + 1, 240 - (margin + 16) * 2 - 2, line.left, line.left ? 15 : 12);
            }
            y += 30;
        }

        if (self.done || self.waitingForKey) {
            const color = (frameCounter % 12 < 6) ? 3 : 15;
            printCentered('CLICK TO CONTINUE', 120, 128, color);
        } else if (!map.disableCutsceneSkip) {
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
        self.endTime = gameTime + timeToPlace * 1000;
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
        //var totalTiles = 0;
        //var totalTilesInWall = 0;
        for (var x = 0; x < MAP_PIECE_WIDTH; x++) {
            for (var y = 0; y < MAP_PIECE_HEIGHT; y++) {
                const tile = mget(MAP_SCRATCH_X + x, MAP_SCRATCH_Y + y);
                const mx = x + self.mouseTileX;
                const my = y + self.mouseTileY;
                const mapTile = mget(mx, my);
                const entity = getEntity(mx, my);

                if (tile > 0) {
                    const hasWall = tileHasFlag(mapTile, FLAG_WALL);
                    const buildable = tileHasFlag(mapTile, FLAG_BUILDABLE);
                    //totalTiles++;

                    //if (hasWall) {
                    //    totalTilesInWall++;
                    //}

                    if (!buildable
                        || (entity && entity.type !== 'DROPLET')
                        || mx < 0 || mx > 29
                        || my < 0 || my > 16
                    ) {
                        return false;
                    }
                }
            }
        }
        //return totalTilesInWall === 0 || totalTilesInWall === totalTiles;
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
    };

    self.update = function() {
        if (btnp(5) || (gameTime > self.endTime && !self.hasPiece)) {
            self.moveToNextState();
        }

        if (keyp(18)) {
            // quick reset
            gameState.reset();
            gameState.transition(new TransitionState(60, 'RESTART!', gameState.populateMapState));
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
        if (gameTime > self.placementTimer) {
            if (m[2] && self.validPlacement) {
                self.placeCurrentPiece()
                self.hasPiece = false;
                self.piecesRemaining--;
                self.placementTimer = gameTime + placementDelay;
                self.floodFill();
            } else if (m[3]) {
                self.hasPiece = false;
                self.piecesRemaining--;
                self.placementTimer = gameTime + placementDelay;
                self.floodFill();
            } else if (m[4]) {
                self.rotate();
                self.placementTimer = gameTime + placementDelay;
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
                    } else if (self.endTime - gameTime < 2000) {
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
        var tm = Math.max((self.endTime - gameTime) / 1000, 0).toFixed(0);
        var color = 15;
        if (tm <= 0) {
            tm = 'LAST BLOCK!';
            color = (frameCounter % 12 < 6) ? 3 : 15;
        }
        printCentered(tm, 120, 6, 14, 0, 2);
        printCentered(tm, 120, 4, color, 0, 2);
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
function MolassesState(updates, spreadRate) {
    var self = {
        nextUpdate: 0,
        droplets: [],
        deaths: [],
        paths: [],
        survivorUpdates: 10,
        updates,
    };

    self.onEnter = function() {
        self.updates = updates || 15;
        self.spreadRate = spreadRate || maps[globals.mapId].spreadRate;
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
                if (Math.random() > self.spreadRate) continue;

                if (self.isSurrounded(x, y)) {
                    mset(x, y, TILE_INERT_MOLASSES);
                    continue;
                }

                const direction = Math.floor(Math.random() * 4);
                var nextX;
                var nextY;

                const closest = self.paths[y * 30 + x];
                if (!closest || Math.random() > 0.7) {
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
                            self.maybeKillSurvivor(nx, ny);
                        }
                    });

                    self.maybeKillSurvivor(nextX, nextY);
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

    self.maybeKillSurvivor = function(x, y) {
        const entity = getEntity(x, y);
        if (entity && entity.type === 'SURVIVOR') {
            // we killed a man
            self.deaths.push({ x: x * 8, y: y * 8 });
            setEntity(x, y, null);
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
        const map = maps[globals.mapId];
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
                if (entity.target && debug) {
                    jtrace(Object.assign({}, entity.target, {
                        thf: tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL),
                        tw: mget(entity.target.wallX, entity.target.wallY) > TILE_WALL,
                    }), true);
                }
                if (entity.target) {
                    // target still valid
                    if (debug) trace('enclosed, still have target');
                    const tile = mget(entity.target.wallX, entity.target.wallY);
                    entity.sprite = map.survivorSprite || SPRITE_SURVIVOR;
                    if (tile === TILE_WALL) {
                        if (debug) trace('repaired, finding new target');
                        // wall is healed
                        entity.target = null;
                    } else if (tileHasFlag(mget(entity.target.wallX, entity.target.wallY), FLAG_WALL)) {
                        if (debug) trace('repairing');
                        sfx(map.survivorBuildingSound || SFX_BUIDLING, Math.floor(Math.random() * 4 + 28), 12, 0, 8);
                        mset(entity.target.wallX, entity.target.wallY, mget(entity.target.wallX, entity.target.wallY) - 1);
                        entity.sprite = map.survivorRepairingSprite || SPRITE_SURVIVOR_REPAIRING;
                    } else {
                        if (debug) trace('um help the wall is gone');
                    }
                } else {
                    entity.sprite = map.survivorSprite || SPRITE_SURVIVOR;
                }

                if (!entity.target) {
                    if (debug) trace('enclosed, looking for target');
                    // flood fill until we find a cracked wall
                    // right wtf are we doing here
                    // we can find the cracked wall but we want the tile we /came from/
                    var target = null;
                    entity.target = null;
                    floodFill(x, y, function(tileX, tileY, prevX, prevY) {
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
                        return mget(tileX, tileY) === TILE_FLOOR;
                    });

                    if (target) {
                        if (debug) {
                            trace('found this:');
                            jtrace(target);
                        }
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
        if (gameTime > self.nextUpdate) {
            if (self.updates === 0) {
                self.removeFlowingMolasses();
                self.nextUpdate = gameTime + 500;
                self.updates--;
                return;
            } else if (self.updates === -1) {
                if (self.deaths.length === 0) {
                    gameState.transition(new TransitionState(TRANSITION_TIME, TXT_ROUND_END, gameState.roundEndState));
                }
                return;
            }
            self.spread();
            self.spread();
            self.calculatePaths();
            self.moveSurvivors();
            self.nextUpdate = gameTime + 250;
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
        xOffset: 0,
    };

    const winAmount = 0.6;
    const highlightTime = 500;
    const highlightColor = 6;

    self.onEnter = function() {
        self.currentSurvivorIndex = -1;
        self.finished = false;

        self.countSurvivors();
        self.nextUpdateTime = gameTime + highlightTime;

        self.lost = self.totalSurvivors < (globals.initialSurviors * winAmount);
        self.won = !self.lost && self.enclosedSurvivors.length >= (globals.initialSurviors * winAmount);

        self.xOffset = 0;
        if (self.enclosedSurvivors.length) {
            self.xOffset = Math.max(0, Math.min(10, -self.enclosedSurvivors[0].x + 20));
        }
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

        self.enclosedSurvivors.sort(function(a, b) {
            return a.x - b.x;
        });
    }

    self.update = function() {
        if (self.finished && !mouse()[2]) return;
        if (gameTime < self.nextUpdateTime) return;

        if (self.currentSurvivorIndex < self.enclosedSurvivors.length - 1) {
            self.currentSurvivorIndex++;
            self.nextUpdateTime += highlightTime;
            sfx(SFX_COUNTER, SFX_COUNTER_PITCH, -1, 0, 7);
        } else if (self.finished) {
            // we outta stuff to display
            if (self.won) {
                globals[maps[globals.mapId].survivorCounter || 'peopleSaved'] += self.enclosedSurvivors.length;
                goToNextMap();
            } else if (self.lost) {
                gameState.reset();
                gameState.transition(new TransitionState(TRANSITION_TIME, "TRY AGAIN", gameState.populateMapState));
            } else {
                gameState.transition(new TransitionState(TRANSITION_TIME, TXT_BUILDING, gameState.buildState));
            }
        } else {
            self.nextUpdateTime += 2000;
            self.finished = true;
        }
    };

    self.draw = function() {
        cls(0);
        const currentSurvivor = self.enclosedSurvivors[self.currentSurvivorIndex];
        const map = maps[globals.mapId];
        if (currentSurvivor) {
            const next = Math.max(0, Math.min(10, -currentSurvivor.x + 20));
            self.xOffset = (1 - 0.05) * self.xOffset + 0.05 * next;
            //trace(self.xOffset);
        }

        drawMap(self.xOffset);
        drawEntities(self.xOffset);
        const flashingColor = (frameCounter % 12 < 6) ? highlightColor : highlightColor - 1;
        const count = self.enclosedSurvivors.length ? (self.currentSurvivorIndex + 1) : 0;
        const x = 40;
        var y = 16;

        for (var i = 0; i <= self.currentSurvivorIndex; i++) {
            const survivor = self.enclosedSurvivors[i];
            if (survivor) {
                rectb((survivor.x + self.xOffset) * 8, survivor.y * 8, 8, 8, flashingColor);
            }
        }

        rect(0, 0, 80, 136, 0);

        printCentered(count, x, y, flashingColor, 0, 2);
        y += 20;
        printCentered(map.survivorName || 'PEOPLE', x, y, 15);
        y += 8;
        printCentered('SAFE', x, y, 15);
        y += 16;
        printCentered(Math.ceil(globals.initialSurviors * winAmount) + '       ', x, y, flashingColor, true);
        printCentered('  NEEDED', x, y, 15, true);

        if (self.finished) {
            y += 16;
            var msg = 'TO CONTINUE';
            if (self.won) {
                printCentered(map.winMessage || "LET'S SCRAM!!", x, y, flashingColor);
            } else if (self.lost) {
                printCentered('TOO MANY', x, y, flashingColor);
                y += 8
                printCentered('DEAD! ABORT!', x, y, flashingColor);
                msg = 'TO RESTART';
            } else {
                printCentered('SAVE MORE!', x, y, flashingColor);
            }

            const color = (frameCounter % 12 < 6) ? 15 : 3;
            y += 24;
            printCentered('CLICK', x, y, color);
            y += 8;
            printCentered(msg, x, y, color);
        }
    };

    return self;
}

function EndState() {
    var self = {
        canResetTime: 0,
    };

    self.onEnter = function() {
        self.canResetTime = gameTime + 2000;

        cls(0);
        var y = 8;
        printCentered('You saved', 120, y); y+= 16;
        printCentered(globals.peopleSaved + ' people', 120, y, 9); y+= 8;
        printCentered('and', 120, y); y+= 8;
        printCentered(globals.ducksSaved + ' ducks', 120, y, 9); y+= 16;
        printCentered('Thanks for playing!', 120, y); y+= 24;

        printCentered('Everything by', 120, y, 3); y+= 8;
        printCentered('alligator', 120, y, 12); y+= 16;
        printCentered('Good ideas and feedback from', 120, y, 3); y+= 8;
        printCentered('sponge', 120, y, 12); y+= 16;

        printCentered('CLICK TO RESET', 120, y); y+= 16;
    };

    self.update = function() {
        if (gameTime > self.canResetTime && mouse()[2]) {
            reset();
        }
    };

    return self;
};

// ----------------------------------------------------------------------------
// FLOOD FILL
function floodFill(x, y, checkFn) {
    const visited = new Array(32 * 19);
    const filled = [];
    floodFill8Recursive(x, y, x, y, filled, visited, checkFn);
    return filled;
}

function floodFill8Recursive(x, y, prevX, prevY, filled, visited, checkFn) {
    if ( x < 0 || x > 31 || y < 0 || y > 18) {
        return;
    }

    if (visited[y * 32 + x]) {
        return;
    }

    visited[y * 32 + x] = true;

    var tileCheck;
    if (checkFn) {
        tileCheck = checkFn(x, y, prevX, prevY);
    } else {
        if (x == 0 || x == 31 || y == 0 || y == 18) {
            tileCheck = true;
        } else {
            tileCheck = !tileHasFlag(mget(x-1, y-1), FLAG_SOLID);
        }
    }

    if (!tileCheck) {
        return;
    }

    filled[y * 32 + x] = true;

    floodFill8Recursive(x + 1 , y,     x, y, filled, visited, checkFn);
    floodFill8Recursive(x - 1 , y,     x, y, filled, visited, checkFn);
    floodFill8Recursive(x     , y + 1, x, y, filled, visited, checkFn);
    floodFill8Recursive(x     , y - 1, x, y, filled, visited, checkFn);
    floodFill8Recursive(x + 1 , y + 1, x, y, filled, visited, checkFn);
    floodFill8Recursive(x - 1 , y - 1, x, y, filled, visited, checkFn);
    floodFill8Recursive(x - 1 , y + 1, x, y, filled, visited, checkFn);
    floodFill8Recursive(x + 1 , y - 1, x, y, filled, visited, checkFn);
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
                && (tile > TILE_MORE_BUILDING_MAX || tile < TILE_MORE_BUILDING_MIN)
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
        mset(x, y, map.baseTile || TILE_GROUND_MIN);
    } else {
        mset(x, y, tile);
    }
}

function drawMap(xoff, yoff) {
    const xOffset = xoff || 0;
    const yOffset = yoff || 0;
    map(0, 0, 30, 17, xOffset * 8, yOffset * 8);
}

function tileHasFlag(tile, type) {
    var result = 0;

    if (tile === TILE_WATER || tile === TILE_TITLE || tile === TILE_MENU_BG) {
        result |= FLAG_SPREADABLE;
    }

    if ((tile >= TILE_GROUND_MIN && tile <= TILE_GROUND_MAX)
        || (tile >= 36 && tile <= 39)
        || tile === TILE_FLOOR) {
        result |= FLAG_BUILDABLE | FLAG_SPREADABLE;
    } else if (tile >= TILE_WALL && tile <= TILE_WALL_CRACKED) {
        result |= FLAG_WALL;
        result |= FLAG_SOLID;
    } else if ((tile >= TILE_BUILDING_MIN && tile <= TILE_BUILDING_MAX)
               || (tile >= TILE_MORE_BUILDING_MIN && tile <= TILE_MORE_BUILDING_MAX)) {
        result |= FLAG_SOLID;
    } else if (tile >= TILE_MOLASSES_MIN && tile <= TILE_MOLASSES_MAX) {
        result |= FLAG_MOLASSES;
    }

    return (result & type) > 0;
}

// ----------------------------------------------------------------------------
// ENTITIES
function forAllEntities(fn, filter) {
    const tm = Math.floor(gameTime);

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
        entity.updated = Math.floor(gameTime);
    }
    entities[y * 30 + x] = entity;
}

function drawEntities(xoff, yoff) {
    const xOffset = xoff || 0;
    const yOffset = yoff || 0;
    forAllEntities(function(x, y, entity) {
        spr(entity.sprite, x*8 + (xOffset * 8), y*8 + (yOffset * 8), 0);
    });
}


function printCentered(text, x, y, color, fixed, scale) {
    const width = print(text, -100, -100, 0, fixed, scale);
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


function drawPause() {
    const w = 80;
    const h = 16;
    rect(120 - w/2, 68 - h/2, 80, 20, 0);
    rectb(120 - w/2, 68 - h/2, 80, 20, 2);
    printCentered('- PAUSED -', 120, 68);
}

// ----------------------------------------------------------------------------
// TIC STUFF
function init() {
    gameState.transition(gameState.titleScreenState);
}
init()

function update() {
    gameState.update();
}

function draw() {
    //cls(0);
    gameState.draw();

    // const m = mouse();
    // const mtx = Math.floor(m[0] / 8);
    // const mty = Math.floor(m[1] / 8);
    // const bx = m[0] + 8;
    // const by = m[1] + 8;
    // rect(bx, by, 28, 17);
    // print('X: ' + mtx, bx + 2, by + 2)
    // print('Y: ' + mty, bx + 2, by + 10)
}

function TIC() {
    try {
        if (!globals.paused) {
            const tm = time();
            gameTime += tm- lastFrameTime
            lastFrameTime = tm;
        }

        if (keyp(16)) {
            globals.paused = !globals.paused;
        }

        if (!globals.paused) {
            update();
            draw();
        } else {
            drawPause();
        }
        frameCounter++;
    } catch (e) {
        // thanks tic-80
        trace(e.lineNumber + ': ' + e);
        trace(e.stack);
        exit();
    }
}
