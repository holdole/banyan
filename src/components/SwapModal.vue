<template>
  <div class="app-container" v-if="isLoading">
    <van-config-provider :theme-vars="themeVars">
      <van-nav-bar 
        left-arrow 
        @click-left="$router.back()"
      />
    </van-config-provider>
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  </div>

  <div class="app-container" v-else>
    <van-config-provider :theme-vars="themeVars">
      <van-nav-bar :title="tokenTitle" left-arrow @click-left="$router.back()">
        <template #right>
          <van-icon name="share-o" size="20" @click="shareContent" />
        </template>
        <!-- <template #right>
          <div class="menu-container">
            <van-popover
              v-model:show="showPopover"
              :actions="actions"
              @select="onSelect"
              placement="bottom-end"
              theme="dark"
              class="custom-popover"
              :teleport="false"
              reference-element-selector=".menu-trigger"
            >
              <template #reference>
                <div class="menu-trigger">
                  <van-icon name="ellipsis" size="24" />
                </div>
              </template>
            </van-popover>
          </div>
        </template> -->
      </van-nav-bar>
    </van-config-provider>

    <van-pull-refresh v-model="isRefreshing" pulling-text="Pull down to refresh..."  loosing-text="Release to refresh..." loading-text="Loading..." @refresh="onRefresh">
    <div class="container-swap">
      <div class="header">
        <div class="logo" :style="avatarStyle"></div>
        <div class="title-container">
          <div class="left-content">
            <div class="title">{{tokenInfo.attributes.symbol}}</div>
            <div class="address-container">
              <div class="subtitle">{{formatAddress(tokenInfo.attributes.address)}}</div>
              <img src="@/assets/images/copy.png" alt="Swap Icon" class="copy-icon" @click="copyAddress">
              <div class="create-time">{{getTimeDifference(priceInfo.attributes.pool_created_at)}} Ago</div>
            </div>
          </div>
          <div class="price-container">
            <div class="price" v-html="formatPrice(tokenInfo.attributes.price_usd)"></div>
          </div>
        </div>
      </div>
      <div class="description">
        <div class="info-box">
          <span class="value">${{formatMarketCap(priceInfo.attributes.reserve_in_usd)}}</span>
          <span class="label">Liquidity</span>
        </div>
        <div v-if="tokenInfo.attributes.market_cap_usd != null" class="info-box">
          <span class="value">${{formatMarketCap(tokenInfo.attributes.market_cap_usd)}}</span>
          <span class="label">MKT Cap</span>
        </div>
        <div v-if="tokenInfo.attributes.fdv_usd != null" class="info-box">
          <span class="value">${{formatMarketCap(tokenInfo.attributes.fdv_usd)}}</span>
          <span class="label">FDV</span>
        </div>
      </div>

      <div class="values">
        <div class="value-box">
          <div class="time">5M</div>
          <div :class="['percentage', { positive: isPositive(priceInfo.attributes.price_change_percentage.m5), negative: !isPositive(priceInfo.attributes.price_change_percentage.m5) }]">
            {{priceInfo.attributes.price_change_percentage.m5}}%
          </div>
          <div class="volume">{{formatNumber(priceInfo.attributes.volume_usd.m5)}}</div>
        </div>
        <div class="value-box">
          <div class="time">1H</div>
          <div :class="['percentage', { positive: isPositive(priceInfo.attributes.price_change_percentage.h1), negative: !isPositive(priceInfo.attributes.price_change_percentage.h1) }]">
            {{priceInfo.attributes.price_change_percentage.h1}}%
          </div>
          <div class="volume">{{formatNumber(priceInfo.attributes.volume_usd.h1)}}</div>
        </div>
        <div class="value-box">
          <div class="time">24H</div>
          <div :class="['percentage', { positive: isPositive(priceInfo.attributes.price_change_percentage.h24), negative: !isPositive(priceInfo.attributes.price_change_percentage.h24) }]">
            {{priceInfo.attributes.price_change_percentage.h24}}%
          </div>
          <div class="volume">{{formatNumber(priceInfo.attributes.volume_usd.h24)}}</div>
        </div>
      </div>

      <div class="time-scale-selector">
        <button v-for="scale in timeScales" :key="scale" @click="changeTimeScale(scale)" :class="{ active: currentTimeScale === scale }">
          {{ scale }}
        </button>
      </div>

      <div class="chart-placeholder">
        <CandlestickChart v-if="tokenInfo.ohlcv" :data="tokenInfo.ohlcv" :scale="currentTimeScale"/>
        <div v-else class="loading-indicator">Loading chart data...</div>
      </div>

      <div class="homepage">
        <div class="swap-filter-container">
          <span class="swap-filter-title">Activities</span>
          <span class="banyan-filter-custom" @click="showFilterPopup = true">{{filterOptions.chain}}<van-icon name="arrow-down" class="ml-1" /></span>
        </div>
        <van-list v-model:loading="loading" :finished="finished" loading-text="loading" finished-text="No More" @load="onLoad">
          <van-cell v-for="(item, index) in activitiesData.slice(0, displayCount).filter(item => item.transaction)" :key="index" class="homepage-cell">
            <template #default>
              <div v-if="item.transaction" class="homepage-cell-template">
                <img :src="item.avatar_url" alt="avatar" class="avatar" @click="showPopupUser(item)">
                <div class="user-details">
                  <div class="user-title">
                    <span class="display-name">{{ item.display_name }}</span>
                    <span class="time">·</span>
                    <span class="time">{{ formatTime(item.transaction.Block.Time) }}</span>
                  </div>
                  <div class="user-followers">
                    <div class="text-item">
                      <span class="text-number">{{ formatFollow(item.followers) }}</span>
                      <span class="text-label">Followers</span>
                    </div>
                  </div>
                  <div class="user-address">
                    <img v-if="item.network == 'base'" src="@/assets/images/network/base.png" alt="Icon" class="network-icon" />
                    <img v-if="item.network == 'eth'" src="@/assets/images/network/ethereum.png" alt="Icon" class="network-icon" />
                    {{ formatAddress(item.address) }}
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

      <van-popup v-model:show="showFilterPopup" position="bottom" round :style="{ height: 'auto', maxHeight: '80%' }">
        <div class="filter-popup-content">
          <h3>Filter</h3>
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

      <van-tabbar v-model="active" class="custom-tabbar">
        <van-tabbar-item @click="routeToHome()">
          <template #icon>
            <span class="tabbar-text">
              Home
            </span>
          </template>
        </van-tabbar-item>
        <van-tabbar-item @click="showPopup()">
          <template #icon>
            <span class="tabbar-text">
              Swap
            </span>
          </template>
        </van-tabbar-item>
      </van-tabbar>
    </div>
  </van-pull-refresh>

  </div>
