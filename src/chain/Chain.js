const { Block } = require("../block/Block");
const Cryptojs = require("crypto-js");
const Transcation = require('../transcation/transcation')
const pckage = require('../../package.json');
const UTXO = require("../transcation/utxo");
const Address = require('../wallet/address')
const Wallet = require('../wallet/wallet');
/**
 * 区块链
 */
class Chain {
    constructor() {
        this.difficult = 2;
        this.trans = [];
        this.transMerkleRootHash = '';
        this.mineTime = 1;//出块时间，1min
        this.adjustDifficultBlockHeight = 10
        this.coinBaseAmount = 100//每次铸币交易所奖励矿工的coin数

        //未花费的交易池 utxo对象数组
        this.UTXOPool = [];
        this.blockchain = [this.genesisBlock()];
    }
    /**
     * 生成创世区块
     * @returns 创世区块
     */
    genesisBlock = function() {
        let timestamp = 1618399623804;
        let genesisHash = this.caculateBlockHash(pckage.version, 0, '', this.constructTransactionMerkleTree(this.trans), timestamp, this.difficult, 0);
        let genesisBlock = new Block(pckage.version, 0, '', genesisHash, '', [], timestamp, this.difficult,0);
        genesisBlock.setSize(JSON.stringify(genesisBlock).length);
        return genesisBlock;
    }

    /**
     * 计算区块哈希参数为区块对象本身
     * @param {*} block 
     * @returns 
     */
    caculateBlockHashForBlock = function(blockhead) {
        return Cryptojs.SHA256(blockhead.version + blockhead.index + blockhead.prevHash + blockhead.transMerkleRootHash + blockhead.timestamp + blockhead.difficult + blockhead.nonce).toString();
    }
    /**
     * 计算区块哈希值参数为区块属性
     * @param {String} version 
     * @param {Number} index 
     * @param {String} prevHash 
     * @param {Number} timestamp 
     * @param {Number} difficult 
     * @param {String} transMerkleRootHash 
     * @param {Number} nonce 
     * @returns 
     */
    caculateBlockHash = function(version, index, prevHash, transMerkleRootHash, timestamp, difficult, nonce) {
        return Cryptojs.SHA256(version + index + prevHash + transMerkleRootHash + timestamp + difficult + nonce).toString();
    }

    /**
     * 是否是合法的区块头
     * @param {*} block 
     * @returns 
     */
    isValidBlockStructure = function(blockhead) {
        if (typeof blockhead.version === 'string' &&
            typeof blockhead.index === 'number' &&
            typeof blockhead.hash === 'string' &&
            typeof blockhead.prevHash === 'string' &&
            typeof blockhead.timestamp === 'number' &&
            typeof blockhead.difficult === 'number' &&
            typeof blockhead.transMerkleRootHash === 'string' &&
            typeof blockhead.nonce === 'number')
            return true;
        else return false;
    }
    /**
     * 是否为合法的区块
     * @param {*} block 
     * @returns 
     */
    isValidBlock = function(block, lastBlock) {

        if (typeof block.index === 'number' &&
            typeof block.size === 'number' &&
            this.isValidBlockHead(block.blockhead, lastBlock.blockhead) &&
            typeof block.transCount === 'number' &&
            block.trans instanceof Array)
            return true;
        else return false;
    }
    /**
     * 是否是合法的区块头
     * @param {*} blockhead 
     * @param {*} lastBlockhead 
     * @returns 
     */
    isValidBlockHead = function(blockhead, lastBlockhead) {
        if (this.caculateBlockHashForBlock(blockhead) === blockhead.hash &&
            blockhead.prevHash === lastBlockhead.hash &&
            blockhead.timestamp > lastBlockhead.timestamp &&
            blockhead.index === lastBlockhead.index + 1 &&
            this.isValidBlockStructure(blockhead))
            return true;
        else return false;
    }
    /**
     * 是否为合法的交易
     * @param {*} tran 
     * @returns 
     */
    isValidTran = function(tran) {
        if (tran.input instanceof Array &&
            typeof tran.inputCount === 'number' &&
            tran.output instanceof Array &&
            typeof tran.outputCount === 'number' &&
            typeof tran.timestamp === 'number' &&
            typeof tran.isCoinBase === 'boolean') {
            return true
        }
        return false
    }
    /**
     * 获得区块链中上一个区块
     * @returns 
     */
    getLastBlock = function() {
        return this.blockchain[this.blockchain.length - 1];
    }

