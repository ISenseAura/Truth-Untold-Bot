/*************************************************
 **                                              **
 ** Custom Profile Plugin - Code By Pokem9n$(❤)  **
 **                                             **
 ************************************************/

const http = require("https");

class Profile {
  constructor(user, age, regdate, room) {
    this.id = user.id;
    this.name = user.name;
    this.room = room;
    this.age = age;
    this.regdate = regdate;
    this.rank = "Regular";
    this.favpoke = "not set";
    this.country = "not set";
    this.color = "";
    this.bg = "";
    this.curr = 0;
    if (Currency.hasCurrency(user, room)) this.curr = Currency.get(user, room);
    this.status = "Alive";
    this.level = 0;
    if (this.hasLevel(this.id, room))
      this.level = Storage.databases[room.id].explevels[this.id].Lvls;
    let data = {};
    if (!Storage.databases[room.id]) Storage.databases[room.id] = {};
    let dbs = Storage.databases[room.id];
    if (!dbs[user.id]) dbs[user.id] = {};
    if (dbs[user.id] && dbs[user.id].profile) {
      data = dbs[user.id].profile;
      this.favpoke = data.favpoke ? data.favpoke : this.favpoke;
      this.country = data.country ? data.country : this.country;
      this.color = data.color ? data.color : this.color;
      this.bg = data.bg ? data.bg : this.bg;
      this.rank = data.rank ? data.rank : this.rank;
      this.status = data.status ? data.status : this.status;
    }
  }

  setColor(color) {
    this.color = color;
    Storage.databases[this.room.id][this.id].profile.color = color;
    Storage.exportDatabase(this.room.id);
  }

  setRank(x) {
    this.rank = x;
    Storage.databases[this.room.id][this.id].profile.rank = x;
    Storage.exportDatabase(this.oom.id);
  }

  setBg(x) {
    this.bg = x;
    Storage.databases[this.room.id][this.id].profile.bg = x;
    Storage.exportDatabase(this.room.id);
  }

  setStatus(x) {
    this.status = x;
    Storage.databases[this.room.id][this.id].profile.status = x;
    Storage.exportDatabase(this.room.id);
  }

  setFavpoke(x) {
    this.favpoke = x;
    Storage.databases[this.room.id][this.id].profile.favpoke = x;
    Storage.exportDatabase(this.room.id);
  }

  setCountry(x) {
    this.country = x;
    Storage.databases[this.room.id][this.id].profile.country = x;
    Storage.exportDatabase(this.room.id);
  }

  setRank(x) {
    this.rank = x;
    Storage.databases[this.room.id][this.id].profile.rank = x;
    Storage.exportDatabase(this.room.id);
  }

  hasLevel(id, room) {
    if (
      !Storage.databases[room.id] ||
      !Storage.databases[room.id].explevels ||
      !Storage.databases[room.id].explevels[id]
    )
      return false;
    return true;
  }

  getHtml() {
    return `<div style = "background-color: ${this.bg}"><font color="${this.color}"> <center><h2>PROFILE</h2></center> <hr/> <table><tr><td><b>Name :-</b></td><td>${this.id}</td></tr><tr><td><b>Regdate :-</b></td><td>${this.regdate}</td></tr><tr><td><b>PS Age :-</b></td><td>${this.age}</td></tr><tr><td><b>Status :-</b></td><td>${this.status}</td></tr><tr><td><b>${Currency.name} :-</b></td><td>${this.curr}</td></tr><tr><td><b>Rank :-</b></td><td> ${this.rank} </td></tr><tr><td><b>Favorite Pokemon:-</b></td><td>${this.favpoke}</td></tr><tr><td><b>Country :-</b></td><td>${this.country}</td></tr><tr><td><b>Level :-</b></td><td>${this.level}</td></tr></table></font></div>`;
  }
}