</template>


<script>
  import {  ref, reactive, onMounted, computed } from 'vue';
  import { formatAddress,formatNumber, formatTime,formatMarketCap,formatPrice,getTimeDifference,formatFollow,formatUSD } from '@/utils/utils.js';
  import SwapPopup from './SwapPopup.vue';
  import { showToast } from 'vant';
  import CandlestickChart from './CandlestickChart.vue';
  import axios from 'axios';
  import { debounce } from 'lodash';
  import {fetchBaseTransaction} from '@/utils/fetchBaseTransaction.js'
  import {fetchEthTransaction} from '@/utils/fetchEthTransaction.js'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router';

  export default {
    components: {
      SwapPopup,
      CandlestickChart,
    },
    props: {
      network:{},
      token: {},
      referrer: {},
      fid: {},
    },
    setup(props) {
      const tokenInfo = ref();
      const priceInfo = ref();
      const isLoading = ref(true)
      const isLoadingPriceChart = ref(true)
      const chartCanvas = ref(null);
      const show = ref(false);
      const showPopover = ref(false);
      const referrerWallet = ref();
      const activitiesData = ref([]);
      const displayCount = ref(10);
      const loading = ref(false);
      const finished = ref(false);
      const showFilterPopup = ref(false);
      const userPopup = ref(null);
      const showUser = ref(false);
      const userFname = ref(null);
      const isRefresh = ref(false);
      const store = useStore();
      const router = useRouter();
      const timeScales = ref(['1m', '5m', '15m', '1h', '4h', '1D'])
      const currentTimeScale = ref()
      const swapPopupRef = ref(null);
      const isRefreshing = ref(false);

      const filterOptions = reactive({
            chain: '',
            followers: 0,
            amount: 0
          });

      // const actions = [
      //   { text: 'Share', icon: 'share' },
      //   // { text: 'Group', icon: 'friends-o' },
      // ];

      // const onSelect = (action) => {        
      //   switch(action.text) {
      //     case 'Share':
      //       console.log('Share clicked');
      //       shareContent();
      //       break;
      //     case 'Group':
      //       console.log('Group clicked');
      //       shareToGroup();
      //       break;
      //     default:
      //       console.log('Unknown action:', action.text);
      //   }
      //   showPopover.value = false;
      // };

      // const shareContent = () => {
      //   const baseUrl = `https://app.banyan.top/api/frame/swap/${tokenInfo.value.network}/${tokenInfo.value.attributes.address}`;
      //   const castText = `Check my Banyan swap!`;
      //   window.parent.postMessage({
      //     type: "createCast",
      //     data: {
      //       cast: {
      //         text: castText,
      //         embeds: [baseUrl]
      //       }
      //     }
      //   }, "*");
      // };

      // const shareToGroup = () => {
      //   console.log("1")
      // };

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
        fetchActivities(tokenInfo.value.network, priceInfo.value.attributes.address);
      };

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

      const fetchTokenInfo = async (network, token, fid) => {
        try {
          const fetchData = async () => {
            const url = `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${token}`;
            const priceUrl = `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/tokens/${token}/pools`;

            const options = {
              method: 'GET',
              headers: {
                accept: 'application/json',
                'x-cg-pro-api-key': process.env.VUE_APP_COINGECKO_API
              }
            };

            const [response, response1] = await Promise.all([
              fetch(url, options),
              fetch(priceUrl, options)
            ]);

            if (!response.ok || !response1.ok) {
              throw new Error('API response was not ok');
            }

            const [result, result1] = await Promise.all([
              response.json(),
              response1.json()
            ]);

            return { tokenData: result.data, priceData: result1.data[0] };
          };

          const { tokenData, priceData } = await retryOperation(fetchData);

          tokenInfo.value = tokenData;
          priceInfo.value = priceData;
          tokenInfo.value.network = network;
        } catch (error) {
          console.error("Error fetching token info after retries:", error);
          router.push({
            name: 'homeApp',
            query: { fid: fid }
          });
        } finally {
          isLoading.value = false;
        }
      };

      const fetchTokenChartInfo = async (network, pool, baseOrQuote) => {
        try {
          const fetchData = async () => {
            let url;
            const baseUrl = `https://pro-api.coingecko.com/api/v3/onchain/networks/${network}/pools/${pool}/ohlcv/`;
            const commonParams = `&limit=240&currency=usd&token=${baseOrQuote}`;
            
            switch(currentTimeScale.value) {
              case '1m':
                url = `${baseUrl}minute?aggregate=1${commonParams}`;
                break;
              case '5m':
                url = `${baseUrl}minute?aggregate=5${commonParams}`;
                break;
              case '15m':
                url = `${baseUrl}minute?aggregate=15${commonParams}`;
                break;
              case '1h':
                url = `${baseUrl}hour?aggregate=1${commonParams}`;
                break;
              case '4h':
                url = `${baseUrl}hour?aggregate=4${commonParams}`;
                break;
              default:
                url = `${baseUrl}day?aggregate=1${commonParams}`;
            }
            const options = {
              method: 'GET',
              headers: {
                accept: 'application/json',
                'x-cg-pro-api-key': process.env.VUE_APP_COINGECKO_API
              }
            };
            const response = await fetch(url, options);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
          };
          const result = await retryOperation(fetchData);
          const ohlcvList = result.data.attributes.ohlcv_list;
          tokenInfo.value.ohlcv = ohlcvList.map(item => ({
            time: item[0],
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            volume: item[5]
          }));
        } catch (error) {
          console.error("Error fetching token chart data after retries:", error);
        } finally {
          isLoadingPriceChart.value = false;
        }
      };

      const fetchActivities = async (network, pool) => {
        activitiesData.value = [];
        loading.value = true;
        finished.value = false;

        try {
          const fetchData = async () => {
            return await axios.get('https://app.banyan.top/api/getActivitiesData', {
              params: {
                network,
                pool,
                followers: filterOptions.followers,
                amount: filterOptions.amount
              }
            });
          };

          const response = await retryOperation(fetchData);
          activitiesData.value = await response.data;

          if (activitiesData.value.length == 0) {
            finished.value = true;
          }
        } catch (error) {
          console.error("Error fetching activities data after retries:", error);
        } finally {
          loading.value = false;
        }
      };

      onMounted(async () => {
        let fid;
        
        try {
          const params = new URLSearchParams(window.location.search);
          fid = params.get('fid');
          if (Number(fid) > 0 && Number(fid) < 1000000) {
            store.dispatch('updateFid', fid);
          }

          const network = props.network;
          const token = props.token;
          referrerWallet.value = props.referrer;
          filterOptions.chain = network == 'eth' ? 'Ethereum' : 'Base';
          await fetchTokenInfo(network, token, fid);
          currentTimeScale.value = getTimeDifference([priceInfo.value.attributes.pool_created_at]);

          const isBaseToken = token == priceInfo.value.relationships.base_token.data.id.split("_")[1];
          const poolAddress = priceInfo.value.attributes.address;
          
          await Promise.all([
            fetchTokenChartInfo(
              network,
              poolAddress,
              isBaseToken ? 'base' : 'quote'
            ),
            fetchActivities(network, poolAddress)
          ]);
        } catch (error) {
          console.error("Error in token component initialization:", error);
          router.push({
            path: '/',
            query: { fid }
          });
        }
      });

      const avatarStyle = computed(() => {
          if (tokenInfo.value.attributes.image_url !== 'missing.png') {
              let logoUrl = tokenInfo.value.attributes.image_url;
              return { backgroundImage: `url(${logoUrl})` };
          } else {
              return { backgroundImage: `url(${require('@/assets/images/missing-icon.png')})` };
          }
      });

      const getTimeDifference = (dateString) => {
        const givenDate = new Date(dateString);
        const currentDate = new Date();

        const timeDiff = currentDate - givenDate;

        const secondsDiff = Math.floor(timeDiff / 1000);
        const minutesDiff = Math.floor(secondsDiff / 60);
        const hoursDiff = Math.floor(minutesDiff / 60);
        const daysDiff = Math.floor(hoursDiff / 24);

        let timeframeTitle

        if (hoursDiff < 1) {
          timeframeTitle = '1m';
        } else if (hoursDiff < 10) {
          timeframeTitle = '5m';
        } else if (daysDiff < 1) {
          timeframeTitle = '15m';
        } else if (daysDiff < 5) {
          timeframeTitle = '1h';
        } else if (daysDiff < 30) {
          timeframeTitle = '4h';
        } else {
          timeframeTitle = '1D';
        }

        return timeframeTitle
      }


      const themeVars = reactive({
        navBarIconColor: '#000000',
        navBarTextColor: '#000000',
      });

      const tokenTitle = computed(() => {
        return tokenInfo.value.attributes.name;
      });

      const showPopup = async () => {
        show.value = true
      };

      const routeToHome = async () => {
        const fid = store.state.fid
        router.push({
          path: '/',
          query: { fid: fid }
        });
      };

      const fetchTransactionWithRetry = async (fetchFunction, transactionHashes) => {
        const fetchOperation = async () => {
          return await fetchFunction(transactionHashes);
        };
        return await retryOperation(fetchOperation);
      };

      const onLoad = debounce(async () => {
        try {
          if (activitiesData.value.length == 0) return;
          let dataSlice = activitiesData.value.slice(
            displayCount.value,
            displayCount.value + 10
          );
          const transactionHashes = dataSlice.map(item => item.transactionHash);
          const fetchFunction = tokenInfo.value.network == 'eth' 
            ? fetchEthTransaction 
            : fetchBaseTransaction;

          const dexdata = await fetchTransactionWithRetry(fetchFunction, transactionHashes);

          if (dexdata.length != 0) {
            activitiesData.value = await mergeData(activitiesData.value, dexdata);
            displayCount.value = displayCount.value + 10;
          }

          loading.value = false;
          if (displayCount.value >= activitiesData.value.length) {
            finished.value = true;
          }
        } catch (error) {
          console.error("Error loading activities data after retries:", error);
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

      const changeTimeScale = async (scale) => {
        try {
          currentTimeScale.value = scale;
          isLoadingPriceChart.value = true;

          const token = props.token;
          const network = props.network;
          const poolAddress = priceInfo.value.attributes.address;
          const isBaseToken = token == priceInfo.value.relationships.base_token.data.id.split("_")[1];

          await fetchTokenChartInfo(
            network,
            poolAddress,
            isBaseToken ? 'base' : 'quote'
          );
        } catch (error) {
          console.error("Error changing time scale:", error);
        } finally {
          isLoadingPriceChart.value = false;
        }
      };

      const onRefresh = async () => {
        try {
          const network = props.network;
          const token = props.token;
          await fetchTokenInfo(network, token, store.state.fid);
          
          const isBaseToken = token == priceInfo.value.relationships.base_token.data.id.split("_")[1];
          const poolAddress = priceInfo.value.attributes.address;
          
          await Promise.all([
            fetchTokenChartInfo(
              network,
              poolAddress,
              isBaseToken ? 'base' : 'quote'
            ),
            fetchActivities(network, poolAddress)
          ]);
          
          displayCount.value = 10;
          
          showToast('Refresh successful');
        } catch (error) {
          console.error("Error refreshing data:", error);
          showToast('Refresh failed');
        } finally {
          isRefreshing.value = false;
        }
      };

      return {
        themeVars,
        tokenInfo,
        priceInfo,
        referrerWallet,
        isLoading,
        isLoadingPriceChart,
        tokenTitle,
        chartCanvas,
        show,
        showPopup,
        avatarStyle,
        showPopover,
        activitiesData,
        displayCount,
        onLoad,
        loading,
        finished,
        followerOptions,
        amountOptions,
        applyFilter,
        showFilterPopup,
        filterOptions,
        showUser,
        userPopup,
        userFname,
        isRefresh,
        onRefresh,
        isRefreshing,
        routeToHome,
        changeTimeScale,
        timeScales,
        currentTimeScale,
        swapPopupRef,
        // actions,
        // onSelect,
      };
    },
    methods: {
      showPopupUser(item) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) 
                          || /Android.*Version\/[0-9].[0-9]/.test(navigator.userAgent);

        const url = this.$router.resolve({
          name: 'UserProfile',
          query: { username: item.fname }
        }).href;

        if (isMobile || isWebView) {
          this.$router.push({ name: 'UserProfile', query: { username: item.fname } });
        } else {
          try {
            const newWindow = window.open(url, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              throw new Error('Failed to open new window');
            }
          } catch (e) {
            this.$router.push({ name: 'UserProfile', query: { username: item.fname } });
          }
        }
      },
      isPositive(value) {
        return value >= 0;
      },
      copyAddress() {
        const addressToCopy = this.tokenInfo.attributes.address;
        
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
      async shareContent(){
        const fid = this.$store.state.fid;
        console.log(fid)
        let result = await this.fetchWithRetryWithFid(fid)
        let address = result.users[0].verified_addresses.eth_addresses[0]
        console.log()
        const baseUrl = `https://app.banyan.top/api/frame/swap/${this.tokenInfo.network}/${this.tokenInfo.attributes.address}`;
        const finalUrl = address ? `${baseUrl}?referral=${address}` : baseUrl;

        const castText = `Check my Banyan swap!`;
        window.parent.postMessage({
          type: "createCast",
          data: {
            cast: {
              text: castText,
              embeds: [finalUrl]
            }
          }
        }, "*");
      },
      async fetchWithRetryWithFid (fid) {
        const fetchOperation = async () => {
          const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
          const options = {
            method: 'GET',
            headers: { 
              accept: 'application/json', 
              api_key: process.env.VUE_APP_NEYNAR_APIKEY 
            }
          };

          const response = await fetch(url, options);
          if (!response.ok) throw new Error('Failed to fetch user data');
          return await response.json();
        };
        return await this.retryOperation(fetchOperation);
      },
      async retryOperation (operation, maxAttempts = 3) {
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
      },
      formatAddress,
      formatNumber,
      formatTime,
      formatMarketCap,
      formatPrice,
      getTimeDifference,
      formatFollow,
      formatUSD
    }
  };
</script>

<style scoped>
.custom-popover {
  --van-popover-action-width: 200px;
  --van-popover-action-height: 44px;
}

.custom-action {
  text-align: left;
  padding: 0 16px;
  font-size: 16px;
  color: #333;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
}

.custom-action::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 1px;
  background-color: #e0e0e0;
}

