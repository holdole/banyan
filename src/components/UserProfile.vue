<template>
      <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
      </div>
      <div class="container-1" v-else>
        <van-config-provider :theme-vars="themeVars">
            <van-nav-bar :title="tokenTitle" left-arrow @click-left="$router.back()">
              <template #right>
                <van-icon name="star-o" size="20" @click="onMonitoring" />
              </template>
            </van-nav-bar>
        </van-config-provider>

        <div class="homePage-user">
            <div class="user-info">
                <img :src="userPopup.pfp_url" alt="avatar" class="avatar-popup">
                <div class="user-title-popu">
                <div class="text-display">{{userPopup.display_name}}</div>
                <div class="text-fname">@{{userPopup.username}}</div>
                <div class="text-address">
                    <span>{{ formatAddress(userPopup.verified_addresses.eth_addresses[0]) }}</span>
                    <img src="@/assets/images/copy.png" alt="Swap Icon" class="copy-icon" @click="copyAddress">
                </div>
                </div>
            </div>
            <div class="text-bios">{{userPopup.profile.bio.text}}</div>
            <div class="text-section">
                <div class="text-item">
                <span class="text-number">{{ formatFollow(userPopup.following_count) }}</span>
                <span class="text-label">Following</span>
                </div>
                <div class="text-item">
                <span class="text-number">{{ formatFollow(userPopup.follower_count) }}</span>
                <span class="text-label">Followers</span>
                </div>
            </div>
            <div class="text-address">
            </div>
            <div class="tabs-container">
            <div class="tabs-wrapper">
                <div 
                class="tab" 
                :class="{ active: activeTab === 'eth' }"
                @click="onChange('eth')"
                >
                <img src="@/assets/images/network/ethereum.png" alt="Ethereum" class="tabs-network-icon" />
                <span>Ethereum</span>
                </div>
                <div 
                class="tab" 
                :class="{ active: activeTab === 'base' }"
                @click="onChange('base')"
                >
                <img src="@/assets/images/network/base.png" alt="Base" class="tabs-network-icon" />
                <span>Base</span>
                </div>
            </div>
            <div class="tabs-border"></div>
            <div class="tab-content">
                <div v-if="activeTab === 'eth'">
                    <div class="homepage">
                        <div class="banyan-filter-container">
                        <span class="banyan-filter-title">Activities</span>
                        <span class="banyan-filter-custom" @click="showFilterPopup = true">{{filterOptions.chain}}<van-icon name="arrow-down" class="ml-1" /></span>
                        </div>
                        <van-list v-model:loading="loading" :finished="finished" loading-text="loading" finished-text="No More" @load="onLoad">
                        <van-cell v-for="(item, index) in userEthTradeData.slice(0, displayCount).filter(item => item.transaction)" :key="index" class="homepage-cell" @click="routeToSwapModal(item.network, item.transaction.Trade.Buy.Currency.SmartContract, item.address)">
                            <template #default>
                            <div v-if="item.transaction" class="homepage-cell-template">
                                <img :src="item.avatar_url" alt="avatar" class="avatar">
                                <div class="user-details">
                                <div class="user-title">
                                  <span class="display-name">{{ item.display_name }}</span>
                                  <span class="point">·</span>
                                  <img v-if="item.network == 'base'" src="@/assets/images/network/base.png" alt="Icon" class="network-icon-swap" />
                                  <img v-if="item.network == 'eth'" src="@/assets/images/network/ethereum.png" alt="Icon" class="network-icon-swap" />
                                  <span class="point">·</span>
                                  <span class="user-time">{{ formatTime(item.transaction.Block.Time) }}</span>
                                </div>
                                <div class="user-followers">
                                    <div class="text-item">
                                    <span class="text-number">{{ formatFollow(item.followers) }}</span>
                                    <span class="text-label">Followers</span>
                                    </div>
                                </div>
                                <div class="user-address">
                                  <button class="text-copy" @click.stop="copyTrade(item)">
                                    Copy Trade
                                  </button>
                                </div>
                                </div>
                                <div class="transaction">
                                <div class="transaction-info">
                                    <span class="sell">-{{ formatNumber(item.transaction.Trade.Sell.Amount) }} {{item.transaction.Trade.Sell.Currency.Symbol}}</span>
                                </div>
                                <div class="transaction-info">
                                    <span class="buy">+{{ formatNumber(item.transaction.Trade.Buy.Amount) }} {{item.transaction.Trade.Buy.Currency.Symbol}}</span>
                                </div>
                                <div class="transaction-info">
                                  <span class="sellUSD">${{ formatUSD(item.transaction.Trade.Buy.AmountInUSD, item.transaction.Trade.Sell.AmountInUSD) }}</span>
                                </div>
                                </div>
                            </div>
                            </template>
                        </van-cell>
                        </van-list>
                    </div>
                
                </div>
                <div v-if="activeTab === 'base'">
                    <div class="homepage">
                        <div class="swap-filter-container">
                        <span class="swap-filter-title">Activities</span>
                        <span class="swap-filter-custom" @click="showFilterPopup = true">{{filterOptions.chain}}<van-icon name="arrow-down" class="ml-1" /></span>
                        </div>
                        <van-list v-model:loading="loadingBase" :finished="finishedBase" loading-text="loading" finished-text="No More" @load="onLoad">
                        <van-cell v-for="(item, index) in userBaseTradeData.slice(0, displayBaseCount).filter(item => item.transaction)" :key="index" class="homepage-cell" @click="routeToSwapModal(item.network, item.transaction.Trade.Buy.Currency.SmartContract, item.transaction.Trade.Sell.Currency.SmartContract,item.address)">
                            <template #default>
                            <div v-if="item.transaction" class="homepage-cell-template">
                                <img :src="item.avatar_url" alt="avatar" class="avatar">
                                <div class="user-details">
                                <div class="user-title">
                                  <span class="display-name">{{ item.display_name }}</span>
                                  <span class="point">·</span>
                                  <img v-if="item.network == 'base'" src="@/assets/images/network/base.png" alt="Icon" class="network-icon-swap" />
                                  <img v-if="item.network == 'eth'" src="@/assets/images/network/ethereum.png" alt="Icon" class="network-icon-swap" />
                                  <span class="point">·</span>
                                  <span class="user-time">{{ formatTime(item.transaction.Block.Time) }}</span>
                                </div>
                                <div class="user-followers">
                                    <div class="text-item">
                                    <span class="text-number">{{ formatFollow(item.followers) }}</span>
                                    <span class="text-label">Followers</span>
                                    </div>
                                </div>
                                <div class="user-address">
                                  <button class="text-copy" @click.stop="copyTrade(item)">
                                    Copy Trade
                                  </button>
                                </div>
                                </div>
                                <div class="transaction">
                                <div class="transaction-info">
                                    <span class="sell">-{{ formatNumber(item.transaction.Trade.Sell.Amount) }} {{item.transaction.Trade.Sell.Currency.Symbol}}</span>
                                </div>
                                <div class="transaction-info">
                                    <span class="buy">+{{ formatNumber(item.transaction.Trade.Buy.Amount) }} {{item.transaction.Trade.Buy.Currency.Symbol}}</span>
                                </div>
                                <div class="transaction-info">
                                  <span class="sellUSD">${{ formatUSD(item.transaction.Trade.Buy.AmountInUSD, item.transaction.Trade.Sell.AmountInUSD) }}</span>
                                </div>
                                </div>
                            </div>
                            </template>
                        </van-cell>
                        </van-list>
                    </div>
                </div>
            </div>
            <van-popup v-if="showSwap" v-model:show="showSwap" round position="bottom" closeable close-icon-position="top-left" :duration="0" :style="{ height: '90%' }">
              <van-nav-bar title="Swap" />
              <SwapPopup :referrer="referrerWallet" :token="token" :network="network" />
            </van-popup>

            <van-popup v-model:show="showFilterPopup" position="bottom" round :style="{ height: 'calc(100vh)', maxHeight: '40%' }">
            <div class="filter-popup-content">
            <h3>Filter</h3>
            <van-field label="Eth" class="filter-field">
                <template #input>
                <div class="custom-buttons">
                    <button 
                    v-for="option in amountOptions" 
                    :key="option.value" 
                    @click="filterOptions.amount = option.value"
                    :class="['custom-button', { active: filterOptions.amount === option.value }]"
                    >
                    {{ option.label }}
                    </button>
                </div>
                </template>
            </van-field>
            <van-button type="primary" block @click="applyFilter" class="apply-filter-btn">Apply</van-button>
            </div>
            </van-popup>
            <van-dialog
              class="centered-dialog"
              v-model:show="showMonitoring"
              title="Monitoring"
              show-cancel-button
              cancel-button-text="Cancel"
              confirm-button-text="Confirm"
              :close-on-click-overlay="false"
              @confirm="handleConfirm(userPopup.username)"
            >
              <div class="custom-content">
                <p class="share-text">Start Monitoring?</p>
              </div>
            </van-dialog>
            
            </div>
          </div>
    </div>    
