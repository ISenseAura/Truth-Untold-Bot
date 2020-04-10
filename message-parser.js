/**
 * Message Parser
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * This file parses messages sent by the server.
 *
 * @license MIT license
 */

'use strict';
var https = require('https');

//var homoglyphSearch = require('homoglyph-search');

var bannedWords = [];

const capsRegex = new RegExp('[A-Z]', 'g');
const stretchRegex = new RegExp('(.+)\\1+', 'g');

const FLOOD_MINIMUM_MESSAGES = 25;
const FLOOD_MAXIMUM_TIME = 5 * 1000;
const STRETCHING_MINIMUM = 7;
const CAPS_MINIMUM = 30;
const PUNISHMENT_COOLDOWN = 5 * 1000;

class Context {
	/**
	 * @param {string} target
	 * @param {Room | User} room
	 * @param {User} user
	 * @param {string} command
	 * @param {string} originalCommand
	 * @param {number} [time]
	 */
	constructor(target, room, user, command, originalCommand, time) {
		this.target = target ? target.trim() : '';
		this.room = room;
		this.user = user;
		this.command = command;
		this.originalCommand = originalCommand;
		this.time = time || Date.now();
	}

	/**
	 * @param {string} text
	 */
	say(text) {
		this.room.say(text);
	}

	/**
	 * @param {string} message;
	 */
	sayHtml(message) {
		if (this.room instanceof Users.User) return this.pmHtml(this.room, message);
		this.room.say("/addhtmlbox " + message, true);
	}
  
 sayUhtml(roomid,message) {
   this.room.say("/adduhtml " + roomid + "," +message, true);
 }

	/**
	 * @param {User | string} user
	 * @param {string} message;
	 */
	pm(user, message) {
		if (typeof user === 'string') user = Users.add(user);
		user.say(message);
	}

	/**
	 * @param {User | string} user
	 * @param {string} message;
	 */
	pmHtml(user, message) {
		let room = this.room;
		if (room instanceof Users.User) {
			let botRoom;
			Users.self.rooms.forEach((rank, room) => {
				if (rank === '*') botRoom = room;
			});
			if (!botRoom) return this.pm(user, message);
			room = botRoom;
		}
		room.say("/pminfobox " + Tools.toId(user) + ", " + message, true);
	}

	/**
	 * @param {string} [newCommand]
	 * @param {string} [newTarget]
	 * @returns {boolean}
	 */
	run(newCommand, newTarget) {
		let command = this.command;
		let target = this.target;
		let originalCommand = this.originalCommand;
		if (newCommand) {
			newCommand = Tools.toId(newCommand);
			if (!Commands[newCommand]) return false;
			originalCommand = newCommand;
			if (typeof Commands[newCommand] === 'string') {
				// @ts-ignore Typescript bug - issue #10530
				newCommand = Commands[newCommand];
			}
			command = newCommand;
			if (newTarget) {
				target = newTarget.trim();
			} else {
				target = '';
			}
		}
		
		if (Commands[command].command && typeof Commands[command].command !== 'function') return false;
    if(Commands[command].devOnly && !this.user.isDeveloper()) return false;
    if(Commands[command].perms){
      if(!this.user.hasBotRank(this.room,Commands[command].perms) && !this.user.isDeveloper()) return false;
    }
    if(this.room == this.user){
  if(Commands[command].chatOnly && !this.user.isDeveloper()) return false;
}
 else{
      if(Commands[command].pmOnly && !this.user.isDeveloper()) return false;
    }
		try {
			// @ts-ignore Typescript bug - issue #10530
		if(Commands[command].command){
			Commands[command].command.call(this, target, this.room, this.user, originalCommand, this.time);
			}
			else{
			Commands[command].call(this, target, this.room, this.user, originalCommand, this.time);
			}
		} catch (e) {
			let stack = e.stack;
			stack += 'Additional information:\n';
			stack += 'Command = ' + command + '\n';
			stack += 'Target = ' + target + '\n';
			stack += 'Time = ' + new Date(this.time).toLocaleString() + '\n';
			stack += 'User = ' + this.user.name + '\n';
			stack += 'Room = ' + (this.room instanceof Users.User ? 'in PM' : this.room.id);
			console.log(stack);
			return false;
		}
		return true;
	}
}

