<template>
  <div v-if="isLoading" class="loading-container">
    <div class="spinner"></div>
  </div>
  <div v-else>
  <div class="container-popup">
    <div class="wrapper">
      <div v-if="userInfo" class="buy-popup">
        <div class="custom-input">
          <input v-model="userInfo.inputSellValue" placeholder="0" @keydown="handleKeydown" @input="handleInput($event)" type="number" pattern="^[0-9]*[.,]?[0-9]*$" minlength="1"/>
          <div class="dropdown-selected">
            <div class="dropdown-icon">
              <div class="logo" :style="avatarStyleSellToken"></div>
            </div>
            <span>{{userInfo.sellTokenSymbol}}</span>
          </div>
        </div>
        <div v-if="addressFromStore != null" class="right-section">
          <div class="balance">
            Balance: {{formatBalance(userInfo.sellTokenBalances)}}
          </div>
          <div v-if="parseFloat(userInfo.sellTokenBalances) > 0.001" @click="fillMax()">
            <div style="color: green;">MAX</div>
          </div>
        </div>
      </div>

      <div class="arrow-container" @click="switchBuyAndSell()">
        <img src="@/assets/images/swap_1.png" alt="Arrow" class="arrow-icon">
      </div>

      <div v-if="userInfo" class="sell">
        <div class="custom-input">
          <input type="tel" v-model="userInfo.buyAmountToEther" placeholder="0" disabled/>
          <div class="dropdown-selected">
            <div class="dropdown-icon">
              <div class="logo" :style="avatarStyleBuyToken"></div>
            </div>
            <span>{{ userInfo.buyTokenSymbol }}</span>
          </div>
        </div>
        <div v-if="addressFromStore != null" class="right-section">
          <div class="balance">
            Balance: {{formatBalance(userInfo.buyTokenBalances)}}
          </div>
        </div>
      </div>
    </div>
    <div class="wrapper-exchange">
      <div v-if="userInfo.inputSellValue" class="exchange-rate">
        <div class="swap-details-header">
            <button class="trade-price">
                <span v-if="!userInfo.tokenRate && quoteError == false" class="trade-price-value">Fetching best price...</span>
                <span v-if="userInfo.tokenRate && quoteError == false" class="trade-price-value">{{ userInfo.tokenRate }}</span>
                <span v-if="quoteError == true" class="trade-price-value">No quote found</span>
            </button>
        </div>
      </div>
    </div>

    <button id="swap-button" v-if="addressFromStore == undefined || addressFromStore == ''" @click="connectWallet">Connect</button>

    <button class="wallet-info" v-if="addressFromStore != undefined && addressFromStore != ''">
      <img v-if="tokenInfo.network == 'base'" src="@/assets/images/network/base.png" alt="Base Icon" class="network-icon" />
      <img v-if="tokenInfo.network == 'eth'" src="@/assets/images/network/ethereum.png" alt="Ethereum Icon" class="network-icon" />
      <span>{{ getShortAddress(addressFromStore) }}</span>
    </button>

    <button v-if="addressFromStore != null" id="swap-button" class="swap-btn" @click="openConfirmModal()" :disabled="!userInfo.buyAmountToEther ||  userInfo.isBalanceInsufficient">
      <div v-if="userInfo.isBalanceInsufficient">No Enough Balance</div>
      <div v-else>Swap</div>
    </button>

    <div v-if="addressFromStore != null" class="dex-info-container" @click="showPopupSlippage()">
      <div class="dex-info-fee-container">
        <div class="left-text">Slippage</div>
        <div class="right-text">{{userInfo.slippage}}% ></div>
      </div>
    </div>

    <van-popup v-model:show="showSlippage" round position="bottom" closeable close-icon-position="top-left" :duration="0" :style="{ height: '30%' }" @close="handleSlippagePopupClose(slippageValue)">
      <van-nav-bar title="Setting" />
      <div class="slippage-content">
        <div class="slippage-item">
          <span class="custom-label">Custom</span>
          <div class="input-wrapper">
            <van-field
              v-model="slippageValue"
              type="number"
              placeholder="0"
              :border="false"
              input-align="right"
            >
              <template #right-icon>
                <span class="percentage">%</span>
              </template>
            </van-field>
          </div>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="show" round position="bottom" closeable close-icon-position="top-left" :duration="0" :style="{ height: '80%' }" @closed="handlePopupClosed">
        <van-nav-bar title="Confirm" />
            <div class="swap-modal-content">
                <div class="swap-details">
                    <div class="swap-detail">
                        <span class="swap-label">You pay</span>
                        <div class="swap-value-container">
                            <span class="swap-value">{{formatNumber(userInfo.inputSellValue)}} {{userInfo.sellTokenSymbol}} </span>
                            <div class="transaction-icon-buy" :style="avatarStyleSellToken"></div>
                        </div>
                    </div>
                    <div class="swap-detail">
                        <span class="swap-label">You receive</span>
                        <div class="swap-value-container">
                            <span class="swap-value">{{formatNumber(userInfo.buyAmountToEther)}} {{userInfo.buyTokenSymbol}} </span>
                            <div class="transaction-icon-buy" :style="avatarStyleBuyToken"></div>
                        </div>
                    </div>
                </div>
                <div class="swap-info">
                    <span class="swap-label">Rate</span>
                    <span class="swap-value-1">{{userInfo.tokenRate}}</span>
                </div>
                <div class="swap-info">
                    <span class="swap-label">Max. slippage</span>
                    <span class="swap-value-1">{{userInfo.slippage}}%</span>
                </div>
                <div class="swap-info">
                    <span class="swap-label">Receive at least</span>
                    <span class="swap-value-1">{{ formatNumber(userInfo.receiveAtLeast) }} {{userInfo.buyTokenSymbol}}</span>
                </div>
                <div class="swap-info">
                    <span class="swap-label">Fee</span>
                    <span class="swap-value-1">1%</span>
                </div>
            </div>
            <footer v-if="userInfo.sellTokenSymbol == 'ETH'" class="swap-modal-footer">
              <button 
                class="swap-confirm-btn" 
                @click="!isTransactionSent && openETHProgressModal()"
                :disabled="isTransactionSent"
              >
                <template v-if="!isTransactionSent">
                  Confirm Swap
                </template>
                <template v-else>
                  <div class="spinner-container">
                    <span class="swap-spinner"></span>
                  </div>
                  </template>
              </button>
            </footer>
            <footer v-if="userInfo.sellTokenSymbol != 'ETH'" class="swap-modal-footer">
              <button 
                class="swap-confirm-btn" 
                @click="!isTransactionSent && openTokenProgressModal()"
                :disabled="isTransactionSent"
              >
                <template v-if="!isTransactionSent">
                  Approve and Swap
                </template>
                <template v-else>
                  <div class="spinner-container">
                    <span class="swap-spinner"></span>
                  </div>
                  </template>
              </button>
            </footer>

            <van-dialog
              v-model:show="isTransactionSuccess"
              title="Success"
              show-cancel-button
              cancel-button-text="Cancel"
              confirm-button-text="Confirm"
              :close-on-click-overlay="false"
              @cancel="handleSuccessTransactionClosed"
              @confirm="handleConfirm"
            >
              <div class="custom-content">
                <p class="share-text">Share to Warpcast</p>
              </div>
            </van-dialog>
            <van-dialog
              v-model:show="isTransactionFail"
              title="Failure"
              show-cancel-button
              cancel-button-text="Cancel"
              confirm-button-text="Confirm"
              :close-on-click-overlay="false"
            >
              <div class="custom-content">
                <p class="share-text">Please Increase Slippage</p>
              </div>
            </van-dialog>
    </van-popup>
  </div>
</div>

</template>

