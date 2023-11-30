class Message {
  constructor(user, message) {
    this.user = user;
    this.message = message;
    this.date = Date.now();
  }
}

module.exports = Message;
