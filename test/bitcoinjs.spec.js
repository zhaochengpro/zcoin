const assert = require('assert');
const Chain = require('../src/chain/Chain')
const UTXO = require('../src/transcation/utxo')
const Cryptojs = require('crypto-js')
const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1');
const { Address } = require('../src/wallet/address');
describe('密钥测试', () => {

});

describe('地址测试', () => {

});

let chain = new Chain();
describe('区块链测试', () => {

    it('测试merkle数根哈希值', () => {

        let MerkleRootHash = chain.constructTransactionMerkleTree([{
            input: ['sssssssss'],
            output: [],
            value: '10'
        }, {
            input: ['xxxxx'],
            output: [],
            value: '20'
        }, {
            input: ['ggg'],
            output: [],
            value: '34'
        }, {
            input: ['sss'],
            output: [],
            value: '20'
        }, {
            input: ['ghjhj'],
            output: [],
            value: '100'
        }])
        // console.log(MerkleRootHash)
        assert.strictEqual(MerkleRootHash.length, 64)
    });
    it('测试生成新区块', () => {
        chain.trans = [{
            input: ['sssssssss'],
            output: [],
            value: '10'
        }, {
            input: ['xxxxx'],
            output: [],
            value: '20'
        }, {
            input: ['ggg'],
            output: [],
            value: '34'
        }, {
            input: ['sss'],
            output: [],
            value: '20'
        }, {
            input: ['ghjhj'],
            output: [],
            value: '100'
        }]
        // console.log(chain.generateNewBlock());

    });
    it('测试挖矿难度更新', () => {
        //     for(let i = 0; i < 200; i++){
        //         chain.trans = [{
        //             input:['sssssssss'],
        //             output:[],
        //             value:'10'
        //         },{
        //             input:['xxxxx'],
        //             output:[],
        //             value:'20'
        //         },{
        //             input:['ggg'],
        //             output:[],
        //             value:'34'
        //         },{
        //             input:['sss'],
        //             output:[],
        //             value:'20'
        //         },{
        //             input:['ghjhj'],
        //             output:[],
        //             value:'100'
        //         }]
        //         chain.generateNewBlock();
        //     }
    });
    it('交易测试', () => {
        let chain = new Chain();
        chain.mine();
        //0268e4fbcf94e1adb2d00bd043b222275ccfb13240d9a2a9dc04488b55950fda23 100
        //033fd2cc4a1f8c4eef473af3a3d57cab68162e99eedb95cc0a14cd05f238d25d83 -------> 1QCwcPRFUx4E4GpQzwpGoQF1KwEwDrxPJ4
        //0268e4fbcf94e1adb2d00bd043b222275ccfb13240d9a2a9dc04488b55950fda23 -------> 1MEJSciMNeSjJtp86RogP4jJEVzZwAeMJG
        chain.transfer('0268e4fbcf94e1adb2d00bd043b222275ccfb13240d9a2a9dc04488b55950fda23','033fd2cc4a1f8c4eef473af3a3d57cab68162e99eedb95cc0a14cd05f238d25d83',30);
        chain.transfer('0268e4fbcf94e1adb2d00bd043b222275ccfb13240d9a2a9dc04488b55950fda23','036671f16d1ee61fcc9dababbfcf1f2e1aaa2690dda959173188a8364b4484c1eb',40);
        chain.transfer('0268e4fbcf94e1adb2d00bd043b222275ccfb13240d9a2a9dc04488b55950fda23','02aac9cd79643c5e85ac602da30b10886915ae96d44e126e99169a21c8b88e41ca',30);
        console.log(chain.UTXOPool)
        // assert.strictEqual(chain.trans.length,2);
    });
    

});
