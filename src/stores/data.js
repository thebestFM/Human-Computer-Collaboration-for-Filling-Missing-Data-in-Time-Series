import { defineStore } from 'pinia';

const useDataStore = defineStore("dataStore", {
  state: () => ({
    missingData: [],
    predictData: [],
    realData: [],
    missingAndSavedData: [],
    dateTimes: []
  }),

  actions: {
    setMissingData(data) {
      this.missingData = data;
    },
    setPredictData(data) {
      this.predictData = data;
    },
    setRealData(data) {
      this.realData = data;
    },
    setMissingAndSavedData(data) {
      this.missingAndSavedData = data;
    },
    setDateTimes(data) {
      this.dateTimes = data;
    }
  }
});

// 暴露 useDataStore 模块
export default useDataStore;
