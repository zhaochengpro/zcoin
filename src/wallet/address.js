
/**
 * 用于生成bitcoinjs地址
 */

const Cryptojs = require('crypto-js');
const Base58Check = require('../utils/base58check')

/**
 * 1、对公钥进行SHA256哈希计算 SHA256PubKey(pub);
 * 2、对第一步的哈希值进行RIPEMD160哈希计算  RIPEMD160PubKey(pub);
 * 3、得到的第二步结果进行Base58check编码
 */
module.exports = function Address() {
    /**
     * 1、对公钥进行SHA256哈希计算
     * @param {*} pub 
     * @returns 
     */
    function SHA256PubKey(pub) {
        if (!pub) throw new Error('pub is invalid')
        return Cryptojs.SHA256(pub).toString();
    }
    /**
     * 2、对第一步的哈希值进行RIPEMD160哈希计算
     * @param {*} pubSha256 
     * @returns 
     */
    function RIPEMD160PubKey(pubSha256) {
        return Cryptojs.RIPEMD160(pubSha256).toString();
    }
    /**
     * 通过公钥来获取地址
     * 3、得到的第二步结果进行Base58check编码
     * @param {*} Pub 
     * @returns 
     */
    function getAddressByPub(pub) {
        if(!pub) throw new Error('pub is invalid')
        let pubRIPEMD160 = this.RIPEMD160PubKey(this.SHA256PubKey(pub));
        //添加'00'前缀的地址
        const prefixAddress = constractAddress(pubRIPEMD160)
        //对地址进行两次SHA256哈希计算得到的四字节校验码并添加到地址末尾
        const addressCheck = addSuffixToAddress(prefixAddress);
        const address = Base58Check.encode(Buffer.alloc(addressCheck.length / 2,addressCheck, 'hex'))
        return address
    }

    /**
     * 构造地址格式 '00'+address
     * @param {*} address 
     * @returns 
     */
    function constractAddress(address){
        if(!address)return;
        return '00'+address;
    }
    /**
     * 
     * @param {*} address 
     * @returns 添加了校验码的地址 
     */
    function addSuffixToAddress(address){
        if(!address || address.slice(0,2) !== '00') return;
        const hash = Cryptojs.SHA256(Cryptojs.SHA256(address).toString()).toString();
        const hashPrefix = hash.slice(0,8);
        address = address + hashPrefix;
        return address
    }

    return {
        getAddressByPub,
        RIPEMD160PubKey,
        SHA256PubKey
    }
}();