<script>
  import { formatAddress,formatNumber,getShortAddress,formatBalance } from '@/utils/utils.js';
  import {  ref,reactive,computed, onMounted,watch } from 'vue';
  import { useStore } from 'vuex'
  import { Alchemy, Network } from "alchemy-sdk";
  import _ from 'lodash';
  const { ethers } = require('ethers');
  import BigNumber from 'bignumber.js';
  import {encodeETHTransaction} from '@/utils/encodeETHTransaction.js'
  import {encodeBaseTransaction} from '@/utils/encodeBaseTransaction.js'
  import Web3 from 'web3';
  import { config } from '../config'
  import { switchChain } from '@wagmi/core'
  import permit2 from '@/abis/permit2.json';
  import {AllowanceTransfer} from '@uniswap/permit2-sdk';
  import { _TypedDataEncoder } from '@ethersproject/hash'
  import { v4 as uuidv4 } from 'uuid';

  const CHAIN_CONFIG = {
    base: {
      web3Provider: process.env.VUE_APP_WEB3BASE_ALCHEMY,
      ETH_ADDRESS: '0x4200000000000000000000000000000000000006',
      USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      alchemySettings: {
        apiKey: process.env.VUE_APP_WEB3ALCHEMY_API,
        network: Network.BASE_MAINNET,
      }
    },
    eth: {
      web3Provider: process.env.VUE_APP_WEB3ETH_ALCHEMY,
      ETH_ADDRESS: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      USDC_ADDRESS: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      alchemySettings: {
        apiKey: process.env.VUE_APP_WEB3ALCHEMY_API,
        network: Network.ETH_MAINNET,
      }
    }
  };


  const DECIMAL_TO_UNIT = {
    6: 'mwei',
    9: 'gwei',
    18: 'ether'
  };
  
  export default {
    props: {
      referrer: {
      },
      token: {
        type: Object,
      },
      pool: {
        type: Object,
      },
      network:{},
    },
    data() {
      return {
        dexInfo:'',
        show:false,
        quoteError: false,
        isTransactionSent:false,
        isTransactionSuccess:false,
        isTransactionFail:false,
      }
    },
    setup(props) {
      const store = useStore();
      const isLoading = ref(true);
      const showSlippage = ref(false);
      let tokenInfo = ref();
      let poolInfo = ref();
      let chainConfig = ref();
      let alchemy = ref();
      let web3 = ref();
      let isETH = ref();

      const userInfo = reactive({});
      const tokenListInfo = reactive({ eth: '', usdc: '' });

      const referrerWallet = computed(() => props.referrer);
      const addressFromStore = computed(() => store.state.address);
      const isConnected = computed(() => store.state.isConnected);
      const deviceType = ref(null);

      const getTokenBalances = async () => {
        if (!addressFromStore.value) return;

        let buyTokenBalances, sellTokenBalances;

        if (isETH.value) {
          [buyTokenBalances, sellTokenBalances] = await Promise.all([
            alchemy.value.core.getBalance(addressFromStore.value),
            alchemy.value.core.getTokenBalances(addressFromStore.value, [chainConfig.value.USDC_ADDRESS])
          ]);
        } else {
          [buyTokenBalances, sellTokenBalances] = await Promise.all([
            alchemy.value.core.getTokenBalances(addressFromStore.value, [tokenInfo.value.attributes.address]),
            alchemy.value.core.getBalance(addressFromStore.value)
          ]);
        }

        return { buyTokenBalances, sellTokenBalances };
      };

      const formatBalance = (balance, decimals) => {
        const hexBalance = balance.tokenBalances?.[0]?.tokenBalance ?? balance;
        const decimalBalance = web3.value.utils.hexToNumberString(hexBalance);
        return web3.value.utils.fromWei(decimalBalance, DECIMAL_TO_UNIT[decimals] || 'ether');
      };

      const updateUserInfo = async () => {
        if (addressFromStore.value != undefined) {
          const { buyTokenBalances, sellTokenBalances } = await getTokenBalances();
          userInfo.buyTokenBalances_raw = isETH.value ? buyTokenBalances : buyTokenBalances.tokenBalances[0].tokenBalance;
          userInfo.sellTokenBalances_raw = isETH.value ? sellTokenBalances.tokenBalances[0].tokenBalance : sellTokenBalances;
          userInfo.buyTokenBalances = formatBalance(buyTokenBalances, tokenInfo.value.attributes.decimals);
          if (isETH.value) {
            const balance = ethers.toBigInt(sellTokenBalances.tokenBalances[0].tokenBalance);
            userInfo.sellTokenBalances = web3.value.utils.fromWei(balance.toString(), 'mwei');
          } else {
            const balanceString = sellTokenBalances.toString();
            const balanceBigInt = ethers.toBigInt(balanceString);
            userInfo.sellTokenBalances = ethers.formatEther(balanceBigInt);
          }

          userInfo.buyTokenSymbol = isETH.value ? 'ETH' : tokenInfo.value.attributes.symbol;
          userInfo.sellTokenSymbol = isETH.value ? 'USDC' : 'ETH';
          userInfo.buyTokenContract = tokenInfo.value.attributes.address;
          userInfo.sellTokenContract = isETH.value ? chainConfig.value.USDC_ADDRESS : chainConfig.value.ETH_ADDRESS;
          userInfo.buyTokenDecimal = tokenInfo.value.attributes.decimals;

          userInfo.sellTokenDecimal = isETH.value ? 6 : 18;
          userInfo.buyTokenImage = isETH.value ? 'eth.png' : tokenInfo.value.attributes.image_url;
          userInfo.sellTokenImage = undefined
          userInfo.slippage = 1;
          userInfo.dex = poolInfo.value.relationships.dex.data.id;

          if (Number(userInfo.buyTokenBalances) < 0.01) {
            userInfo.buyTokenBalances = '0';
          }
        }
      };

      const fetchTokenInfo = async (network, token) => {
        try {
          const url = `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${token}`;
          const priceUrl = `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${token}/pools`;

          const options = {
            method: 'GET',
            headers: {accept: 'application/json', 'x-cg-pro-api-key': process.env.VUE_APP_COINGECKO_API}
          };

          let response, response1;
          [response, response1] = await Promise.all([
            fetch(url,options),
            fetch(priceUrl,options)
          ]);
          let result = await response.json();
          let result1 = await response1.json();
          tokenInfo.value = result.data;
          poolInfo.value = result1.data[0];
          tokenInfo.value.network = network
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      onMounted(async () => {
        try {
          if (props.network == 'eth' || props.network == 'base') {
            await fetchTokenInfo(props.network, props.token)
          } else {
            tokenInfo.value =  props.token
            poolInfo.value = props.pool
          }

          chainConfig.value = CHAIN_CONFIG[tokenInfo.value.network];
          alchemy.value = new Alchemy(chainConfig.value.alchemySettings);
          web3.value = new Web3(new Web3.providers.HttpProvider(chainConfig.value.web3Provider));
          isETH.value = tokenInfo.value.attributes.address === chainConfig.value.ETH_ADDRESS;

          if (addressFromStore.value) {
            await updateUserInfo();
          } else {
            userInfo.buyTokenSymbol = isETH.value ? 'ETH' : tokenInfo.value.attributes.symbol;
            userInfo.sellTokenSymbol = isETH.value ? 'USDC' : 'ETH';
            userInfo.buyTokenImage = isETH.value ? 'eth.png' : tokenInfo.value.attributes.image_url;
            userInfo.sellTokenContract = isETH.value ? chainConfig.value.USDC_ADDRESS : chainConfig.value.ETH_ADDRESS;
            userInfo.buyTokenContract = tokenInfo.value.attributes.address;
            userInfo.sellTokenDecimal = isETH.value ? 6 : 18;
            userInfo.buyTokenDecimal = tokenInfo.value.attributes.decimals;
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          isLoading.value = false;
        }
      });

      watch(() => store.state.address, updateUserInfo);

      const avatarStyleBuyToken = computed(() => {
        if (userInfo.buyTokenImage === 'missing.png') {
          return { backgroundImage: `url(${require('@/assets/images/missing-icon.png')})` };
        } else if (userInfo.buyTokenImage === 'eth.png') {
          return { backgroundImage: `url(${require('@/assets/images/token/ethereum.png')})` };
        } else {
          return { backgroundImage: `url(${userInfo.buyTokenImage})` };
        }
      });

      const avatarStyleSellToken = computed(() => {
        if (userInfo.sellTokenImage == undefined) {
          return { backgroundImage: `url(${require(`@/assets/images/token/${userInfo.sellTokenSymbol === 'ETH' ? 'ethereum' : 'USDC'}.png`)})` };
        }  else if(userInfo.sellTokenImage == 'missing.png') {
          return { backgroundImage: `url(${require('@/assets/images/missing-icon.png')})` };
        } else if(userInfo.sellTokenImage == 'eth.png') {
          return { backgroundImage: `url(${require('@/assets/images/token/ethereum.png')})` };
        } else {
          return { backgroundImage: `url(${userInfo.sellTokenImage})` };
        }
      });

      const showPopupSlippage = () => {
        showSlippage.value = true;
      };

      const handleSlippagePopupClose = (slippageValue) => {
        if (slippageValue && slippageValue > 0 && slippageValue < 50) {
          userInfo.slippage = slippageValue;
        }
      };

      const themeVars = reactive({
        navBarIconColor: '#000000',
        navBarTextColor: '#000000',
        navBarTitleMaxWidth: 'auto',
      });

      return {
        referrerWallet,
        tokenInfo,
        poolInfo,
        tokenListInfo,
        isLoading,
        addressFromStore,
        isConnected,
        userInfo,
        avatarStyleSellToken,
        avatarStyleBuyToken,
        showSlippage,
        showPopupSlippage,
        handleSlippagePopupClose,
        updateUserInfo,
        deviceType,
        web3,
        themeVars
      };
    },
    methods: {
      async fillMax() {
        try {
          this.userInfo.inputSellValue = Number(this.userInfo.sellTokenBalances) - 0.001
          this.handleInput({ target: { value: this.userInfo.inputSellValue.toString() } });
        }catch (error) {
            console.error(error);
        }
      },
      handleInput: _.debounce(async function(event) {
          const inputValue = parseFloat(event.target.value);
          this.processInput(inputValue);
      }, 1000),
      async processInput(inputValue) {
        let inputValueUint = ethers.parseUnits(inputValue.toString(), this.userInfo.sellTokenDecimal)

        try {
          this.dexInfo = await this.getPrice(this.userInfo.buyTokenContract, this.userInfo.sellTokenContract, inputValueUint)
          this.userInfo.buyAmountToEther = ethers.formatUnits(this.dexInfo.buyAmount.toString(), this.userInfo.buyTokenDecimal);
          this.userInfo.tokenRate = `1 ${this.userInfo.sellTokenSymbol} = ${formatNumber(this.dexInfo.price)} ${this.userInfo.buyTokenSymbol}`
          this.userInfo.isBalanceInsufficient = parseFloat(this.userInfo.sellTokenBalances) <= parseFloat(inputValue);
        } catch{
          this.quoteError = true
        }
      },
      async switchBuyAndSell() {
        if (this.addressFromStore != undefined) {
          const tempBalances = this.userInfo.buyTokenBalances;
          this.userInfo.buyTokenBalances = this.userInfo.sellTokenBalances;
          this.userInfo.sellTokenBalances = tempBalances;

          const tempSymbol = this.userInfo.buyTokenSymbol;
          this.userInfo.buyTokenSymbol = this.userInfo.sellTokenSymbol;
          this.userInfo.sellTokenSymbol = tempSymbol;

          const tempContract = this.userInfo.buyTokenContract;
          this.userInfo.buyTokenContract = this.userInfo.sellTokenContract;
          this.userInfo.sellTokenContract = tempContract;

          const tempDecimal = this.userInfo.buyTokenDecimal;
          this.userInfo.buyTokenDecimal = this.userInfo.sellTokenDecimal;
          this.userInfo.sellTokenDecimal = tempDecimal;

          const tempBalances_raw = this.userInfo.buyTokenBalances_raw;
          this.userInfo.buyTokenBalances_raw = this.userInfo.sellTokenBalances_raw;
          this.userInfo.sellTokenBalances_raw = tempBalances_raw;

          if (this.userInfo.buyTokenSymbol == 'ETH') {
            this.userInfo.sellTokenImage = this.userInfo.buyTokenImage
            this.userInfo.buyTokenImage = 'eth.png'
          } else {
            this.userInfo.buyTokenImage = this.userInfo.sellTokenImage
            this.userInfo.sellTokenImage = 'eth.png'
          }
        } else {
          const tempSymbol = this.userInfo.buyTokenSymbol;
          this.userInfo.buyTokenSymbol = this.userInfo.sellTokenSymbol;
          this.userInfo.sellTokenSymbol = tempSymbol;

          const tempContract = this.userInfo.buyTokenContract;
          this.userInfo.buyTokenContract = this.userInfo.sellTokenContract;
          this.userInfo.sellTokenContract = tempContract;

          const tempDecimal = this.userInfo.buyTokenDecimal;
          this.userInfo.buyTokenDecimal = this.userInfo.sellTokenDecimal;
          this.userInfo.sellTokenDecimal = tempDecimal;

          if (this.userInfo.buyTokenSymbol == 'ETH') {
            this.userInfo.sellTokenImage = this.userInfo.buyTokenImage
            this.userInfo.buyTokenImage = 'eth.png'
          } else {
            this.userInfo.buyTokenImage = this.userInfo.sellTokenImage
            this.userInfo.sellTokenImage = undefined
          }

        }
      },
      async refreshPrice(){
        if (this.userInfo.inputSellValue) {
          this.userInfo.tokenRate = ''
          this.userInfo.buyAmountToEther = ''
          await this.handleInput({ target: { value: this.userInfo.inputSellValue.toString() } });
        }

      },
      async getPrice(buyToken, sellToken, sellAmount, maxRetries = 3) {
        let attempts = 0;
        
        while (attempts < maxRetries) {
          try {
            let baseUrl;
            if (this.tokenInfo.network == 'base') {
              baseUrl = `https://base.api.0x.org/swap/v1/price?`;
            } else if (this.tokenInfo.network == 'eth') {
              baseUrl = `https://api.0x.org/swap/v1/price?`;
            }
            
            const params = new URLSearchParams({
              buyToken: buyToken,
              sellToken: sellToken,
              sellAmount: sellAmount.toString(),
              feeRecipient: process.env.VUE_APP_DEVELOPER_ADDRESS,
              buyTokenPercentageFee: '0.01',
            }).toString();

            const res = await fetch(baseUrl + params, {
              headers: { '0x-api-key': process.env.VUE_APP_QUOTE_API},
            });

            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
            
          } catch (error) {
            attempts++;
            
            if (attempts === maxRetries) {
              throw new Error(`Failed after ${maxRetries} attempts`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      },
      async openConfirmModal() {
        this.userInfo.receiveAtLeast = new BigNumber(this.userInfo.buyAmountToEther)
            .multipliedBy(new BigNumber(100).minus(this.userInfo.slippage).minus(1))
            .dividedBy(100)
            .toNumber(); 

        this.show = true;
      },
      async openETHProgressModal() {
        try {
            this.isTransactionSent = true;
            if (this.tokenInfo.network == 'eth') {
              await switchChain(config, { chainId: 1 })
            } else if (this.tokenInfo.network == 'base') {
              await switchChain(config, { chainId: 8453 })
            }

            let provider
            let baseUrl
            let chainId
            if (this.tokenInfo.network == 'eth') {
              provider = new ethers.JsonRpcProvider(process.env.VUE_APP_WEB3ETH_ALCHEMY);
              baseUrl = `https://api.0x.org/swap/v1/quote?`
              chainId = 'eip155:1'
            } else if(this.tokenInfo.network == 'base'){
              provider = new ethers.JsonRpcProvider(process.env.VUE_APP_WEB3BASE_ALCHEMY);
              baseUrl = `https://base.api.0x.org/swap/v1/quote?`
              chainId = 'eip155:8453'
            }
            if (this.userInfo.dex == 'uniswap-v3-base' || this.userInfo.dex == 'uniswap_v3') {
              const pool_abi = [{"inputs":[],"name":"fee","outputs":[{"internalType":"uint24","name":"","type":"uint24"}],"stateMutability":"view","type":"function"}]
              const contract = new ethers.Contract(this.poolInfo.attributes.address, pool_abi, provider);
              const fee = await contract.fee();
              const feeHex = fee.toString(16).padStart(6, '0');

              let poolQuoteToken = this.poolInfo.relationships.quote_token.data.id.split("_")[1]
              if (this.userInfo.sellTokenContract == poolQuoteToken) {
                this.userInfo.path = `0x${ this.userInfo.sellTokenContract.slice(2)}${feeHex}${this.userInfo.buyTokenContract.slice(2)}`;
              } else {
                let eth_usdc_fee = 100
                eth_usdc_fee = eth_usdc_fee.toString(16).padStart(6, '0');
                this.userInfo.path = `0x${ this.userInfo.sellTokenContract.slice(2)}${eth_usdc_fee}${ poolQuoteToken.slice(2)}${feeHex}${this.userInfo.buyTokenContract.slice(2)}`;
              }
              const { commands, inputs } = await encodeETHTransaction(this.userInfo, this.referrerWallet);
              const deadline = Date.parse(new Date()) / 1000 + 600;
              const options = {
                  parametersType: ['bytes', 'bytes[]', 'uint256'],
                  parameters: [commands, inputs, deadline],
                  functionHash: '0x3593564c'
              };
              const data = await this.encodeFunctionData(options);
              const value = this.web3.utils.toWei(this.userInfo.inputSellValue.toString(), 'ether');

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"components":[{"internalType":"address","name":"permit2","type":"address"},{"internalType":"address","name":"weth9","type":"address"},{"internalType":"address","name":"seaportV1_5","type":"address"},{"internalType":"address","name":"seaportV1_4","type":"address"},{"internalType":"address","name":"openseaConduit","type":"address"},{"internalType":"address","name":"nftxZap","type":"address"},{"internalType":"address","name":"x2y2","type":"address"},{"internalType":"address","name":"foundation","type":"address"},{"internalType":"address","name":"sudoswap","type":"address"},{"internalType":"address","name":"elementMarket","type":"address"},{"internalType":"address","name":"nft20Zap","type":"address"},{"internalType":"address","name":"cryptopunks","type":"address"},{"internalType":"address","name":"looksRareV2","type":"address"},{"internalType":"address","name":"routerRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareToken","type":"address"},{"internalType":"address","name":"v2Factory","type":"address"},{"internalType":"address","name":"v3Factory","type":"address"},{"internalType":"bytes32","name":"pairInitCodeHash","type":"bytes32"},{"internalType":"bytes32","name":"poolInitCodeHash","type":"bytes32"}],"internalType":"struct RouterParameters","name":"params","type":"tuple"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"BalanceTooLow","type":"error"},{"inputs":[],"name":"BuyPunkFailed","type":"error"},{"inputs":[],"name":"ContractLocked","type":"error"},{"inputs":[],"name":"ETHNotAccepted","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandIndex","type":"uint256"},{"internalType":"bytes","name":"message","type":"bytes"}],"name":"ExecutionFailed","type":"error"},{"inputs":[],"name":"FromAddressIsNotOwner","type":"error"},{"inputs":[],"name":"InsufficientETH","type":"error"},{"inputs":[],"name":"InsufficientToken","type":"error"},{"inputs":[],"name":"InvalidBips","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandType","type":"uint256"}],"name":"InvalidCommandType","type":"error"},{"inputs":[],"name":"InvalidOwnerERC1155","type":"error"},{"inputs":[],"name":"InvalidOwnerERC721","type":"error"},{"inputs":[],"name":"InvalidPath","type":"error"},{"inputs":[],"name":"InvalidReserves","type":"error"},{"inputs":[],"name":"InvalidSpender","type":"error"},{"inputs":[],"name":"LengthMismatch","type":"error"},{"inputs":[],"name":"SliceOutOfBounds","type":"error"},{"inputs":[],"name":"TransactionDeadlinePassed","type":"error"},{"inputs":[],"name":"UnableToClaim","type":"error"},{"inputs":[],"name":"UnsafeCast","type":"error"},{"inputs":[],"name":"V2InvalidPath","type":"error"},{"inputs":[],"name":"V2TooLittleReceived","type":"error"},{"inputs":[],"name":"V2TooMuchRequested","type":"error"},{"inputs":[],"name":"V3InvalidAmountOut","type":"error"},{"inputs":[],"name":"V3InvalidCaller","type":"error"},{"inputs":[],"name":"V3InvalidSwap","type":"error"},{"inputs":[],"name":"V3TooLittleReceived","type":"error"},{"inputs":[],"name":"V3TooMuchRequested","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsSent","type":"event"},{"inputs":[{"internalType":"bytes","name":"looksRareClaim","type":"bytes"}],"name":"collectRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
                      to: "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
                      data: data,
                      value: value,
                    },
                  }
                }
              }
              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                this.handleTransactionResult(result.transactionHash, this.web3.eth);
              } else {
                this.isTransactionSent = false;
              }
            } else if (this.userInfo.dex == 'uniswap-v2-base' || this.userInfo.dex == 'uniswap_v2') {
              let poolQuoteToken = this.poolInfo.relationships.quote_token.data.id.split("_")[1]
              if (this.userInfo.sellTokenContract == poolQuoteToken) {
                this.userInfo.path = [this.userInfo.sellTokenContract, this.userInfo.buyTokenContract]
              } else {
                this.userInfo.path = [this.userInfo.sellTokenContract, poolQuoteToken, this.userInfo.buyTokenContract]
              }
              const { commands, inputs } = await encodeETHTransaction(this.userInfo, this.referrerWallet);

              const deadline = Date.parse(new Date()) / 1000 + 600;
              const options = {
                  parametersType: ['bytes', 'bytes[]', 'uint256'],
                  parameters: [commands, inputs, deadline],
                  functionHash: '0x3593564c'
              };
              const data = await this.encodeFunctionData(options);
              const value = this.web3.utils.toWei(this.userInfo.inputSellValue.toString(), 'ether');

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"components":[{"internalType":"address","name":"permit2","type":"address"},{"internalType":"address","name":"weth9","type":"address"},{"internalType":"address","name":"seaportV1_5","type":"address"},{"internalType":"address","name":"seaportV1_4","type":"address"},{"internalType":"address","name":"openseaConduit","type":"address"},{"internalType":"address","name":"nftxZap","type":"address"},{"internalType":"address","name":"x2y2","type":"address"},{"internalType":"address","name":"foundation","type":"address"},{"internalType":"address","name":"sudoswap","type":"address"},{"internalType":"address","name":"elementMarket","type":"address"},{"internalType":"address","name":"nft20Zap","type":"address"},{"internalType":"address","name":"cryptopunks","type":"address"},{"internalType":"address","name":"looksRareV2","type":"address"},{"internalType":"address","name":"routerRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareToken","type":"address"},{"internalType":"address","name":"v2Factory","type":"address"},{"internalType":"address","name":"v3Factory","type":"address"},{"internalType":"bytes32","name":"pairInitCodeHash","type":"bytes32"},{"internalType":"bytes32","name":"poolInitCodeHash","type":"bytes32"}],"internalType":"struct RouterParameters","name":"params","type":"tuple"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"BalanceTooLow","type":"error"},{"inputs":[],"name":"BuyPunkFailed","type":"error"},{"inputs":[],"name":"ContractLocked","type":"error"},{"inputs":[],"name":"ETHNotAccepted","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandIndex","type":"uint256"},{"internalType":"bytes","name":"message","type":"bytes"}],"name":"ExecutionFailed","type":"error"},{"inputs":[],"name":"FromAddressIsNotOwner","type":"error"},{"inputs":[],"name":"InsufficientETH","type":"error"},{"inputs":[],"name":"InsufficientToken","type":"error"},{"inputs":[],"name":"InvalidBips","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandType","type":"uint256"}],"name":"InvalidCommandType","type":"error"},{"inputs":[],"name":"InvalidOwnerERC1155","type":"error"},{"inputs":[],"name":"InvalidOwnerERC721","type":"error"},{"inputs":[],"name":"InvalidPath","type":"error"},{"inputs":[],"name":"InvalidReserves","type":"error"},{"inputs":[],"name":"InvalidSpender","type":"error"},{"inputs":[],"name":"LengthMismatch","type":"error"},{"inputs":[],"name":"SliceOutOfBounds","type":"error"},{"inputs":[],"name":"TransactionDeadlinePassed","type":"error"},{"inputs":[],"name":"UnableToClaim","type":"error"},{"inputs":[],"name":"UnsafeCast","type":"error"},{"inputs":[],"name":"V2InvalidPath","type":"error"},{"inputs":[],"name":"V2TooLittleReceived","type":"error"},{"inputs":[],"name":"V2TooMuchRequested","type":"error"},{"inputs":[],"name":"V3InvalidAmountOut","type":"error"},{"inputs":[],"name":"V3InvalidCaller","type":"error"},{"inputs":[],"name":"V3InvalidSwap","type":"error"},{"inputs":[],"name":"V3TooLittleReceived","type":"error"},{"inputs":[],"name":"V3TooMuchRequested","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsSent","type":"event"},{"inputs":[{"internalType":"bytes","name":"looksRareClaim","type":"bytes"}],"name":"collectRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
                      to: "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
                      data: data,
                      value: value,
                    },
                  }
                }
              }

              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                this.handleTransactionResult(result.transactionHash, this.web3.eth);
              } else {
                this.isTransactionSent = false;
              }
            } else {
              let sellToken
              let sellAmount
              if (this.userInfo.sellTokenSymbol == 'ETH') {
                sellToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
                sellAmount = this.web3.utils.toWei(this.userInfo.inputSellValue.toString(), 'ether');
              } else {
                sellToken = this.userInfo.sellTokenContract
                sellAmount = ethers.parseUnits(this.userInfo.inputSellValue.toString(), this.userInfo.sellTokenDecimal)
              }

              let params = new URLSearchParams({
                buyToken: this.userInfo.buyTokenContract,
                sellToken: sellToken,
                sellAmount: sellAmount.toString(),
                feeRecipient: this.referrerWallet,
                buyTokenPercentageFee: '0.005',
              }).toString()
              const res = await fetch(baseUrl + params, {
                headers: { '0x-api-key': process.env.VUE_APP_QUOTE_API},
              })
              const order = (await res.json())

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"internalType":"address","name":"zeroExAddress","type":"address"},{"internalType":"contract IEtherToken","name":"weth","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"hash","type":"bytes32"},{"indexed":true,"internalType":"bytes4","name":"selector","type":"bytes4"},{"indexed":false,"internalType":"address","name":"signer","type":"address"},{"indexed":false,"internalType":"address","name":"sender","type":"address"}],"name":"MetaTransactionExecuted","type":"event"},{"inputs":[],"name":"EIP712_DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEATURE_NAME","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEATURE_VERSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MTX_EIP712_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MTX_FEE_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2[]","name":"mtxs","type":"tuple[]"},{"components":[{"internalType":"enum LibSignature.SignatureType","name":"signatureType","type":"uint8"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"internalType":"struct LibSignature.Signature[]","name":"signatures","type":"tuple[]"}],"name":"batchExecuteMetaTransactionsV2","outputs":[{"internalType":"bytes[]","name":"returnResults","type":"bytes[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"},{"components":[{"internalType":"enum LibSignature.SignatureType","name":"signatureType","type":"uint8"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"internalType":"struct LibSignature.Signature","name":"signature","type":"tuple"}],"name":"executeMetaTransactionV2","outputs":[{"internalType":"bytes","name":"returnResult","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"}],"name":"getMetaTransactionV2ExecutedBlock","outputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"}],"name":"getMetaTransactionV2Hash","outputs":[{"internalType":"bytes32","name":"mtxHash","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"mtxHash","type":"bytes32"}],"name":"getMetaTransactionV2HashExecutedBlock","outputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"migrate","outputs":[{"internalType":"bytes4","name":"success","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"}],
                      to: order.to,
                      data: order.data,
                      value: order.value,
                    },
                  }
                }
              }

              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                this.handleTransactionResult(result.transactionHash, this.web3.eth);
              } else {
                this.isTransactionSent = false;
              }
            }
          } catch (error) {
              this.handleTransactionError(error);
          }
      },
      handleTransactionResult(txHash, ethProvider) {
          this.txHash = txHash;
          const intervalTime = 2000;
          setTimeout(async () => {
              const interval = setInterval(async () => {
                  try {
                      const receipt = await ethProvider.getTransactionReceipt(txHash);
                      if (receipt) {
                          clearInterval(interval);
                          if (receipt.status) {
                              this.isTransactionSent = false;
                              this.isTransactionSuccess = true;
                          } else {
                              this.isTransactionSent = false;
                              this.isTransactionFail = true;
                          }
                      }
                  } catch (error) {
                      console.error('Error fetching transaction receipt:', error.message);
                  }
              }, intervalTime);
          }, intervalTime);
      },
      handleTransactionError() {
        this.isTransactionSent = false;
      },
      async encodeFunctionData(options) {
        const params = this.web3.eth.abi.encodeParameters(
            options.parametersType,
            options.parameters
        );
        const data = options.functionHash + params.slice(2);
        return (data);
      },
      async handleSuccessTransactionClosed(){
        this.isTransactionSuccess = false;
        this.show = false
        this.userInfo.inputSellValue = ''
        this.userInfo.buyAmountToEther = ''
        this.userInfo.sellTokenBalances = ''
        this.userInfo.buyTokenBalances = ''
        this.updateUserInfo()
      },
      async openTokenProgressModal(){
        try {
          this.isTransactionSent = true;
          if (this.tokenInfo.network == 'eth') {
            await switchChain(config, { chainId: 1 })
          } else if (this.tokenInfo.network == 'base') {
            await switchChain(config, { chainId: 8453 })
          }

          let provider
          let baseUrl
          let chainId
          if (this.tokenInfo.network == 'eth') {
            provider = new ethers.JsonRpcProvider(process.env.VUE_APP_WEB3ETH_ALCHEMY);
            baseUrl = `https://api.0x.org/swap/v1/quote?`
            chainId = 'eip155:1'
          } else if(this.tokenInfo.network == 'base'){
            provider = new ethers.JsonRpcProvider(process.env.VUE_APP_WEB3BASE_ALCHEMY);
            baseUrl = `https://base.api.0x.org/swap/v1/quote?`
            chainId = 'eip155:8453'
          }
          let permit2Address = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
          let spenderAddress = '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad'
          if (this.userInfo.dex == 'uniswap-v3-base' || this.userInfo.dex == 'uniswap_v3') {
            const token_abi = [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}]
            const sellTokenInstance = new ethers.Contract(this.userInfo.sellTokenContract, token_abi, provider);
            const allowance = await sellTokenInstance.allowance(this.addressFromStore, permit2Address);
            if (allowance == 0) {
              const maxUint256 = ethers.MaxUint256;
              const data = sellTokenInstance.interface.encodeFunctionData('approve', [permit2Address, maxUint256]);
              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
                      to: this.userInfo.sellTokenContract,
                      data: data,
                    },
                  }
                }
              }

              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                await new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const interval = setInterval(async () => {
                            try {
                                let receipt = await this.web3.eth.getTransactionReceipt(result.transactionHash);
                                if (receipt) {
                                    clearInterval(interval);
                                    if (receipt.status) {
                                        resolve();
                                    } else {
                                        this.isTransactionSent = false;
                                        reject(new Error('Transaction failed'));
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching transaction receipt:', error.message);
                            }
                        }, 2000);
                    }, 2000);
                });
              } else {
                this.isTransactionSent = false;
              }
            }

            const permit2Instance = new ethers.Contract(permit2Address, permit2, provider);
            const allowanceForPermit2 = await permit2Instance.allowance(this.addressFromStore, this.userInfo.sellTokenContract, spenderAddress)
            const now = Date.parse(new Date()) / 1000 + 600;
            let signature
            if (allowanceForPermit2[0] == 0 && allowanceForPermit2[1] <= now) {
              const permitData = {
                  details: {
                      token: this.userInfo.sellTokenContract,
                      amount: '0xffffffffffffffffffffffffffffffffffffffff',
                      expiration: '0xffffffffffff',
                      nonce: '0',
                  },
                  spender: spenderAddress,
                  sigDeadline: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
              };

              const networkToChainIdMap = {
                  'eth': 1,
                  'base': 8453,
              };
              const { domain, types, values } = AllowanceTransfer.getPermitData(permitData, permit2Address, networkToChainIdMap[this.tokenInfo.network]);
              const typedDataMessage = _TypedDataEncoder.getPayload(domain, types, values);

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_signTypedData_v4",
                    chainId: chainId,
                    params: {
                      domain: typedDataMessage.domain,
                      types: typedDataMessage.types,
                      primaryType: typedDataMessage.primaryType,
                      message: typedDataMessage.message,
                    }
                  }
                }
              }
              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.signature) {
                signature = result.signature
              } else {
                this.isTransactionSent = false;
              }
            }

            const pool_abi = [{"inputs":[],"name":"fee","outputs":[{"internalType":"uint24","name":"","type":"uint24"}],"stateMutability":"view","type":"function"}]
            const contract = new ethers.Contract(this.poolInfo.attributes.address, pool_abi, provider);
            const fee = await contract.fee();
            const feeHex = fee.toString(16).padStart(6, '0');

            let poolQuoteToken = this.poolInfo.relationships.quote_token.data.id.split("_")[1]
            if (this.userInfo.buyTokenContract == poolQuoteToken) {
              this.userInfo.path = `0x${ this.userInfo.sellTokenContract.slice(2)}${feeHex}${this.userInfo.buyTokenContract.slice(2)}`;
            } else {
              let eth_usdc_fee = 100
              eth_usdc_fee = eth_usdc_fee.toString(16).padStart(6, '0');
              this.userInfo.path = `0x${ this.userInfo.sellTokenContract.slice(2)}${eth_usdc_fee}${ poolQuoteToken.slice(2)}${feeHex}${this.userInfo.buyTokenContract.slice(2)}`;
            }

            const { commands, inputs } = await encodeBaseTransaction(signature, this.userInfo, this.referrerWallet);

            const deadline = Date.parse(new Date()) / 1000 + 600;
            const options = {
                parametersType: ['bytes', 'bytes[]', 'uint256'],
                parameters: [commands, inputs, deadline],
                functionHash: '0x3593564c',
            };
            const data = await this.encodeFunctionData(options);

            let requestId = this.generateRequestId();
            let request = {
              jsonrpc: "2.0",
              id: requestId,
              method: "fc_requestWalletAction",
              params: {
                action: {
                  method: "eth_sendTransaction",
                  chainId: chainId,
                  params: {
                    abi: [{"inputs":[{"components":[{"internalType":"address","name":"permit2","type":"address"},{"internalType":"address","name":"weth9","type":"address"},{"internalType":"address","name":"seaportV1_5","type":"address"},{"internalType":"address","name":"seaportV1_4","type":"address"},{"internalType":"address","name":"openseaConduit","type":"address"},{"internalType":"address","name":"nftxZap","type":"address"},{"internalType":"address","name":"x2y2","type":"address"},{"internalType":"address","name":"foundation","type":"address"},{"internalType":"address","name":"sudoswap","type":"address"},{"internalType":"address","name":"elementMarket","type":"address"},{"internalType":"address","name":"nft20Zap","type":"address"},{"internalType":"address","name":"cryptopunks","type":"address"},{"internalType":"address","name":"looksRareV2","type":"address"},{"internalType":"address","name":"routerRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareToken","type":"address"},{"internalType":"address","name":"v2Factory","type":"address"},{"internalType":"address","name":"v3Factory","type":"address"},{"internalType":"bytes32","name":"pairInitCodeHash","type":"bytes32"},{"internalType":"bytes32","name":"poolInitCodeHash","type":"bytes32"}],"internalType":"struct RouterParameters","name":"params","type":"tuple"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"BalanceTooLow","type":"error"},{"inputs":[],"name":"BuyPunkFailed","type":"error"},{"inputs":[],"name":"ContractLocked","type":"error"},{"inputs":[],"name":"ETHNotAccepted","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandIndex","type":"uint256"},{"internalType":"bytes","name":"message","type":"bytes"}],"name":"ExecutionFailed","type":"error"},{"inputs":[],"name":"FromAddressIsNotOwner","type":"error"},{"inputs":[],"name":"InsufficientETH","type":"error"},{"inputs":[],"name":"InsufficientToken","type":"error"},{"inputs":[],"name":"InvalidBips","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandType","type":"uint256"}],"name":"InvalidCommandType","type":"error"},{"inputs":[],"name":"InvalidOwnerERC1155","type":"error"},{"inputs":[],"name":"InvalidOwnerERC721","type":"error"},{"inputs":[],"name":"InvalidPath","type":"error"},{"inputs":[],"name":"InvalidReserves","type":"error"},{"inputs":[],"name":"InvalidSpender","type":"error"},{"inputs":[],"name":"LengthMismatch","type":"error"},{"inputs":[],"name":"SliceOutOfBounds","type":"error"},{"inputs":[],"name":"TransactionDeadlinePassed","type":"error"},{"inputs":[],"name":"UnableToClaim","type":"error"},{"inputs":[],"name":"UnsafeCast","type":"error"},{"inputs":[],"name":"V2InvalidPath","type":"error"},{"inputs":[],"name":"V2TooLittleReceived","type":"error"},{"inputs":[],"name":"V2TooMuchRequested","type":"error"},{"inputs":[],"name":"V3InvalidAmountOut","type":"error"},{"inputs":[],"name":"V3InvalidCaller","type":"error"},{"inputs":[],"name":"V3InvalidSwap","type":"error"},{"inputs":[],"name":"V3TooLittleReceived","type":"error"},{"inputs":[],"name":"V3TooMuchRequested","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsSent","type":"event"},{"inputs":[{"internalType":"bytes","name":"looksRareClaim","type":"bytes"}],"name":"collectRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
                    to: "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
                    data: data
                  },
                }
              }
            }

            const responsePromise = this.listenForResponse();
            window.parent.postMessage(request, "*");
            const result = await responsePromise;

            if (result.transactionHash) {
              this.handleTransactionResult(result.transactionHash, this.web3.eth);
            } else {
              this.isTransactionSent = false;
            }
          } else if (this.userInfo.dex == 'uniswap-v2-base' || this.userInfo.dex == 'uniswap_v2') {
            const token_abi = [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}]
            const sellTokenInstance = new ethers.Contract(this.userInfo.sellTokenContract, token_abi, provider);
            const allowance = await sellTokenInstance.allowance(this.addressFromStore, permit2Address);
            if (allowance == 0) {
              const maxUint256 = ethers.MaxUint256;
              const data = sellTokenInstance.interface.encodeFunctionData('approve', [permit2Address, maxUint256]);
              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
                      to: this.userInfo.sellTokenContract,
                      data: data,
                    },
                  }
                }
              }

              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                await new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const interval = setInterval(async () => {
                            try {
                                let receipt = await this.web3.eth.getTransactionReceipt(result.transactionHash);
                                if (receipt) {
                                    clearInterval(interval);
                                    if (receipt.status) {
                                        resolve();
                                    } else {
                                        this.isTransactionSent = false;
                                        reject(new Error('Transaction failed'));
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching transaction receipt:', error.message);
                            }
                        }, 2000);
                    }, 2000);
                });
              } else {
                this.isTransactionSent = false;
              }
            }

            const permit2Instance = new ethers.Contract(permit2Address, permit2, provider);
            const allowanceForPermit2 = await permit2Instance.allowance(this.addressFromStore, this.userInfo.sellTokenContract, spenderAddress)
            const now = Date.parse(new Date()) / 1000 + 600;
            let signature
            if (allowanceForPermit2[0] == 0 && allowanceForPermit2[1] <= now) {
              const permitData = {
                  details: {
                      token: this.userInfo.sellTokenContract,
                      amount: '0xffffffffffffffffffffffffffffffffffffffff',
                      expiration: '0xffffffffffff',
                      nonce: '0',
                  },
                  spender: spenderAddress,
                  sigDeadline: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
              };

              const networkToChainIdMap = {
                  'eth': 1,
                  'base': 8453,
              };
              const { domain, types, values } = AllowanceTransfer.getPermitData(permitData, permit2Address, networkToChainIdMap[this.tokenInfo.network]);
              const typedDataMessage = _TypedDataEncoder.getPayload(domain, types, values);

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_signTypedData_v4",
                    chainId: chainId,
                    params: {
                      domain: typedDataMessage.domain,
                      types: typedDataMessage.types,
                      primaryType: typedDataMessage.primaryType,
                      message: typedDataMessage.message,
                    }
                  }
                }
              }
              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.signature) {
                signature = result.signature
              } else {
                this.isTransactionSent = false;
              }
            }

            let poolQuoteToken = this.poolInfo.relationships.quote_token.data.id.split("_")[1]
            if (this.userInfo.buyTokenContract == poolQuoteToken) {
              this.userInfo.path = [this.userInfo.sellTokenContract, this.userInfo.buyTokenContract]
            } else {
              this.userInfo.path = [this.userInfo.sellTokenContract, poolQuoteToken, this.userInfo.buyTokenContract]
            }

            const { commands, inputs } = await encodeBaseTransaction(signature, this.userInfo, this.referrerWallet);

            const deadline = Date.parse(new Date()) / 1000 + 600;
            const options = {
                parametersType: ['bytes', 'bytes[]', 'uint256'],
                parameters: [commands, inputs, deadline],
                functionHash: '0x3593564c',
            };
            const data = await this.encodeFunctionData(options);

            let requestId = this.generateRequestId();
            let request = {
              jsonrpc: "2.0",
              id: requestId,
              method: "fc_requestWalletAction",
              params: {
                action: {
                  method: "eth_sendTransaction",
                  chainId: chainId,
                  params: {
                    abi: [{"inputs":[{"components":[{"internalType":"address","name":"permit2","type":"address"},{"internalType":"address","name":"weth9","type":"address"},{"internalType":"address","name":"seaportV1_5","type":"address"},{"internalType":"address","name":"seaportV1_4","type":"address"},{"internalType":"address","name":"openseaConduit","type":"address"},{"internalType":"address","name":"nftxZap","type":"address"},{"internalType":"address","name":"x2y2","type":"address"},{"internalType":"address","name":"foundation","type":"address"},{"internalType":"address","name":"sudoswap","type":"address"},{"internalType":"address","name":"elementMarket","type":"address"},{"internalType":"address","name":"nft20Zap","type":"address"},{"internalType":"address","name":"cryptopunks","type":"address"},{"internalType":"address","name":"looksRareV2","type":"address"},{"internalType":"address","name":"routerRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareRewardsDistributor","type":"address"},{"internalType":"address","name":"looksRareToken","type":"address"},{"internalType":"address","name":"v2Factory","type":"address"},{"internalType":"address","name":"v3Factory","type":"address"},{"internalType":"bytes32","name":"pairInitCodeHash","type":"bytes32"},{"internalType":"bytes32","name":"poolInitCodeHash","type":"bytes32"}],"internalType":"struct RouterParameters","name":"params","type":"tuple"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"BalanceTooLow","type":"error"},{"inputs":[],"name":"BuyPunkFailed","type":"error"},{"inputs":[],"name":"ContractLocked","type":"error"},{"inputs":[],"name":"ETHNotAccepted","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandIndex","type":"uint256"},{"internalType":"bytes","name":"message","type":"bytes"}],"name":"ExecutionFailed","type":"error"},{"inputs":[],"name":"FromAddressIsNotOwner","type":"error"},{"inputs":[],"name":"InsufficientETH","type":"error"},{"inputs":[],"name":"InsufficientToken","type":"error"},{"inputs":[],"name":"InvalidBips","type":"error"},{"inputs":[{"internalType":"uint256","name":"commandType","type":"uint256"}],"name":"InvalidCommandType","type":"error"},{"inputs":[],"name":"InvalidOwnerERC1155","type":"error"},{"inputs":[],"name":"InvalidOwnerERC721","type":"error"},{"inputs":[],"name":"InvalidPath","type":"error"},{"inputs":[],"name":"InvalidReserves","type":"error"},{"inputs":[],"name":"InvalidSpender","type":"error"},{"inputs":[],"name":"LengthMismatch","type":"error"},{"inputs":[],"name":"SliceOutOfBounds","type":"error"},{"inputs":[],"name":"TransactionDeadlinePassed","type":"error"},{"inputs":[],"name":"UnableToClaim","type":"error"},{"inputs":[],"name":"UnsafeCast","type":"error"},{"inputs":[],"name":"V2InvalidPath","type":"error"},{"inputs":[],"name":"V2TooLittleReceived","type":"error"},{"inputs":[],"name":"V2TooMuchRequested","type":"error"},{"inputs":[],"name":"V3InvalidAmountOut","type":"error"},{"inputs":[],"name":"V3InvalidCaller","type":"error"},{"inputs":[],"name":"V3InvalidSwap","type":"error"},{"inputs":[],"name":"V3TooLittleReceived","type":"error"},{"inputs":[],"name":"V3TooMuchRequested","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsSent","type":"event"},{"inputs":[{"internalType":"bytes","name":"looksRareClaim","type":"bytes"}],"name":"collectRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"commands","type":"bytes"},{"internalType":"bytes[]","name":"inputs","type":"bytes[]"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"uint256[]","name":"","type":"uint256[]"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155BatchReceived","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC1155Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
                    to: "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad",
                    data: data
                  },
                }
              }
            }

            const responsePromise = this.listenForResponse();
            window.parent.postMessage(request, "*");
            const result = await responsePromise;
            if (result.transactionHash) {
              this.handleTransactionResult(result.transactionHash, this.web3.eth);
            } else {
              this.isTransactionSent = false;
            }
          }else {
            let sellToken
            let sellAmount
            if (this.userInfo.sellTokenSymbol == 'ETH') {
              sellToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
              sellAmount = this.web3.utils.toWei(this.userInfo.inputSellValue.toString(), 'ether');
            } else {
              sellToken = this.userInfo.sellTokenContract
              sellAmount = ethers.parseUnits(this.userInfo.inputSellValue.toString(), this.userInfo.sellTokenDecimal)

            }

            let buyToken
            if (this.userInfo.buyTokenSymbol == 'ETH') {
              buyToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            } else {
              buyToken = this.userInfo.buyTokenContract
            }

            let params = new URLSearchParams({
              buyToken: buyToken,
              sellToken: sellToken,
              sellAmount: sellAmount.toString(),
              feeRecipient: this.referrerWallet,
              buyTokenPercentageFee: '0.01',
            }).toString()
            const res = await fetch(baseUrl + params, {
              headers: { '0x-api-key': process.env.VUE_APP_QUOTE_API},
            })
            const order = (await res.json())

            const token_abi = [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}]
            const sellTokenInstance = new ethers.Contract(this.userInfo.sellTokenContract, token_abi, provider);
            const allowance = await sellTokenInstance.allowance(this.addressFromStore, order.to);
            if (allowance == 0) {
              const maxUint256 = ethers.MaxUint256;
              const data = sellTokenInstance.interface.encodeFunctionData('approve', [order.to, maxUint256]);

              let requestId = this.generateRequestId();
              let request = {
                jsonrpc: "2.0",
                id: requestId,
                method: "fc_requestWalletAction",
                params: {
                  action: {
                    method: "eth_sendTransaction",
                    chainId: chainId,
                    params: {
                      abi: [{"inputs":[{"internalType":"address","name":"_bridge","type":"address"},{"internalType":"address","name":"_remoteToken","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"BRIDGE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"REMOTE_TOKEN","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"l1Token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"l2Bridge","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"remoteToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"_interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}],
                      to: this.userInfo.sellTokenContract,
                      data: data,
                    },
                  }
                }
              }

              const responsePromise = this.listenForResponse();
              window.parent.postMessage(request, "*");
              const result = await responsePromise;
              if (result.transactionHash) {
                await new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        const interval = setInterval(async () => {
                            try {
                                let receipt = await this.web3.eth.getTransactionReceipt(result.transactionHash);
                                if (receipt) {
                                    clearInterval(interval);
                                    if (receipt.status) {
                                        resolve();
                                    } else {
                                        this.isTransactionSent = false;
                                        reject(new Error('Transaction failed'));
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching transaction receipt:', error.message);
                            }
                        }, 2000);
                    }, 2000);
                });
              } else {
                this.isTransactionSent = false;
              }
            }

            let requestId = this.generateRequestId();
            let request = {
              jsonrpc: "2.0",
              id: requestId,
              method: "fc_requestWalletAction",
              params: {
                action: {
                  method: "eth_sendTransaction",
                  chainId: chainId,
                  params: {
                    abi: [{"inputs":[{"internalType":"address","name":"zeroExAddress","type":"address"},{"internalType":"contract IEtherToken","name":"weth","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"hash","type":"bytes32"},{"indexed":true,"internalType":"bytes4","name":"selector","type":"bytes4"},{"indexed":false,"internalType":"address","name":"signer","type":"address"},{"indexed":false,"internalType":"address","name":"sender","type":"address"}],"name":"MetaTransactionExecuted","type":"event"},{"inputs":[],"name":"EIP712_DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEATURE_NAME","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"FEATURE_VERSION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MTX_EIP712_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MTX_FEE_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2[]","name":"mtxs","type":"tuple[]"},{"components":[{"internalType":"enum LibSignature.SignatureType","name":"signatureType","type":"uint8"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"internalType":"struct LibSignature.Signature[]","name":"signatures","type":"tuple[]"}],"name":"batchExecuteMetaTransactionsV2","outputs":[{"internalType":"bytes[]","name":"returnResults","type":"bytes[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"},{"components":[{"internalType":"enum LibSignature.SignatureType","name":"signatureType","type":"uint8"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"internalType":"struct LibSignature.Signature","name":"signature","type":"tuple"}],"name":"executeMetaTransactionV2","outputs":[{"internalType":"bytes","name":"returnResult","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"}],"name":"getMetaTransactionV2ExecutedBlock","outputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address payable","name":"signer","type":"address"},{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"expirationTimeSeconds","type":"uint256"},{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"contract IERC20Token","name":"feeToken","type":"address"},{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionFeeData[]","name":"fees","type":"tuple[]"}],"internalType":"struct IMetaTransactionsFeatureV2.MetaTransactionDataV2","name":"mtx","type":"tuple"}],"name":"getMetaTransactionV2Hash","outputs":[{"internalType":"bytes32","name":"mtxHash","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"mtxHash","type":"bytes32"}],"name":"getMetaTransactionV2HashExecutedBlock","outputs":[{"internalType":"uint256","name":"blockNumber","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"migrate","outputs":[{"internalType":"bytes4","name":"success","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"}],
                    to: order.to,
                    data: order.data
                  },
                }
              }
            }

            const responsePromise = this.listenForResponse();
            window.parent.postMessage(request, "*");
            const result = await responsePromise;
            if (result.transactionHash) {
              this.handleTransactionResult(result.transactionHash, this.web3.eth);
            } else {
              this.isTransactionSent = false;
            }
          }
        } catch (error) {
          this.handleTransactionError(error);
        }
      },
      async waitForTransactionReceipt(txHash, maxAttempts = 200, interval = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);
            if (receipt) {
              if (receipt.status) {
                return true;
              } else {
                this.isTransactionSent = false;
                this.isTransactionFail = true;
                throw new Error('Transaction failed');
              }
            }
            await new Promise(resolve => setTimeout(resolve, interval));
          } catch (error) {
            console.error('Error fetching transaction receipt:', error.message);
          }
        }
      },
      async handleConfirm(){
        const socialLink = `https://app.banyan.top/api/frame/swap/${this.tokenInfo.network}/${this.userInfo.buyTokenContract}?referral=${this.referrerWallet}`;
        const castText = `Check out my Banyan swap!`;
        window.parent.postMessage({
          type: "createCast",
          data: {
            cast: {
              text: castText,
              embeds: [socialLink]
            }
          }
        }, "*");
        this.isTransactionSuccess = false;
        this.show = false
        this.userInfo.inputSellValue = ''
        this.userInfo.buyAmountToEther = ''
        this.userInfo.sellTokenBalances = ''
        this.userInfo.buyTokenBalances = ''
        this.updateUserInfo()
      },
      createSignatureRequest() {
        const timestamp = Math.floor(Date.now() / 1000);
        let requestId = this.generateRequestId();
        let chainId, domainChainId
        if (this.tokenInfo.network == 'eth') {
          chainId = 'eip155:1'
          domainChainId = 1
        } else if(this.tokenInfo.network == 'base'){
          chainId = 'eip155:8453'
          domainChainId = 8453
        }
        return {
          jsonrpc: "2.0",
          id: requestId,
          method: "fc_requestWalletAction",
          params: {
            action: {
              method: "eth_signTypedData_v4",
              chainId: chainId,
              params: {
                domain: {
                  name: "Banyan",
                  version: "1",
                  chainId: domainChainId,
                },
                types: {
                  EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" }
                  ],
                  Login: [
                    { name: "message", type: "string" },
                    { name: "timestamp", type: "uint256" }
                  ]
                },
                primaryType: "Login",
                message: {
                  message: "Login to Banyan",
                  timestamp: timestamp
                }
              }
            }
          }
        };
      },
      listenForResponse() {
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {                     
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (data.jsonrpc === '2.0' && !data.method) {
                        window.removeEventListener('message', handleMessage);
                        if (data.error) {
                            reject(data.error);
                        } else if (data.result) {
                            resolve(data.result);
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };

            window.addEventListener('message', handleMessage);

            setTimeout(() => {
                window.removeEventListener('message', handleMessage);
                reject(new Error('Connection request timed out'));
            }, 3 * 60 * 1000);
        });
      },
      async connectWallet() {
        const request = this.createSignatureRequest();
        const responsePromise = this.listenForResponse();

        window.parent.postMessage(request, "*");
        const result = await responsePromise;
        if (result.address) {
            await this.$store.dispatch('updateAddress', result.address);
            this.updateUserInfo()
        }
      },
      handlePopupClosed(){
        this.isTransactionSent = false
      },
      generateRequestId() {
        return uuidv4();
      },
      formatAddress,
      formatNumber,
      formatBalance,
      getShortAddress,
      calculateSmallestUnit(amount, decimals) {
        const BigNumber = require('bignumber.js');
        BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN });
        return new BigNumber(amount).times(new BigNumber(10).pow(decimals)).toFixed(0);
      }
    }
  }

