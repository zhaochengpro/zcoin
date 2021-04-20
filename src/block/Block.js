const Cryptojs = require('crypto-js');

/**
 * 区块信息
 * 区块大小 size
 * 区块头对象
 * 交易计数
 */
class Block {

    constructor(version, index, prevHash, hash, transMerkleRootHash, trans, timestamp, difficult,nonce) {
        this.index = index;
        this.size = 0;
        this.blockhead = new BlockHead(version, index, prevHash, hash, transMerkleRootHash, timestamp, difficult,nonce)
        this.transCount = trans.length;
        this.trans = trans
    }
    setSize(size){
        this.size = size;
    }
}

/**
 * 对象：区块头
 * 包含：区块位置 index
 * 区块版本 verison
 * 前区块哈希 prevHash
 * 区块哈希 hash
 * 交易merkle根哈希 transMerkleRootHash
 * 时间戳 timestamp
 * 难度目标 difficult
 * nonce计数器 nonce
 */
class BlockHead {
    constructor(version, index, prevHash, hash, transMerkleRootHash, timestamp, difficult,nonce) {
        this.version = version
        this.index = index;
        this.prevHash = prevHash;
        this.hash = hash;
        this.transMerkleRootHash = transMerkleRootHash;
        this.timestamp = timestamp;
        this.difficult = difficult;
        this.nonce = nonce;
    }
}


module.exports = {
    Block,
    BlockHead
};