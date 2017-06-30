'use strict';

const assert = require('chai').assert;
const s = require('./support');

describe('basic', () => {

  before(s.setup);
  after(s.teardown);

  it('should setup fixtures', () => {
    assert.ok(s.app);
    const {Account} = s.app.models;
    return Account.count().then(count => {
      assert.ok(count > 2);
    });
  });
});