</script>
  

<style scoped>
.loading-container {display: flex;justify-content: center;align-items: center;height: 90vh;}
.spinner {border: 4px solid rgba(0, 0, 0, 0.1);border-left-color: #16a34a;border-radius: 50%;width: 30px;height: 30px;animation: spin 1s linear infinite;margin: auto;}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.container-popup {
  height:100%;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 10px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.address-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  height: 40px;
  padding: 0 0 20px 0;
}

.left-content {
  display: flex;
  align-items: center;
  margin-right:40px;
}

.network-icon {
  width: 30px;
  height: 30px;
  margin-right: 5px;
}

.address-text {
  font-weight: bold;
  color: #24292e;
  font-size: 17px;
}

.arrow-container {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: #f5f5f5;
  border-radius: 50%;
  padding: 5px;
}
.arrow-icon {
  width: 24px;
  height: 24px;
  fill: #888;
}

.exchange-rate {
  background-color: #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  text-align: center;
  max-width:400px;
}

.continue-button {
  width: 100%;
  padding: 10px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: auto
}

.buy-popup {
  background-color: #f9f9f9;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: auto;
  width:90%;
}

.sell {
  background-color: #f9f9f9;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: auto;
  width:90%;
}

.custom-input {
  flex: 1;
  background-color:#f9f9f9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  height:60px;
  max-width:400px;
  margin-bottom: 10px;
}

