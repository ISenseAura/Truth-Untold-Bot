/*************************************************
 **                                              **
 ** Room Currency Plugin - Code By Pokem9n$(❤)  **
 **                                             **
 ************************************************/
let Storage = require("../storage.js");

module.exports = {
  name: Config.currency,
  baseCurr: 0, // amount of currency at begining
  UNO: "5", // define amount of currency that should be given after winning UNO
  TOUR: "5", // define amount of currency that should be given after winning UNO
  data: {
    logs: []
  },

  give(user, room, amount, reason) {
    let db = Storage.databases;
    if (!db[room.id]) db[room.id] = {};
    if (!db[room.id][user.id]) db[room.id][user.id] = {};
    if (!db[room.id][user.id].currency)
      db[room.id][user.id].currency = { amount: 0 };
    if (!reason) return room.say("Sorry, you must specify a reason");
    db[room.id][user.id].currency.amount += amount;
    this.data[user.id] = db[room.id][user.id].currency.amount;
    this.data.logs.push(
      user.name +
        " has been given " +
        amount +
        this.name +
        " (REASON : " +
        reason +
        ")"
    );
    Storage.databases[room.id].currency = this.data;
    Storage.exportDatabase(room.id);
    return true;
  },

  take(user, room, amount, reason) {
    let db = Storage.databases;
    if (!db[room.id]) db[room.id] = {};
    if (!db[room.id][user.id]) db[room.id][user.id] = {};
    if (!db[room.id][user.id].currency)
      db[room.id][user.id].currency = { amount: 0 };
    if (!reason) return room.say("Sorry, you must specify a reason");
    db[room.id][user.id].currency.amount -= amount;
    this.data.logs.push(
      user.name + " lost " + amount + this.name + " (REASON : " + reason + ")"
    );
    this.data[user.id] = db[room.id][user.id].currency.amount;
    Storage.databases[room.id].currency = this.data;
    Storage.exportDatabase(room.id);
    return true;
  },

  resetAll(user, room, amount) {
    let db = Storage.databases;
    if (!db[room.id]) return;
    let a = Object.keys(db[room.id]);
    for (let i = 0; i <= a.length; i++) {
      db[room.id][a[i]].currency = this.baseCurr;
    }
    Storage.exportDatabase(room.id);
    return true;
  },

  hasCurrency(user, room) {
    let db = Storage.databases;

    if (!db[room.id] || !db[room.id][user.id] || !db[room.id][user.id].currency)
      return false;
    return true;
  },

  get(user, room) {
    let db = Storage.databases;
    if (!this.hasCurrency(user, room))
      return user.name + " has no currency not even ZERO!";
    return db[room.id][user.id].currency.amount;
  }
};
