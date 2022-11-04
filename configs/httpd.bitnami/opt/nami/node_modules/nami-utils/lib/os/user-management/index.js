'use strict';

module.exports = {
  getUid: require('./get-uid.js'),
  getUsername: require('./get-username.js'),
  getGid: require('./get-gid.js'),
  getGroupname: require('./get-groupname.js'),
  getUserGroups: require('./get-user-groups.js'),
  findUser: require('./find-user.js'),
  findGroup: require('./find-group.js'),
  groupExists: require('./group-exists.js'),
  deleteGroup: require('./delete-group.js'),
  addGroup: require('./add-group.js'),
  userExists: require('./user-exists.js'),
  addUser: require('./add-user.js'),
  deleteUser: require('./delete-user.js')
};