.custom-input input {
  width: 70%;
  border: none;
  outline: none;
  background: #f9f9f9;
  font-size: 28px;
  color: rgb(34, 34, 34);
  font-family: Basel,sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 485;
}

.custom-input input::placeholder {
  font-size: 28px;
  color: grey;
}


.right-section {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.balance {
  font-size: 14px;
  color: #7d7d7d;
  margin-right:3px;
}

.dropdown-selected {
  display: flex;
  align-items: center;
  cursor: pointer;
  background-color: #ffffff;
  border-radius: 20px;
  padding: 5px 10px;
  max-width: 150px;
}

.dropdown-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
  background-color: #f9f9f9;
  border-radius: 50%;
  overflow: hidden;
}

.logo {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.dropdown-selected span {
  color: black; 
  font-size: 20px;
  margin-right:5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 30px);
}

.wrapper-exchange {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: auto;
  width:90%;
}

.exchange-rate {
  background-color: #f9f9f9;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: auto;
  width:100%;
}

.swap-details-header {display: flex;justify-content: space-between;align-items: center;}
.trade-price {display: flex;justify-content: space-between;align-items: center;width: 100%;background: none;border: none;cursor: pointer;}
.trade-price-value {font-size: 14px;color: #222222;}

#swap-button {  max-width:400px;background-color: #16a34a;color: white;border: none;border-radius: 20px;padding: 16px 32px;font-size: 16px;font-weight: bold;text-align: center;width: 100%;cursor: pointer;display: flex;justify-content: center;align-items: center;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);outline: none;transition: background-color 0.3s ease;margin-top:10px;}
#swap-button:hover {background-color: #1a7c59;}


.dex-info-container {
  width: 100%;
  max-width: 440px;
  margin: 20px auto;
  border-radius: 8px;
  background-color: #ffffff;
}

.dex-info-fee-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  width: 100%;
  box-sizing: border-box;
}
.row-container:last-child {
  border-bottom: none;
}

