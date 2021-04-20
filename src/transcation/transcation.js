const Vin = require('./vin');
const Vout = require('./vout')
const P2PKH = require('../utils/p2pkh')
const Cryptojs = require('crypto-js')
const secp256 = require("secp256k1");
const fs = require('fs');
const path = require('path');
let keys = {};
if(fs.existsSync(path.resolve(__dirname,'../keys.json'))){
    keys = require('../keys.json')
}


/**
 * 交易
 */
class Transcation {
    constructor() {
        this.input = []
        this.inputCount = 0;
        this.output = [];
        this.outputCount = 0;
        this.timestamp = new Date().getTime();
        this.isCoinBase = false;
    }

    /**
     * 新增输入到交易中
     * @param {*} usefulUTXO
     * @param {*} scriptSig
     * @returns 
     */
    addInput(usefulUTXO,from,to) {
        //判断交易是否为铸币交易
        //如果交易发起方地址为0则表示是系统的铸币交易
        if(from == '0') {
            this.isCoinBase = true;
            const vinCoinBase = new Vin(null, null, null);
            this.input.push(vinCoinBase);
            return true;
        }
       
        if (usefulUTXO.length === 0 && !from) return false;
        for (let i = 0; i < usefulUTXO.result.length; i++) {
            const utxo = usefulUTXO.result[i]
            const hash = Cryptojs.SHA256(utxo.txid,utxo.nHeight).toString();
            const prvK = Buffer.alloc(keys.masterKey.prv.length / 2,keys.masterKey.prv,'hex');
            const sigObj = secp256.ecdsaSign(Buffer.alloc(hash.length / 2, hash, 'hex'),prvK)
            const pubK = Buffer.from(secp256.publicKeyCreate(prvK)).toString('hex')
            const sig = Buffer.from(sigObj.signature).toString('hex')
            const scriptSig = sig + " "+ pubK
            const vin = new Vin(utxo.txid, utxo.nHeight, scriptSig);
            //用解锁脚本来解锁锁定脚本
            const p2pkh = new P2PKH()
            if (p2pkh.vertifyScript(utxo.PkScript, vin)) {
                this.input.push(vin);
                this.inputCount++;
                utxo.isSpent = true;
            } else return false
        }
        return this.inputCount > 0 ? true:false;

    }
    /**
     * 新增交易输出
     * @param {*} amount 
     * @param {*} scriptPubKey 
     * @returns 
     */
    addOutput(amount, scriptPubKey) {
        let vout = new Vout(this.output.length, amount, scriptPubKey);
        this.output.push(vout);
        this.outputCount++;
        return vout;
    }
}

module.exports = Transcation;