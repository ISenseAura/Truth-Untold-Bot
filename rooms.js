/**
 * Rooms
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * This file tracks information about the rooms that the bot joins.
 *
 * @license MIT license
 */

'use strict';
const request = require('request');
let Storage = require("./storage.js");
let Shop = require("./plugins/Shop.js");
const webhook = '';

class Room {
	/**
	 * @param {string} id
	 */
	constructor(id) {
    this.logChatMessages = false;
    if(Config.msglogs.includes(this.id)) this.logChatMessages = true;
    
		this.id = id;
		this.clientId = id === 'lobby' ? '' : id;
		/**@type {Map<User, string>} */
		this.users = new Map();
		/**@type {{[k: string]: Function}} */
		this.listeners = {};
		/**@type {?Game} */
		this.game = null;
		/**@type {?Tournament} */
		this.tour = null;		
    this.level = false;
    if(Config.level.includes(this.id)) this.level = true;
	    if(Config.msglogs.includes(this.id)) this.logChatMessages = true;
		if(!Storage.databases[this.id]) Storage.databases[this.id] = {}
    this.shop = Storage.databases[this.id].shop ? Storage.databases[this.id].shop : new Shop(this,Date);

  }

	/**
	 * @param {User} user
	 * @param {string} rank
	 */
	onJoin(user, rank) {
		if (this.id === 'lobby') {
		this.users.set(user, rank);
		if (rank == "#") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		if (rank == "@") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		if (rank == "%") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		}
    this.say('/pm truthuntold,/cmd userdetails ' + user.id);
		user.rooms.set(this, rank);
	}

  onStatus(user){
          this.say('/pm truthuntold,/cmd userdetails ' + user.id);
  }
	/**
	 * @param {User} user
	 */
	onLeave(user) {
		this.users.delete(user);
		if (this.id === 'lobby') {
		if (global.online_auth[user.id]) {
			delete global.online_auth[user.id];
		}
			var keys = Array.from(this.users.keys());
			var names = keys.map(function(item) {
				return item['id'];
			});
			Object.keys(global.online_auth).forEach(function (key) {
				if (!names.includes(key)) { delete global.online_auth[key]; }
			});
	/*	if (Object.keys(global.online_auth).length == 0 && !global.notified) {
				request.post(webhook, {
					json: {
						embeds: [{ "title": "Emergency situation!", "description": "Room has been left unsupervised!" }]
					}
				}, (error, res, body) => {
					if (error) {
						console.error(error);
						return;
					}
					global.notified = true;
				});
		}*/
		}
		user.rooms.delete(this);
	}

	/**
	 * @param {User} user
	 * @param {string} newName
	 */
	onRename(user, newName) {
		let rank = newName.charAt(0);
		newName = Tools.toName(newName);
		let id = Tools.toId(newName);
		let oldName = user.name;
		if (id === user.id) {
			user.name = newName;
		} else {
			if (this.id === 'lobby') {
			if (global.online_auth[user.id]) {
				delete global.online_auth[user.id];
			}
			}
			delete Users.users[user.id];
			if (Users.users[id]) {
				user = Users.users[id];
				user.name = newName;
			} else {
				user.name = newName;
				user.id = id;
				Users.users[id] = user;
			}
		}
		this.users.set(user, rank);
		if (this.id === 'lobby') {
		if (rank == "#") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		if (rank == "@") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		if (rank == "%") {
			global.notified = false;
			global.online_auth[user.id] = user.name;
		}
		}
		user.rooms.set(this, rank);
		if (this.game) this.game.renamePlayer(user, oldName);
		if (this.tour) this.tour.renamePlayer(user, oldName);
	}

	/**
	 * @param {string} message
	 * @param {boolean} [skipNormalization]
	 */
	say(message, skipNormalization) {
		if (!skipNormalization) message = Tools.normalizeMessage(message, this);
		if (!message) return;
		Client.send(this.clientId + '|' + message);
	}

	/**
	 * @param {string} message
	 * @param {Function} listener
	 */
	on(message, listener) {
		message = Tools.normalizeMessage(message, this);
		if (!message) return;
		this.listeners[Tools.toId(message)] = listener;
	}
}

exports.Room = Room;

class Rooms {
	constructor() {
		this.rooms = {};

		this.Room = Room;
		this.globalRoom = this.add('global');
	}

	/**
	 * @param {Room | string} id
	 * @return {Room}
	 */
	get(id) {
		if (id instanceof Room) return id;
		return this.rooms[id];
	}

	/**
	 * @param {string} id
	 * @return {Room}
	 */
	add(id) {
		let room = this.get(id);
		if (!room) {
			room = new Room(id);
			this.rooms[id] = room;
		}
		return room;
	}

	/**
	 * @param {Room | string} id
	 */
	destroy(id) {
		let room = this.get(id);
		if (!room) return;
		if (room.game) room.game.forceEnd();
		if (room.tour) room.tour.end();
		room.users.forEach(function (value, user) {
			user.rooms.delete(room);
		});
		delete this.rooms[room.id];
	}

	destroyRooms() {
		for (let i in this.rooms) {
			this.destroy(i);
		}
	}
}

exports.Rooms = new Rooms();
