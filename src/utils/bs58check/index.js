'use strict'

var createHash = require('create-hash')
var bs58checkBase = require('./base')
let Cryptojs = require('crypto-js')

// SHA256(SHA256(buffer))
function sha256x2 (buffer) {
    /**
     * 执南樱樱修改，通过crypto-js来实现检验码的验证
     */
  let tmp = Cryptojs.SHA256(Cryptojs.SHA256(buffer.toString('hex')).toString()).toString().slice(0,8);
  return  Buffer.alloc(tmp.length / 2,tmp,'hex');
}

module.exports = bs58checkBase(sha256x2)
