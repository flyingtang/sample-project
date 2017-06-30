'use strict';

const moment = require('moment');
const randomString = require('randomstring');
const errs = require('errs');
const PromiseA = require('bluebird');

module.exports = function (Verification) {
    Verification.verifyMobile = function (mobile, type) {
        mobile = mobile.trim();
        type  = type.trim();
        return new Promise((resolve) => {
            let promises = [Verification.app.models.Account.checkMobileValid(mobile),
                Verification.findValidInstance(mobile)];
            if (type === 'forgetPassword')
                promises.push(Verification.app.models.Account.findByMobileForForget(mobile));
            else if (type === 'signup')
                promises.push(Verification.app.models.Account.findByMobileForSignup(mobile));
            else
                throw errs.create({
                    code: 'INVALID_TYPE',
                    status: 401,
                    statusCode: 401,
                    message: 'invalid type'
                });
            return PromiseA.all(promises).then(() =>  {return resolve();});
        }).then(() => {
            const newData = {
                mobile: mobile,
                verifyCode: randomString.generate({length: 6, charset: 'numeric'}),
                expireAt: moment().add(1, 'minutes').toDate(),
                ttl: moment().add(30, 'minutes').toDate(),
            };
            return Verification.create(newData).then(newVerifyData => {
                if (!newVerifyData)
                    throw errs.create({
                        code: 'VERIFICATION_CODE_CREATE_ERROR',
                        status: 401,
                        statusCode: 401,
                        message: 'failed save code to data source'
                    });
                return Verification.app.sender.send({code: newVerifyData.verifyCode}, newVerifyData.mobile, {
                    type: 'phone',
                    sendType: 'code'
                }).then(() => {
                    return newVerifyData;
                })
            });
        });
    };
    Verification.verifyMobileTest = function (mobile, type) {
        mobile = mobile.trim();
        type  = type.trim();
        return new Promise((resolve) => {
            let promises = [Verification.app.models.Account.checkMobileValid(mobile),
                Verification.findValidInstance(mobile)];
            if (type === 'forgetPassword')
                promises.push(Verification.app.models.Account.findByMobileForForget(mobile));
            else if (type === 'signup')
                promises.push(Verification.app.models.Account.findByMobileForSignup(mobile));
            else
                throw errs.create({
                    code: 'INVALID_TYPE',
                    status: 401,
                    statusCode: 401,
                    message: 'invalid type'
                });
            return PromiseA.all(promises).then(() =>  {return resolve();});
        }).then(() => {
            const newData = {
                mobile: mobile,
                verifyCode: randomString.generate({length: 6, charset: 'numeric'}),
                expireAt: moment().add(1, 'minutes').toDate(),
                ttl: moment().add(30, 'minutes').toDate(),
            };
            return Verification.create(newData).then(newVerifyData => {
                if (!newVerifyData)
                    throw errs.create({
                        code: 'VERIFICATION_CODE_CREATE_ERROR',
                        status: 401,
                        statusCode: 401,
                        message: 'failed save code to data source'
                    });
                return newVerifyData;
                // return Verification.app.sender.send({code: newVerifyData.verifyCode}, newVerifyData.mobile, {
                //     type: 'phone',
                //     sendType: 'code'
                // }).then(() => {
                //     return newVerifyData;
                // })
            });
        });
    };

    Verification.remoteMethod('verifyMobileTest', {
        description: '发送验证码',
        accepts: [{arg: 'mobile', type: 'string', required: true, description: '手机号码'},
            {arg: 'type', type: 'string', required: true, description: 'forgetPassword 或者 signup 其他无效'}],
        returns: {arg: 'result', type: 'string'},
        http: {verb: 'get', path: '/verify-mobile-test'}
    });
    Verification.remoteMethod('verifyMobile', {
        description: '发送验证码',
        accepts: [{arg: 'mobile', type: 'string', required: true, description: '手机号码'},
            {arg: 'type', type: 'string', required: true, description: 'forgetPassword 或者 signup 其他无效'}],
        returns: {arg: 'result', type: 'string'},
        http: {verb: 'get', path: '/verify-mobile'}
    });
    Verification.verifyCode = function (mobile, code) {
        return Verification.findOne({
            where: {
                mobile,
                verifyCode: code,
                ttl: {gt: moment().toDate()}
            }
        }).then(verifyData => {
            if (!verifyData) {
                throw errs.create({
                    code: 'PHONE_CODE_INVALID',
                    status: 401,
                    statusCodae: 401,
                    message: 'invalid code or phone'
                });
            }
            return true;
        });
    };
    Verification.findValidInstance = function (mobile) {
        return Verification.findOne({where: {mobile, expireAt: {gt: moment().toDate()}}}).then((verification) => {
            console.log(123,verification)
            if (verification)
                throw errs.create({
                    code: 'VERIFICATION_CODE_EXISTED',
                    status: 401,
                    statusCode: 401,
                    message: 'already send sms'
                });
            return true;
        });
    };
}
;
