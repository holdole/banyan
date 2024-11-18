// event-bus.js
import { reactive, readonly } from 'vue';

const state = reactive(new Map());

export const EventBus = {
  $on(event, callback) {
    if (!state.has(event)) {
      state.set(event, new Set());
    }
    state.get(event).add(callback);
  },
  $off(event, callback) {
    if (state.has(event)) {
      state.get(event).delete(callback);
    }
  },
  $emit(event, ...args) {
    if (state.has(event)) {
      for (const callback of state.get(event)) {
        callback(...args);
      }
    }
  }
};

export default readonly(EventBus);
