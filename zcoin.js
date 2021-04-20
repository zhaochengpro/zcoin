const vorpal = require('vorpal')();
const fs = require('fs')
const http = require('http')
const path = require('path')
const Table = require('cli-table')
const Wallet = require('./src/wallet/wallet')
const chalk = vorpal.chalk;
const Address = require('./src/wallet/address')
const P2P = require('./src/net/p2p')
const { Message, MessageType } = require('./src/net/Message')
const p2p = new P2P();
const chain = p2p.chain;
const port = Number(process.argv[2]) || 0
p2p.initP2P(port)

// 格式化命令行输出结果
function formatLog(data) {
  if (!data || data.length === 0) return
  if (!Array.isArray(data)) {
    data = [data]
  }

  const first = data[0]
  const head = Object.keys(first)
  // instantiate
  const table = new Table({
    head: head,
    colWidths: new Array(head.length).fill(35)
  })

  const res = data.map(v => {
    return head.map(h => JSON.stringify(v[h], null, 1))
  })

  table.push(...res)
  console.log(table.toString())
}


vorpal.log(chalk.magenta('Bitcoinjs@v0.0.1 is a similar bitcoin system run at nodejs'))
vorpal.log(chalk.green(`
      ########################################################################

              ##############                                #######
                        ###                               ##
                      ###                                ##
                    ###                                 ##
                  ###                                    ##
                ###                                       ##
              ##############                                #######

      ########################################################################
`))


/**
 * 创建钱包
 * 
 * privatekey.js
 * 1、通过bip39生成助记词（助记词将存储在本地mnemonic.json文件中，助记词与bip38编码所需的密码会进行hash计算也一同储存在mnemonic.json文件中）
 * 2、将助记词转换为256位随机数,取左128位为私钥随机数
 * 3、将随机数前加08表示私钥标识符
 * 4、对以上3结果进行两次哈希计算，得到的hash值取前四位作为校验码加到3结果后面
 * 5、将4得到的结果进行base58编码，编码后的值是以5开头的编码
 * 6、对5生成的编码在进行bip38编码（通过添加密码对数据进行加密编码）得到以6开头的编码
 * keys.js
 * 通过前面生成的私钥随机数来获得对应的公钥
 * 这也我们就可以得到种子私钥和对应的公钥
 * wallet.js HD wallet生成
 * 通过上面的种子私钥，可以通过bip32来生成我们的master keys 主密钥对
 * 将我们的主密钥对与种子私钥对一同存储在本地keys.json文件中，等待使用
 * 
 */
vorpal
  .command('createWallet <password>', '创建钱包 <私钥加密密码（密码不能为纯数字）>')
  .action(function (args, callback) {
    if (fs.existsSync(path.resolve(__dirname, './src/keys.json'))) {
      return this.prompt({
        type: 'confirm',
        name: 'continue',
        default: false,
        message: 'HD wallet already exists. Continue?',
      }, function (result) {
        if (result.continue) {
          Wallet.createWallet(args.password);
        }
      });
    } else {
      Wallet.createWallet(args.password);
    }
    callback();
  });

/**
 * 备份钱包
 * 将我们项目创建的mnemonic.json文件生成到用户指定的路径下。以便用户导出使用
 */
vorpal
  .command('backupWallet <path>', '备份钱包 <钱包导出路径>')
  .action((args, callback) => {
    Wallet.backupWallet(args.path);
    callback();
  });

/**
 * 导入钱包
 * 通过将我们导出的json文件导入，可以得到我们的keys.json文件，其中储存着我们的种子密钥对和主密钥对
 * 导入的时候，我们会将助记词与用户输入的密码进行hash计算，并与mnemonic.json文件下的hash值对比，看是否相等。
 */
vorpal
  .command('importWalletByMnemonicJson <mnemonicaJsonPath> <password>', '通过助记词导入钱包 <助记词文件> <钱包密码>')
  .action((args, callback) => {
    Wallet.importWalletByMnemonicJSON(args.mnemonicaJsonPath, args.password)
    callback();
  })
/**
 * 获得主公钥
 */
vorpal
  .command('getPublicKey', '获得主公钥')
  .action((args, callback) => {
    console.log(Wallet.getMasterPublicKeys());
    callback();
  })