.left-text {
  color: #666;
  font-size: 14px;
}

.right-text {
  color: #333;
  font-weight: bold;
  text-align: right;
  font-size: 14px;
}


.confirmmodal-overlay {position: fixed;top: 0;left: 0;width: 100vw;height: 100vh;background-color: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 100;}
.swap-modal {background: white;width: 420px;height:520px;border-radius: 12px;box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);padding:5px;}
.swap-modal-header {display: flex;justify-content: space-between;align-items: center;position: relative;padding:5px 0 5px 0;}
.swap-modal-header::before {content: '';flex: 1;}
.swap-modal-title {position: absolute;left: 50%;transform: translateX(-50%);font-size: 16px;}
.swap-modal-close-btn {border: none;background: none;font-size: 30px;cursor: pointer;padding:5px 10px 5px 0;}

.swap-modal-content {padding: 20px;}
.swap-detail {display: flex;flex-direction: column;align-items: flex-start;margin-bottom: 30px;}
.swap-label {font-size: 14px;color: #7d7d7d;text-align: left;}
.swap-value-container {display: flex;align-items: center;justify-content: space-between;width: 100%;}
.swap-value {font-size: 36px;font-weight: 500;color: #222222;text-align: right;  white-space: nowrap;overflow: hidden;text-overflow: ellipsis;max-width: calc(100% - 30px);max-width:300px;}
.swap-value-1 {font-size: 14px;font-weight: 500;color: #222222;text-align: right;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;max-width: calc(100% - 30px);max-width:300px;}
.swap-amount {font-size: 14px;color: #7d7d7d;text-align: right;}

.swap-info,
.swap-fee {display: flex;justify-content: space-between;align-items: center;padding:4px 0;font-size:14px;}
.swap-confirm-btn {background-color: #16a34a;color: white;border: none;border-radius: 20px;padding: 16px 32px;font-size: 16px;font-weight: bold;text-align: center;width: 100%;height:50px;cursor: pointer;display: flex;justify-content: center;align-items: center;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);outline: none;transition: background-color 0.3s ease;margin-top:0px;}
.swap-confirm-btn:hover {background-color: #1a7c59;}
.swap-modal-footer {padding: 16px;border-top: 1px solid #eaecef;}
.transaction-icon {width: 36px;height: 36px;border-radius: 50%;object-fit: cover;margin-right: 2px;}
.transaction-icon-buy {width: 36px;height: 36px;border-radius: 50%;object-fit: cover;margin-right: 2px;background-size: cover;background-position: center;background-repeat: no-repeat;}2

.spinner-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.swap-spinner {
  display: block;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #ffffff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.approve-container {display: flex;flex-direction: column;align-items: left;opacity: 1;gap: 10px;}
.operation {margin: 10px 0;font-size:16px;color:#7d7d7d;}
.operation.active {margin: 10px 0;font-size:20px;color:#222222;}
.load-container {display: flex;justify-content: center;}
.load-more-button {padding: 10px 15px;font-size: 16px; background-color: #16a34a;color: white;border: none;border-radius: 5px;cursor: pointer;box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);transition: background-color 0.3s;margin-top:5vh;margin-bottom:5vh;}
.no-more-button {padding: 10px 15px;font-size: 16px; background-color: #d3d3d3;color: #a9a9a9;border: none;border-radius: 5px;cursor: pointer;box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);transition: background-color 0.3s;margin-top:3vh;margin-bottom:3vh;}


.slippage-content {
  padding: 16px;
}

.slippage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-label {
  background-color: #f5f5f5;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 16px;
  color: #666;
}

.input-wrapper {
  display: flex;
  align-items: center;
  border-radius: 10px;
  padding: 4px 8px;
  border: 1px solid #ccc;
}

.input-wrapper :deep(.van-field__control) {
  font-size: 16px;
  font-weight: bold;
  width: 100px;
  text-align: right;
}

.percentage {
  font-size: 16px;
  font-weight: bold;
  margin-left: 4px;
}

.token-list-popup {
    font-family: sans-serif;
    padding: 16px;
  }
.token-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.token-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}
.token-info {
  flex-grow: 1;
}
.token-name {
  font-weight: bold;
  margin-bottom: 4px;
}
.token-symbol {
  font-size: 0.9em;
  color: #666;
}
.token-balance {
  font-weight: bold;
  text-align: right;
}
.alert-icon {
  color: #999;
  margin-left: 8px;
}

.custom-content {
  padding: 20px 0;
}
.share-text {
  font-size: 18px;
  text-align: center;
  margin: 0;
  font-weight: bold;
}

:deep(.van-dialog__header) {
  padding-bottom: 0;
}
:deep(.van-dialog__footer) {
  padding-top: 0;
}
:deep(.van-button) {
  font-size: 16px;
}

#w3m-modal {
  z-index: 10000 !important;
}

.wallet-info {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 10px 0;
  cursor: pointer;
  transition: color 0.3s;
}

.network-icon {
  width: 20px;
  height: 20px;
  margin-right: 5px;
  flex-shrink: 0;
}

.wallet-info span {
  font-size: 16px;
  color: #24292e;
  line-height: 1;
}


</style>