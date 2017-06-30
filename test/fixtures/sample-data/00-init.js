'use strict';
const errs = require('errs');
module.exports = function (app) {
  const {Role} = app.models;
  // return Role.create({name: 'admin'}).then(roleAdmin => {
  //   app.roleAdmin = roleAdmin;
  // });
  return Role.create([{name: 'admin'},{name: 'register'}], (err, role) => {
    if (err) {
      throw errs.create({
        code: 401,
        codeSttus: 401,
        message: 'create role failed!'
      });
    }
    app.roleAdmin = role[0];
    app.roleRegister = role[1];
  });
};
