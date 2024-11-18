<template>
  <div class="explore-container">
    <div class="explore-header">
      <span class="main-title">Explore</span>
    </div>
    
    <div class="search-wrapper">
      <div class="search-container">
        <span class="search-icon">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="debouncedSearch"
          placeholder="Search" 
          class="search-input"
          autofocus
        >
      </div>
      <button class="close-button" @click="$router.back()">
        Close
      </button>
    </div>

    <div v-if="hasSearched && !isContract && searchResults.length > 0" class="search-results">
      <div v-for="(user, index) in searchResults" :key="index" class="user-item" @click="navigateToUser(user.username)">
        <div class="user-avatar-container">
          <img :src="user.pfp_url" :alt="user.username" class="user-avatar">
        </div>
        <div class="user-info">
          <div class="user-name-wrapper">{{ user.username }}</div>
          <div class="follower-count">{{ formatFollow(user.follower_count) }} followers</div>
        </div>
      </div>
    </div>

    <div v-if="hasSearched && isContract && tokenData" class="search-results">
      <div class="token-list">
        <div class="token-item" :class="{ 'loading': isLoading }" @click="routeToSwapModal(tokenData.network, tokenData.address)">
          <div class="token-info">
            <div class="logo" :style="tokenAvatarStyle"></div>
            <div class="token-details">
              <div class="token-name">{{ tokenData.symbol }}</div>
              <div class="network-info">
                <img 
                  v-if="tokenData.network === 'base'" 
                  src="@/assets/images/network/base.png" 
                  alt="Base" 
                  class="network-icon-swap" 
                />
                <img 
                  v-if="tokenData.network === 'eth'" 
                  src="@/assets/images/network/ethereum.png" 
                  alt="Ethereum" 
                  class="network-icon-swap" 
                />
              </div>
            </div>
          </div>
          <div class="price-container">
            <div class="price" v-html="formatPrice(tokenData.price)"></div>
            <div class="price-change" :class="{ 
              'positive': tokenData.price_change_percentage > 0, 
              'negative': tokenData.price_change_percentage < 0 
            }">
              {{ tokenData.price_change_percentage > 0 ? '+' : ''}}{{ tokenData.price_change_percentage }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="isLoading" class="loading-state">
      Loading...
    </div>
    
    <div v-else-if="hasSearched && !isLoading && ((isContract && !tokenData) || (!isContract && searchResults.length === 0))" class="no-results">
      No results found
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { formatFollow, formatPrice } from '@/utils/utils.js';
import { throttle } from 'lodash';

export default {
  name: 'ExploreView',
  
  data() {
    return {
      searchQuery: '',
      searchResults: [],
      hasSearched: false,
      debounceTimer: null,
      isLoading: false,
      isContract: false,
      tokenData: null,
      error: null,
    }
  },

  computed: {
    tokenAvatarStyle() {
      if (!this.tokenData) return {};
      return this.tokenData.image_url && this.tokenData.image_url !== 'missing.png'
        ? { backgroundImage: `url(${this.tokenData.image_url})` }
        : { backgroundImage: `url(${require('@/assets/images/missing-icon.png')})` };
    }
  },

  methods: {
    formatFollow,
    formatPrice,
    debouncedSearch: throttle(function() {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.handleSearch()
      }, 500)
    }, 200),

    navigateToUser(username) {
      this.$router.push(`/user?username=${username}`)
    },

    async fetchWithRetry(fname, retries = 3) {
      const url = `https://api.neynar.com/v2/farcaster/user/search?q=${fname}&limit=5`
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          api_key: process.env.VUE_APP_NEYNAR_APIKEY
        }
      }

      try {
        const response = await fetch(url, options)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const result = await response.json()
        return result
      } catch (error) {
        console.error('API call failed:', error)
        if (retries > 0) {
          return await this.fetchWithRetry(fname, retries - 1)
        }
        return null
      }
    },

    validateSearch() {
      if (this.searchQuery.length < 2) {
        this.resetSearch();
        return false;
      }
      return true;
    },

    resetSearch() {
      this.hasSearched = false;
      this.searchResults = [];
      this.isLoading = false;
      this.error = null;
    },

    async handleSearch() {
      if (!this.validateSearch()) return;
      
      this.hasSearched = true;
      this.isLoading = true;
      this.error = null;
      
      try {
        if (this.searchQuery.startsWith('0x')) {
          this.isContract = await this.checkIsContract(this.searchQuery);
        } else {
          this.isContract = false;
          const result = await this.fetchWithRetry(this.searchQuery);
          if (result?.result?.users) {
            this.searchResults = result.result.users;
          } else {
            this.searchResults = [];
          }
        }
      } catch (error) {
        console.error('Search failed:', error);
        this.error = 'Search failed. Please try again.';
        this.searchResults = [];
      } finally {
        this.isLoading = false;
      }
    },
    async checkIsContract(address) {
      try {
        const baseResult = await this.fetchTokenInfo('base', address);
        if (baseResult) {
          this.tokenData = {
            address: baseResult.tokenData.attributes.address,
            image_url: baseResult.tokenData.attributes.image_url || 'missing.png',
            symbol: baseResult.tokenData.attributes.symbol,
            price: baseResult.tokenData.attributes.price_usd || 0,
            price_change_percentage: baseResult.priceData.attributes.price_change_percentage.h24,
            network: 'base',
          };
          return true;
        }
      } catch (error) {
        console.log('Not a Base contract');
      }

      try {
        const ethResult = await this.fetchTokenInfo('eth', address);
        if (ethResult) {
          this.tokenData = {
            address: ethResult.tokenData.attributes.address,
            image_url: ethResult.tokenData.attributes.image_url || 'missing.png',
            symbol: ethResult.tokenData.attributes.symbol,
            price: ethResult.tokenData.attributes.price_usd || 0,
            price_change_percentage: ethResult.priceData.attributes.price_change_percentage.h24,
            network: 'eth'
          };
          return true;
        }
      } catch (error) {
        console.log('Not an ETH contract');
      }

      return false;
    },

    async fetchTokenInfo(network, token, retries = 2) {
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

      try {
        return await fetchData();
      } catch (error) {
        console.error(`Error fetching token info (retries left: ${retries}):`, error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
          return this.fetchTokenInfo(network, token, retries - 1);
        }
        throw error;
      }
    },
    routeToSwapModal(network, token) {
      this.$router.push({
        name: 'swapmodal',
        query: { network, token }
      });
    },

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  },

  beforeUnmount() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  },
}
</script>