.loading-container {display: flex;justify-content: center;align-items: center;height: 90vh;}
.spinner {border: 4px solid rgba(0, 0, 0, 0.1);border-left-color: #16a34a;border-radius: 50%;width: 30px;height: 30px;animation: spin 1s linear infinite;margin: auto;}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.custom-action:last-child::after {
  display: none;
}

.container-swap {
  width: 100%;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
  background:#ffffff;
}

.header {
  display: flex;
  align-items: center;
}

.logo {
  width: 65px;
  height: 56px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-left:10px;
}

.left-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.title {
  font-weight: bold;
  font-size: 20px;
}

.address-container {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.subtitle {
  font-size: 12px;
  margin-right: 5px;
}

.create-time{
  font-size: 12px;
}

.copy-icon {
  width: 12px;
  height: 12px;
  cursor: pointer;
  margin-right:5px;
}

.price-container {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.price {
  font-size: 25px;
  font-weight: bold;
  text-align: right;
}

.content {
  margin-bottom: 20px;
}

.description {
  display: flex;
  justify-content: flex-start;
  background-color: white;
  border-radius: 8px;
  padding: 20px 0 0 0;
}

.info-box {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  padding: 6px 4px;
  border-radius: 6px;
  margin-right: 5px;
}

.value {
  font-weight: bold;
  margin-right: 4px;
  font-size:10px;
}

.label {
  color: #24292e;
  font-size:10px;
}

.price-token {
  padding: 20px 0 0 0;
  border-radius: 8px;
}

.current-price {
  font-size: 15px;
  color: #24292e;
}


.price sub.subscript-normal {
  font-size: 0.6em;
  vertical-align: baseline;
  position: relative;
  bottom: -0.3em;
  font-weight: normal;
}

.price ::v-deep(sub.subscript-normal) {
  font-weight: normal;
}

.price-chart-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  padding: 20px 10px 10px 10px;
}

.chart-wrapper {
  flex-grow: 1;
  height: 180px;
  width: 100%;
  position: relative;
}


.time-label {
  font-size: 15px;
  color: #666;
  font-weight: bold;
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.values {
  display: flex;
  justify-content: space-between;
  margin-bottom:10px;
  margin-top:20px;
}

.value-box {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 10px 15px;
  text-align: center;
  flex: 1;
}

.time {
  font-size: 14px;
  color: #666;
}

.percentage {
  font-size: 16px;
  font-weight: bold;
  margin-top:3px;
}

.volume {
  font-size: 16px;
  font-weight: bold;
  margin-top:3px;
}

.time-scale-selector {
  display: flex;
  justify-content: flex-start;
  z-index: 10;
  margin-bottom:-20px;
}

.time-scale-selector button {
  margin-right: 10px;
  padding: 5px 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #888;
  font-weight: normal;
  transition: color 0.3s ease, font-weight 0.3s ease;
}

.time-scale-selector button.active {
  color: #000;
  font-weight: bold;
}

.chart-placeholder {
  min-height: 250px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-indicator {
  font-size: 16px;
  color: #666;
}

.positive {
  color: #4caf50;
}

.negative {
  color: #f44336;
}

.values {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  text-align: center;
}

.swap-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
}
.swap-content{
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.swap-icon {
  width: 40px;
  height: 40px;
  background-color: #F0F0F0;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer-image {
  width: 20px;
  height: 20px;
  display: block;
}

.swap-text {
  margin-top: 8px;
  font-size: 15px;
  color: #000;
}

.popup-content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60%;
}


.custom-tabbar {
  padding:0 10px;
  position: fixed !important;
  left: 49% !important;
  transform: translateX(-50%) !important;
  max-width: 430px !important;
  height: 50px !important;
  background-color: #ffffff !important;
}

.custom-tabbar :deep(.van-tabbar-item) {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 12px;
}

.tabbar-text {
  font-size: 15px;
  color: #7d7e80;
  transition: all 0.3s;
}

.tabbar-text-active {
  font-weight: bold;
  color: #000000;
}

.custom-tabbar :deep(.van-icon) {
  display: none;
}

.custom-tabbar :deep(.van-tabbar-item__text) {
  margin-top: 0;
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


.time {
  color: #546473;
  margin-left: 5px;
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

.network-icon{
  width: 15px;
  height: 15px;
  margin-right:5px;
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
  font-size:10px;
}
.menu-container {
  position: relative;
  display: flex;
  justify-content: flex-end;
  width: 24px;
}

.menu-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.custom-popover) {
  --van-popover-action-width: 40px;
  --van-popover-action-height: 40px;
}

:deep(.van-popover__content) {
  margin-right: -200px;
}
</style>