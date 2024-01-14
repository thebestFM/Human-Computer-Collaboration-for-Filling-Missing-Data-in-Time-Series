<template>
  <div id="map-container">
    <div id="map" style="height: 100vh;"></div>
    <div id="overlay-container" v-show="showOverlay">
      <button v-if="selectedMarker" @click="resetMap" class="map-button" :style="buttonStyle">取消选择</button>
      <svg class="map-svg-box" v-for="markInfo, idx in svgsBoxToShow" :key="idx"
        :style="{position: 'absolute', left: markInfo.pos.x - 50 + 'px', top: markInfo.pos.y - 50 + 'px'}" width="100" height="100">
        <rect x="10" y="10" width="80" height="40" stroke="black" fill="transparent" stroke-width="2"/>
        <line x1="10" y1="10" x2="30" y2="30" stroke="black" stroke-width="2"/>
        <line x1="10" y1="50" x2="30" y2="30" stroke="black" stroke-width="2"/>
      </svg>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import Papa from 'papaparse';

export default {
  name: 'MapComponent',
  data() {
    return {
      map: null,
      pointIcon: L.icon({
        iconUrl: require('@/assets/point.png'),//蓝色
        iconSize: [40, 40],
      }),
      // point2Icon: L.icon({
      //   iconUrl: require('@/assets/point2.png'),//紫色-用于选中点
      //   iconSize: [50, 50],
      // }),
      selectedMarker: null,
      tempArray: [],
      showOverlay: false,
      nearbyStationIds: [],//存储10公里范围内标记的ID
      airQualityData: [],//存储查找到的空气质量数据
      markersInMap: [],
      svgsBoxToShow: [] // 保存需要展示的图标svg

    };
  },
  mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom') || 11;

    this.markersInMap = []
    this.svgsBoxToShow = []

    this.map = L.map('map').setView([lat || 40, lng || 116.18], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const _this = this
    this.map.on('move', function() {
        console.log("地图正在移动");
        // 您可以在此处添加更多的逻辑，如获取地图的当前中心点等
        // const pos = this.map.latLngToLayerPoint(marker.getLatLng());
        if (_this.svgsBoxToShow == undefined) return
        for (let i=0; i<_this.svgsBoxToShow.length; i+=1) {
          const now_marker = _this.markersInMap[_this.svgsBoxToShow[i].arrId]
          const pos = _this.map.latLngToLayerPoint(now_marker.getLatLng())
          console.log(pos);
          console.log(now_marker);
          _this.svgsBoxToShow[i].pos = pos

          _this.map.whenReady(function() {
            // 使用私有属性 _icon 获取 DOM 元素
            var markerElement = now_marker._icon;

            if (markerElement) {
                console.log("Marker 的 DOM 元素: ", markerElement);
                // 在这里您可以对 DOM 元素进行操作
                console.log(markerElement.offsetLeft);
            }
          });
        }
    });


    this.loadStations();
  },
  methods: {
    loadStations() {
      fetch('/Data/station.csv')
        .then(response => response.text())
        .then(csv => {
          Papa.parse(csv, {
            header: true,
            complete: results => {
              results.data.forEach(station => {
                if (station.latitude && station.longitude) {
                    const marker = L.marker([station.latitude, station.longitude], {
                      icon: this.pointIcon, stationId: station.station_id, arrId: this.markersInMap.length,
                      latitude: station.latitude, longitude: station.longitude})
                      .addTo(this.map)
                      // .bindPopup(`<b>${station.name_chinese}</b><br>Station ID: ${station.station_id}`);
                    this.markersInMap.push(marker)
                    marker.stationId = station.station_id;
                    marker.arrId = this.markersInMap.length;
                    // console.log("station_id", station.station_id);

                    //点击事件监听器
                    marker.on('click', () => {
                      this.onMarkerClick(marker);
                      // console.log("Adding marker:", marker);
                    });
                    // marker.on('move', (e) => {
                    //   console.log(e);
                    // })
                }
              });
            }
          });
        });
    },

    onMarkerClick(marker) {
      // if (this.selectedMarker && this.selectedMarker !== marker) {
      //   //如果之前有选中的marker，恢复为小蓝标
      //   this.selectedMarker.setIcon(this.pointIcon);
      // }

      //更新当前选中的大紫标
      this.selectedMarker = marker;
      // marker.setIcon(this.point2Icon);

      //console.log(marker.options.stationId);

      this.selectedMarker = marker;
      // this.map.setView(marker.getLatLng(), 12);
      // this.map.zoomControl.disable();
      // this.map.scrollWheelZoom.disable();
      // this.map.dragging.disable();

      this.buttonStyle = {
        position: 'absolute',
        left: `50%`,
        top: `57%`,
        transform: 'translate(-50%, -50%)'
      };
      this.showOverlay = true;

      //计算10km范围
      const radius = 0.09; // 大约10公里的经纬度范围
      const latLng = marker.getLatLng();
      const latRange = [latLng.lat - radius, latLng.lat + radius];
      const lngRange = [latLng.lng - radius, latLng.lng + radius];

      this.nearbyStationIds = []; // 清空附近标记ID数组

      this.map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const layerLatLng = layer.getLatLng();
          if (layerLatLng.lat >= latRange[0] && layerLatLng.lat <= latRange[1] &&
              layerLatLng.lng >= lngRange[0] && layerLatLng.lng <= lngRange[1]) {
            // 处理并添加ID
            const stationId = layer.options.stationId.replace(/^0+/, ''); // 删除ID前面的0
            this.nearbyStationIds.push(stationId);
          }
        }
      });
      
      //加载范围点数据
      //this.loadAirQualityData(this.nearbyStationIds);

      // const overlayContainer = document.querySelector('#overlay-container');
      // const svgHTML = `
      //   <svg class="map-svg-box" style="position: absolute; left: 100px; top: 100px;" width="100" height="100">
      //     <rect x="10" y="10" width="80" height="80" stroke="black" fill="white" stroke-width="2"/>
      //   </svg>`;

      // overlayContainer.insertAdjacentHTML('beforeend', svgHTML);

      // 为附近的每个标记添加SVG矩形框
      this.svgsBoxToShow = []
      this.nearbyStationIds.forEach(id => {
        const nearbyMarker = this._findMarkerById(id);
        if (nearbyMarker) {
          this.drawSvgRefOR(nearbyMarker);
        }
      });
    },

    // 辅助函数来根据ID查找标记
    _findMarkerById(id) {
      let foundMarker = null;
      const normalizedId = id.toString().replace(/^0+/, ''); // 移除前导零

      this.map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          const markerId = layer.stationId.replace(/^0+/, ''); // 同样移除前导零
          if (markerId === normalizedId) {
            foundMarker = layer;
          }
        }
      });

      return foundMarker;
    },


    // 新方法来添加SVG矩形框
    drawSvgRefOR(marker) {
      const pos = this.map.latLngToLayerPoint(marker.getLatLng());
      this.svgsBoxToShow.push({arrId: marker.arrId, pos: pos})
      const overlayContainer = document.querySelector('#overlay-container');
      const svgHTML = `
        <svg class="map-svg-box" style="position: absolute; left: ${pos.x - 50}px; top: ${pos.y - 50}px;" width="100" height="100">
          <rect x="10" y="10" width="80" height="40" stroke="black" fill="transparent" stroke-width="2"/>
          <line x1="10" y1="10" x2="30" y2="30" stroke="black" stroke-width="2"/>
          <line x1="10" y1="50" x2="30" y2="30" stroke="black" stroke-width="2"/>
        </svg>`;
      overlayContainer.insertAdjacentHTML('beforeend', svgHTML);
    },

    loadAirQualityData(stationIds) {
      this.airQualityData = []; // 清空空气质量数据数组

      Papa.parse('/Data/airquality.csv', {
        download: true,
        header: true,
        step: (row) => {
          const data = row.data;
          const normalizedId = data.station_id.replace(/^0+/, ''); // 删除ID前面的0
          if (stationIds.includes(normalizedId)) {
            this.airQualityData.push(data); // 将数据添加到数组中
          }
        },
        complete: () => {
          console.log("Loaded air quality data: ", this.airQualityData);
        }
      });
    },

    resetMap() {
      if (this.selectedMarker) {
        const latLng = this.selectedMarker.getLatLng();
        this.tempArray.push(latLng);
        window.location.href = `${window.location.pathname}?lat=${latLng.lat}&lng=${latLng.lng}&zoom=11`;
      
        // 重置marker图标
        this.selectedMarker.setIcon(this.pointIcon);
        this.selectedMarker = null;
      }
      document.querySelectorAll('.map-svg-box').forEach(el => el.remove());
    },
  }
};
</script>

<style>
/* Leaflet CSS */
@import "~leaflet/dist/leaflet.css";

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#map-container {
  position: relative;
}

#overlay-container {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000; /* 确保容器在地图层之上 */
  display: flex; /* 可根据需要调整布局 */
  justify-content: center;
  align-items: center;
}

#overlay-container > * {
  pointer-events: auto; /* 确保容器内部的元素可以交互 */
}

.map-button {
  pointer-events: auto;
  cursor: pointer; /*鼠标悬停为手形*/
  height: 45px;
  width: 100px;
  padding: 10px;
  border: none;
  background-color: white;
  color: #007bff;
  border: 2px solid #007bff;
  font-size: 17px;
  font-family: "微软雅黑", sans-serif;
  border-radius: 5px;
}

.map-svg-box {
  position: absolute;
  pointer-events: none;
}

</style>