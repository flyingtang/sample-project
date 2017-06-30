/**
 * Created by tangxiaogang on 2017/6/14.
 */
const assert = require('chai').assert;
const s = require('../support');
const PromiseA = require('bluebird');
describe('api/verification', () => {
    // before(s.setup);
    // after(s.teardown);
    describe('verifyCode', () => {
        it('should get verification code',() => {
            const data1 = {
                mobile:'13751821418',
                type:'x'
            };
            const data2 = {
                mobile:'123',
                type:'x'
            };
            const data3 = {
                mobile:'13751821418',
                type:'xx '
            };
            const data4 = {
                mobile:'13751812321418',
                type:'forgetPassword'
            };
            const data5 = {
                mobile:'13751821418',
                type:'forgetPassword'
            };
            const data51 = {
                mobile:'17688311914',
                type:'forgetPassword'
            };
            const data6 = {
                mobile:'13751821418 ',
                type:'forgetPassword '
            };
            const data7 = {
                mobile:'13751821418',
                type:'signup '
            };
            const data8 = {
                mobile:'13751821418',
                type:'signup1'
            };
            const data9 = {
                mobile:'17688311914',
                type:'signup'
            };
            const data10 = {
                mobile:'17688311914',
                type:'signup1'
            };
            return s.json('get','/Verifications/verify-mobile-test')
                .send(data9)
                .then(verification => {
                    assert.isObject(verification.body);
                })
        })
    });
});