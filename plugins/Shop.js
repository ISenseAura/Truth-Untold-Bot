// ROOMSHOP PLUGIN
class Shop {
  constructor(room,date,items) {
    
    this.id = room.id
    this.name = room.name
    this.dateCreated = new date()
    this.items = {}
    if(items) this.items = items
    this.logs = []
    
  }
  
  add(user,name,price,desc) {
    if(!name || !price || !desc) return "Incomplete details";
    if(this.hasItem(Tools.toId(name))) return "Item already exists";
    this.items[Tools.toId(name)] = {
      price : price,
      description : desc
    }
    this.log(`${user.name} added a new item ${name} to the shop`);
    this.update()
    return true
  }
  
  log(msg) {
    if(!msg) return;
    this.logs.push(msg)
    this.update()
    return true;
  }
  
  remove(user,name) {
    if(!name) return "Incomplete details";
    if(!this.hasItem(Tools.toId(name))) return "Item does not exist"
    this.log(`${user.name} removed ${name} from the shop`);
    this.update()
    return true
  }
  
  hasItem(name) {
    if(Object.keys(this.items).includes(name)) return true;
    return false;
  }
  
  purchase(user,item) {
    if(!user || !item) return "Incomplete details"
    if(!this.hasItem(Tools.toId(item))) return "Item does not exist";
    if(Currency.get(user,Rooms.get(this.id)) < this.items[item].price) return "Not enough " + Currency.name;
    Currency.take(user,Rooms.get(this.id),this.items[item].price,"Purchased " + item)
    this.log(`${user.name} has purchased ${item}`)
    this.update()
    return true;
    
  }
  
  delete() {
    Storage.databases[this.id].shop = false;
    Storage.exportDatabase(this.id);
    Rooms.get(this.id).shop = "Room shop has been deleted, restart the bot to create a new one";
    return true;
  }
  
  
  update() {
    if(!Storage.databases[this.id]) Storage.databases[this.id] = {}
    Storage.databases[this.id].shop = this;
    console.log(Storage.databases[this.id].shop)
    Storage.exportDatabase(this.id);
  }
  
  getHtml() {
    let items = "";
    let b = Object.keys(this.items);
    for(let i = 0;i < b.length;i++) {
      let a = `<tr><td>${b[i]}</td><td>${this.items[b[i]].description}</td><td>${this.items[b[i]].price}</td></tr>`;
      items += a;
    }
    let html = `<div style="max-height: 200px; width: 100%; overflow: scroll;"><center><h1>${Rooms.get(this.id).id}'s Room Shop</h1><table border="1" cellspacing ="0" cellpadding="3"><tr><td>Item</td><td>Description</td><td>Cost</td></tr>${items}</table></center></div>`
    return html;
  }
  }

module.exports = Shop;
  
  
  
