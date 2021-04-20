// 用来生成私钥
const Cryptojs = require('crypto-js')//哈希加密
const base58 = require('../utils/base58check');//将生成的私钥进行base58编码
const bip38 = require('bip38');//encode the string with password
const wif = require('../utils/wif/index');
const bip39 = require('bip39')//generate a series mnemonic
const fs = require('fs');
const path = require('path')

function PrivateKey() {

    let privateKey;
    /**
     * 生成随机的助记词，并将助记词转换为256位的随机数
     * 将助记词存在本地{mnemonic:'xxx xx xxx xxxxx xxx'}
     * 将256为左边的128位作为种子生成根私钥，右边128位作为链码
     * @param {*} password 用来对助记词进行sha256哈希计算
     * @returns 
     */
    function getRamNumber(password) {
        let mnemonic = bip39.generateMnemonic();
        let mnemonicPath = path.resolve(__dirname,'../mnemonic.json');
        let mnemonicHash = Cryptojs.SHA256(mnemonic+password).toString();
        fs.writeFileSync(mnemonicPath,`{"mnemonic":"${mnemonic}","hash":"${mnemonicHash}"}`);
        let result = bip39.mnemonicToSeedSync(mnemonic).toString('hex').slice(0,64);
        return result
    }

    /**
     * 
     * @param {*} result 
     * @returns 
     */

    function constractPrivateKey(result) {
        if (result.length !== 64) throw new Error('param length is invalid')
        else {
            return "80" + result;
        }
    }


    /**
     * 对私钥进行二次哈希计算
     * @param {*} privateKey 
     * @returns 
     */

    function caculatePrivateHash(privateKey) {
        if (privateKey.length !== 66 || privateKey.slice(0, 2) !== '80') throw new Error('param is invalid')
        return Cryptojs.SHA256(Cryptojs.SHA256(privateKey).toString()).toString();

    }


    /**
     * 取私钥的哈希前四位作为私钥哈希的后缀
     * @param {*} privateKeyHash 
     * @returns 
     */
    function privateKeyPrefixSuffix(privateKeyHash) {
        let hashPrefix = privateKeyHash.slice(0, 8);
        let privateKeyPrefix = privateKey + hashPrefix;
        return base58.encode(Buffer.alloc(privateKeyPrefix.length / 2, privateKeyPrefix, 'hex'))
    }

    /**
     * 
     * @param {*} password 
     * @returns encrytedKey bip38编码加密之后的数据 randomRes 原生生成的随机数
     */
    function generatePrivateKey(password) {
        const randomRes = getRamNumber(password)
        privateKey = constractPrivateKey(randomRes);
        let privateKeyHash = caculatePrivateHash(privateKey);
        let base58PrivateKey = privateKeyPrefixSuffix(privateKeyHash);
        let decoded = wif.decode(base58PrivateKey);
        let encrytedKey = bip38.encrypt(decoded.privateKey, decoded.compressed, password);
        return {
            encrytedKey,
            randomRes
        };
    }



    /**
     * @description 通过随机种子获得私钥
     * @param {*} seed 
     * @param {*} password 
     * @returns 
     */
    function generatePrivateKeyBySeed(seed,password){
        if(Buffer.isBuffer(seed)) seed = seed.toString('hex');
        privateKey = constractPrivateKey(seed.slice(0,64));
        let privateKeyHash = caculatePrivateHash(privateKey);
        let base58PrivateKey = privateKeyPrefixSuffix(privateKeyHash);
        let decoded = wif.decode(base58PrivateKey);
        let encrytedKey = bip38.encrypt(decoded.privateKey, decoded.compressed, password);
        return encrytedKey;
    }

    return {
        generatePrivateKey,
        generatePrivateKeyBySeed,
    }

}
module.exports = PrivateKey()