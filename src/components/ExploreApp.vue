<template>
  <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
  </div>
  <div v-else class="explore-container">
    <div class="homepage-home">
    <div class="explore-header">
      <span class="main-title">Explore</span>
    </div>
    
    <div class="search-container" @click="goToSearch">
      <input 
        type="text" 
        placeholder="Search" 
        class="search-input"
        readonly
      >
      <span class="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
    </div>

    <section class="section">
      <div class="section-header">
        <div class="title-container">
          <div class="token-title">Farcaster User Trades</div>
          <router-link to="/trades" class="see-more">See more</router-link>
        </div>
        <div class="timeframe-selector">
          <span 
            v-for="timeframe in timeframes" 
            :key="timeframe.value"
            :class="['timeframe-option', { active: selectedTimeframe === timeframe.value }]"
            @click="changeTimeframe(timeframe.value)"
          >
            {{ timeframe.label }}
          </span>
          <div v-if="timeframeLoading" 
             class="timeframe-spinner">
          </div>
        </div>
      </div>
      <div class="token-list">
        <div v-for="(item, index) in tokenData" :key="index" class="token-item" @click="routeToSwapModal(item.network, item.tokenId)">
          <div class="token-info">
            <div class="logo" :style="avatarStyles[index]"></div>
            <div class="token-details">
              <div class="token-name">
                <span class="name">{{ item.symbol }}</span>
                <span class="point">·</span>
                <img v-if="item.network == 'base'" src="@/assets/images/network/base.png" alt="Icon" class="network-icon-swap" />
                <img v-if="item.network == 'eth'" src="@/assets/images/network/ethereum.png" alt="Icon" class="network-icon-swap" />
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

    <section class="section">
      <div class="section-header">
        <div class="title-container">
          <div class="token-title">Farcaster Influencers</div>
          <!-- <a href="#" class="see-more">See more</a> -->
        </div>
      </div>
      <div v-for="(user, index) in influencers" :key="index" class="user-item" @click="navigateToUser(user.username)">
        <div class="user-avatar-container">
          <img :src="user.pfp_url" :alt="user.username" class="user-avatar">
        </div>
        <div class="user-info">
          <div class="user-name-wrapper">{{ user.username }}</div>
          <div class="follower-count">{{ user.followers }} followers</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div class="title-container">
          <div class="token-title">Onchain Influencers</div>
          <!-- <a href="#" class="see-more">See more</a> -->
        </div>
      </div>
      <div v-for="(user, index) in onchain" :key="index" class="user-item" @click="navigateToUser(user.username)">
        <div class="user-avatar-container">
          <img :src="user.pfp_url" :alt="user.username" class="user-avatar">
        </div>
        <div class="user-info">
          <div class="user-name-wrapper">{{ user.username }}</div>
          <div class="follower-count">{{ user.followers }} followers</div>
        </div>
      </div>
    </section>
  </div>
</div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { formatAddress, formatNumber, formatTime, formatFollow, formatUSD, formatPrice } from '@/utils/utils.js';