    /**
     * 构造交易Merkle树
     * @param {*} trans 
     * @returns 
     */
    constructTransactionMerkleTree = function(trans) {
        if (trans.length === 0) return '';
        const transCount = trans.length;
        let tempTrans = []
        //判断交易数目
        //如果数目为偶数则直接返回，
        //否则是奇数，将会复制一个最后的交易构成偶数交易。
        tempTrans = transCount % 2 === 0 ? trans : trans.push(trans[trans.length - 1])
        let tempHashTrans = trans.map((v, i) => {
            return Cryptojs.SHA256(JSON.stringify(v)).toString();
        })
        //从底部构造Merkle树，并返回根哈希值
        return this.constructMerkleTreeFromBottom(tempHashTrans);
    }
    /**
     * 从底部构造Merkle树，并返回根哈希值
     * @param {*} hashArray 
     * @returns 
     */
    constructMerkleTreeFromBottom = function(hashArray) {
        if (!Array.isArray(hashArray) || hashArray.length === 0) return;
        if (hashArray.lengths === 1) return hashArray[0];
        while (hashArray.length > 1) {
            hashArray.length % 2 !== 0 ? hashArray.push(hashArray[hashArray.length - 1]) : null;
            let tempMerkle = [];
            for (let i = 0; i < hashArray.length; i += 2) {
                let lHash = hashArray[i].slice(0, 32);
                let rHash = hashArray[i + 1].slice(0, 32);
                let parentHash = Cryptojs.SHA256(lHash + rHash).toString();
                tempMerkle.push(parentHash);
            }
            hashArray = tempMerkle
        }
        return hashArray[0]

    }
    /**
     * 生成新的区块 
     * @returns 新区块
     */
    generateNewBlock = function() {
        let nonce = 0;
        let version = pckage.version;
        let index = this.blockchain.length;
        let prevHash = this.getLastBlock().blockhead.hash;
        let timestamp = new Date().getTime();
        let difficult = this.difficult;
        //将引用赋值转换为传值赋值
        let trans = []
        for (let i = 0; i < this.trans.length; i++) {
            trans.push(this.trans[i]);
        }

        let transMerkleRootHash = this.constructTransactionMerkleTree(trans);
        let hash = this.caculateBlockHash(version, index, prevHash, transMerkleRootHash, timestamp, difficult, 0)

        //根据情况修改产生区块的难度
        this.adjustDifficult();
        //通过不断地加nonce得到想要的hash值；
        while (hash.slice(0, this.difficult) !== '0'.repeat(this.difficult)) {
            nonce++;
            hash = this.caculateBlockHash(version, index, prevHash, transMerkleRootHash, timestamp, difficult, nonce)
        }
        let newBlock = new Block(version, index, prevHash, hash, transMerkleRootHash, this.trans, timestamp, difficult,nonce);
        newBlock.setSize(JSON.stringify(newBlock).length);
        return newBlock;
    }
    /**
     * 挖矿
     */
    mine = function() {
        let pubK = Wallet.getMasterPublicKeys();
        if (!this.blockchain.length % 210000) {
            this.coinBaseAmount = this.coinBaseAmount / 2;
        }
        this.transfer('0', pubK, this.coinBaseAmount);
        let newBlock = this.generateNewBlock();
        if (newBlock !== undefined) {
            this.blockchain.push(newBlock);
            this.trans = [];
            return newBlock
        }
    }
    /**
     * 调整出块的困难度。
     * @returns 
     */
    adjustDifficult = function() {
        let height = this.blockchain.length;
        if (height % this.adjustDifficultBlockHeight !== 0) return;
        let lastAdjustBlock = this.blockchain[(height - this.adjustDifficultBlockHeight)];
        let lastBlock = this.getLastBlock();
        let lastAdjustBlockMins = new Date(lastAdjustBlock.blockhead.timestamp) / 1000;
        let lastBlockMins = new Date(lastBlock.blockhead.timestamp) / 1000;
        let actualTime = parseInt((lastBlockMins - lastAdjustBlockMins) / 60);
        let expectTime = this.mineTime * this.adjustDifficultBlockHeight;
        if (actualTime < expectTime) {
            this.difficult++
        } else {
            this.difficult--
        }
        // this.difficult = this.difficult * (actualTime / expectTime));
    }
    /**
     * 判断是否为正确的创世区块
     * @param {*} block 
     * @returns 
     */
    isValidGensisBlock = function(block) {
        return JSON.stringify(block) === JSON.stringify(this.genesisBlock())
    }
    /**
     * 判断是否是合法的区块链
     * @param {*} chain 
     * @returns 
     */
    isValidBlockChain = function(blockchain) {
        if (!this.isValidGensisBlock(blockchain[0])) {
            console.log('创世区块不正确')
            return false;
        }
        for (let i = blockchain.length - 1; i >= 1; i--) {
            if (!this.isValidBlockHead(blockchain[i].blockhead, blockchain[i - 1].blockhead)) {
                return false
            }
        }
        return true;
    }
    /**
     * 判断是否是合法的链()
     * @param {*} chain 
     * @returns 
     */
    isValidChain = function(chain) {
        if (typeof chain.difficult === 'number' &&
            chain.trans instanceof Array &&
            typeof chain.transMerkleRootHash === 'string' &&
            typeof chain.mineTime === 'number' &&
            typeof chain.adjustDifficultBlockHeight === 'number' &&
            typeof chain.coinBaseAmount === 'number' &&
            chain.UTXOPool instanceof Array &&
            this.isValidBlockChain(chain.blockchain)) {
            return true;
        }
        return false
    }
    /**
     * 更新本地的区块链
     * @param {*} newBlockChain 
     * @returns 
     */
    replaceBlockChain = function(newBlockChain) {
        if (newBlockChain.length === 1) {
            return
        }
        if (this.isValidBlockChain(newBlockChain) && newBlockChain.length > this.blockchain.length) {
            this.blockchain = JSON.parse(JSON.stringify(newBlockChain));
        } else {
            console.log('【错误】不合法的链')
        }
    }
    /**
     * 更新整个区块链系统（包括版本，交易，等）
     * @param {*} newChain 
     */
    replaceChain = function(newChain) {
        if (newChain.blockchain.length > this.blockchain.length) {
            if (this.isValidChain(newChain)) {
                this.UTXOPool = newChain.UTXOPool;
                this.version = newChain.version;
                this.difficult = newChain.difficult;
                this.transMerkleRootHash = newChain.transMerkleRootHash;
                this.mineTime = newChain.mineTime;
                this.adjustDifficultBlockHeight = newChain.adjustDifficultBlockHeight
                this.coinBaseAmount = newChain.coinBaseAmount;
                this.trans = newChain.trans;
            } else {
                console.log('【错误】不合法的区块链')
            }
        }
        return
    }

