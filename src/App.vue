<template>
  <div id="app">
    <div class="page-container">
      <router-view v-slot="{ Component }">
        <keep-alive :include="cachedViews">
          <component :is="Component" :key="$route.fullPath" />
        </keep-alive>
      </router-view>
    </div>

    <van-tabbar v-if="active != 10000" v-model="active" @change="onChange" class="custom-tabbar-app">
      <van-tabbar-item>
        <template #icon="props">
          <van-icon 
            :name="props.active ? 'friends' : 'friends-o'" 
            :color="props.active ? activeColor : inactiveColor"
            size="32"
          />
        </template>
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <van-icon 
            :name="props.active ? 'fire' : 'fire-o'" 
            :color="props.active ? activeColor : inactiveColor"
            size="32"
          />
        </template>
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <van-icon 
            :name="props.active ? 'gem' : 'gem-o'" 
            :color="props.active ? activeColor : inactiveColor"
            size="32"
          />
        </template>
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <van-icon 
            :name="props.active ? 'wap-home' : 'wap-home-o'" 
            :color="props.active ? activeColor : inactiveColor"
            size="32"
          />
        </template>
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { ref, onMounted, watch, computed } from 'vue';

const active = ref();
const store = useStore();
const route = useRoute();
const router = useRouter();
const activeColor = '#000000';
const inactiveColor = '#546473';

onMounted(() => {
  updateActiveTab(route.path)
})

const updateActiveTab = (path) => {
  if (path === '/') {
    active.value = 0
  } else if (path === '/trending') {
    active.value = 1
  } else if (path === '/explore' || path === '/search' || path === '/trades') {
    active.value = 2
  } else if (path === '/home') {
    active.value = 3
  } else if (path === '/swap') {
    active.value = 10000
  } else if (path === '/user') {
    active.value = 10001
  } 
}

const onChange = (index) => {
  const fid = computed(() => store.state.fid);

  if (index == 0) {
    router.push({
      path: '/',
      query: { fid: fid.value }
    });
  } else if (index == 1) {
    router.push('/trending');
  } else if (index == 2) {
    router.push('/explore');
  } else if (index == 3) {
    router.push({
      path: '/home',
    });
  }
};

const cachedViews = computed(() => {
  return ['HomeApp', 'TrenDing', 'UserHome', 'ExploreApp'];
});

watch(() => route.path, (newPath) => {
  updateActiveTab(newPath)
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-container {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 50px;
  -webkit-overflow-scrolling: touch;
}

#w3m-modal {
  z-index: 10000 !important;
}

.custom-tabbar-app {
  padding:0 10px;
  position: fixed !important;
  left: 49% !important;
  transform: translateX(-50%) !important;
  max-width: 430px !important;
  height: 50px !important;
  background-color: #ffffff !important;
  z-index: 100 !important;
}

.custom-tabbar-app :deep(.van-tabbar-item) {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 12px;
}

.custom-tabbar-app .van-icon {
  font-size: 25px !important;
}

.van-tabbar-item--active .van-tabbar-item__text {
  font-weight: bold;
  font-size: 15px;
  max-width: 450px;
}

.van-tabbar-item--inactive .van-tabbar-item__text {
  font-size: 15px;
  max-width: 450px;
}
</style>