export default {
  name: 'HomeApp',
  data() {
    return {
      brands: [
        { id: 1, name: '0xff5a...1100', followers: '58' },
        { id: 2, name: 'crowdmuse.eth', followers: '67' },
        { id: 3, name: 'zora.gnars.eth', followers: '197' }
      ],
      influencers: [
        { pfp_url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/bc698287-5adc-4cc5-a503-de16963ed900/original', username: 'dwr.eth', followers: '484K' },
        { pfp_url: 'https://i.imgur.com/IzJxuId.jpg', username: 'vitalik.eth', followers: '384K' },
        { pfp_url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/1013b0f6-1bf4-4f4e-15fb-34be06fede00/original', username: 'jessepollak', followers: '444K' }
      ],
      onchain: [
        { pfp_url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/635dee2e-e4f9-4564-1c85-764b1154ed00/original', username: 'martin', followers: '27K' },
        { pfp_url: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/364edabb-9ab8-4578-be59-f414c86a3400/original', username: 'realitycrafter.eth', followers: '3.1K' },
        { pfp_url: 'https://i.imgur.com/PPdOvbs.jpg', username: '0xsun.eth', followers: '1.2K' }
      ],
    }
  },
  setup() {
      const fid = ref(null);
      const show = ref(null);
      const nofid = ref(false);
      const tokenData = ref([]);
      const isLoading = ref(true);
      const displayCount = ref(15);
      const loading = ref(false);
      const selectedTimeframe = ref('5m');
      const timeframeLoading = ref(false);

      const timeframes = [
        { label: '5m', value: '5m' },
        { label: '15m', value: '15m' },
        { label: '1h', value: '1h' },
        { label: '6h', value: '6h' },
        { label: '24h', value: '24h' },

      ];

      const fetchData = async (timeframe) => {
        try {
          const response = await axios.get('https://app.banyan.top/api/tradingAnalysis', {
            params: { timeframe }
          });
          return response;
        } catch (error) {
          console.error("Error fetching data:", error);
          throw error;
        }
      };

      const changeTimeframe = async (timeframe) => {        
        selectedTimeframe.value = timeframe;
        timeframeLoading.value = true;
        try {
          const response = await retryOperation(() => fetchData(timeframe));
          tokenData.value = await response.data;
          for (let i = 0; i < tokenData.value.length; i++) {
            for (let j = i + 1; j < tokenData.value.length; j++) {
              if (tokenData.value[i].tokenId === tokenData.value[j].tokenId) {
                tokenData.value.splice(j, 1);
                j--;
              }
            }
          }
        } catch (error) {
          console.error("Error fetching data after 3 attempts:", error);
        } finally {
          isLoading.value = false;
          timeframeLoading.value = false;
        }
      };

      onMounted(async () => {
        await changeTimeframe(selectedTimeframe.value);
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
        fid,
        nofid,
        tokenData,
        isLoading,
        displayCount,
        loading,
        show,
        avatarStyles,
        timeframes,
        selectedTimeframe,
        changeTimeframe,
        timeframeLoading
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
    goToSearch() {
      this.$router.push('/search')
    },
    navigateToUser(username) {
      this.$router.push({
        path: '/user',
        query: { username }
      });
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
  to {
    transform: rotate(360deg);
  }
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
  padding:10px 10px 20px 10px;
  height:100%;
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

.search-container {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px 8px 40px;
  border-radius: 8px;
  border: none;
  background-color: #f5f5f5;
  font-size: 16px;
  box-sizing: border-box;
  color: #666;
}

.search-input::placeholder {
  color: #666;
  font-size: 16px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.icon {
  width: 20px;
  height: 20px;
}

.section {
  margin-bottom: 20px;
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}

.token-title {
  font-size: 16px;
  font-weight: bold;
}

.see-more {
  color: #0066ff;
  text-decoration: none;
  font-size: 14px;
}

.token-list,
.influencer-list {
  display: flex;
  flex-direction: column;
}

.token-item,
.influencer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-info,
.influencer-info {
  display: flex;
  align-items: center;
}

.point {
  color: #546473;
  margin-left: 5px;
  margin-right:5px;
  font-size:15px;
}

.logo {
  width: 40px;
  height:40px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  margin-right:5px;
}

.network-icon-swap{
  width: 15px;
  height: 15px;
}

.token-details,
.influencer-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-name,
.influencer-name {
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

.title-with-timeframes {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeframe-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.timeframe-option {
  font-size: 14px;
  color: #999;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.timeframe-option:hover {
  background-color: #f5f5f5;
}

.timeframe-option.active {
  color: #000;
  font-weight: 500;
}

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
  to {
    transform: rotate(360deg);
  }
}

.section-header {
  margin-bottom: 12px;
}

.title-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-title {
  font-size: 16px;
  font-weight: bold;
}

.timeframe-selector {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 4px 0;
}

.timeframe-option {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 2px 4px;
  transition: all 0.2s ease;
}

.timeframe-option:hover {
  color: #000;
}

.timeframe-option.active {
  color: #000;
  font-weight: 500;
}

.see-more {
  color: #0066ff;
  text-decoration: none;
  font-size: 14px;
}

.token-list {
  transition: opacity 0.2s ease;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-item:hover,
.token-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.user-item:active,
.token-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.user-avatar-container {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-right: 5px;
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name-wrapper {
  color: #000;
  font-size: 15px;
  font-weight: 500;
}

.follower-count {
  color: #536471;
  font-size: 14px;
}

.timeframe-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}

.timeframe-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-left-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 4px;
}

.timeframe-option {
  font-size: 14px;
  color: #666;
  cursor: pointer;
  padding: 2px 4px;
  transition: all 0.2s ease;
}

.timeframe-option:hover {
  color: #000;
}

.timeframe-option.active {
  color: #000;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>