'use strict';
const PromiseA = require('bluebird');
const debug = require('debug')('uugo:models');
const errs = require('errs');
const moment = require('moment');
module.exports = function (Account) {
  // require('./account.model')(Account);
  Account.disableRemoteMethodByName('patchById');
  Account.disableRemoteMethodByName('prototype.__get__accessTokens');
  Account.disableRemoteMethodByName('prototype.__create__accessTokens');
  Account.disableRemoteMethodByName('prototype.__delete__accessTokens');
  Account.disableRemoteMethodByName('prototype.__findById__accessTokens');
  Account.disableRemoteMethodByName('prototype.__updateById__accessTokens');
  Account.disableRemoteMethodByName('prototype.__destroyById__accessTokens');
  Account.disableRemoteMethodByName('prototype.__count__accessTokens');
  Account.findByMobileForForget = function (mobile) {
    return Account.findOne({where: {mobile}}).then(account => {
      if (!account)
        throw errs.create({
          code: 'MOBILE_NO_EXIST',
          status: 404,
          statusCode: 404,
          message: 'mobile no exist'
        });
      return account;
    });
  };

  Account.findByMobileForSignup = function (mobile) {
    return Account.findOne({where: {mobile}}).then(account => {
      if (account)
        throw errs.create({
          code: 'REGISTERED_MOBILE',
          status: 404,
          statusCode: 404,
          message: 'registered mobile already'
        });
      return true
    });
  };
  // 增加角色
  Account.prototype.addRole = function (roleName) {
    const {RoleMapping} = Account.app.models;
    return Account.app.models.Role.findOne({where: {name: roleName}}).then(role => {
      return role.principals.findOne({
        where: {
          principalType: RoleMapping.USER,
          principalId: this.id
        }
      }).then(roleMap => {
        if (roleMap && roleMap.roleId === role.id) {
          return roleMap;
        }
        return role.principals.create({principalType: RoleMapping.USER, principalId: this.id});
      });
    });
  };
  // 删除角色
  Account.prototype.deleteRole = function (roleName) {
    const {RoleMapping} = Account.app.models;
    return Account.app.models.Role.findOne({where: {name: roleName}}).then(role => {
      return role.principals.destroyAll({principalType: RoleMapping.USER, principalId: this.id});
    });
  };
  // 注册
  Account.signup = function (mobile, code, password) {
    Account.validatesUniquenessOf('mobile', {message: 'mobile is not unique'});
    return Account.app.models.Verification.verifyCode(mobile, code).then(() => {
      return Account.create({mobile, password,}).then((account) => {
        return account.addRole('register').then(() => {
          return Account.login({mobile, password});
        });
      });
    });
  };
  // 校验手机号
  Account.checkMobileValid = function (mobile) {
    return new Promise(resolve => {
      if (!(/^1[34578]\d{9}$/.test(mobile))) {
        throw errs.create({
          code: '20001',
          status: 401,
          statusCode: 401,
          message: 'Invalid mobile'
        });
      }
      return resolve(true);
    });
  };
  //密码正确性检测prototype.changePassword
  Account.checkValidPassword = function (password) {
    return new Promise((resolve) => {
      if (password.trim() === '')
        throw errs.create({
          code: '20001',
          status: 401,
          statusCode: 401,
          message: 'password empty'
        });
      return resolve(true);
    })
  };
  // 忘记密码
  Account.forgetPassword = function (mobile, verifyCode, password) {
    return PromiseA.all([Account.app.models.Verification.verifyCode(mobile, verifyCode),
      Account.checkMobileValid(mobile), Account.findByMobileForForget(mobile),
      Account.checkValidPassword(password)])
      .then(([isValidCode, isValidMobile, account]) => {
        return account.updateAttribute('password', password).then(() => true);
      });
  };

  Account.changePassword = function (id, oldPassword, newPassword) {
    try {
      return Account.findById(id).then(user => {
        if (!user) {
          throw errs.create({
            code: 'LOGIN_FAILED_EMAIL',
            status: 401,
            statusCode: 401,
            message: `No match between provided current logged user`
          });
        }
        return PromiseA.fromCallback(callback => user.hasPassword(oldPassword, callback)).then(isMatch => {
          if (isMatch) {
            // TODO ...further verifications should be done here (e.g. non-empty new password, complex enough password etc.)...
            return user.updateAttributes({password: newPassword}).then(() => true);
          }
          throw errs.create({
            code: 'LOGIN_FAILED_PWD',
            status: 401,
            statusCode: 401,
            message: `User specified wrong current password !`
          });
        });
      });
    } catch (err) {
      console.error(err);
      return PromiseA.reject(err);
    }
  };

  Account.normalizeCredentials = function (credentials, realmRequired, realmDelimiter) {
    const query = {};
    credentials = credentials || {};
    if (realmRequired) {
      if (credentials.realm) {
        query.realm = credentials.realm;
      }
      let parts;
      if (credentials.mobile) {
        parts = splitPrincipal(credentials.mobile, realmDelimiter);
        query.mobile = parts[1];
        if (parts[0]) {
          query.realm = parts[0];
        }
      } else if (credentials.email) {
        parts = splitPrincipal(credentials.email, realmDelimiter);
        query.email = parts[1];
        if (parts[0]) {
          query.realm = parts[0];
        }
      } else if (credentials.username) {
        parts = splitPrincipal(credentials.username, realmDelimiter);
        query.username = parts[1];
        if (parts[0]) {
          query.realm = parts[0];
        }
      }
    } else if (credentials.mobile) {
      query.mobile = credentials.mobile;
    } else if (credentials.email) {
      query.email = credentials.email;
    } else if (credentials.username) {
      query.username = credentials.username;
    } else if (credentials.credential) {
      query.or = [{mobile: credentials.credential}, {username: credentials.credential}, {email: credentials.credential}];
    }
    return query;
  };
  Account.login = function (credentials, include) {
    return this.doLogin(credentials, include, {enabled: {neq: false}});
  };
  Account.doLogin = function (credentials, include, where) {
    include = (include || '');
    if (Array.isArray(include)) {
      include = include.map((val) => {
        return val.toLowerCase();
      });
    } else {
      include = include.toLowerCase();
    }
    let realmDelimiter;
    // Check if realm is required
    const realmRequired = Boolean(this.settings.realmRequired || this.settings.realmDelimiter);
    if (realmRequired) {
      realmDelimiter = this.settings.realmDelimiter;
    }

    let query = this.normalizeCredentials(credentials, realmRequired, realmDelimiter);

    if (realmRequired && !query.realm) {
      throw errs.create({
        code: '20014',
        status: 401,
        statusCode: 401,
        message: '{{realm}} is required'
      });
    }
    if (!query.or && !query.mobile && !query.email && !query.username) {
      throw errs.create({
        code: '20015',
        status: 401,
        statusCode: 401,
        message: '{username}} or {{email}} or {{mobile}}is required'
      });
    }

    if (where) {
      query = {and: [query, where]};
    }
    return this.findOne({where: query}).then(user => {
      const defaultError = errs.create({
        code: '20008',
        status: 401,
        statusCode: 401,
        message: 'login failed'
      });

      function tokenHandler(token) {
        if (Array.isArray(include) ? include.indexOf('user') !== -1 : include === 'user') {
          // NOTE(bajtos) We can't set token.user here:
          //  1. token.user already exists, it's a function injected by
          //     "AccessToken belongsTo User" relation
          //  2. ModelBaseClass.toJSON() ignores own properties, thus
          //     the value won't be included in the HTTP response
          // See also loopback#161 and loopback#162
          token.__data.user = user;
        }
        return token;
      }

      if (user) {
        return user.hasPassword(credentials.password).then(isMatch => {
          if (isMatch) {
            if (this.settings.emailVerificationRequired && !user.emailVerified) {
              // Fail to log in if email verification is not done yet
              debug('User email has not been verified');
              throw errs.create({
                code: '20016',
                status: 401,
                statusCode: 401,
                message: 'login failed as the email has not been verified'
              });
            } else if (user.createAccessToken.length === 2) {
              return user.createAccessToken(credentials.ttl).then(tokenHandler);
            } else {
              return user.createAccessToken(credentials.ttl, credentials).then(tokenHandler);
            }
          } else {
            debug('The password is invalid for user %s', query.email || query.username);
            throw defaultError;
          }
        });
      } else {
        debug('No matching record is found for user %s', query.email || query.username);
        throw defaultError;
      }
    });
  };
  Account.prototype.enable = function () {
    return this.updateAttribute('enabled', true);
  };
  Account.prototype.disable = function () {
    return this.updateAttribute('enabled', false);
  };
  Account.enable = function (identity) {
    return Account.findOne({where: {or: [{id: identity}, {username: identity}, {email: identity}]}}).then(account => {
      if (!account) throw errs.create({
        code: '20012',
        status: 404,
        statusCode: 404,
        message: `Unknown "Account" ${identity}`
      });
      return account.enable();
    });
  };
  Account.disable = function (identity) {
    return Account.findOne({where: {or: [{id: identity}, {username: identity}, {email: identity}]}}).then(account => {
      if (!account) throw errs.create({
        code: '20012',
        status: 404,
        statusCode: 404,
        message: `Unknown "Account" ${identity}`
      });
      return account.disable();
    });
  };


  // Account.remoteMethod('prototype.addRole', {
  //     description: '为一个账户增加一个角色',
  //     accessType: 'WRITE',
  //     accepts: [{arg: 'roleName', type: 'string', required: true, http: {source: 'path'}, description: '角色名字'}],
  //     returns: {arg: 'result', type: 'object'},
  //     http: {verb: 'put', path: '/:roleName/role'},
  // });
  // Account.remoteMethod('prototype.deleteRole', {
  //     description: '为一个账户删除一个角色',
  //     accessType: 'WRITE',
  //     accepts: [{arg: 'roleName', type: 'string', required: true, http: {source: 'path'}, description: '角色名字'}],
  //     returns: {arg: 'result', type: 'object'},
  //     http: {verb: 'delete', path: '/:roleName/role'},
  // });
  Account.remoteMethod('signup', {
    description: '通过手机,手机验证码,以及邀请码注册账号',
    accessType: 'EXECUTE',
    accepts: [
      {arg: 'mobile', type: 'string', description: '手机号'},
      {arg: 'code', type: 'string', description: '验证码'},
      {arg: 'password', type: 'string', description: '密码'}],
    returns: {arg: 'result', type: 'object'},
    http: {verb: 'post', path: '/signup'}
  });
  Account.remoteMethod('enable', {
    description: '启用一个用户',
    accessType: 'WRITE',
    accepts: [{
      arg: 'identity', type: 'string', required: true, http: {source: 'path'},
      description: 'The id, username or email of the account'
    }],
    returns: {arg: 'data', type: 'array', root: true},
    http: {verb: 'put', path: '/:identity/enable'},
  });
  Account.remoteMethod('disable', {
    description: '关闭一个用户',
    accessType: 'WRITE',
    accepts: [{
      arg: 'identity', type: 'string', required: true, http: {source: 'path'},
      description: 'The id, username or email of the account'
    }],
    returns: {arg: 'data', type: 'array', root: true},
    http: {verb: 'put', path: '/:identity/disable'},
  });
  Account.remoteMethod('changePassword', {
    description: '修改账户密码',
    accessType: 'EXECUTE',
    accepts: [
      {
        arg: 'id', type: 'string', required: true, http: {source: 'path'},
        description: 'Account id'
      },
      {arg: 'oldPassword', type: 'string', required: true, description: 'The old password'},
      {arg: 'newPassword', type: 'string', required: true, description: 'The new password'},
      {arg: 'options', type: 'object', http: 'optionsFromRequest'}
    ],
    returns: {arg: 'success', type: 'boolean'},
    http: {verb: 'patch', path: '/:id/password'}
  });
  Account.remoteMethod('forgetPassword', {
    description: '用户忘记密码的时候，重置密码',
    accessType: 'EXECUTE',
    accepts: [
      {arg: 'mobile', type: 'string', required: true, description: '手机号'},
      {arg: 'code', type: 'string', required: true, description: '验证码'},
      {arg: 'password', type: 'string', required: true, description: '新密码'}
    ],
    returns: {arg: 'success', type: 'boolean'},
    http: {verb: 'put', path: '/forget-password'}
  });
};
function splitPrincipal(name, realmDelimiter) {
  const parts = [null, name];
  if (!realmDelimiter) {
    return parts;
  }
  const index = name.indexOf(realmDelimiter);
  if (index !== -1) {
    parts[0] = name.substring(0, index);
    parts[1] = name.substring(index + realmDelimiter.length);
  }
  return parts;
}
