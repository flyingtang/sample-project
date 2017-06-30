'use strict';

require('cls-hooked');
process.env.NODE_ENV = 'development';

const _ = require('lodash');
const path = require('path');
const PromiseA = require('bluebird');
const needs = require('needs');
const request = require('supertest-as-promised');
const chai = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-subset'));
chai.includeStack = true;
const assert = chai.assert;

const app = require('..');

exports.ready = ready;
function ready() {
  if (app.booting) {
    return PromiseA.fromCallback(cb => app.once('booted', cb));
  }
  return PromiseA.resolve();
}

exports.assert = assert;

exports.app = app;

// speed up user creation
(function () {
  const User = app.loopback.getModelByType('User');
  User.hashPassword = plain => plain;
  User.prototype.hasPassword = function (plain, cb) {
    const isMatch = plain === this.password;
    return PromiseA.resolve(isMatch).asCallback(cb);
  };
})();

exports.fixtures = fixtures;
function fixtures(...args) {
  return path.resolve(__dirname, 'fixtures', ...args);
}

function setupFixtures(dir) {
  const setups = needs(dir);
  return PromiseA.mapSeries(_.entries(setups), ([filename, setup]) => {
    if (_.isFunction(setup)) {
      return PromiseA.resolve(setup(app));
    }
  });
}

function cleanup() {
  const ignores = [];
  return PromiseA.mapSeries(_.values(app.models), model => {
    if (model.deleteAll) {
      return PromiseA.fromCallback(cb => model.deleteAll(cb));
    }
    ignores.push(model.modelName);
  }).then(() => {
    if (!_.isEmpty(ignores)) {
      console.warn('Ignore cleanup for model %j', ignores);
    }
  });
}

exports.setup = function () {
  return ready().then(cleanup).then(() => setupFixtures(fixtures('sample-data')));
};

exports.teardown = function () {
  return ready();
};

function json(verb, url) {
  url = app.get('restApiRoot') + url;
  return request(app)[verb](url)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/);
}
exports.json = json;

function loginAs(username, password) {
  password = password || 'password';
  return json('post', '/accounts/login')
    .send({username, password})
    .expect(200);
}
function loginAsMobile(mobile, password) {
  password = password || 'password';
  return json('post', '/accounts/login')
    .send({mobile, password})
    .expect(200);
}
exports.loginAs = loginAs;
exports.loginAsMobile = loginAsMobile;

exports.users = {
  admin: {
    id: 'admin',
    username: 'admin'
  },
  userGeneral: {
    id: 'userGeneral',
    username: 'userGeneral',
  },
  userGeneral1: {
    id: 'userGeneral1',
    username: 'userGeneral1',
  },
  userGeneral2: {
    id: 'userGeneral2',
    username: 'userGeneral2',
  }
};