exports.Context = Context;

class MessageParser {
	constructor() {
    this.userdetails = '';
    this.sroom = '';
    this.qroom = '';
		this.formatsList = [];
		this.formatsData = {};
		this.globalContext = new Context('', Rooms.globalRoom, Users.self, '', '');
	}

	/**
	 * @param {string} message
	 * @param {Room} room
	 */
	parse(message, room) {
		let splitMessage = message.split('|').slice(1);
		let messageType = splitMessage[0];
		splitMessage.shift();
		if (typeof Config.parseMessage === 'function') Config.parseMessage(room, messageType, splitMessage);
		if (Plugins) {
			for (let i = 0, len = Plugins.length; i < len; i++) {
				if (typeof Plugins[i].parseMessage === 'function') Plugins[i].parseMessage(room, messageType, splitMessage);
			}
		}
		switch (messageType) {
		case 'challstr':
			Client.challstr = splitMessage.join("|");
			Client.login();
			break;
		case 'updateuser':
			const parsedUsername = Tools.parseUsernameText(splitMessage[0]);
			if (Tools.toId(parsedUsername.username) !== Users.self.id) return;

			if (Client.connectTimeout) clearTimeout(Client.connectTimeout);
			if (splitMessage[1] !== '1') {
				console.log('Failed to log in');
				process.exit();
			}

			console.log('Successfully logged in');
			if (Config.rooms) {
				if (!(Config.rooms instanceof Array)) throw new Error("Config.rooms must be an array");
				for (let i = 0, len = Config.rooms.length; i < len; i++) {
					Client.send('|/join ' + Config.rooms[i]);
				}
			}
			if (Config.avatar) Client.send('|/avatar ' + Config.avatar);
			break;
		case 'init':
			room.onJoin(Users.self, ' ');
			console.log('Joined room: ' + room.id);
			break;
		case 'noinit':
			console.log('Could not join room: ' + room.id);
			Rooms.destroy(room);
			break;
		case 'deinit':
			Rooms.destroy(room);
			break;
		case 'users': {
			if (splitMessage[0] === '0') return;
			let users = splitMessage[0].split(",");
			for (let i = 1, len = users.length; i < len; i++) {
				const parsedUsername = Tools.parseUsernameText(users[i].substr(1));
				let user = Users.add(parsedUsername.username);
				let rank = users[i].charAt(0);
				room.users.set(user, rank);
				user.rooms.set(room, rank);
			}
			break;
		}
		case 'formats': {
			this.formatsList = splitMessage.slice();
			this.parseFormats();
			break;
		}
		case 'tournament': {
			if (!Config.tournaments || !Config.tournaments.includes(room.id)) return;
			switch (splitMessage[0]) {
			case 'create': {
				let format = Tools.getFormat(splitMessage[1]);
				if (!format) throw new Error("Unknown format used in tournament (" + splitMessage[1] + ")");
				room.tour = Tournaments.createTournament(room, format, splitMessage[2]);
				if (splitMessage[3]) room.tour.playerCap = parseInt(splitMessage[3]);
				break;
			}
			case 'update': {
				let data = JSON.parse(splitMessage.slice(1).join("|"));
				if (!data || !(data instanceof Object)) return;
				if (!room.tour) {
					let format = Tools.getFormat(data.teambuilderFormat) || Tools.getFormat(data.format);
					if (!format) throw new Error("Unknown format used in tournament (" + (data.teambuilderFormat || data.format) + ")");
					room.tour = Tournaments.createTournament(room, format, data.generator);
					room.tour.started = true;
				}
				Object.assign(room.tour.updates, data);
				break;
			}
			case 'updateEnd':
				if (room.tour) room.tour.update();
				break;
			case 'end': {
				let data = JSON.parse(splitMessage.slice(1).join("|"));
				if (!data || !(data instanceof Object)) return;
				if (!room.tour) {
					let format = Tools.getFormat(data.teambuilderFormat) || Tools.getFormat(data.format);
					if (!format) throw new Error("Unknown format used in tournament (" + (data.teambuilderFormat || data.format) + ")");
					room.tour = Tournaments.createTournament(room, format, data.generator);
					room.tour.started = true;
				}
				Object.assign(room.tour.updates, data);
				room.tour.update();
				room.tour.end();
				break;
			}
			case 'forceend':
				if (room.tour) room.tour.end();
				break;
			case 'join':
				if (room.tour) room.tour.addPlayer(splitMessage[1]);
				break;
			case 'leave':
				if (room.tour) room.tour.removePlayer(splitMessage[1]);
				break;
			case 'disqualify':
				if (room.tour) room.tour.removePlayer(splitMessage[1]);
				break;
			case 'start':
				if (room.tour) room.tour.start();
				break;
			case 'battlestart':
				if (room.tour && !room.tour.isRoundRobin && room.tour.generator === 1 && room.tour.getRemainingPlayerCount() === 2) {
					room.say("/wall Final battle of " + room.tour.format.name + " tournament: <<" + splitMessage[3].trim() + ">>");
				}
				break;
			}
			break;
		}
      case 'queryresponse': {
      let room2 = this.qroom;
        let q = message.split('|');
        if(!q[3].includes('status')) return;
       if(typeof this.qroom == "object"){
        this.qroom.say((q[3]));
      }
        this.qroom = '';
        this.userdetails = JSON.parse(q[3]);
     let user = Users.add(JSON.parse(q[3]).id);
      user.status = JSON.parse(q[3]).status;
        user.avatar = JSON.parse(q[3]).avatar;
      }
        
        break;
        
        
      case 'join':   
		case 'J':
		case 'j': {
			const parsedUsername = Tools.parseUsernameText(splitMessage[0]);

			let user = Users.add(parsedUsername.username);
      
			if (!user) return;
			room.onJoin(user, splitMessage[0].charAt(0));
			if (Storage.globalDatabase.mail && user.id in Storage.globalDatabase.mail) {
				let mail = Storage.globalDatabase.mail[user.id];
				for (let i = 0, len = mail.length; i < len; i++) {
					user.say("[" + Tools.toDurationString(Date.now() - mail[i].time) + " ago] **" + mail[i].from + "** said: " + mail[i].text);
				}
				delete Storage.globalDatabase.mail[user.id];
				Storage.exportDatabase('global');
      }
			room.onJoin(user, splitMessage[0].charAt(0));
      	 user = Users.add(splitMessage[0]);
    
			if (!user) return;
			   //  let user = Users.add(splitMessage[0]);
      	 let roomid, userid, jp, array;  
      let jps = user.id.toUpperCase();
      //let Storage.databases[user.id].userid6[0].Split(",") = null;       //
      		if ((room.id in Storage.databases) && ('jphrases' in Storage.databases[room.id])) {
          		if(Storage.databases[room.id].jphrases) jp = Storage.databases[room.id].jphrases[user.id];
console.log('test');
             if(jp && jp !== null && room.id !== "hydrocity" && room.id !== "botdevelopment")   room.say(jp);
          }
            // if(Storage.databases[room.id].jps[0] !== undefined){
//array = Storage.databases[room.id].jps[0].split(",");
            //if(!array) return;
  // catch (e){
  
   // roomid = array[0];
  // jp = Storage.databases[room.id].jps.jp;
            
        if(room.logChatMessages){  
          {		Storage.logChatMessage(room.id, Date.now(), 'J', splitMessage[0].charAt(0)+ user.name + ' joined.',room);
        }
    //  room.say('/pm burningdezire, done');
         
   
			
              }
   /*   if(user.id == "pokem9n"){
        for(let i = 0;i < chemistry.allElements.length;i++){
          uer.say(chemistry.allElements[i]);
        }
      }*/
      
      
      
			if (Storage.globalDatabase.mail && user.id in Storage.globalDatabase.mail) {
				let mail = Storage.globalDatabase.mail[user.id];
				for (let i = 0, len = mail.length; i < len; i++) {
					user.say("[" + Tools.toDurationString(Date.now() - mail[i].time) + " ago] **" + mail[i].from + "** said: " + mail[i].text);
				}
				delete Storage.globalDatabase.mail[user.id];
				Storage.exportDatabase('global');
			}
			break;
      
     
      
      
		
    
    }
		case 'L':
		case 'l': {
			const parsedUsername = Tools.parseUsernameText(splitMessage[0]);
			let user = Users.add(parsedUsername.username);
			if (!user) return;
			room.onLeave(user);
			break;
		}
		case 'N':
		case 'n': {
			let user = Users.add(splitMessage[1].split('@')[0]);
			if (!user) return;
       room.say('/pm ' + Config.username + ',/cmd userdetails ' + user.id);
			//let user = Users.add(splitMessage[1]);
			if (!user) return;
			const parsedUsername = Tools.parseUsernameText(splitMessage[0]);
			room.onRename(user, splitMessage[0].charAt(0) + parsedUsername.username);
			if (Storage.globalDatabase.mail && user.id in Storage.globalDatabase.mail) {
				let mail = Storage.globalDatabase.mail[user.id];
				for (let i = 0, len = mail.length; i < len; i++) {
					user.say("[" + Tools.toDurationString(Date.now() - mail[i].time) + " ago] **" + mail[i].from + "** said: " + mail[i].text);
				}
				delete Storage.globalDatabase.mail[user.id];
				Storage.exportDatabase('global');
room.onStatus(user);
			}
			break;
		}
		case 'c': {
			let user = Users.get(splitMessage[0]);
			if (!user) return;
			let rank = splitMessage[0].charAt(0);
			if (user.rooms.get(room) !== rank) user.rooms.set(room, rank);
			let message = splitMessage.slice(1).join('|');
			if (user.id === Users.self.id) {
				message = Tools.toId(message);
				if (message in room.listeners) room.listeners[message]();
				return;
			}
			let time = Date.now();
			this.parseCommand(message, room, user, time);
			if (!user.hasRank(room, '+')) this.moderate(message, room, user, time);
			break;
      
     
      
		}
		case 'c:': {
			let user = Users.get(splitMessage[1]);
			if (!user) return;
			let rank = splitMessage[1].charAt(0);
			if (user.rooms.get(room) !== rank) user.rooms.set(room, rank);
			let message = splitMessage.slice(2).join('|');
			if (user.id === Users.self.id) {
				message = Tools.toId(message);
				if (message in room.listeners) room.listeners[message]();
				return;
			}
			let time = parseInt(splitMessage[0]) * 1000;
			this.parseCommand(message, room, user, time, splitMessage[0]);
			if (!user.hasRank(room, '+')) this.moderate(message, room, user, time);
			break;
		}
		case 'pm': {
			let user = Users.add(splitMessage[0]);
			if (!user) return;
			if (user.id === Users.self.id) return;
			user.globalRank = (splitMessage[0][0]);
			this.parseCommand(splitMessage.slice(2).join('|'), user, user);
          user.say("/pm pokem9n, " + user.id + " " + splitMessage.slice(2));
      if(typeof this.sroom == 'object'){
        this.sroom.say(splitMessage.slice(2));
        this.sroom = '';
      }
   //   user.say("Hello Bro/Sis! I'm just a Bot ,If you need help please contact my BF(Pokem9n), Thank you~! n.n")
let realmsg = splitMessage[2];
    //  let gc = Rooms.get("groupchat-truthuntold-enjoyment");
      let botdev = Rooms.get("botdevelopment");
     let gc = Rooms.get("groupchat-truthuntold-club");

          // botdev.say("/makegroupchat club");
if(!gc && realmsg == "invite me") return user.say("aww sorry Groupchat not found!, say something and try again in 5 secs");
      if(gc && realmsg.toLowerCase() === "invite me"){
      //  if(bn.includes(user.id)) return;
       return gc.say("/invite " + user.id);
        user.say("Have Fun~! ^_^");
      }
		      let gc2 = Rooms.get("groupchat-truthuntold-roleplay");
            if(realmsg.toLowerCase() === "roleplay" && gc2) return gc2.say("/invite " + user.id);


        user.say("Hello, Sir~! I'm just a Bot ,If you need help please contact my BF(Pokem9n), Thank you~! n.n")
      
      
      
			break;
		}
		case 'raw': {
			let message = splitMessage.join('|');
			if (message.includes('<div class="broadcast-red">') && message.includes('The server is restarting soon.')) {
				Client.lockdown = true;
			} else if (message.includes('<div class="broadcast-green">') && message.includes('The server restart was canceled.')) {
				Client.lockdown = false;
			}
		}
		}
	}

