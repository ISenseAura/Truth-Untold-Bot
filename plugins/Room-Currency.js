// COMMANDS FOR CURRENCY PLUGIN

exports.commands = {
  curr : "currency",
  atm : "currency",
  currency : {
    command(target,room,user) {
      if(!target) return this.say(Currency.get(user,room) + " " +Currency.name);
      if(!target.includes(",")) return this.say(Currency.get(Users.get(Tools.toId(target)),room));
      let opts = target.split(",");
      switch(opts[0]) {
        case 'give' : {
          Currency.give(Users.get(Tools.toId(opts[1])),room,parseInt(opts[2]),opts[3])
        }
          break;
         case 'take' : {
          Currency.take(Users.get(Tools.toId(opts[1])),room,parseInt(opts[2]),opts[3])
        }
          break;
      }
    },
    help : "``&currency [give|take],[userid],[amount]``",
    perms : "+"
  },
  

  
};