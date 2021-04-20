/**
 * 用于生成密钥对
 */

const secp256 = require("secp256k1");
const PrivateKey = require('./privateKey') 
;(module.exports = Keys = function (){
    /**
     * 
     * @param {*} password 
     * @returns prv
     */
    function createPrvKey(password){
        var prv = PrivateKey.generatePrivateKey(password);
        return prv
    }

    /**
     * 
     * @param {*} password 
     * @returns pub 
     */
    function createPubKey(seedPrv){
        let randomKeyBuffer = Buffer.alloc(seedPrv.length/2,seedPrv,'hex');
        let pubUint8 = secp256.publicKeyCreate(randomKeyBuffer);
        var pub = Buffer.from(pubUint8).toString('hex');
        return pub
    }
    /**
     * 通过导入助记词生成的seed来获取私钥和生成对应的公钥
     * @param {*} seed 
     * @param {*} password 
     * @returns 
     */
         function createKeysBySeed(seed,password){
            let seedPrv = PrivateKey.generatePrivateKeyBySeed(seed,password);
            let seedPub = createPubKey(seed.slice(0,64));
            return {
                seedPrv,
                seedPub
            }
        }

    /**
     * 
     * @param {*} password 
     */
    function createKeys(password){
        let prv,pub;
        if(typeof password !== 'string') 
        throw new Error('password type error')
        try {
            prv = createPrvKey(password);
            pub = createPubKey(prv.randomRes)
        } catch (error) {
            console.log(error)
            return 
        }
        return {
            seedPrv:prv.encrytedKey,
            seedPub:pub
        }
    }


    return {
        createPrvKey,
        createPubKey,
        createKeys,
        createKeysBySeed,
        randomkey:PrivateKey.randomkey
    }
})


