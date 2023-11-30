class UserResponse {
  constructor(status, username, users = null) {
    this.type = "user-response";
    this.status = status;
    this.username = username;
    this.users = users;
  }
}

module.exports = UserResponse;
