'use strict';

const assert = require('chai').assert;
const should = require('chai').should();
const s = require('../support');
const PromiseA = require('bluebird');
describe('api/accounts', () => {
  before(s.setup);
  after(s.teardown);
  describe('update properties', () => {
    it('should keep current access token valid after email updated', () => {
      const user = s.users.admin;
      let token;
      return s.loginAs(user.username)
        .then(res => {
          token = res.body.id;
          return s.json('patch', `/accounts/${user.id}?access_token=${token}`)
            .send({email: 'userGeneral@example.com'})
            .expect(200);
        }).then(res => {
          assert.isObject(res.body);
        }).then(() => s.json('get', `/accounts/${user.id}?access_token=${token}`)
          .expect(200));
    });
  });
  describe('change password', () => {
    it('should not change password', () => {
      const user1 = s.users.userGeneral1;
      const user2 = s.users.userGeneral2;
      return s.loginAs(user1.username)
        .then(res => s.json('patch', `/accounts/${user2.id}/password?access_token=${res.body.id}`)
          .send({oldPassword: 'password', newPassword: '123456'})
          .expect(401));
    });

    it('should change password by owner', () => {
      const user = s.users.userGeneral2;
      return s.loginAs(user.username)
        .then(res => s.json('patch', `/accounts/${user.id}/password?access_token=${res.body.id}`)
          .send({oldPassword: 'password', newPassword: '123456'})
          .expect(200))
        .then(() => s.loginAs(user.username, '123456'))
        .then(res => {
          assert.isString(res.body.id);
          return res;
        })
        .then(res => s.json('patch', `/accounts/${user.id}/password?access_token=${res.body.id}`)
          .send({oldPassword: '123456', newPassword: 'password'}));
    });

    it('should change password by admin', () => {
      const user = s.users.userGeneral2;
      const admin = s.users.admin;
      return s.loginAs(admin.username)
        .then(res => s.json('patch', `/accounts/${user.id}/password?access_token=${res.body.id}`)
          .send({oldPassword: 'password', newPassword: '123456'})
          .expect(200))
        .then(() => s.loginAs(user.username, '123456'))
        .then(res => assert.isString(res.body.id));
    });
  });
  describe('signup', () => {
    it('signup', () => {
      const data = {
        mobile: '17688311914',
        password: 'mmp0ss',
        type: 'signup'
      };
      return s.json('get', '/Verifications/verify-mobile-test')
        .send({mobile: data.mobile, type: data.type})
        .expect(200)
        .then(({body: {result}}) => {
          return s.json('post', '/accounts/signup')
            .send({mobile: data.mobile, code: result.verifyCode, password: data.password})
            // .expect(200)
            .then(({body}) => {
              console.log(body);
            });

        });
    });
    it('login in', () => {
      let data = {mobile: '13751821418', password: 'password'};
      return s.json('post', '/accounts/login')
        .expect(200)
        .send(data)
        .then(({body}) => {
          assert.isObject(body);
          should.exist(body.id);
          const token = body.id;
          // 修改密码
          return s.json('patch', `/accounts/${body.userId}/password?access_token=${token}`)
            .send({oldPassword: 'password', newPassword: '123'})
            .then(({body: {success}}) => {
              assert.equal(success, true);
              data.password = '123';
              return s.json('post', '/accounts/login')
                .expect(200)
                .send(data)
                .then(({body}) => {
                  assert.isObject(body);
                  should.exist(body.id);
                });
            });
        });

    });
    it('forget password', () => {
      const data = {
        mobile: '13751821418',
        password: 'password',
        type: 'forgetPassword'
      };
      return s.json('get', '/Verifications/verify-mobile-test')
        .send({mobile: data.mobile, type: data.type})
        .expect(200)
        .then(({body: {result}}) => {
          console.log(result)
          return s.json('post', '/accounts/login')
            .expect(200)
            .send({mobile: data.mobile, password: 'password'})
            .then(({body}) => {
              assert.isObject(body);
              should.exist(body.id);
              const token = body.id;
              return s.json('put', `/accounts/forget-password`)
              // return s.json('put', `/accounts/forget-password?access_token=${token}`)
                .send({mobile: data.mobile, code: result.verifyCode, password: '123'})
                .expect(200)
                .then(({body: {success}}) => {
                  assert.equal(success, true);
                  return s.json('post', '/accounts/login')
                    .expect(200)
                    .send({mobile: data.mobile, password: '123'})
                    .then(({body}) => {
                      assert.isObject(body);
                      should.exist(body.id);
                    });
                })
            })
        });
    })

  });
});
