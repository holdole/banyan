<template>
  <div v-if="isLoading" class="loading-container">
    <div class="spinner"></div>
  </div>
  <div v-else class="explore-container">
    <van-config-provider :theme-vars="themeVars">
      <van-nav-bar left-arrow @click-left="$router.back()">
      </van-nav-bar>
    </van-config-provider>
 
    <div class="homepage-home">
      <div class="explore-header">
        <span class="main-title">Trades</span>
        <span class="banyan-filter-custom" @click="showFilterPopup = true">{{filterOptions.chain}}<van-icon name="arrow-down" class="ml-1" /></span>
      </div>
      <section class="section">
        <div class="token-list">
          <div v-for="(item, index) in tokenData" :key="index" class="token-item" @click="routeToSwapModal(item.network, item.tokenId)">
            <div class="token-info">
              <div class="logo" :style="avatarStyles[index]"></div>
              <div class="token-details">
                <div class="token-name">
                  <span class="name">{{ item.symbol }}</span>
                </div>
                <div class="buyAndSell">{{ formatTotalCount(item) }}</div>
              </div>
            </div>
            <div class="price-container">
              <div class="price" v-html="formatPrice(item.price)"></div>
              <div class="price-change" :class="{ 'positive': item.price_change_percentage > 0, 'negative': item.price_change_percentage < 0 }">
                {{ item.price_change_percentage > 0 ? '+' : ''}}{{ item.price_change_percentage }}%
              </div>
            </div>
          </div>
        </div>
      </section>
 
      <van-popup v-model:show="showFilterPopup" :z-index="9999" position="bottom" round :style="{ height: 'calc(100vh)', maxHeight: '45%' }">
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
          <van-field label="Time" class="filter-field">
            <template #input>
              <div class="custom-buttons">
                <button 
                  v-for="option in timeframes" 
                  :key="option.value" 
                  @click="filterOptions.time = option.value"
                  :class="['custom-button', { active: filterOptions.time === option.value }]"
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
 import { ref, onMounted, computed, reactive } from 'vue';
 import axios from 'axios';
 import { formatAddress, formatNumber, formatTime, formatFollow, formatUSD, formatPrice } from '@/utils/utils.js';
 
 export default {
  name: 'FarcasterTrades',
  setup() {
    const tokenData = ref([]);
    const isLoading = ref(true);
    const showFilterPopup = ref(false);
 
    const themeVars = reactive({
      navBarIconColor: '#000000',
      navBarTextColor: '#000000',
    });
 
    const filterOptions = reactive({
      chain: 'Ethereum',
      time: '5m'
    });
 
    const timeframes = [
      { label: '5m', value: '5m' },
      { label: '15m', value: '15m' },
      { label: '1h', value: '1h' },
      { label: '6h', value: '6h' },
      { label: '24h', value: '24h' },
    ];
 
    const fetchData = async (network, timeframe) => {
      try {
        const response = await axios.get('https://app.banyan.top/api/tradingAnalysisAll', {
          params: { 
            network: network.toLowerCase() === 'ethereum' ? 'eth' : 'base',
            timeframe 
          }
        });
        return response;
      } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
      }
    };
 
    const loadData = async (network, timeframe) => {
      isLoading.value = true;
      try {
        const response = await retryOperation(() => fetchData(network, timeframe));
        const newData = await response.data;
        const uniqueData = removeDuplicates(newData);
        tokenData.value = uniqueData;
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        isLoading.value = false;
      }
    };
 
    const applyFilter = async () => {
      showFilterPopup.value = false;
      await loadData(filterOptions.chain, filterOptions.time);
    };
 
    const removeDuplicates = (data) => {
      const seen = new Set();
      return data.filter(item => {
        if (seen.has(item.tokenId)) {
          return false;
        }
        seen.add(item.tokenId);
        return true;
      });
    };
 
    onMounted(async () => {
      await loadData(filterOptions.chain, filterOptions.time);
    });
 
    const avatarStyles = computed(() => {
      return tokenData.value.map(item => {
        if (item.image_url !== 'missing.png') {
          let logoUrl = item.image_url;
          return { backgroundImage: `url(${logoUrl})` };
        } else {
          return { backgroundImage: `url(${require('@/assets/images/missing-icon.png')})` };
        }
      });
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
 
    return {
      tokenData,
      isLoading,
      avatarStyles,
      showFilterPopup,
      filterOptions,
      timeframes,
      applyFilter,
      themeVars
    };
  },
  methods: {
    formatTotalCount(item) {
      return `${item.total_count}(${item.non_zero_value_count}/${item.zero_value_count})`;
    },
    routeToSwapModal(network, token) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) 
                      || /Android.*Version\/[0-9].[0-9]/.test(navigator.userAgent);
      
      const url = this.$router.resolve({
        name: 'swapmodal',
        query: { network, token }
      }).href;
 
      if (isMobile || isWebView) {
        this.$router.push({ name: 'swapmodal', query: { network, token } });
      } else {
        try {
          const newWindow = window.open(url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            throw new Error('Failed to open new window');
          }
        } catch (e) {
          console.warn('Failed to open new window, falling back to in-app navigation', e);
          this.$router.push({ name: 'swapmodal', query: { network, token } });
        }
      }
    },
    formatAddress,
    formatNumber,
    formatTime,
    formatFollow,
    formatUSD,
    formatPrice
  }
 };
 </script>
 
 <style scoped>
 .loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100%;
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
  to { transform: rotate(360deg); }
 }
 
 .explore-container {
  max-width: 450px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #ffffff;
 }
 
 .homepage-home {
  padding: 10px 10px 20px 10px;
  height: 100%;
 }
 
 .explore-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
 }
 
 .main-title {
  font-size: 24px;
  font-weight: bold;
 }
 
 .banyan-filter-custom {
  font-size: 14px;
  color: #333;
  padding: 0 10px 0 0;
  line-height: normal;
 }
 
 .section {
  flex: 1;
  width: 100%;
 }
 
 .token-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
 }
 
 .token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
 }
 
 .token-info {
  display: flex;
  align-items: center;
 }
 
 .logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  margin-right: 10px;
 }
 
 .token-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
 }
 
 .token-name {
  font-weight: bold;
  font-size: 15px;
  color: #24292e;
 }
 
 .buyAndSell {
  color: #546473;
  font-size: 13px;
 }
 
 .price-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
 }
 
 .price {
  font-size: 15px;
  font-weight: bold;
  color: #24292e;
 }
 
 .price-change {
  font-size: 14px;
 }
 
 .price-change.positive {
  color: #16a34a;
 }
 
 .price-change.negative {
  color: #dc2626;
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
 
 .custom-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
 }
 
 .custom-button {
  min-width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
 }
 
 .custom-button:hover {
  background: #e5e7eb;
 }
 
 .custom-button.active {
  background: #16a34a;
  color: white;
 }
 
 .custom-radio-group {
  --van-radio-checked-icon-color: #16a34a;
 }
 
 .apply-filter-btn {
  background-color: #16a34a;
  margin-top: 20px;
 }
 </style>