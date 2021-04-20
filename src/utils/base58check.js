const _Buffer = require('safe-buffer').Buffer
const Cryptojs = require('crypto-js')
//base58所包含的字符 与base64不同的是，其中去除了容易引起误解的字符如O和0、l和I、/ +
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Base58编码
 * 这是一个依照bitcoin中Base58Check编码实现的js版base58编码工具
 */
module.exports = Base58 = function () {
    //申请长度256的int8数组
    const BASE_MAP = new Uint8Array(256);
    //将BASE_MAP数组所有元素初始化为255
    for (let j = 0; j < BASE_MAP.length; j++) {
        BASE_MAP[j] = 255;
    }
    //将ALPHABET中的字符对应到索引
    for (let i = 0; i < ALPHABET.length; i++) {
        let x = ALPHABET.charAt(i);
        let xc = x.charCodeAt(0);
        if (BASE_MAP[xc] !== 255) throw new TypeError(x + 'is ambiguous')
        BASE_MAP[xc] = i;
    }


    let BASE = ALPHABET.length;
    let LEADER = ALPHABET.charAt(0);
    var FACTOR = Math.log(BASE) / Math.log(256) // log(BASE) / log(256), rounded up

    //iFACTOR数学含义
    //iFACTOR用于计算经过base58编码后，字符串所需要的空间大小
    //因为输出的每个字符都是从58个字符中选择出来的，及每一个字符代表的信息量为log(2)58
    //而我们输入的字节流长度是固定（byte_length * 8）bit = (byte_length * log(2)256)
    //需要预留的输出字符空间长度就为 (byte_length * log(2)256) / log(2)58 = byte_length * 1.37 + 1
    var iFACTOR = Math.log(256) / Math.log(BASE) // log(256) / log(BASE), rounded up

    /**
     * encode
     * @param {*} source 
     * @returns 
     */
    function encode(source) {
        //判断传入的source是否为Buffer
        if (Array.isArray(source) || source instanceof Uint8Array) source = _Buffer.from(source);
        if (!_Buffer.isBuffer(source)) throw new TypeError('Expected Buffer');
        if (source.length === 0) return '';

        let zeroes = 0;
        let length = 0;
        let pbegin = 0;
        let pend = source.length;

        //将pbegin定位到除开头为零的元素上
        while (pbegin !== pend && source[pbegin] === 0) {
            pbegin++;
            //对资源开头存在零进行计数
            zeroes++;
        }

        // Allocate enough space in big-endian base58 representation.
        //编码所得结果字符大小
        let size = Math.floor((pend - pbegin) * iFACTOR + 1);
        //申请字符空间大小为size的uint8字符数组
        let b58 = new Uint8Array(size);
        
        //遍历buffer中的每个元素（得到的会是对应十六进制转为十进制），将十进制转换为58进制
        while (pbegin !== pend) {
            let carry = source[pbegin]; //得到buffer中的值，这里得到的值为10进制。0x80 —> 128
            let i = 0;
            for (let it = size - 1; (carry !==  0 || i < length)
                && (it !== -1); it--, i++) {
                carry += Math.floor((256 * b58[it]));
                b58[it] = Math.floor((carry % BASE));
                carry = Math.floor((carry / BASE));
            }
            if (carry !== 0) throw new Error('Non-zero carry')

            length = i;
            pbegin++;
        }
        
        //跳过开头所有的为零的字符
        let it = size - length;
        while (it !== size && b58[it] === 0) {
            it++
        }
        //将开头为零的数量还原
        let str = LEADER.repeat(zeroes);
        while (it < size) {
            str += ALPHABET.charAt(b58[it]);
            ++it;
        }
        return str
    }

    /**
     * decodeUnsafe
     * @param {*} source 
     * @returns 
     */
    function decodeUnsafe(source) {
        if (typeof source !== 'string') throw new TypeError('Expected String');
        if (source.length === 0) return _Buffer.alloc(0);
        let psz = 0;
        // Skip leading spaces.
        if (source[psz] === ' ') return
        let zeroes = 0;
        let length = 0;
        // Skip and count leading '1's.
        while (source[psz] === LEADER) {
            zeroes++;
            psz++;
        }

        let size = (((source.length - psz) * FACTOR) + 1) >>> 0;
        let b256 = new Uint8Array(size);

        while (source[psz]) {
            let carry = BASE_MAP[source.charCodeAt(psz)];
            if (carry === 255) return
            let i = 0;
            for (let it = size - 1; (carry !== 0 || i < length) && (it !== -1); it--, i++) {
                carry += (BASE * b256[it]) >>> 0
                b256[it] = (carry % 256) >>> 0
                carry = (carry / 256) >>> 0
            }
            if (carry !== 0) throw new Error('Non-zero carry')
            length = i;
            psz++;
        }
        // Skip trailing spaces.
        if (source[psz] === ' ') return
        let it = size - length
        while (it !== size && b256[it] === 0) it++;
        let vch = _Buffer.allocUnsafe(zeroes + (size - it));
        vch.fill(0x00, 0, zeroes)
        let j = zeroes;
        while (it !== size) {
            vch[j++] = b256[it++]
        }
        return vch
    }

    /**
     * decode
     * @param {*} string 
     * @returns 
     */
    function decode(string) {
        var buffer = decodeUnsafe(string)
        if (buffer) {
            let privateSuffix = buffer.toString('hex').slice(-8);
            let privateKey = buffer.toString('hex').slice(0,-8);
            let checkPrefix = Cryptojs.SHA256(Cryptojs.SHA256(privateKey).toString()).toString().slice(0,8);
            if(checkPrefix === privateSuffix){
                return buffer 
            }else{
                throw new Error('Incorrect private key')
            }
            
        }
        throw new Error('Non-base' + BASE + ' character')
    }


    return {
        encode,
        decode,
        decodeUnsafe
    }
}()