    /**
     * 
     *  
     * 
     * 交易
     */

    /**
     * 
     * @param {*} from 
     * @param {*} to 
     * @param {*} amount 
     * @returns 
     */
    transfer = function(from, to, amount) {
        if (amount <= 0) return false;
        //从utxo池中获取所有有关输入的所有utxo
        let res = this.selectAmountFromUTXOPool(from);
        //对所有的utxo进行排序
        res = this.sortSelectedUTXO(res);
        //从排序后的utxo中以此选择金额，凑齐转账金额
        let usefulUTXO = this.chooseAmountFromUTXO(res, amount);

        let transcation = new Transcation();
        //将交易输入脚本添加到交易中
        let isInput = transcation.addInput(usefulUTXO, from, to);

        if (isInput) {
            //计算收款人公钥哈希值
            let newUTXO = this.generateOutput(transcation, to, amount);
            //判断交易是否为铸币交易
            from == 0 ? newUTXO.setCoinBase(true) : newUTXO.setCoinBase(false);
            //将新的输出添加到UTXO池中
            this.UTXOPool.push(newUTXO);
            //系统将自动将剩余的找零转给自己
            if (usefulUTXO !== undefined && usefulUTXO.change > 0) {
                let changeOutput = this.generateOutput(transcation, from, usefulUTXO.change);
                this.UTXOPool.push(changeOutput);
            }
            this.trans.push(transcation);
            //删除已经花费的utxo
            this.UTXOPool = this.deleteSpentUTXO(this.UTXOPool);
        }
        return transcation;
    }
    /**
     * 删除已经花费的utxo，并返回新的utxo池
     * @param {*} utxoPool 
     * @returns 
     */
    deleteSpentUTXO = function(utxoPool) {
        if (utxoPool.length <= 0) return;
        return utxoPool.filter((utxo) => {
            return !utxo.isSpent
        })
    }