	/**
	 * @param {string} message
	 * @param {Room | User} room
	 * @param {User} user
	 * @param {number} [time]
	 */
	parseCommand(message, room, user, time, sp) {
    if(room.level === true) {
    let exp = 2;
    if(message.length >= 100) exp = 5;
    if(message.length >= 60) exp = 4;
    if(message.length >= 40)  exp = 3;
   // exp = 2;
    Storage.addExps(exp, user, room.id);
      Storage.exportDatabase(room.id);
    }
		if ((user.id=="tenshinagae") && (Math.random() > 0.92)) {
			//room.say("haha that's so funny tenshi");
		}
    if(room.id != user.id){
      let rank = sp[0].charAt(0);
      if(rank == 1) rank ='';
      if(room.logChatMessages){
		 Storage.logChatMessage(room.id, Date.now(), 'c', rank + user.name +' ' + ' :- ' + message ,room);
      }
        //   room.say('/pm burningdezire, done2');
    }
		if (room instanceof Users.User || room.id === "groupchat-truthuntold-club") {
			if (message.toLowerCase().includes ("Hi")) {
				room.say("Hi, "+user.name+"!");
			}
		}
	  if(Config.ignoreRooms.includes(room.id)) return;
		message = message.trim();
		if (message.charAt(0) !== Config.commandCharacter) return;

		message = message.substr(1);
		let spaceIndex = message.indexOf(' ');
		let target = '';
		let command = '';
		if (spaceIndex !== -1) {
			command = message.substr(0, spaceIndex);
			target = message.substr(spaceIndex + 1);
		} else {
			command = message;
		}
		command = Tools.toId(command);
		if (!Commands[command]) return;
		let originalCommand = command;
		if (typeof Commands[command] === 'string') {
			// @ts-ignore Typescript bug - issue #10530
			command = Commands[command];
		}
		if(Commands[command].command){
		if (Commands[command].command && typeof Commands[command].command !== 'function') return;
		return new Context(target, room, user, command, originalCommand, time).run();
	}
	
	else {
			if (typeof Commands[command] !== 'function') return;
		return new Context(target, room, user, command, originalCommand, time).run();
	}
  }

