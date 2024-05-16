import {defineStore} from 'pinia'

const useMapStore = defineStore("mapStore",{
  state:() => ({
    MapState: 0,
    mouseState: 1
  }),

  actions: {
    setMapState(value) {
      this.MapState = value;
    },
    setMouseState(value) {
      this.mouseState = value;
    },
  }
})

//暴露useMapStore模块
export default useMapStore