</template>

<script>
import { ref, onMounted,reactive } from 'vue';
import { formatAddress, formatFollow, formatTime, formatNumber,formatUSD } from '@/utils/utils.js';
import { showToast } from 'vant';
import axios from 'axios';
import {fetchBaseTransaction} from '@/utils/fetchBaseTransaction.js'
import {fetchEthTransaction} from '@/utils/fetchEthTransaction.js'
import { debounce } from 'lodash';
import { useStore } from 'vuex'
import SwapPopup from './SwapPopup.vue';


export default {
  components: {
    SwapPopup
  },
  props: {
    username: {
      type: String,
      required: true
    },
  },
  setup(props) {
    const store = useStore();
    const isLoading = ref(true);
    const show = ref(true);
    const showSwap = ref(false);
    const showMonitoring = ref(false);
    const userPopup = ref(null);
    const activeTab = ref('eth');
    const userEthTradeData = ref([]);
    const userBaseTradeData = ref([]);
    const loading = ref(false);
    const loadingBase = ref(false);
    const finished = ref(false);
    const finishedBase = ref(false);
    const displayCount = ref(10);
    const displayBaseCount = ref(10);
    const showFilterPopup = ref(false);

    const filterOptions = reactive({
        chain: 'Ethereum',
        amount: 0
    });

    const amountOptions = [
    { label: '0', value: 0 },
    { label: '0.001', value: 0.001 },
    { label: '0.1', value: 0.1 },
    { label: '1', value: 1 }
    ];

    const themeVars = reactive({
    navBarIconColor: '#000000',
    navBarTextColor: '#000000',
    });

    const retryOperation = async (operation, maxAttempts = 3) => {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          attempts++;
          return await operation();
        } catch (error) {
          if (attempts === maxAttempts) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        }
      }
    };

    const fetchWithRetry = async (fname) => {
      const fetchOperation = async () => {
        const url = `https://api.neynar.com/v2/farcaster/user/search?q=${fname}&limit=5`;
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            api_key: process.env.VUE_APP_NEYNAR_APIKEY
          }
        };

        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
      };

      return await retryOperation(fetchOperation);
    };

    const applyFilter = () => {
        showFilterPopup.value = false;
        fetchUserTradeData(activeTab.value, userPopup.value.username);
    };

    const fetchUserTradeData = async (network, username) => {
      if (network == 'eth') {
        filterOptions.chain = 'Ethereum';
        userEthTradeData.value = [];
        loading.value = true;
        finished.value = false;
      } else if (network == 'base') {
        filterOptions.chain = 'Base';
        userBaseTradeData.value = [];
        loadingBase.value = true;
        finishedBase.value = false;
      }

      try {
        const fetchData = async () => {
          return await axios.get('https://app.banyan.top/api/getUserTradeData', {
            params: {
              network: network,
              username: username,
              amount: filterOptions.amount
            }
          });
        };

        const response = await retryOperation(fetchData);
        const data = await response.data;

        if (network == 'eth') {
          userEthTradeData.value = data;
        } else if (network == 'base') {
          userBaseTradeData.value = data;
        }
      } catch (error) {
        console.error("Error fetching user trade data after 3 attempts:", error);
      } finally {
        if (network == 'eth') {
          loading.value = false;
          if (userEthTradeData.value.length <= 10) {
            finished.value = true;
          }
        } else if (network == 'base') {
          loadingBase.value = false;
          if (userBaseTradeData.value.length <= 10) {
            finishedBase.value = true;
          }
        }
      }
    };

    const onChange = async (network) => {
      try {
        activeTab.value = network;
        await fetchUserTradeData(network, userPopup.value.username);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

      const fetchTransactionWithRetry = async (fetchFunction, transactionHashes) => {
        const fetchOperation = async () => {
          return await fetchFunction(transactionHashes);
        };
        return await retryOperation(fetchOperation);
      };

      const onLoad = debounce(async () => {
        try {
          const processData = async (activeData, displayCountRef, fetchTransactionFunction) => {
            let dataSlice = activeData.value.slice(
              displayCountRef.value,
              displayCountRef.value + 10
            );
            const transactionHashes = dataSlice.map(item => item.transactionHash);
            
            let dexdata = await fetchTransactionWithRetry(fetchTransactionFunction, transactionHashes);
            
            if (dexdata.length != 0) {
              activeData.value = await mergeData(activeData.value, dexdata);
              displayCountRef.value = displayCountRef.value + 10;
            }
          };

          if (activeTab.value === 'eth') {
            await processData(userEthTradeData, displayCount, fetchEthTransaction);
            loading.value = false;
            if (displayCount.value >= userEthTradeData.value.length) {
              finished.value = true;
            }
          } else if (activeTab.value === 'base') {
            await processData(userBaseTradeData, displayBaseCount, fetchBaseTransaction);
            loadingBase.value = false;
            if (displayBaseCount.value >= userBaseTradeData.value.length) {
              finishedBase.value = true;
            }
          }
        } catch (error) {
          console.error("Error in onLoad after retries:", error);
          if (activeTab.value === 'eth') {
            loading.value = false;
          } else {
            loadingBase.value = false;
          }
        }
      }, 3000);

      const mergeData = (result, dexdata) => {
        let mergedResult = [];
        for (let i = 0; i < result.length; i++) {
            const resultItem = result[i];
            let found = false;
            for (let j = 0; j < dexdata.length; j++) {
                const dexItem = dexdata[j];
                if (resultItem.transactionHash === dexItem.Transaction.Hash) {
                    resultItem.transaction = dexItem;
                    mergedResult.push(resultItem);
                    found = true;
                    break;
                }
            }
            if (!found) {
                mergedResult.push(resultItem);
            }
        }
        return mergedResult;
      }

    const onMonitoring = () => {
      showMonitoring.value = true
    }


    onMounted(async () => {
      const params = new URLSearchParams(window.location.search);
      let fid = params.get('fid');
      if (Number(fid) > 0 && Number(fid) < 1000000) {
        store.dispatch('updateFid', fid);
      }

      try {
        const result = await fetchWithRetry(props.username);
        if (!result.result.users || result.result.users.length === 0) {
          throw new Error("No user data found");
        }
        userPopup.value = result.result.users[0];
        isLoading.value = false;
        await fetchUserTradeData(activeTab.value, userPopup.value.username);
      } catch (error) {
        console.error("Error fetching user data:", error);
        isLoading.value = false;
      }
    });

    return {
      isLoading,
      loading,
      loadingBase,
      finished,
      finishedBase,
      filterOptions,
      show,
      userPopup,
      activeTab,
      displayCount,
      displayBaseCount,
      userEthTradeData,
      userBaseTradeData,
      applyFilter,
      showFilterPopup,
      amountOptions,
      onChange,
      onLoad,
      themeVars,
      showMonitoring,
      onMonitoring,
      showSwap
    };
  },
  methods: {
    routeToSwapModal(network, buyContract, sellContract, referrer) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) 
                        || /Android.*Version\/[0-9].[0-9]/.test(navigator.userAgent);

      let contract
      if (buyContract == '0x4200000000000000000000000000000000000006' || buyContract == '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        contract = sellContract
      } else {
        contract = buyContract
      }
      const url = this.$router.resolve({
        name: 'swapmodal',
        query: { network, token: contract, referrer }
      }).href;

      if (isMobile || isWebView) {
        this.$router.push({ name: 'swapmodal', query: { network, token: contract, referrer } });
      } else {
        try {
          const newWindow = window.open(url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            throw new Error('Failed to open new window');
          }
        } catch (e) {
          console.warn('Failed to open new window, falling back to in-app navigation', e);
          this.$router.push({ name: 'swapmodal', query: { network, token: contract, referrer } });
        }
      }
    },
    async copyTrade(item) {
      this.referrerWallet = item.address
      let token
      if (item.transaction.Trade.Buy.Currency.SmartContract == '0x4200000000000000000000000000000000000006' || item.transaction.Trade.Buy.Currency.SmartContract == '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
        token = item.transaction.Trade.Sell.Currency.SmartContract
      } else {
        token = item.transaction.Trade.Buy.Currency.SmartContract
      }

      this.network = item.network
      this.token = token
      this.showSwap = true
    },
    copyAddress() {
        const addressToCopy = this.userPopup.verified_addresses.eth_addresses[0]
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(addressToCopy)
            .then(() => {
                showToast('Address copied');
            })
            .catch(() => {
                this.fallbackCopyToClipboard(addressToCopy);
            });
        } else {
            this.fallbackCopyToClipboard(addressToCopy);
        }
        },
        fallbackCopyToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        
        document.body.appendChild(textArea);
        
        const isIos = navigator.userAgent.match(/ipad|iphone/i);
        
        if (isIos) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        } else {
            textArea.select();
        }

        try {
            const successful = document.execCommand('copy');
            if (successful) {
            showToast('Address copied');
            } else {
            showToast('Failed to copy address');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showToast('Failed to copy address');
        }

        document.body.removeChild(textArea);
    },
    async handleConfirm(username){
      const fid = this.$store.state.fid;
      if (Number(fid) > 0 && Number(fid) < 1000000) {
        let response = await axios.post('https://app.banyan.top/api/monitoring', {
          monitoringResult: username,
          fid: fid
        });

        let data = await response.data;

        if (data.message == 'Data successfully inserted') {
          showToast('Monitoring Successful');
        } else {
          showToast('Monitoring Failure');
        }
      } else {
        showToast('Monitoring Failure');
      }
    },
    formatAddress,
    formatFollow,
    formatTime,
    formatNumber,
    formatUSD

  }
};
</script>

