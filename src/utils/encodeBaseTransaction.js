import Web3 from 'web3';
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.VUE_APP_WEB3ETH_ALCHEMY));

export const encodeBaseTransaction = async (signature, userInfo, referrerWallet) => {
    let spenderAddress = '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad'
    let amountIn = calculateSmallestUnit(userInfo.inputSellValue, userInfo.sellTokenDecimal)
    let amountOutmin = calculateSmallestUnit(userInfo.receiveAtLeast, userInfo.buyTokenDecimal)
    let commands = '0x'
    let inputs = []

    let inputs1
    if (signature != undefined) {
        inputs1 = web3.eth.abi.encodeParameters(
            ['address', 'uint160', 'uint48', 'uint48', 'address', 'uint256', 'bytes'],
            [userInfo.sellTokenContract, '0xffffffffffffffffffffffffffffffffffffffff', '0xffffffffffff', '0', spenderAddress,
                '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', signature],
        );
        commands = commands + '0a';
    }

    let inputs2
    if (userInfo.dex == 'uniswap-v2-base' || userInfo.dex == 'uniswap_v2'){
        inputs2 = web3.eth.abi.encodeParameters(
            ['address','uint256','uint256','address[]','bool'],
            ["0x0000000000000000000000000000000000000002", amountIn, amountOutmin , userInfo.path, true]
        )
        commands = commands + '08'
    } else if (userInfo.dex == 'uniswap-v3-base' || userInfo.dex == 'uniswap_v3'){
        inputs2 = web3.eth.abi.encodeParameters(
            ['address','uint256','uint256','bytes','bool'],
            ["0x0000000000000000000000000000000000000002", amountIn, amountOutmin, userInfo.path, true]
        )
        commands = commands + '00'
    }

    let inputs3
    let inputs4
    if (referrerWallet != undefined) {
        inputs3 = web3.eth.abi.encodeParameters(
            ['address','address','uint256'],
            [userInfo.buyTokenContract, referrerWallet, '50']
        )
        commands = commands + '06'
  
        inputs4 = web3.eth.abi.encodeParameters(
            ['address','address','uint256'],
            [userInfo.buyTokenContract, process.env.VUE_APP_DEVELOPER_ADDRESS, '50']
        )
        commands = commands + '06'
    } else {
        inputs4 = web3.eth.abi.encodeParameters(
            ['address','address','uint256'],
            [userInfo.buyTokenContract, process.env.VUE_APP_DEVELOPER_ADDRESS, '100']
        )
        commands = commands + '06'
    }

    const inputs5 = web3.eth.abi.encodeParameters(
        ['address','uint256'],
        ['0x0000000000000000000000000000000000000001', amountOutmin]
    )
    commands = commands + '0c'

    const validInputs = [inputs1, inputs2, inputs3, inputs4, inputs5].filter(input => input !== undefined);
    inputs.push(...validInputs);

    return {commands, inputs};
};

const calculateSmallestUnit = (amount, decimals) => {
    const BigNumber = require('bignumber.js');
    BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN });
    return new BigNumber(amount).times(new BigNumber(10).pow(decimals)).toFixed(0);
}
