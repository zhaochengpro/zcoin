/**
 * UTXO 未花费的输出
 */
class UTXO{
    constructor(txid,index,value,PkScript){
        this.txid = txid;
        this.value = value;
        this.isCoinBase = false;
        this.nHeight = index;
        this.PkScript = PkScript;
        this.isSpent = false;
    }

    setCoinBase(isCoinBase){
        this.isCoinBase = isCoinBase;
    }
}

module.exports = UTXO;