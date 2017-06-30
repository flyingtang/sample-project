'use strict';

const _ = require('lodash');
const PromiseA = require('bluebird');

const users = [{
  id: 'admin',
  username: 'admin',
  password: 'password'
}, {
  id: 'userGeneral',
  username: 'userGeneral',
  mobile: '13751821418',
  password: 'password',
}, {
  id: 'userGeneral1',
  username: 'userGeneral1',
  password: 'password',
}, {
  id: 'userGeneral2',
  username: 'userGeneral2',
  password: 'password',
}];
module.exports = function (app) {
  const {Account, RoleMapping} = app.models;
  return PromiseA.mapSeries(users, item => Account.create(item)).then(users => {
    return app.users = _.fromPairs(_.map(users, user => [user.username, user]));
  }).then(users => {
    return app.roleAdmin.principals.create({principalType: RoleMapping.USER, principalId: users.admin.id});
  });
};
