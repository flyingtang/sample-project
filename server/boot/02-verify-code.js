'use strict';

const Sender = require('verifications-code');

module.exports = function (app) {
  const verifyCodeOptions = app.get('verify-code');
  app.sender = new Sender(verifyCodeOptions);
};
