/**
 * vin 交易输出
 */
class Vin{
    constructor(txid,txindex,scriptSig){
        this.txid = txid;//utxo中交易hash
        this.txindex = txindex;//utxo交易位置
        this.scriptSig = scriptSig;
    }
}

module.exports = Vin;