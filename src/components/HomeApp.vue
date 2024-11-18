<template>
  <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
  </div>
  <div class="app-container" v-else>
    <!-- <van-config-provider :theme-vars="themeVars">
      <van-nav-bar>
        <template #title>
          <div class="nav-logo-container">
            <img src="@/assets/images/banyan.png" alt="BANYAN" class="nav-logo"/>
          </div>
        </template>
        <template #right>
          <router-link :to="{ name: 'createframe' }">
            <van-icon name="add-o" size="24"/>
          </router-link>
        </template>
      </van-nav-bar>
    </van-config-provider> -->

    <div v-if="nofid" class="homePage-log">
      <div class="content">
        <input v-model="fname" type="text" class="input-field" placeholder="Enter your Warpcast Username">
        <button @click="loginUser" class="login-button">Log In</button>
        <div v-if="error" class="error-message">{{error}}</div>
      </div>
    </div>

    <div v-if="!nofid" class="homepage-home">
        <div class="banyan-filter-container">
          <span class="banyan-filter-title">Following</span>
          <span class="banyan-filter-custom" @click="showFilterPopup = true">{{filterOptions.chain}}<van-icon name="arrow-down" class="ml-1" /></span>
        </div>
        <van-pull-refresh v-model="refreshing" pulling-text="Pull down to refresh..."  loosing-text="Release to refresh..." loading-text="Loading..."  @refresh="onRefresh">
          <van-list v-model:loading="loading" :finished="finished" loading-text="loading" finished-text="No More" @load="onLoad">
            <van-cell v-for="(item, index) in data.slice(0, displayCount).filter(item => item.transaction)" :key="index" class="homepage-cell" @click="routeToSwapModal(item.network, item.transaction.Trade.Buy.Currency.SmartContract, item.transaction.Trade.Sell.Currency.SmartContract, item.address)">
              <template #default>
                <div v-if="item.transaction" class="homepage-cell-template">
                  <img :src="item.avatar_url" alt="avatar" class="avatar" @click.stop="showPopup(item)">
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
                      <span class="buy-token">+{{ formatNumber(item.transaction.Trade.Buy.Amount) }} {{item.transaction.Trade.Buy.Currency.Symbol}}</span>
                    </div>
                    <div class="transaction-info">
                      <span class="sellUSD">${{ formatUSD(item.transaction.Trade.Buy.AmountInUSD, item.transaction.Trade.Sell.AmountInUSD) }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </van-cell>
          </van-list>
        </van-pull-refresh>

        <van-popup v-if="show" v-model:show="show" round position="bottom" closeable close-icon-position="top-left" :duration="0" :style="{ height: '90%' }">
          <van-config-provider :theme-vars="themeVars">
            <van-nav-bar title="Swap">
              <template #right>
                <van-icon name="replay" size="20" @click="swapPopupRef.refreshPrice()" />
              </template>
            </van-nav-bar>
          </van-config-provider>
          <SwapPopup ref="swapPopupRef" :referrer="referrerWallet" :token="token" :network="network" />
        </van-popup>

        <van-popup v-model:show="showFilterPopup" :z-index="9999" position="bottom" round :style="{ height: 'calc(100vh)', maxHeight: '55%' }">
          <div class="filter-popup-content">
            <h3>Filter</h3>
            <van-field label="Chain" class="filter-field">
              <template #input>
                <van-radio-group v-model="filterOptions.chain" direction="horizontal" class="custom-radio-group">
                  <van-radio name="Ethereum">Ethereum</van-radio>
                  <van-radio name="Base">Base</van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field label="Followers" class="filter-field">
              <template #input>
                <div class="custom-buttons">
                  <button 
                    v-for="option in followerOptions" 
                    :key="option.value" 
                    @click="filterOptions.followers = option.value"
                    :class="['custom-button', { active: filterOptions.followers === option.value }]"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </template>
            </van-field>
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
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { formatAddress,formatNumber, formatTime, formatFollow, formatUSD } from '@/utils/utils.js';
import { reactive } from 'vue';
import {fetchBaseTransaction} from '@/utils/fetchBaseTransaction.js'
import {fetchEthTransaction} from '@/utils/fetchEthTransaction.js'
import { debounce } from 'lodash';
import { showToast } from 'vant';
import { useStore } from 'vuex';
import SwapPopup from './SwapPopup.vue';

export default {
  name: 'HomeApp',
  components: {
    SwapPopup
  },
  data() {
    return {
      fname: '',
      error: '',
    };
  },
  setup() {
      const fid = ref(null)
      const show = ref(null)
      const nofid = ref(false)
      const data = ref([]);
      const isLoading = ref(true)
      const displayCount = ref(15);
      const loading = ref(false);
      const finished = ref(false);
      const refreshing = ref(false);
      const store = useStore();
      const swapPopupRef = ref(null);
      const showFilterPopup = ref(false);

      const filterOptions = reactive({
            chain: 'Ethereum',
            followers: 0,
            amount: 0
          });

      const followerOptions = [
        { label: '0', value: 0 },
        { label: '100', value: 100 },
        { label: '500', value: 500 },
        { label: '1000', value: 1000 }
      ];

      const amountOptions = [
        { label: '0', value: 0 },
        { label: '0.001', value: 0.001 },
        { label: '0.1', value: 0.1 },
        { label: '1', value: 1 }
      ];

      const applyFilter = () => {
        showFilterPopup.value = false;
        handleChainFollowing();
      };

      const themeVars = reactive({
        navBarIconColor: '#000000',
        navBarTextColor: '#000000',
      });


      onMounted(async () => {
        const params = new URLSearchParams(window.location.search);
        fid.value = params.get('fid');
        if (fid.value == null) {
          fid.value = store.state.fid;
        }
        if (Number(fid.value) > 0 && Number(fid.value) < 1000000) {
          store.dispatch('updateFid', fid.value);
          try {
            const fetchData = async () => {
              const response = await axios.get('https://app.banyan.top/api/getSocialWalletEth', { 
                params: { 
                  fid: fid.value,
                  followers: filterOptions.followers,
                  amount: filterOptions.amount
                }
              });
              return response;
            };

            const response = await retryOperation(fetchData);
            data.value = await response.data;
            if (data.value.length == 0) {
              finished.value = true;
            }
          } catch (error) {
            console.error("Error fetching data after 3 attempts:", error);
          } finally {
            isLoading.value = false;
          }
        } else {
          nofid.value = true;
          isLoading.value = false;
        }
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

      const fetchWithRetry = async (fname, retries = 1) => {
        const url = `https://api.neynar.com/v2/farcaster/user/search?q=${fname}&limit=5`;
        const options = {
          method: 'GET',
          headers: { accept: 'application/json', api_key: process.env.VUE_APP_NEYNAR_APIKEY }
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error();
            const result = await response.json();
            return result
        } catch (error) {
            if (retries > 0) {
                await fetchWithRetry(retries - 1);
            }
        }
      }

      const onRefresh = async () => {
        refreshing.value = true;
        finished.value = false;
        loading.value = true;

        try {
          const fetchData = async () => {
            if (filterOptions.chain == 'Ethereum') {
              const response = await axios.get('https://app.banyan.top/api/getSocialWalletEth', {
                params: { 
                  fid: fid.value,
                  followers: filterOptions.followers,
                  amount: filterOptions.amount
                }
              });
              return response;
            } else if (filterOptions.chain == 'Base') {
              const response = await axios.get('https://app.banyan.top/api/getSocialWallet', {
                params: { 
                  fid: fid.value,
                  followers: filterOptions.followers,
                  amount: filterOptions.amount
                }
              });
              return response;
            }
          };

          const response = await retryOperation(fetchData);
          data.value = await response.data;
          displayCount.value = 15;
        } catch (error) {
          console.error("Error fetching data after 3 attempts:", error);
        } finally {
          loading.value = false;
          refreshing.value = false;
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
          if (filterOptions.chain == 'Ethereum') {
            let dataSlice = data.value.slice(displayCount.value, displayCount.value + 15);
            const transactionHashes = dataSlice.map(item => item.transactionHash);
            
            let dexdata = await fetchTransactionWithRetry(fetchEthTransaction, transactionHashes);
            
            if (dexdata.length != 0) {
              data.value = await mergeData(data.value, dexdata);
              displayCount.value = displayCount.value + 15;
            }

            loading.value = false;
            if (displayCount.value >= data.value.length) {
              finished.value = true;
            }
          } else if (filterOptions.chain == 'Base') {
            let dataSlice = data.value.slice(displayCount.value, displayCount.value + 15);
            const transactionHashes = dataSlice.map(item => item.transactionHash);
            
            let dexdata = await fetchTransactionWithRetry(fetchBaseTransaction, transactionHashes);
            
            if (dexdata.length != 0) {
              data.value = await mergeData(data.value, dexdata);
              displayCount.value = displayCount.value + 15;
            }

            loading.value = false;
            if (displayCount.value >= data.value.length) {
              finished.value = true;
            }
          }
        } catch (error) {
          console.error("Error in onLoad after 3 attempts:", error);
          loading.value = false;
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

      const handleChainFollowing = async () => {
        displayCount.value = 15;
        isLoading.value = true;

        try {
          const fetchData = async () => {
            if (filterOptions.chain == 'Base') {
              return await axios.get('https://app.banyan.top/api/getSocialWallet', {
                params: { 
                  fid: fid.value,
                  followers: filterOptions.followers,
                  amount: filterOptions.amount
                }
              });
            } else if (filterOptions.chain == 'Ethereum') {
              return await axios.get('https://app.banyan.top/api/getSocialWalletEth', {
                params: { 
                  fid: fid.value,
                  followers: filterOptions.followers,
                  amount: filterOptions.amount
                }
              });
            }
          };

          const response = await retryOperation(fetchData);
          data.value = await response.data;
        } catch (error) {
          console.error("Error fetching data after 3 attempts:", error);
        } finally {
          isLoading.value = false;
        }
      };

      return {
        fid,
        nofid,
        data,
        isLoading,
        themeVars,
        displayCount,
        onLoad,
        loading,
        finished,
        refreshing,
        onRefresh,
        fetchWithRetry,
        handleChainFollowing,
        show,
        swapPopupRef,
        followerOptions,
        amountOptions,
        applyFilter,
        showFilterPopup,
        filterOptions
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
    showPopup(item) {
      this.$router.push({ name: 'UserProfile', query: { username:item.fname} });
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
      this.show = true
    },
    async loginUser() {
      this.error = '';
      if (!this.fname) {
        this.error = 'Please enter a Warpcast Username';
        return;
      }
      
      try {
        const result = await this.fetchWithRetry(this.fname);
        if (result.result.users && result.result.users.length > 0) {
          let fid = result.result.users[0].fid
          window.location.href = `https://app.banyan.top/?fid=${fid}`;
        } else {
          this.error = 'User not found';
        }
      } catch (error) {
        console.error('Login error:', error);
        this.error = 'Please try again.';
      }
    },
    copyAddress() {
        const addressToCopy = this.userPopup.address;
        
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
    formatAddress,
    formatNumber,
    formatTime,
    formatFollow,
    formatUSD
  }
};
</script>


<style>
.loading-container, .loading-container-trending {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
}

.loading-container-trending {
  height: 85vh;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #16a34a;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.app-container {
  max-width: 450px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #ffffff;
}
.nav-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.nav-logo {
  max-height: 40px;
  width: auto;
  margin-bottom:10px;
}

.icon-section {
  display: flex;
  justify-content: right;
  align-items: center;
  height: 48px;
  width: 100%;
}

.icon-section i {
  display: block;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.icon-create{width: 20px;height: 20px;background: url(@/assets/images/create.png) no-repeat center;background-size: 100% 100%;cursor: pointer;margin-top: 30px;margin-right: 20px;outline: none;}

.homePage-log {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 70vh;
  width: 100%;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80%;
  max-width: 400px;
}

.text-log {
  text-align: center;
  font-size: 25px;
  margin-bottom: 20px;
}

.input-field {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.login-button {
  padding: 10px 20px;
  background-color: #16a34a;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-button:hover {
  background-color: #45a049;
}
.homepage-home {
  padding:10px 10px 70px 10px;
  height:100%;
}

.guide {
  font-size:12px;
  color:#546473;
}
.banyan-filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
}

.banyan-filter-title {
  font-size: 24px;
  font-weight: bold;
}

.banyan-filter-custom {
  font-size: 14px;
  color: #333;
  padding: 0 10px 0 0;
  line-height: normal;
}


.banyan-custom-dropdown {
  flex-shrink: 0;
  --van-dropdown-menu-title-active-text-color: #16a34a;
  --van-dropdown-menu-option-active-color: #16a34a;
}

.banyan-custom-dropdown .van-dropdown-menu__bar {
  height: auto;
  background-color: transparent;
  box-shadow: none;
}

.banyan-custom-dropdown :deep(.van-dropdown-menu__title::after) {
  display: none;
}

.banyan-custom-dropdown .van-dropdown-menu__item {
  padding: 0;
  background-color: transparent;
}

.banyan-custom-dropdown .van-dropdown-menu__title {
  font-size: 14px;
  color: #333;
  padding: 0 10px 0 0;
  line-height: normal;
}

.van-popup {
  max-width: 450px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

.homepage h2 {
  margin-bottom: 10px;
  font-size:15px;
  color:#24292e;
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

.text-copy {
  font-weight: bold;
  color: #666;
  background-color: #f8f8f8;
  padding: 0px 4px;
  border-radius: 6px;
  display: inline-block;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 12px;
  border: none;
  outline: none;
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

.buy-token {
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

.van-tabbar-item--active .van-tabbar-item__text {
  font-weight: bold;
  font-size:15px;
  max-width:450px;
}

.van-tabbar-item--inactive .van-tabbar-item__text {
  font-size:15px;
  max-width:450px;
}

.van-popup {
  z-index: 9999 !important;
  position: fixed !important;
  transform: translateZ(9999px);
}
</style>