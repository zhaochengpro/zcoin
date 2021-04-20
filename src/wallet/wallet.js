/**
 * 生成wallet分层钱包
 * 通过母私钥生成子私钥以此类推
 */

const Key = require('./keys')()
const bip32 = require('bip32');
const bip39 = require('bip39');
const fs = require('fs');
const path = require('path');
const Cryptojs = require('crypto-js')
const vorpal = require('vorpal')()
const chalk = vorpal.chalk;
const Address = require('./address')

function Wallet() {

    /**
     * 创建钱包
     * @param {*} password 
     */
    function createWallet(password) {
        const seed = Key.createKeys(password);
        const mKeys = bip32.fromSeed(Buffer.from(seed.seedPrv));
        try {
            walletFormat(seed, mKeys)
        } catch (error) {
            console.log(error)
        }

    }

    /**
     * 将种子密钥和主密钥导出到指定文件
     * @param {*} seedKey 
     * @param {*} masterKey 
     */
    function walletFormat(seedKey, masterKey) {
        console.time('HD钱包生成')
        const keysPath = path.resolve(__dirname, '../keys.json');
        fs.writeFileSync(keysPath, `{
            "seedKey":{
                "prv":"${seedKey.seedPrv}",
                "pub":"${seedKey.seedPub}"
            },
            "masterKey":{
                "prv":"${masterKey.privateKey.toString('hex')}",
                "pub":"${masterKey.publicKey.toString('hex')}"
            }\n}`);
        console.timeEnd('HD钱包生成')
        console.log('生成HD钱包路径：' + keysPath);
    }

    /**
     * 通过路径树获得HD wallet的某一个子私钥或者子公钥
     * @param {*} path 'm/[index]'/[index]/[index]' 其中“'”表示生成硬私钥或者公钥
     * @returns 
     */
    function getPubKeyByDerivePath(path,prvOrpub) {
        const keysJson = getKeysPath();
        if(!keysJson){
            console.log(chalk.red("种子密钥不存在，请重新创建您的HD钱包"));
            return;
        }
        if (!keysJson.seedKey.prv) throw new Error('Not valid private key')
        let deriveKey = bip32.fromSeed(Buffer.from(keysJson.seedKey.prv)).derivePath(path)
        if(prvOrpub === 'prv'){
            console.log(deriveKey.privateKey.toString('hex'));
        }else if(prvOrpub === 'pub'){
            console.log(deriveKey.publicKey.toString('hex'));
        }else{
            return;
        }
    }

    /**
     * 通过导入助记词，来生成种子钱包
     * @param {*} mnemoic 
     * @param {*} password 
     */
    function importWalletByMnemonicJSON(mnemonicJsonPath, password) {
        if(!fs.existsSync(path.resolve(__dirname,mnemonicJsonPath))){
            console.log(chalk.red(mnemonicJsonPath+'该路径下的助记词文件不存在'))
            return;
        }
        if(path.extname(path.resolve(__dirname,mnemonicJsonPath)) !== '.json'){
            console.log(chalk.red('【文件类型错误】不是bitcoinjs系统的导出文件类型'))
            return
        }
        const mnemonicJson = JSON.parse(fs.readFileSync(path.resolve(__dirname,mnemonicJsonPath)))
        const mnemonic = mnemonicJson.mnemonic;
        if (mnemonic.split(' ').length !== 12)
            throw new Error('Except mnemoic length 12,got ' + mnemonic.split(' ').length)
        //判断密码是否正确
        const mnemonicHash = Cryptojs.SHA256(mnemonic+password).toString();
        if(mnemonicHash !== mnemonicJson.hash) {
            console.log('输入的密码错误，请重新输入');
            return;
        }
        
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const seedKeys = Key.createKeysBySeed(seed, password);
        const mKeys = bip32.fromSeed(Buffer.from(seedKeys.seedPrv));
        try {
            walletFormat(seedKeys, mKeys)
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * 将钱包路径导出
     */
    function backupWallet(backupPath){
        console.time("钱包导出中")
        const mnemonicPath = path.resolve(__dirname,'../mnemonic.json');
        if(!fs.existsSync(mnemonicPath)){
            console.log('HD Wallet is not exist')
            return;
        }
        backupPath = path.resolve(__dirname,backupPath+'/mnemonic.json');
        fs.writeFileSync(backupPath,fs.readFileSync(mnemonicPath))
        console.timeEnd("钱包导出中")
        console.log('已将钱包导出到：\n'+ backupPath)
    }
    /**
     * 获取主密钥
     * @returns 
     */
    function getMasterKeys(){
        const res =  getKeysPath();
        if(!res){
            console.log("密钥不存在");
            return;
            
        }
        console.log(res.seedKey);
    }
    /**
     * 解析获取存放的密钥信息
     * @returns 
     */
    function getKeysPath(){
        const keysPath = path.resolve(__dirname,'../keys.json');
        if(!fs.existsSync(keysPath)) {
            return;
        }
        const res = JSON.parse(fs.readFileSync(keysPath));
        return res;
    }
    /**
     * 获取主密钥
     * @returns 
     */
     function getMasterPublicKeys(){
        const res =  getKeysPath();
        if(!res){
            console.log("密钥不存在");
            return;
        }
        return res.masterKey.pub
    }

    /**
     * 查询当前地址余额
     * @param {*} UTXOPool 
     * @returns {Number}
     */
    function balance(UTXOPool){
        if(UTXOPool === undefined || UTXOPool.length == 0){
            return 0
        }
        const pubK = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../keys.json'))).masterKey.pub;
        const address = Address.getAddressByPub(pubK);
        if(address === undefined) return 0;
        let balance = 0;
        UTXOPool.forEach((utxo,i) => {
            if(utxo.txid === address){
                balance += utxo.value;
            }
        })
        return balance;
    }

    return {
        createWallet,
        importWalletByMnemonicJSON,
        getPubKeyByDerivePath,
        backupWallet,
        getMasterPublicKeys,
        getMasterKeys,
        balance
    }

}
module.exports = Wallet()