    /**
     * 
     * @param {*} to 
     */
    generateOutput = function(transcation, to, amount) {
        let pubKeyHash = Cryptojs.RIPEMD160(to).toString();
        let scriptPubKey = `OP_DUP OP_HASH160 ${pubKeyHash} OP_EQUALVERIFY OP_CHECKSIG`
        let vout = transcation.addOutput(amount, scriptPubKey)
        let UTXOaddr = Address.getAddressByPub(to);
        let newUTXO = new UTXO(UTXOaddr, vout.index, vout.value, vout.scriptPubKey);
        return newUTXO;
    }
    /**
     * 对utxo排序 从大到小
     * @param {*} res 
     * @returns 
     */
    sortSelectedUTXO = function(res) {
        if (!res || res.length === 0) return [];
        if (res.length === 1) return res;
        for (let i = 0; i < res.length - 1; i++) {
            for (let j = 0; j < (res.length - i) - 1; j++) {
                let temp;
                if (res[j].value > res[j + 1].value) {
                    temp = res[j]
                    res[j] = res[j + 1]
                    res[j + 1] = temp
                } else {
                    continue;
                }
            }
        }
        return res
    }
    /**
     * 获取所有有关输入的所有utxo
     * @param {*} address 
     * @returns 
     */
    selectAmountFromUTXOPool = function(address) {
        if (this.UTXOPool.length === 0) return;
        let res = [];
        let addressHash = Address.getAddressByPub(address);
        for (let i = 0; i < this.UTXOPool.length; i++) {
            if (this.UTXOPool[i].txid === addressHash) {
                res.push(this.UTXOPool[i]);
            }
        }
        return res;
    }
    /**
     * 从UTXO中选择满足要求的余额进行付款。
     * @param {*} res 
     * @param {*} amount 
     * @returns 返回涉及的utxo及找零 {utxo,change}
     */
    chooseAmountFromUTXO = function(res, amount) {
        if (res.length === 0) return;
        //将小于amount的余额UTXO放到lessers中
        let lessers = res.filter((v) => {
            if (v.value < amount) {
                return v.value
            }
        })
        //将大于amount的余额UTXO放到greaters中
        let greaters = res.filter((v) => {
            if (v.value >= amount) {
                return v.value
            }
        })

        //最大的余额里面是否有最小的余额可以进行支付，有的话返回
        if (greaters.length !== 0) {
            let minGreater = greaters[0];
            let change = minGreater.value - amount;
            return {
                result: [minGreater], change
            }
        }
        //如果没有大余额进行支付，则从最小的当中选择多个UTXO进行累加并支付
        let result = [];
        let accum = 0;
        for (let i = 0; i < lessers.length; i++) {
            result.push(lessers[i]);
            accum += lessers[i].value;
            if (accum >= amount) {
                let change = accum - amount;
                return {
                    result,
                    change
                }
            }
        }
        if (accum <= amount) {
            console.log('余额不足')
            return {
                result: [],
                change: 0
            }
        }
    }
    name(){
        return 'Chain'
    }
}


module.exports = Chain;