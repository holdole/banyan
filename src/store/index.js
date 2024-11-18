import { createStore } from 'vuex';

export default createStore({
  state: {
    address: null,
    fid: null,
  },
  mutations: {
    setAddress(state, address) {
      state.address = address;
    },
    setFid(state, fid) {
      state.fid = fid;
    },
  },
  actions: {
    updateAddress({ commit }, address) {
      commit('setAddress', address);
    },
    updateFid({ commit }, fid) {
      commit('setFid', fid);
    },
  },
});