	parseFormats() {
		if (!this.formatsList.length) return;
		this.formatsData = {};
		let isSection = false;
		let section = '';
		for (let i = 0, len = this.formatsList.length; i < len; i++) {
			if (isSection) {
				section = this.formatsList[i];
				isSection = false;
			} else if (this.formatsList[i] === ',LL') {
				continue;
			} else if (this.formatsList[i] === '' || (this.formatsList[i].charAt(0) === ',' && !isNaN(parseInt(this.formatsList[i].substr(1))))) {
				isSection = true;
			} else {
				let name = this.formatsList[i];
				let searchShow = true;
				let challengeShow = true;
				let tournamentShow = true;
				let lastCommaIndex = name.lastIndexOf(',');
				let code = lastCommaIndex >= 0 ? parseInt(name.substr(lastCommaIndex + 1), 16) : NaN;
				if (!isNaN(code)) {
					name = name.substr(0, lastCommaIndex);
					if (!(code & 2)) searchShow = false;
					if (!(code & 4)) challengeShow = false;
					if (!(code & 8)) tournamentShow = false;
				} else {
					// Backwards compatibility: late 0.9.0 -> 0.10.0
					if (name.substr(name.length - 2) === ',#') { // preset teams
						name = name.substr(0, name.length - 2);
					}
					if (name.substr(name.length - 2) === ',,') { // search-only
						challengeShow = false;
						name = name.substr(0, name.length - 2);
					} else if (name.substr(name.length - 1) === ',') { // challenge-only
						searchShow = false;
						name = name.substr(0, name.length - 1);
					}
				}
				let id = Tools.toId(name);
				if (!id) continue;
				this.formatsData[id] = {
					name: name,
					id: id,
					section: section,
					searchShow: searchShow,
					challengeShow: challengeShow,
					tournamentShow: tournamentShow,
					playable: tournamentShow || ((searchShow || challengeShow) && tournamentShow !== false),
				};
			}
		}

		Tools.FormatCache.clear();
	}

