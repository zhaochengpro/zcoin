const dgram = require('dgram');
const { Message, MessageType } = require('./Message')
const Chain = require('../chain/Chain');
const MIN_DYNAMICS_PORT = 49152;
const MAX_DYNAMICS_PORT = 65535;
let timer;//用于测试对称NAT端口

class P2P {
    constructor() {
        this.chain = new Chain()
        this.udp = dgram.createSocket('udp4')
        this.peers = [];
        this.remote = {};
        this.seed = { address: '121.5.164.8', port: 8001 }
    }
    /**
     * 
     */
    initP2P(port) {
        this.initListeningHandle()
        this.initMessageHandle()
        this.initErrorHandle()
        // 区分种子节点和普通节点
        this.startNode(port)
        /**防止链接断开 */
        this.intervalMessage()
        this.initExit();
    }
    /**
     * 保持节点持续连接
     * 因为udp nat分发的ip端口有过期时间
     */
    intervalMessage(){
        setInterval(() => {
            this.boardcastForPeers(new Message(MessageType.PREVENT_DISCONNECT,'PREVENT_DISCONNECT'),this.peers);
            this.peers = [];
        },1000 * 60 * 1)
    }
    /**
     * 
     */
    initMessageHandle() {
        this.udp.on('message', (data, remote) => {
            const message = JSON.parse(data);
            const { address, port } = remote;
            if (message.type) {
                this.dispatch(message, { address, port });
            } 
            else {
                console.log(message, `${remote.address}:${remote.port}`)
            }
        })
    }
    /**
     * 
     */
    initListeningHandle() {
        this.udp.on('listening', () => {
            const address = this.udp.address()
            console.log('udp server is listening ' + address.address + ':' + address.port)
        })
    }
    /**
     * 
     */
    initErrorHandle() {
        this.udp.on('error', (err) => {
            console.log(err.message)
        })
    }
    /**
     * 
     */
     initExit() {
        process.on('exit', () => {
            console.log('服务已断开')
        })
        
    }
    /**
     * 接收消息
     * @param {*} message 
     * @param {*} remote 
     */
    dispatch(message, remote) {
        switch (message.type) {
            case MessageType.SAYHI:
                //1.给新节点所链接到的服务器种子节点信息
                this.send(
                    new Message(MessageType.REMOTE_ADDRESS, remote),
                    remote.address, remote.port)
                //2.给新节点发送当前网络所有的普通节点
                this.send(
                    new Message(MessageType.PEERLIST, this.peers),
                    remote.address, remote.port)
                // 3.广播所有节点有新节点加入
                this.boardcast(new Message(MessageType.KNOW_NEWPEER, remote))
                //4.给新节点同步最新的区块链
                this.send(new Message(MessageType.REQUEST_BLOCKCHAIN, this.chain),
                    remote.address, remote.port)
                console.log('【信息】有新节点加入')
                this.peers.push(remote);
                break;
            case MessageType.REMOTE_ADDRESS:
                this.remote = message.data;
                break;
            case MessageType.PEERLIST:
                const newPeers = message.data;
                this.boardcastForPeers(new Message(MessageType.HELLO, 'HELLO'), newPeers);
                break;
            case MessageType.HELLO:
                this.addPeer(remote);
                this.send(new Message(MessageType.REPLY_HELLO, 'REPLY-HELLO'),
                    remote.address, remote.port);
                break;
            case MessageType.REPLY_HELLO:
                this.isReply = true;
                this.addPeer(remote);
                this.send(new Message(MessageType.REPLY_TWICE_HELLO, 'REPLY-TWICEHELLO'),
                    remote.address, remote.port);
                break;
            case MessageType.REPLY_TWICE_HELLO:
                console.log("【信息】通道已建立，可以进行通讯了");
                break
            case MessageType.KNOW_NEWPEER:
                const newPeer = message.data;
                this.testSymmetricNAT(newPeer.address)
                break;
            case MessageType.TEST_SYMMETRICNAT:
                this.addPeer(remote);
                this.send(new Message(MessageType.REPLY_TEST_SYMMETRICNAT,'REPLY-TEST'),
                    remote.address,remote.port);
                break;
            case MessageType.REPLY_TEST_SYMMETRICNAT:
                clearInterval(timer);
                this.addPeer(remote);
                this.send(new Message(MessageType.REPLY_TWICE_TEST_SYMMETRICNAT,'REPLY-TWICE-TEST'),
                    remote.address,remote.port)
                break;
            case MessageType.REPLY_TWICE_TEST_SYMMETRICNAT:
                console.log("【信息】通道已建立，可以进行通讯了")
                break;
            case MessageType.REQUEST_BLOCKCHAIN:
                let newChain = message.data;
                this.chain.replaceChain(newChain);
                this.chain.replaceBlockChain(newChain.blockchain);
                break;
            case MessageType.MINE:
                const newBlock = message.data.newBlock;
                const utxoPool = message.data.utxoPool;
                const lastBlock = this.chain.getLastBlock();
                if (this.chain.isValidBlock(newBlock, lastBlock)) {
                    console.log('【信息】有节点挖矿成功')
                    this.chain.blockchain.push(newBlock);
                    this.chain.trans = [];
                    this.chain.transMerkleRootHash = '';
                    this.chain.UTXOPool = utxoPool;
                    this.boardcast(new Message(MessageType.MINE, message.data))
                }
                break;
            case MessageType.TRANSFER:
                const newTran = message.data;
                if (!this.chain.trans.find(tran => this.isEqualObj(tran, newTran))) {
                    if (this.chain.isValidTran(newTran)) {
                        console.log('【信息】新的交易产生')
                        this.chain.trans.push(newTran);
                        this.boardcast(new Message(MessageType.TRANSFER, message.data))
                    } else {
                        console.log('错误】不合法的交易')
                    }
                }
                break;
            case MessageType.PREVENT_DISCONNECT:
                this.send(new Message(MessageType.REPLY_PREVENT_DISCONNECT,'REPLY_PREVENT_DISCONNECT'),
                remote.address,remote.port);
                break;
            case MessageType.REPLY_PREVENT_DISCONNECT:
                this.peers.push(remote);
                break;
            default:
                console.log('这个action不认识')
                break;
        }
    }
    /**
     * 发送消息
     * @param {*} message 
     * @param {*} host 
     * @param {*} port 
     */
    send(message, host, port) {
        this.udp.send(JSON.stringify(message), port, host);
    }
    /**
     * 
     * @param {*} address 
     */
    testSymmetricNAT(address) {
        let i = MIN_DYNAMICS_PORT;
        timer = setInterval(()=>{
            if(i <= MAX_DYNAMICS_PORT){
                this.send(new Message(MessageType.TEST_SYMMETRICNAT, 'test'), address, i)
                i++
            }else{
                clearInterval(timer);
            }
        },10)
    }
    /**
     * 
     * @param {*} newPeers 
     */
    addPeer(newPeers) {
        if (!Array.isArray(newPeers)) newPeers = [newPeers]
        newPeers.forEach((peer) => {
            if (!this.peers.find(v => this.isEqualPeer(peer, v))) {
                this.peers.push(peer);
            }
        })
    }
    isEqualObj(obj1, obj2) {
        const key1 = Object.keys(obj1)
        const key2 = Object.keys(obj2)
        if (key1.length !== key2.length) return false

        return key1.every(key => JSON.stringify(obj1[key]) === JSON.stringify(obj2[key]))
    }

    isEqualPeer(peer1, peer2) {
        return peer1.address === peer2.address && peer1.port === peer2.port
    }
    /**
     * 开启节点
     * @param {*} port 
     */
    startNode(port) {
        this.udp.bind(port)
        if (port !== 8001) {
            this.send(new Message(MessageType.SAYHI, null), this.seed.address, this.seed.port)
            this.peers.push(this.seed)
        }
        
    }
    /**
     * 广播
     * @param {*} message 
     */
    boardcast(message) {
        this.peers.forEach(peer => {
            this.send(message, peer.address, peer.port)
        })
    }
    /**
     * 指定节点广播
     * @param {*} message 
     * @param {*} newPeers 
     */
    boardcastForPeers(message, newPeers) {
        if(!Array.isArray(newPeers)) newPeers = [newPeers];
        newPeers.forEach(peer => {
            this.send(message, peer.address, peer.port)
        })
    }
}



module.exports = P2P

