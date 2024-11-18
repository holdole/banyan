import { createRouter, createWebHistory } from 'vue-router'
import HomeApp from './components/HomeApp.vue'
import CreateFrame from './components/CreateFrame.vue';
import SwapModal from './components/SwapModal.vue';
import UserProfile from './components/UserProfile.vue';
import TrenDing from './components/TrenDing.vue';
import UserHome from './components/UserHome.vue';
import ExploreApp from './components/ExploreApp.vue';
import SearchPage from './components/SearchPage.vue';
import FarcasterTrades from './components/FarcasterTrades.vue';

const routes = [
  { path: '/', component: HomeApp, name: 'homeApp', meta: { keepAlive: true }, props: true },
  { path: '/trending', component: TrenDing, name: 'trending', meta: { keepAlive: true }, props: true },
  { path: '/create', component: CreateFrame, name: 'createframe', props: true },
  { path: '/home', component: UserHome, name: 'userhome', meta: { keepAlive: true }, props: true },
  { path: '/explore', component: ExploreApp, name: 'exploreApp', meta: { keepAlive: true }, props: true },
  {path: '/search',name: 'Search',component: SearchPage},
  {path: '/trades',name: 'Trades',component: FarcasterTrades},
  {
    path: '/swap',
    component: SwapModal,
    name: 'swapmodal',
    props: route => ({ network:route.query.network, token: route.query.token, referrer: route.query.referrer })
  },
  {
    path: '/user',
    name: 'UserProfile',
    component: UserProfile,
    props: route => ({ username: route.query.username })
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router