exports.commands = {
  profile: {
    command(target, room, user) {
      user.say("/cmd userdetails " + user.id);
      let tgs;
      let cmd, tg;
      if (target) user.say("/cmd userdetails " + target);
      if (room.id === user.id)
        return this.say("Profile commands are disabled in PMs.");
      let realdate, userid, regDate, status, bits, level;
      userid = user.id;

      target = target.toLowerCase();

      if (target && target.length <= 18) userid = target;
      if (target.includes(",")) {
        tgs = target.split(",");
        userid = user.id;
        tg = tgs[1];
        console.log(tgs);
        if (tgs.length > 2) {
          userid = Tools.toId(tgs[1]);
          tg = tgs[2];
        }
        cmd = tgs[0];
      }

      function getData(link, callback) {
        http.get(link, function(res) {
          var data = "";
          res.on("data", function(part) {
            data += part;
          });
          res.on("end", function(end) {
            callback(data);
          });
        });
      }

      function isDst(tarDate) {
        var deezNuts = new Date(tarDate);
        var deezMonth = deezNuts.getMonth() + 1;
        var deezDay = deezNuts.getDate() + 1;
        var deezDayofWeek = deezNuts.getDay();
        if (deezMonth > 11 || deezMonth < 3) {
          return false;
        }
        if (deezMonth === 3) {
          if (deezDay - deezDayofWeek > 7) {
            return true;
          }
          return false;
        }
        if (deezMonth === 11) {
          if (deezDay - deezDayofWeek > 0) {
            return true;
          }
          return false;
        }
        return true;
      }
      getData("https://pokemonshowdown.com/users/" + userid + ".json", function(
        data
      ) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          room.say("ERROR in retrieving data.");
        }
        let realdate;
        let regdate =
          data.registertime * 1000 +
          new Date().getTimezoneOffset() * 60 * 1000 -
          364000;
        realdate = Tools.getTimeAgo(regdate);
        if (data.registertime === 0) {
          realdate = "The account is not registered.";
          return room.say("User " + target + " not found!");
        }
        let age;
        age =
          data.registertime * 1000 -
          1000 * 60 * 60 * 5 +
          new Date().getTimezoneOffset() * 60 * 1000 -
          364000;
        if (isDst(age)) age = age + 3600000;
        var regDate = new Date(age).toString().substr(4, 20);
        //  room.say(realdate + regDate);

        let profile = new Profile(Users.get(userid), realdate, regDate, room);
        if (!(userid in Storage.databases[room.id]))
          Storage.databases[room.id][userid] = {};
        Storage.databases[room.id][userid].profile = profile;
        Storage.exportDatabase(room.id);
        if (cmd && cmd.length > 2 && tgs.length < 3) {
          switch (cmd) {
            case "setcolor":
              return Storage.databases[room.id][user.id].profile.setColor(tg);
              break;
            case "setbg":
              return Storage.databases[room.id][user.id].profile.setBg(tg);
              break;
            case "setstatus":
              return Storage.databases[room.id][user.id].profile.setStatus(tg);
              break;
            case "setcountry":
              return Storage.databases[room.id][user.id].profile.setCountry(tg);
              break;
          }
          return;
        } else if (cmd && cmd.length > 2 && tgs.length >= 3) {
          tg = tgs[2];
          console.log(userid);
          switch (cmd) {
            case "setrank":
              return Storage.databases[room.id][userid].profile.setRank(tg);
              break;
            case "setbg":
              return Storage.databases[room.id][userid].profile.setBg(tg);
              break;
            case "setstatus":
              return Storage.databases[room.id][userid].profile.setStatus(tg);
              break;
            case "setcountry":
              return Storage.databases[room.id][userid].profile.setCountry(tg);
              break;
          }
          return;
        }
        return room.say("/addhtmlbox " + profile.getHtml(), true);
      });
    },
    help:
      "!htmlbox <pre> /profile setcolor,color</pre> - Sets profile font color <br> <pre> /profile setbg,color </pre> - sets background color <br> <pre> /profile setfavpoke, pokemon</pre> - Sets favpoke <br> <pre> /profile setcountry, name </pre> - Sets country name </br> <pre> /profile setrank,usernams, rank </pre> - Sets an user's rank ( for Developers only)"
  },

  pcolor: {
    command(target, room, user) {
      this.say(eval(target));
    },
    devOnly: true
  }
};