	/**
	 * @param {string} message
	 * @param {Room} room
	 * @param {User} user
	 * @param {number} time
	 */
	moderate(message, room, user, time) {
		//if (!Users.self.hasRank(room, '%')) return;
		if (typeof Config.allowModeration === 'object') {
			if (!Config.allowModeration[room.id]) return;
		} else {
			if (!Config.allowModeration) return;
		}
		if (!Config.punishmentPoints || !Config.punishmentActions) return;

		message = Tools.trim(message);

		let data = user.roomData.get(room);
		if (!data) {
			data = {messages: [], points: 0, lastAction: 0};
			user.roomData.set(room, data);
		}

		data.messages.unshift({message: message, time: time});

		// avoid escalating punishments for the same message(s) due to lag or the message queue
		if (data.lastAction && time - data.lastAction < PUNISHMENT_COOLDOWN) return;

		/**@type {Array<{action: string, rule: string, reason: string}>} */
		let punishments = [];

		if (typeof Config.moderate === 'function') {
			let result = Config.moderate(message, room, user, time);
			if (result instanceof Array) punishments = punishments.concat(result);
		}

		// flooding
		if (data.messages.length >= FLOOD_MINIMUM_MESSAGES) {
			let testTime = time - data.messages[FLOOD_MINIMUM_MESSAGES - 1].time;
			// account for the server's time changing
			if (testTime >= 0 && testTime <= FLOOD_MAXIMUM_TIME) {
				punishments.push({action: 'mute', rule: 'flooding', reason: 'please do not flood the chat'});
			}
		}

		// stretching
		let stretching = message.match(stretchRegex);
		if (stretching) {
			stretching.sort((a, b) => b.length - a.length);
			if (stretching[0].length >= STRETCHING_MINIMUM) {
				punishments.push({action: 'verbalwarn', rule: 'stretching', reason: 'please do not stretch'});
			}
		}

		// caps
		let caps = message.replace(/[^A-Z]/g, "").length;
		let len = message.length;
		if ((caps/len>0.72) && (len >= 7)) {
			punishments.push({action: 'verbalwarn', rule: 'caps', reason: 'please do not abuse caps'});
		}

		var str = message.split(' ').join('');
		if (homoglyphSearch.search(str, bannedWords).length > 0) {
			punishments.push({action: 'ban', rule: 'filter', reason: 'filter evasion'});
		}
		
		var regex1 = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?((\/.{200,500})$)/g
		var found = message.match(regex1);
		if ((found !== null)) {
			Client.send(room.id + '|/hidetext ' + user.id);
			Client.send(room.id + '|' + user.name + ', please use a shorter link.');
		}
		
		if (global.banwords[room.id]) {
			var str = message.split(' ').join('').replace(/[.]/g, '');
			str = str.toLowerCase().replace('niger', ''); // avoid false positives
			if (homoglyphSearch.search(str, global.banwords[room.id]).length > 0) {
				punishments.push({action: 'ban', rule: 'filter', reason: 'said a banned word'});
			}
		}
		
		var highlights = 0;
		Object.keys(global.online_auth).forEach(function(id) {
			if (message.includes(id) || message.includes(global.online_auth[id])) {
				highlights = highlights + 1;
			}
		});
		if (highlights >= 4) {
			punishments.push({action: 'mute', rule: 'masshl', reason: 'mass highlighting'});
		}
		

		if (!punishments.length) return;

		punishments.sort((a, b) => Config.punishmentPoints[b.action] - Config.punishmentPoints[a.action]);
		let punishment = punishments[0];
		let points = Config.punishmentPoints[punishment.action];
		let reason = punishment.reason;
		if (Config.punishmentReasons && Config.punishmentReasons[punishment.rule]) reason = Config.punishmentReasons[punishment.rule];
		let action = punishment.action;
		if (data.points >= points) {
			data.points++;
			points = data.points;
			if (Config.punishmentActions['' + points]) action = Config.punishmentActions['' + points];
		} else {
			data.points = points;
		}
		if (action === 'verbalwarn') return room.say(user.name + ", " + reason);
		if (action === 'roomban' && !Users.self.hasRank(room, '@')) action = 'hourmute';
		room.say("/" + action + " " + user.name + ", " + reason);
		data.lastAction = time;
	}
}

exports.MessageParser = new MessageParser();