/**
 * 获得主密钥对
 */
vorpal
  .command('getKey', '获得主密钥对')
  .action((args, callback) => {
    Wallet.getMasterKeys();
    callback();
  })

/**
 * 获取HD钱包的某个路径的子密钥 
 * <路径，eg:m/0'+'/0>,<选择获取的是prv还是pub，prv输入：prv，pub输入pub>
 */
vorpal
  .command('getSubKeyByHDWallet <hdpath> <prvOrpub>', '获取HD钱包的某个路径的子密钥 <路径，eg:m/0' + '/0>' +
    ',<选择获取的是私钥还是公钥，私钥输入prv，公钥输入pub>\n\n---------------------------------------------------------\n')
  .action((args, callback) => {
    Wallet.getPubKeyByDerivePath(args.hdpath, args.prvOrpub);
    callback();
  })
//============================//============================//============================//============================//============================//============================
/**
 * 获得主密钥对
 */
vorpal
  .command('getAddressByPub <pub>', '获取bitcoinjs地址 <公钥>\n\n---------------------------------------------------------\n')
  .action((args, callback) => {
    const address = Address.getAddressByPub(args.pub);
    console.log(address)
    callback();
  })


/**
 * 挖矿
 */
vorpal
  .command('chain', '查看区块链')
  .action((args, callback) => {
    formatLog(chain.blockchain)
    callback()
  })




vorpal
  .command('mine', '挖矿 生成新的区块')
  .action((args, callback) => {
    let newGenerateBlock = this.chain.mine();
    let lastUTXOPool = this.chain.UTXOPool;
    this.boardcast(new Message(MessageType.MINE, {
        newBlock:newGenerateBlock,
        utxoPool:lastUTXOPool
    }));
    callback();
  })


vorpal
  .command('transfer <to> <amount>', '转账 <接收方公钥> <金额>')
  .action((args, callback) => {
    const keys = JSON.parse(fs.readFileSync(path.resolve(__dirname, './src/keys.json')));
    const from = keys.masterKey.pub;
    const transcation = chain.transfer(from, args.to, args.amount);
    p2p.boardcast(new Message(MessageType.TRANSFER, transcation))
    formatLog(chain.trans)
    callback()
  })
vorpal
  .command('balance', '查看地址余额')
  .action((args, callback) => {
    let keys = Wallet.getMasterPublicKeys();
    let balance = Wallet.balance(chain.UTXOPool);
    console.log("当前账户：" + keys + ",余额为：" + balance)
    callback()
  })
vorpal
  .command('peers', '查看节点列表')
  .action((args, callback) => {
    formatLog(p2p.peers)
    callback()
  })
vorpal
  .command('utxopool', '查看未花费池')
  .action((args, callback) => {
    formatLog(p2p.chain.UTXOPool)
    callback()
  })
vorpal
  .command('pending', '待打包的交易')
  .action((args, callback) => {
    formatLog(p2p.chain.trans)
    callback()
  })
// vorpal
//   .command('send <message> <address> <port>', '待打包的交易')
//   .action((args, callback) => {
//     p2p.send(args.message, args.address, args.port)
//     callback()
//   })

function searchNetWork() {
  let dot = 0;
  if (port !== 8001) {
    let timer = setInterval(function () {
      dot++
      if (dot <= 3) {
        vorpal.ui.redraw('搜寻节点中' + '.'.repeat(dot));
      } else {
        dot = 0;
      }
      if (dot == 3) {
        if (p2p.peers.length >= 2) {
          clearInterval(timer)
          vorpal.ui.redraw.clear()
          console.log('成功连接节点')
          dot = 0
          let timer1 = setInterval(() => {
            dot++;
            if (dot <= 3) {
              vorpal.ui.redraw('同步区块链中' + '.'.repeat(dot));
            } else {
              dot = 0;
            }
            if (p2p.chain.blockchain.length > 1) {
              clearInterval(timer1)
              vorpal.ui.redraw.clear()
              dot = 0;
              console.log('区块链同步成功')
            }
          }, 700)
        }
      }

    }, 700);
  }
}
searchNetWork();
vorpal.exec('help')
vorpal
  .delimiter('bitcoinjs$')
  .show();
