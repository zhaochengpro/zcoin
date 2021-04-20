const Cryptojs = require('crypto-js')
const secp256 = require("secp256k1");
/**
 * P2PKH(pay to public key hash)
 */
class P2PKH{
    constructor(){
        this.operationStack = [];
        this.messageHash = '';
    }
    /**
     * 
     * @returns 
     */
    vertifyScript(lockScript,vin){
        let unlockScript = vin.scriptSig;
        //将交易进行哈希计算
        let messageHash = Cryptojs.SHA256(vin.txid,vin.txindex,vin.scriptSig).toString();
        this.messageHash = Buffer.alloc(messageHash.length / 2, messageHash,'hex');
        let op_array = (unlockScript + " " +lockScript).split(" ");
        for(let i = 0; i < op_array.length; i++){
            // console.log(this.operationStack)
            if(op_array[i].slice(0,2) !== 'OP') {
                this.operationStack.push(op_array[i]);
            }else{
                this.operationSymbol(op_array[i]);
            }
            
        }
        
        return this.operationStack[0] == true;
    }
    /**
     * 获取栈顶元素
     * @param {*} stack 
     * @returns 
     */
    getStackElem(stack = this.operationStack){
        if(stack.length === 0) return;
        return stack[stack.length - 1];
    }
    /**
     * 删除并返回栈顶元素
     * @param {*} stack 
     * @returns 
     */
    popStackElem(stack = this.operationStack){
        if(stack.length === 0) return;
        return stack.pop();
    }
    /**
     * 
     * @param {*} operation 
     */
    operationSymbol(operation){
        switch (operation) {
            case "OP_DUP":
                let dup = this.getStackElem();
                this.operationStack.push(dup);
                break;
            case "OP_HASH160":
                let pubK = this.popStackElem();                
                let hash160End = Cryptojs.RIPEMD160(pubK).toString();          
                this.operationStack.push(hash160End);
                break;
            case "OP_EQUALVERIFY":
                let end = this.popStackElem();
                let second = this.popStackElem();
                if(end !== second){
                    this.operationStack.push(false)
                    console.log("end 与 second 不相等")
                }
                break;
            case "OP_CHECKSIG":
                if(!this.getStackElem()) break;
                let PubK = this.popStackElem();
                let sig = this.popStackElem();
                if(secp256.ecdsaVerify(Buffer.alloc(sig.length/2,sig,'hex'),
                Uint8Array.from(this.messageHash),Buffer.alloc(PubK.length / 2,PubK,'hex'))){
                    this.operationStack.push(true)
                }else{
                    this.operationStack.push(false)
                }
                break;
            default:
                break;
        }
    }
}

module.exports = P2PKH;