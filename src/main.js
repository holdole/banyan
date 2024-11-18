import { createApp } from 'vue';
import App from './App.vue';
import { Button, Field, NavBar, Form, Popup, Picker,ConfigProvider,RadioGroup, Radio,Icon, Tabbar, TabbarItem,List,PullRefresh,CellGroup,Cell,Image as VanImage, DropdownMenu,DropdownItem,Popover,Toast,Dialog } from 'vant';
import 'vant/lib/index.css';
import router from './router';
import store from './store';

import { VueQueryPlugin } from '@tanstack/vue-query'
import { WagmiProvider } from 'wagmi'
import { config } from './config'

const app = createApp(App);

app.use(WagmiProvider, config)
app.use(VueQueryPlugin)


app.use(Button).use(Field).use(NavBar).use(Form).use(Popup).use(Picker).use(ConfigProvider).use(Radio).use(RadioGroup).use(Icon).use(Tabbar).use(TabbarItem).use(List).use(PullRefresh).use(CellGroup).use(Cell).use(VanImage).use(DropdownMenu).use(DropdownItem).use(Popover).use(Toast).use(Dialog);
app.use(router);
app.use(store);


app.mount('#app');
