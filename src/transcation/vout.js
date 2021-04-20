/**
 * Vout 交易输出
 */

class Vout{
    //index 当前交易中输出的位置
    //value 交易金额
    //scriptPubKey 锁定脚本
    constructor(index,value,scriptPubKey){
        this.value = value;
        this.index = index;
        this.scriptPubKey =  scriptPubKey
    }
}

module.exports = Vout;