<style>
.container-1 {
  max-width: 450px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #ffffff;
}

.homePage-user {
  padding: 10px;

}

.user-info {
  display: flex;
  align-items: flex-start;
}

.avatar-popup {
  width: 65px;
  height: 65px;
  margin-right: 5px;
  border-radius: 50%;
  order: -1 !important;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.user-title-popup {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.text-display {
  font-weight: bold;
  color: #24292e;
  font-size:17px;
}

.text-fname {
  color: #546473;
  font-size:15px;
  margin-top:5px;
}

.text-address {
  color: #546473;
  font-size:15px;
  margin-top:5px;
}

.copy-icon {
  width: 15px;
  height: 15px;
  cursor: pointer;
  margin-left:5px;
}

.text-bios {
  color: #24292e;
  font-size:15px;
  margin-top:10px;
}

.text-section {
  display: flex;
  align-items: center;
  margin-top:10px;
}

.text-item {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.text-number {
  font-weight: bold;
  margin-right: 5px;
}

.text-label {
  font-weight: normal;
  color: #657786;
}

.filter-popup-content {
  padding: 20px;
}

.filter-popup-content h3 {
  margin-bottom: 20px;
  text-align: center;
  font-size: 18px;
}

.filter-field {
  margin-bottom: 15px;
}

.custom-radio-group {
  --van-radio-checked-icon-color: #16a34a;
}

.custom-buttons {
  display: flex;
  justify-content: space-between;
}

.custom-button {
  flex: 1;
  margin: 0 4px;
  padding: 8px 0;
  background-color: #f5f5f5;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  width:40px;
}

.custom-button.active {
  background-color: #16a34a;
  color: white;
}

.apply-filter-btn {
  background-color: #16a34a;
  margin-top: 20px;
}


.tabs-container {
  width: 100%;
}

.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 10px 20px 0 20px;
}

.tab {
  cursor: pointer;
  padding: 5px 0;
  margin: 0 30px;
  font-size: 16px;
  color: #888;
  transition: color 0.3s, font-weight 0.3s;
  display: flex;
  align-items: center;
}

.tab.active {
  font-weight: bold;
  color: black;
}

.tabs-network-icon {
  width: 15px;
  height: 15px;
  margin-right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tabs-border {
  height: 1px;
  background-color: #e0e0e0;
}

.homepage {
  padding:10px 0  70px 0;
  height:100%;
}

.guide {
  font-size:12px;
  color:#546473;
}
.swap-filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
}

.swap-filter-title {
  font-size: 16px;
  font-weight: bold;
}


.homepage-cell {
  display: flex !important;
  align-items: center !important;
  padding: 8px !important;
  align-items: center;
  margin-bottom: 5px;
  padding: 8px 8px;
  border-radius: 10px;
  border: 1px solid #ccc;
}

.homepage-cell-template {
  display: flex;
  align-items: center;
  width: 100%;
}

.avatar {
  width: 48px;
  height: 48px;
  margin-right: 5px;
  border-radius: 50%;
  order: -1 !important;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
}



.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-grow: 1;
}

.user-title {
  display: flex;
  align-items: center;
  max-height: 20px;
}

.display-name {
  font-weight: bold;
  color: #24292e;
  font-size:15px;
  max-width: 100px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.f-name {
  color: #546473;
  font-size:15px;
}


.point {
  color: #546473;
  margin-left: 5px;
  font-size:15px;
}

.user-time {
  color: #546473;
  font-size:15px;
}

.user-followers {
  color: #546473;
  display: flex;
  align-items: center;
  font-size:15px;
  max-height: 20px;
}

.text-item {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.text-number {
  font-weight: bold;
  margin-right: 5px;
  color:#24292e;
}

.text-label {
  font-weight: normal;
  color: #657786;
}

.user-address {
  color: #546473;
  display: flex;
  align-items: center;
  font-size:15px;
  max-height: 20px;
}

.network-icon-swap{
  width: 15px;
  height: 15px;
}


.transaction {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.transaction-info {
  display: flex;
  align-items: center;
  color: #666;
}

.buy {
  font-weight: bold;
  color: #333;
  font-size:15px;
  color: #16a34a;
  max-width: 150px;
  margin-bottom:-2px;
}

.sell {
  color: #666;
  margin-left: 5px;
  font-size:13px;
  margin-bottom:-2px;
}

.sellUSD {
  color: #666;
  margin-left: 5px;
  font-size:13px;
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

.custom-content {
  padding: 20px 0;
}
.share-text {
  font-size: 18px;
  text-align: center;
  margin: 0;
  font-weight: bold;
}


</style>