'use strict';

const _ = require('lodash');
const PromiseA = require('bluebird');

module.exports = function (app, done) {
  const dataSources = _(app.datasources).values().uniq().value();
  PromiseA.each(dataSources, ds => ds.autoupdate && ds.autoupdate()).then(() => initFixtures(app)).asCallback(done);
};

function initFixtures(app) {
  if (app.enabled('skipInitFixtures')) {
    return;
  }
  const {Account, Role, RoleMapping} = app.models;
  return PromiseA.all([
    // create global admin role
    // PromiseA.fromCallback(cb => Role.findOrCreate({where: {or: [{name: 'admin'}, {name: 'stuff'}]}}, [{name: 'admin'}, {name: 'stuff'}], cb)),
    PromiseA.fromCallback(cb => Role.findOrCreate({where: {name: 'admin'}}, {name: 'admin'}, cb)),
    // create global admin user - find or create use loopback style to avoid use OptimizedFindOrCreate
    _findOrCreate(Account, {where: {username: 'admin'}}, {
      username: 'admin',
      fullname: 'Administrator',
      password: 'mmp0ss'
    })
  ]).then(([adminRole, [adminUser]]) => {
    // assign global admin user with admin role
    adminRole.principals.findOne({where: {principalType: RoleMapping.USER, principalId: adminUser.id}}, (err, result) => {
      if (err) throw err;
      if (!result) return adminRole.principals.create({principalType: RoleMapping.USER, principalId: adminUser.id});
    });
  });
}

// find or create use loopback style to avoid use OptimizedFindOrCreate
function _findOrCreate(Model, query, data, options) {
  return Model.findOne(query, options).then(record => {
    if (record) return [record, false];
    return Model.create(data, options).then(record => {
      return [record, !_.isNil(record)];
    });
  });
}
