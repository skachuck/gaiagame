var World = {

	RADIUS: 30,
	VILLAGE_POS: [30, 30],
	TILE: {
                VILLAGE: 'A',
                BARE: '.',
                FOREST: 't',
                BURNING: 'b',
                CAUGHT: 'c',
                GROWING: 'g'
	},
        FIRE_SPREAD_PROB: .7,
        FIRE_BURNOUT_PROB: 1.,
        FOREST_SPREAD_PROB: 1.,
        FIRE_START_PROB: 0.00025,
        FOREST_START_PROB: 0.005,
        _FIRE_STATE_DELAY: 1*1*1000.,
	TILE_PROBS: {},
	LANDMARKS: {},
	STICKINESS: 0.1, // 0 <= x <= 1
	LIGHT_RADIUS: 100,
	BASE_WATER: 10,
	MOVES_PER_FOOD: 2,
	MOVES_PER_WATER: 1,
	DEATH_COOLDOWN: 120,
	FIGHT_CHANCE: 0.20,
	BASE_HEALTH: 10,
	BASE_HIT_CHANCE: 0.8,
	MEAT_HEAL: 8,
	MEDS_HEAL: 20,
	FIGHT_DELAY: 3, // At least three moves between fights
	NORTH: [ 0, -1],
	SOUTH: [ 0,  1],
	WEST:  [-1,  0],
	EAST:  [ 1,  0],

	Weapons: {
		'fists': {
			verb: _('punch'),
			type: 'unarmed',
			damage: 1,
			cooldown: 2
		},
		'bone spear': {
			verb: _('stab'),
			type: 'melee',
			damage: 2,
			cooldown: 2
		},
		'iron sword': {
			verb: _('swing'),
			type: 'melee',
			damage: 4,
			cooldown: 2
		},
		'steel sword': {
			verb: _('slash'),
			type: 'melee',
			damage: 6,
			cooldown: 2
		},
		'bayonet': {
			verb: _('thrust'),
			type: 'melee',
			damage: 8,
			cooldown: 2
		},
		'rifle': {
			verb: _('shoot'),
			type: 'ranged',
			damage: 5,
			cooldown: 1,
			cost: { 'bullets': 1 }
		},
		'laser rifle': {
			verb: _('blast'),
			type: 'ranged',
			damage: 8,
			cooldown: 1,
			cost: { 'energy cell': 1 }
		},
		'grenade': {
			verb: _('lob'),
			type: 'ranged',
			damage: 15,
			cooldown: 5,
			cost: { 'grenade': 1 }
		},
		'bolas': {
			verb: _('tangle'),
			type: 'ranged',
			damage: 'stun',
			cooldown: 15,
			cost: { 'bolas': 1 }
		}
	},

	name: 'World',
	options: {}, // Nothing for now
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);

		// Setup probabilities. Sum must equal 1.
		World.TILE_PROBS[World.TILE.BURNING] = 0.0025;
		World.TILE_PROBS[World.TILE.BARE] = 0.25;
		World.TILE_PROBS[World.TILE.FOREST] = 1 - World.TILE_PROBS[World.TILE.BARE] - World.TILE_PROBS[World.TILE.BURNING];

		// Only add the cache if there is prestige data	

		if(typeof $SM.get('features.location.world') == 'undefined') {
			$SM.set('features.location.world', true);
			$SM.setM('game.world', {
				map: World.generateMap(),
				mask: World.newMask()
			});
		}
                else {
                        $SM.setM('game.world', {
				map: World.generateMap(),
				mask: World.newMask()
			});
                }

		// Create the World panel
		this.panel = $('<div>').attr('id', "worldPanel").addClass('location').appendTo('#outerSlider');

		// Create the shrink wrapper
		var outer = $('<div>').attr('id', 'worldOuter').appendTo(this.panel);

		// Create the bag panel
		$('<div>').attr('id', 'bagspace-world').append($('<div>')).appendTo(outer);
		$('<div>').attr('id', 'backpackTitle').appendTo(outer);
		$('<div>').attr('id', 'backpackSpace').appendTo(outer);
		$('<div>').attr('id', 'healthCounter').appendTo(outer);

		Engine.updateOuterSlider();

		// Map the ship and show compass tooltip
		//World.ship = World.mapSearch(World.TILE.SHIP,$SM.get('game.world.map'),1);
		//World.dir = World.compassDir(World.ship[0]);
		// compass tooltip text
		Room.compassTooltip(World.dir);

		// Check if everything has been seen
		World.testMap();

		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(World.handleStateUpdates);


	},

        propagateFire: function() {
                map = World.state.map;
                for(var x=0; x<=World.RADIUS*2; x++) {
                        for(var y=0; y<=World.RADIUS*2; y++) {
                                // Burn adjacent to burn
                                if(map[x][y] == World.TILE.BURNING) { 
                                        var adjacent = [
		                        	y > 0 ? [x,y-1] : null,
		                        	y < World.RADIUS * 2 ? [x,y+1] : null,
		                        	x < World.RADIUS * 2 ? [x+1,y] : null,
		                        	x > 0 ? [x-1,y] : null
		                        ];
                                        for(a in adjacent) {
                                                a = adjacent[a];
                                                if(a==null) {continue;}
                                                if(map[a[0]][a[1]] == World.TILE.FOREST) {
                                                        var r = Math.random();
                                                        if(r < World.FIRE_SPREAD_PROB) {
                                                                map[a[0]][a[1]] = World.TILE.CAUGHT;
                                                        }
                                                }
                                         }
                                 }
                                 // Grow adjacent to forest
                                if(map[x][y] == World.TILE.FOREST) { 
                                        var adjacent = [
		                        	y > 0 ? [x,y-1] : null,
		                        	y < World.RADIUS * 2 ? [x,y+1] : null,
		                        	x < World.RADIUS * 2 ? [x+1,y] : null,
		                        	x > 0 ? [x-1,y] : null
		                        ];
                                        for(a in adjacent) {
                                                a = adjacent[a];
                                                if(a==null) {continue;}
                                                if(map[a[0]][a[1]] == World.TILE.BARE) {
                                                        var r = Math.random();
                                                        if(r < World.FOREST_SPREAD_PROB) {
                                                                map[a[0]][a[1]] = World.TILE.GROWING;
                                                        }
                                                }
                                         }
                                 }
                         }
                }                                                          
           
                // Burn the recently caught
                for(var x=0; x<=World.RADIUS*2; x++) {
                        for(var y=0; y<=World.RADIUS*2; y++) {
                                // Burn out some burning tiles
                                if(map[x][y] == World.TILE.BURNING) {
                                        var r = Math.random();
                                        if(r < World.FIRE_BURNOUT_PROB) {
                                                World.state.map[x][y] = World.TILE.BARE;
                                        }
                                }
                                // Burn the recently caught
                                else if(map[x][y] == World.TILE.CAUGHT) {
                                        map[x][y] = World.TILE.BURNING;
                                }
                                // Start some forests
                                else if(map[x][y] == World.TILE.BARE){
                                        var r = Math.random();
                                        if(r < World.FOREST_START_PROB) {
                                                World.state.map[x][y] = World.TILE.BARE;
                                        }
                                }
                                else if(map[x][y] == World.TILE.GROWING) {
                                        map[x][y] = World.TILE.FOREST;
                                }
                        }
                }

                World.drawMap();
                // Reset the timer
	        World._fireTimer = Engine.setTimeout(World.propagateFire, World._FIRE_STATE_DELAY);

        },

	updateSupplies: function() {
		var supplies = $('div#bagspace-world > div');

		if(!Path.outfit) {
			Path.outfit = {};
		}

		// Add water
		var water = $('div#supply_water');
		if(World.water > 0 && water.length === 0) {
			water = World.createItemDiv('water', World.water);
			water.prependTo(supplies);
		} else if(World.water > 0) {
			$('div#supply_water', supplies).text(_('water:{0}' , World.water));
		} else {
			water.remove();
		}

		var total = 0;
		for(var k in Path.outfit) {
			var item = $('div#supply_' + k.replace(' ', '-'), supplies);
			var num = Path.outfit[k];
			total += num * Path.getWeight(k);
			if(num > 0 && item.length === 0) {
				item = World.createItemDiv(k, num);
				if(k == 'cured meat' && World.water > 0) {
					item.insertAfter(water);
				} else if(k == 'cured meat') {
					item.prependTo(supplies);
				} else {
					item.appendTo(supplies);
				}
			} else if(num > 0) {
				$('div#' + item.attr('id'), supplies).text(_(k) + ':' + num);
			} else {
				item.remove();
			}
		}

		// Update label
		var t = _('pockets');
		if($SM.get('stores.rucksack', true) > 0) {
			t = _('rucksack');
		}
		$('#backpackTitle').text(t);

		// Update bagspace
		$('#backpackSpace').text(_('free {0}/{1}', Math.floor(Path.getCapacity() - total) , Path.getCapacity()));
	},

	setWater: function(w) {
		World.water = w;
		if(World.water > World.getMaxWater()) {
			World.water = World.getMaxWater();
		}
		World.updateSupplies();
	},

	setHp: function(hp) {
		if(typeof hp == 'number' && !isNaN(hp)) {
			World.health = hp;
			if(World.health > World.getMaxHealth()) {
				World.health = World.getMaxHealth();
			}
			$('#healthCounter').text(_('hp: {0}/{1}', World.health , World.getMaxHealth()));
		}
	},

	createItemDiv: function(name, num) {
		var div = $('<div>').attr('id', 'supply_' + name.replace(' ', '-'))
			.addClass('supplyItem')
			.text(_('{0}:{1}',_(name), num));

		return div;
	},

	moveNorth: function() {
		Engine.log('North');
		if(World.curPos[1] > 0) World.move(World.NORTH);
	},

	moveSouth: function() {
		Engine.log('South');
		if(World.curPos[1] < World.RADIUS * 2) World.move(World.SOUTH);
	},

	moveWest: function() {
		Engine.log('West');
		if(World.curPos[0] > 0) World.move(World.WEST);
	},

	moveEast: function() {
		Engine.log('East');
		if(World.curPos[0] < World.RADIUS * 2) World.move(World.EAST);
	},

	move: function(direction) {
		var oldTile = World.state.map[World.curPos[0]][World.curPos[1]];
		World.curPos[0] += direction[0];
		World.curPos[1] += direction[1];
		World.narrateMove(oldTile, World.state.map[World.curPos[0]][World.curPos[1]]);
		World.lightMap(World.curPos[0], World.curPos[1], World.state.mask);
		World.drawMap();
		World.doSpace();
		//if(World.checkDanger()) {
		//	if(World.danger) {
		//		Notifications.notify(World, _('dangerous to be this far from the village without proper protection'));
		//	} else {
		//		Notifications.notify(World, _('safer here'));
		//	}
		//}
	},

	keyDown: function(event) {
		switch(event.which) {
			case 38: // Up
			case 87:
				World.moveNorth();
				break;
			case 40: // Down
			case 83:
				World.moveSouth();
				break;
			case 37: // Left
			case 65:
				World.moveWest();
				break;
			case 39: // Right
			case 68:
				World.moveEast();
				break;
			default:
				break;
		}
	},

	swipeLeft: function(e) {
		World.moveWest();
	},

	swipeRight: function(e) {
		World.moveEast();
	},

	swipeUp: function(e) {
		World.moveNorth();
	},

	swipeDown: function(e) {
		World.moveSouth();
	},

	click: function(event) {
		var map = $('#map'),
			// measure clicks relative to the centre of the current location
			centreX = map.offset().left + map.width() * World.curPos[0] / (World.RADIUS * 2),
			centreY = map.offset().top + map.height() * World.curPos[1] / (World.RADIUS * 2),
			clickX = event.pageX - centreX,
			clickY = event.pageY - centreY;
		if (clickX > clickY && clickX < -clickY) {
			World.moveNorth();
		}
		if (clickX < clickY && clickX > -clickY) {
			World.moveSouth();
		}
		if (clickX < clickY && clickX < -clickY) {
			World.moveWest();
		}
		if (clickX > clickY && clickX > -clickY) {
			World.moveEast();
		}
	},

	checkDanger: function() {
		World.danger = typeof World.danger == 'undefined' ? false: World.danger;
		if(!World.danger) {
			if($SM.get('stores["i armour"]', true) === 0 && World.getDistance() >= 8) {
				World.danger = true;
				return true;
			}
			if($SM.get('stores["s armour"]', true) === 0 && World.getDistance() >= 18) {
				World.danger = true;
				return true;
			}
		} else {
			if(World.getDistance() < 8) {
				World.danger = false;
				return true;
			}
			if(World.getDistance < 18 && $SM.get('stores["i armour"]', true) > 0) {
				World.danger = false;
				return true;
			}
		}
		return false;
	},

	useSupplies: function() {
		World.foodMove++;
		World.waterMove++;
		// Food
		var movesPerFood = World.MOVES_PER_FOOD;
		movesPerFood *= $SM.hasPerk('slow metabolism') ? 2 : 1;
		if(World.foodMove >= movesPerFood) {
			World.foodMove = 0;
			var num = Path.outfit['cured meat'];
			num--;
			if(num === 0) {
				Notifications.notify(World, _('the meat has run out'));
			} else if(num < 0) {
				// Starvation! Hooray!
				num = 0;
				if(!World.starvation) {
					Notifications.notify(World, _('starvation sets in'));
					World.starvation = true;
				} else {
					$SM.set('character.starved', $SM.get('character.starved', true));
					$SM.add('character.starved', 1);
					if($SM.get('character.starved') >= 10 && !$SM.hasPerk('slow metabolism')) {
						$SM.addPerk('slow metabolism');
					}
					World.die();
					return false;
				}
			} else {
				World.starvation = false;
				World.setHp(World.health + World.meatHeal());
			}
			Path.outfit['cured meat'] = num;
		}
		// Water
		var movesPerWater = World.MOVES_PER_WATER;
		movesPerWater *= $SM.hasPerk('desert rat') ? 2 : 1;
		if(World.waterMove >= movesPerWater) {
			World.waterMove = 0;
			var water = World.water;
			water--;
			if(water === 0) {
				Notifications.notify(World, _('there is no more water'));
			} else if(water < 0) {
				water = 0;
				if(!World.thirst) {
					Notifications.notify(World, _('the thirst becomes unbearable'));
					World.thirst = true;
				} else {
					$SM.set('character.dehydrated', $SM.get('character.dehydrated', true));
					$SM.add('character.dehydrated', 1);
					if($SM.get('character.dehydrated') >= 10 && !$SM.hasPerk('desert rat')) {
						$SM.addPerk('desert rat');
					}
					World.die();
					return false;
				}
			} else {
				World.thirst = false;
			}
			World.setWater(water);
			World.updateSupplies();
		}
		return true;
	},

	meatHeal: function() {
		return World.MEAT_HEAL * ($SM.hasPerk('gastronome') ? 2 : 1);
	},

	medsHeal: function() {
		return World.MEDS_HEAL;
	},

	checkFight: function() {
		World.fightMove = typeof World.fightMove == 'number' ? World.fightMove : 0;
		World.fightMove++;
		if(World.fightMove > World.FIGHT_DELAY) {
			var chance = World.FIGHT_CHANCE;
			chance *= $SM.hasPerk('stealthy') ? 0.5 : 1;
			if(Math.random() < chance) {
				World.fightMove = 0;
				Events.triggerFight();
			}
		}
	},

	doSpace: function() {
		var curTile = World.state.map[World.curPos[0]][World.curPos[1]];

		if(curTile == World.TILE.VILLAGE) {
			World.goHome();
		} //else if(typeof World.LANDMARKS[curTile] != 'undefined') {
		//	if(curTile != World.TILE.OUTPOST || !World.outpostUsed()) {
		//		Events.startEvent(Events.Setpieces[World.LANDMARKS[curTile].scene]);
		//	}
		//} else {
		//	if(World.useSupplies()) {
		//		World.checkFight();
		//	}
		//}
	},

	getDistance: function(from, to) {
		from = from || World.curPos;
		to = to || World.VILLAGE_POS;
		return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
	},

	getTerrain: function() {
		return World.state.map[World.curPos[0]][World.curPos[1]];
	},

	getDamage: function(thing) {
		return World.Weapons[thing].damage;
	},

	narrateMove: function(oldTile, newTile) {
		var msg = null;
		switch(oldTile) {
			case World.TILE.FOREST:
				switch(newTile) {
					case World.TILE.BURNING:
						msg = _("the trees here are on fire");
						break;
					case World.TILE.BARE:
						msg = _("the trees are gone.");
						break;
				}
				break;
			case World.TILE.BARE:
				switch(newTile) {
					case World.TILE.FOREST:
						msg = _("trees loom on the horizon. grasses gradually yield to a forest floor of dry branches and fallen leaves.");
						break;
					case World.TILE.BURNING:
						msg = _("the forest here is burning.");
						break;
				}
				break;
			case World.TILE.BURNING:
				switch(newTile) {
					case World.TILE.FOREST:
						msg = _("this part of the forest is not yet burning");
						break;
					case World.TILE.BARE:
						msg = _("burning woods give way to a clearing.");
						break;
				}
				break;
		}
		if(msg != null) {
			Notifications.notify(World, msg);
		}
	},

	newMask: function() {
                Engine.log('Generating mask');
		var mask = new Array(World.RADIUS * 2 + 1);
		for(var i = 0; i <= World.RADIUS * 2; i++) {
			mask[i] = new Array(World.RADIUS * 2 + 1);
		}
		World.lightMap(World.RADIUS, World.RADIUS, mask);
		return mask;
	},

	lightMap: function(x, y, mask) {
		var r = World.LIGHT_RADIUS;
		r *= $SM.hasPerk('scout') ? 2 : 1;
		World.uncoverMap(x, y, r, mask);
		return mask;
	},

	uncoverMap: function(x, y, r, mask) {
		mask[x][y] = true;
		for(var i = -r; i <= r; i++) {
			for(var j = -r + Math.abs(i); j <= r - Math.abs(i); j++) {
				if(y + j >= 0 && y + j <= World.RADIUS * 2 &&
						x + i <= World.RADIUS * 2 &&
						x + i >= 0) {
					mask[x+i][y+j] = true;
				}
			}
		}
	},

	testMap: function() {
		if(!World.seenAll) {
			var dark; 
			var mask = $SM.get('game.world.mask');
			loop:
			for(var i = 0; i < mask.length; i++) {
				for(var j = 0; j < mask[i].length; j++) {
					if(!mask[i][j]) {
						dark = true;
						break loop;
					}
				}
			}
			World.seenAll = !dark;
		}
	},

	applyMap: function() {
		if(!World.seenAll){
			var x,y,mask = $SM.get('game.world.mask');
			do {
				x = Math.floor(Math.random() * (World.RADIUS * 2 + 1));
				y = Math.floor(Math.random() * (World.RADIUS * 2 + 1));
			} while (mask[x][y]);
			World.uncoverMap(x, y, 5, mask);
		}
		World.testMap();
	},

        generateMap: function() {
                Engine.log('Generating Map');
		var map = new Array(World.RADIUS * 2 + 1);
		for(var i = 0; i <= World.RADIUS * 2; i++) {
			map[i] = new Array(World.RADIUS * 2 + 1);
		}
		// The Village is always at the exact center
		// Spiral out from there
		map[World.RADIUS][World.RADIUS] = World.TILE.VILLAGE;
		for(var r = 0; r <= World.RADIUS; r++) {
			for(var t = 0; t < r * 8; t++) {
				var x, y;
				if(t < 2 * r) {
					x = World.RADIUS - r + t;
					y = World.RADIUS - r;
				} else if(t < 4 * r) {
					x = World.RADIUS + r;
					y = World.RADIUS - (3 * r) + t;
				} else if(t < 6 * r) {
					x = World.RADIUS + (5 * r) - t;
					y = World.RADIUS + r;
				} else {
					x = World.RADIUS - r;
					y = World.RADIUS + (7 * r) - t;
				}
                //for (var x=0; x<=World.RADIUS*2; x++) {
                //        for (var y=0; y<=World.RADIUS*2; y++) {
				map[x][y] = World.chooseTile(x, y, map);
			}
		}

		// Place landmarks
		//for(var k in World.LANDMARKS) {
		//	var landmark = World.LANDMARKS[k];
		//	for(var l = 0; l < landmark.num; l++) {
		//		var pos = World.placeLandmark(landmark.minRadius, landmark.maxRadius, k, map);
		//	}
		//}

		return map;
	},

	mapSearch: function(target,map,required){
		var max = World.LANDMARKS[target].num;
		if(!max){
			// this restrict the research to numerable landmarks
			return null;
		}
		// restrict research if only a fixed number (usually 1) is required
		max = (required) ? Math.min(required,max) : max;
		var index = 0;
		var targets = [];
		search: // label for coordinate research
		for(var i = 0; i <= World.RADIUS * 2; i++){
			for(var j = 0; j <= World.RADIUS * 2; j++){
				if(map[i][j].charAt(0) === target){
					// search result is stored as an object;
					// items are listed as they appear in the map, tl-br
					// each item has relative coordinates and a compass-type direction
					targets[index] = {
						x : i - World.RADIUS,
						y : j - World.RADIUS,
					};
					index++;
					if(index === max){
						// optimisation: stop the research if maximum number of items has been reached
						break search;
					}
				}
			}
		}
		return targets;
	},

	compassDir: function(pos){
		var dir = '';
		var horz = pos.x < 0 ? 'west' : 'east';
		var vert = pos.y < 0 ? 'north' : 'south';
		if(Math.abs(pos.x) / 2 > Math.abs(pos.y)) {
			dir = horz;
		} else if(Math.abs(pos.y) / 2 > Math.abs(pos.x)){
			dir = vert;
		} else {
			dir = vert + horz;
		}
		return dir;
	},

	placeLandmark: function(minRadius, maxRadius, landmark, map) {

		var x = World.RADIUS, y = World.RADIUS;
		while(!World.isTerrain(map[x][y])) {
			var r = Math.floor(Math.random() * (maxRadius - minRadius)) + minRadius;
			var xDist = Math.floor(Math.random() * r);
			var yDist = r - xDist;
			if(Math.random() < 0.5) xDist = -xDist;
			if(Math.random() < 0.5) yDist = -yDist;
			x = World.RADIUS + xDist;
			if(x < 0) x = 0;
			if(x > World.RADIUS * 2) x = World.RADIUS * 2;
			y = World.RADIUS + yDist;
			if(y < 0) y = 0;
			if(y > World.RADIUS * 2) y = World.RADIUS * 2;
		}
		map[x][y] = landmark;
		return [x, y];
	},

	isTerrain: function(tile) {
		return tile == World.TILE.FOREST || tile == World.TILE.BARE || tile == World.TILE.BURNING;
	},

	chooseTile: function(x, y, map) { 
		var adjacent = [
			y > 0 ? map[x][y-1] : null,
			y < World.RADIUS * 2 ? map[x][y+1] : null,
			x < World.RADIUS * 2 ? map[x+1][y] : null,
			x > 0 ? map[x-1][y] : null
		];

		var chances = {};	

		var nonSticky = 1;
		var cur;
		for(var i in adjacent) {
			if(adjacent[i] == World.TILE.VILLAGE) {
				// Village must be in a forest to maintain thematic consistency, yo.
				return World.TILE.FOREST;
			} else if(typeof adjacent[i] == 'string') {
				cur = chances[adjacent[i]];
				cur = typeof cur == 'number' ? cur : 0;
				chances[adjacent[i]] = cur + World.STICKINESS;
				nonSticky -= World.STICKINESS;
			}
		}
		for(var t in World.TILE) {
			var tile = World.TILE[t];
			if(World.isTerrain(tile)) {
				cur = chances[tile];
				cur = typeof cur == 'number' ? cur : 0;
				cur += World.TILE_PROBS[tile] * nonSticky;
				chances[tile] = cur;
			}
		}

		var list = [];
		for(var j in chances) {
			list.push(chances[j] + '' + j);
		}
		list.sort(function(a, b) {
			var n1 = parseFloat(a.substring(0, a.length - 1));
			var n2 = parseFloat(b.substring(0, b.length - 1));
			return n2 - n1;
		});

		var c = 0;
		var r = Math.random();
		for(var l in list) {
			var prob = list[l];
			c += parseFloat(prob.substring(0,prob.length - 1));
			if(r < c) {
				return prob.charAt(prob.length - 1);
			}
		}

		return World.TILE.FOREST;
	},

	markVisited: function(x, y) {
		World.state.map[x][y] = World.state.map[x][y] + '!';
	},

	drawMap: function() {
		var map = $('#map');
		if(map.length === 0) {
			map = new $('<div>').attr('id', 'map').appendTo('#worldOuter');
			// register click handler
			map.click(World.click);
		}
		var mapString = "";
		for(var j = 0; j <= World.RADIUS * 2; j++) {
			for(var i = 0; i <= World.RADIUS * 2; i++) {
				var ttClass = "";
				if(i > World.RADIUS) {
					ttClass += " left";
				} else {
					ttClass += " right";
				}
				if(j > World.RADIUS) {
					ttClass += " top";
				} else {
					ttClass += " bottom";
				}
				if(World.curPos[0] == i && World.curPos[1] == j) {
					mapString += '<span class="landmark">@<div class="tooltip ' + ttClass + '">'+_('Wanderer')+'</div></span>';
				} else if(World.state.mask[i][j]) {
					var c = World.state.map[i][j];
					switch(c) {
						case World.TILE.VILLAGE:
							mapString += '<span class="landmark">' + c + '<div class="tooltip' + ttClass + '">'+_('The&nbsp;Village')+'</div></span>';
							break;
						default:	
							if(c.length > 1) {
								c = c[0];
							}
							mapString += c;	
							break;
				        }
				} else {
					mapString += '&nbsp;';
				}
			}
			mapString += '<br/>';
		}
		map.html(mapString);
	},

	die: function() {
		if(!World.dead) {
			World.dead = true;
			Engine.log('player death');
			Engine.event('game event', 'death');
			Engine.keyLock = true;
			// Dead! Discard any world changes and go home
			Notifications.notify(World, _('the world fades'));
			World.state = null;
			Path.outfit = {};
			$SM.remove('outfit');
			$('#outerSlider').animate({opacity: '0'}, 600, 'linear', function() {
				$('#outerSlider').css('left', '0px');
				$('#locationSlider').css('left', '0px');
				$('#storesContainer').css({'top': '0px', 'right': '0px'});
				Engine.activeModule = Room;
				$('div.headerButton').removeClass('selected');
				Room.tab.addClass('selected');
				Engine.setTimeout(function(){
					Room.onArrival();
					$('#outerSlider').animate({opacity:'1'}, 600, 'linear');
					Button.cooldown($('#embarkButton'));
					Engine.keyLock = false;
					Engine.tabNavigation = true;
				}, 2000, true);
			});
		}
	},

	goHome: function() {
		// Home safe! Commit the changes.
		$SM.setM('game.world', World.state);
		World.testMap();

		if(World.state.sulphurmine && $SM.get('game.buildings["sulphur mine"]', true) === 0) {
			$SM.add('game.buildings["sulphur mine"]', 1);
			Engine.event('progress', 'sulphur mine');
		}
		if(World.state.ironmine && $SM.get('game.buildings["iron mine"]', true) === 0) {
			$SM.add('game.buildings["iron mine"]', 1);
			Engine.event('progress', 'iron mine');
		}
		if(World.state.coalmine && $SM.get('game.buildings["coal mine"]', true) === 0) {
			$SM.add('game.buildings["coal mine"]', 1);
			Engine.event('progress', 'coal mine');
		}
		if(World.state.ship && !$SM.get('features.location.spaceShip')) {
			Ship.init();
			Engine.event('progress', 'ship');
		}
		World.state = null;

		if(Path.outfit['cured meat'] > 0) {
			Button.setDisabled($('#embarkButton'), false);
		}

		for(var k in Path.outfit) {
			$SM.add('stores["'+k+'"]', Path.outfit[k]);
			if(World.leaveItAtHome(k)) {
				Path.outfit[k] = 0;
			}
		}

		$('#outerSlider').animate({left: '0px'}, 300);
		Engine.activeModule = Path;
		Path.onArrival();
		Engine.restoreNavigation = true;
	},

	leaveItAtHome: function(thing) {
		 return thing != 'cured meat' && thing != 'bullets' && thing != 'energy cell'  && thing != 'charm' && thing != 'medicine' &&
		 typeof World.Weapons[thing] == 'undefined' && typeof Room.Craftables[thing] == 'undefined';
	},

	getMaxHealth: function() {
		if($SM.get('stores["s armour"]', true) > 0) {
			return World.BASE_HEALTH + 35;
		} else if($SM.get('stores["i armour"]', true) > 0) {
			return World.BASE_HEALTH + 15;
		} else if($SM.get('stores["l armour"]', true) > 0) {
			return World.BASE_HEALTH + 5;
		}
		return World.BASE_HEALTH;
	},

	getHitChance: function() {
		if($SM.hasPerk('precise')) {
			return World.BASE_HIT_CHANCE + 0.1;
		}
		return World.BASE_HIT_CHANCE;
	},

	getMaxWater: function() {
		if($SM.get('stores["water tank"]', true) > 0) {
			return World.BASE_WATER + 50;
		} else if($SM.get('stores.cask', true) > 0) {
			return World.BASE_WATER + 20;
		} else if($SM.get('stores.waterskin', true) > 0) {
			return World.BASE_WATER + 10;
		}
		return World.BASE_WATER;
	},

	outpostUsed: function(x, y) {
		x = typeof x == 'number' ? x : World.curPos[0];
		y = typeof y == 'number' ? y : World.curPos[1];
		var used = World.usedOutposts[x + ',' + y];
		return typeof used != 'undefined' && used === true;
	},

	useOutpost: function() {
		Notifications.notify(null, _('water replenished'));
		World.setWater(World.getMaxWater());
		// Mark this outpost as used
		World.usedOutposts[World.curPos[0] + ',' + World.curPos[1]] = true;
	},

	onArrival: function() {
		Engine.tabNavigation = false;
		// Clear the embark cooldown
		Button.clearCooldown($('#embarkButton'));
		Engine.keyLock = false;
		// Explore in a temporary world-state. We'll commit the changes if you return home safe.
		World.state = $.extend(true, {}, $SM.get('game.world'));
		World.setWater(World.getMaxWater());
		World.setHp(World.getMaxHealth());
		World.foodMove = 0;
		World.waterMove = 0;
		World.starvation = false;
		World.thirst = false;
		World.usedOutposts = {};
		World.curPos = World.copyPos(World.VILLAGE_POS);
		World.drawMap();
		World.setTitle();
		World.dead = false;
		$('div#bagspace-world > div').empty();
		World.updateSupplies();
		$('#bagspace-world').width($('#map').width());
	        World._fireTimer = Engine.setTimeout(World.propagateFire, World._FIRE_STATE_DELAY);
	},

	setTitle: function() {
		document.title = _('A Barren World');
	},

	copyPos: function(pos) {
		return [pos[0], pos[1]];
	},

	handleStateUpdates: function(e){

	}
};