<style scoped>
.explore-container {
  max-width: 450px;
  margin: 0 auto;
  padding:20px 10px 70px 10px;
  background: #ffffff;
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

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 15px;
}

.search-container {
  position: relative;
  flex: 1;
  width: auto;
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

.close-button {
  padding: 8px 16px 8px 8px;
  background: none;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  white-space: nowrap;
}

.close-button:hover {
  color: #333;
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

.token-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-item.loading {
  opacity: 0.7;
  pointer-events: none;
}

.token-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.token-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-name {
  font-weight: 600;
  font-size: 15px;
  color: #24292e;
}

.network-info {
  display: flex;
  align-items: center;
}

.network-icon-swap {
  width: 16px;
  height: 16px;
}

.price-container {
  text-align: right;
}

.price {
  font-size: 15px;
  font-weight: bold;
  color: #24292e;
  margin-bottom: 4px;
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

.loading-state,
.no-results,
.error-message {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.error-message {
  color: #dc2626;
  background: #fef2f2;
  border-radius: 8px;
  margin-top: 12px;
}

@keyframes dot-animation {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.loading-state::after {
  content: '...';
  display: inline-block;
  animation: dot-animation 1.5s infinite;
}

@media (max-width: 480px) {
  .explore-container {
    padding: 16px 8px 60px;
  }
  
  .token-item,
  .user-item {
    padding: 8px;
  }
}
</style>
