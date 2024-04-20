<template>
  <div id="map-container">
    <div id="map" style="height: 100vh;"></div>
    <div id="overlay-container">
      <div id="time-selector-container">
        <div style="display: flex; align-items: center; margin-right: 10px;">
          <button v-if="state === 0 || state === 1 || state === 4" @click="upInfo" class="map-button" style="margin-right: 5px;">
            <i class="fa-solid fa-angle-up"></i>
          </button>
          <button v-if="state === 2" @click="upInfo2" class="map-button" style="margin-right: 5px;">
            <i class="fa-solid fa-angle-up"></i>
          </button>
          <button v-if="state === 3" @click="downInfo" class="map-button" style="margin-right: 5px;">
            <i class="fa-solid fa-angle-down"></i>
          </button>
          <label style="font-family: 'Microsoft YaHei', sans-serif; font-weight: bold; font-size: 14px; color: #eff0fd;">数据时段:</label>
        </div>
        <input type="datetime-local" id="start-time" v-model="startTimeForPicker" :min="first" :max="end" style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #97A5C0; border: 2px solid #97A5C0;">
        <label style="font-family: 'Microsoft YaHei', sans-serif; font-weight: bold; font-size: 14px; color: #eff0fd; margin: 0 4px;">--</label>
        <input type="datetime-local" id="end-time" v-model="endTimeForPicker" :min="first" :max="end" style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #97A5C0; border: 2px solid #97A5C0;">
      </div>
      <button v-if="state === 1 || state === 4" @click="resetMap" class="map-button" :style="buttonStyle">
        <i class="fas fa-rotate-left"></i>
      </button>
      <button v-if="state === 1" @click="nextStep" class="map-button" :style="nextButtonStyle">
        <i class="fas fa-play"></i>
      </button>
      <button v-if="state === 2" @click="previousStep" class="map-button" :style="previousButtonStyle">
        <i class="fa-solid fa-angle-left"></i>
      </button>
      <button v-if="state === 2" @click="confirmSelection" class="map-button" :style="confirmButtonStyle">
        <i class="fas fa-play"></i>
      </button>
      <!-- <Transition :duration="550" name="moveup">
        <div v-if="show" class="one-image-container">
          <button v-if="state === 2" id="previousButton" @click="previousStep" class="on-button" :style="previousButtonStyle">
            <i class="fa-solid fa-angle-left"></i>
          </button>
          <button v-if="state === 2" id="confirmButton" @click="confirmSelection" class="on-button" :style="confirmButtonStyle">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </Transition> -->
      <div id="chartSelected-container" v-if="state === 1">
        <div id="svgSelectedOne"></div>
      </div>
      <div id="chartReference-container" v-if="state === 2">
        <div v-for="marker in elseMarkers" :key="marker.stationId" class="svg-container">
          <svg :id="'elseSvg' + marker.stationId" class="elseSvgClass" :style="boxStyle(marker)"></svg>
        </div>
      </div>

      <Transition :duration="550" name="moveup">
        <div v-if="show" class="chart-container">
          <div v-for="image in linedImages" :key="image.id" class="chartimg" :style="imageStyle(image)" :id="'chartimg-' + image.id">
            <svg :id="'svg' + image.id"></svg>
          </div>
        </div>
      </Transition>

      <button v-if="state === 3" @click="saveChanges" class="on-button" :style="saveButtonStyle">
        <i class="fa-regular fa-floppy-disk"></i>
      </button>
      <button v-if="state === 3" @click="backToStart" class="on-button" :style="backButtonStyle">
        <i class="fas fa-rotate-left"></i>
      </button>
      <button v-if="state === 3" @click="showLines" class="on-button" :style="showLinesButtonStyle">
        <i class="fa-solid fa-eye"></i>
      </button>

      <!-- <div class="chart-container" v-if="state === 3">
        <div v-for="image in linedImages" :key="image.id" class="chartimg" :style="imageStyle(image)" :id="'chartimg-' + image.id">
          <svg :id="'svg' + image.id"></svg>
        </div>
      </div>
      <button v-if="state === 3" @click="saveChanges" class="map-button" :style="saveButtonStyle">
        <i class="fa-regular fa-floppy-disk"></i>
      </button>
      <button v-if="state === 3" @click="backToStart" class="map-button" :style="backButtonStyle">
        <i class="fas fa-rotate-left"></i>
      </button> -->

    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import Papa from 'papaparse';
import * as d3 from 'd3';
import { nextTick } from 'vue';

export default {
  name: 'MapComponent',
  data() {
    return {
      map: null,
      // pointIcon: L.icon({
      //   iconUrl: require('@/assets/point.png'), // 蓝色
      //   iconSize: [40, 40],
      // }),
      // point2Icon: L.icon({
      //   iconUrl: require('@/assets/point2.png'), // 紫色-用于修改点
      //   iconSize: [50, 50],
      // }),
      // point3Icon: L.icon({
      //   iconUrl: require('@/assets/point3.png'), // 绿色打钩-用于参考点
      //   iconSize: [50, 50],
      // }),
      // point4Icon: L.icon({
      //   iconUrl: require('@/assets/point4.png'), // 金色打钩-用于鼠标对应点
      //   iconSize: [50, 50],
      // }),
      isshowLines: false,
      show: false,
      selectedMarker: null,
      tempArray: [],
      markersInMap:[],
      markersNearby:[],
      markersTemp:[],
      markersinfoSatisfied:[],
      airQualityData: [], // missing数据
      predictData:[],
      realData:[],
      MSData:[],
      savedData:[],
      dateTimes: [],
      first: '2014-05-01T01:00',
      end: '2015-04-30T22:00',
      startTime: '2014-09-04 22:00:00',
      endTime: '2014-09-07 02:00:00',
      state: 0,
      linedImages: [],
      missingDataIntervals:[],
      previousOneData:[],
      missingY:[],
      containerData: {},
      filledCircles:[],
      savePoints: [],
      svgBoxes: [],
      elseMarkers: [],
      missingTime: [],
      refDataUsed: [],
      valueUsed: [],
      xScale: null,
      yScale: null,
      weights: [],
      savedCircles: [],
      colorSequence: ['#F29A76', '#AED4DD', '#29AFD4', '#1E3B7A', '#A4ABD6', '#F9B800'],
      nextHue: 0,
      buttonStyle: {
        position: 'absolute',
        left: `50%`,
        top: `75%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      nextButtonStyle: {
        position: 'absolute',
        left: '50%',
        top: 'calc(75% + 40px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      previousButtonStyle: {
        position: 'absolute',
        left: `50%`,
        top: `75%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      confirmButtonStyle: {
        position: 'absolute',
        left: '50%',
        top: 'calc(75% + 40px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      // previousButtonStyle: {
      //   position: 'absolute',
      //     left: `452px`,
      //     top: `calc(50% - 20px)`,
      //     transform: 'translate(-50%, -50%)'
      // },
      // confirmButtonStyle: {
      //   position: 'absolute',
      //     left: `452px`,
      //     top: `calc(50% + 20px)`,
      //     transform: 'translate(-50%, -50%)'
      // },
      saveButtonStyle: {
        position: 'absolute',
        left: `calc(2% + 452px)`,
        top: `calc(60% - 20px)`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      backButtonStyle: {
        position: 'absolute',
        left: `calc(2% + 452px)`,
        top: `calc(60% + 20px)`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
      showLinesButtonStyle: {
        position: 'absolute',
        left: `calc(2% + 452px)`,
        top: `calc(60% + 60px)`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      },
    };
  },

  computed: {
    // startTime
    startTimeForPicker: {
      get() {
        // 'YYYY-MM-DD HH:mm:ss' -> 'YYYY-MM-DDTHH:mm'
        return this.startTime.replace(' ', 'T').substring(0, this.startTime.length - 3);
      },
      set(value) {
        // 'YYYY-MM-DDTHH:mm' -> 'YYYY-MM-DD HH:mm:ss'
        this.startTime = value.replace('T', ' ') + ':00';
      }
    },
    // endTime
    endTimeForPicker: {
      get() {
        return this.endTime.replace(' ', 'T').substring(0, this.endTime.length - 3);
      },
      set(value) {
        this.endTime = value.replace('T', ' ') + ':00';
      }
    }
  },

  mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom') || 11;

    this.markersInMap = []

    this.map = L.map('map', {zoomControl: false}).setView([lat || 40, lng || 116.18], zoom);
    // 'http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // // logo
    // const logoControl = L.control({position: 'topleft'});
    // logoControl.onAdd = function() {
    //   const div = L.DomUtil.create('div', 'logo');
    //   div.innerHTML = '<img src="' + require('@/assets/logo.png') + '"style="height: 4vh; display: block;">'; // 使用require引入Logo图片
    //   return div;
    // };
    // logoControl.addTo(this.map);

    this.loadStations();

    this.map.on('moveend', () => {
      // 地图移动
      this.refreshSvgRefOR();
    });

    this.map.on('zoomend', () => {
      // 地图缩放
      this.refreshSvgRefOR();
    });
  },

  watch: {
    // 监听 startTime 的变化
    startTime: {
      handler() {
        this.handleTimeChange();
        console.log('this.startTime: ', this.startTime);
        console.log('this.endTime: ', this.endTime);
      },
      deep: true,
    },
    // 监听 endTime 的变化
    endTime: {
      handler() {
        this.handleTimeChange();
        console.log('this.startTime: ', this.startTime);
        console.log('this.endTime: ', this.endTime);
      },
      deep: true,
    },
  },

  methods: {
    handleTimeChange() {
    // 根据不同的 state 执行不同的操作
      switch(this.state) {
        case 1: {
          const recentData = this.findData(this.selectedMarker.stationId, this.startTime, this.endTime, 1);
          console.log('recentData: ', recentData);
          if (recentData.length > 0) {
            this.drawSvgSelOR(recentData);
          }
          break;
        }
        case 2: {
          this.elseMarkers = this.markersNearby;
          this.elseMarkers.forEach(marker => {
            this.drawSvgRefOR(marker);
          });
          this.$nextTick(() => {
            const svgId = 'elseSvg' + this.selectedMarker.stationId;
            d3.select('#' + svgId).selectAll('rect')
              .style('stroke', '#FF8066');
          });
          break;
        }
        case 3: {
          this.carryOverlayImages();
          break;
        }
        case 4: {
          const recentData = this.findData(this.selectedMarker.stationId, this.startTime, this.endTime, 1);
          if (recentData.length > 0) {
            this.drawSvgSelOR(recentData);
          }
          break;
        }
        default:
          break;
      }
    },

    formatDateTime(dateTimeStr) {
      return dateTimeStr.replace('T', ' ') + ':00'; // 将 'T' 替换为一个空格并添加秒
    },

    loadStations() {
      fetch('/Data/station.csv')
      .then(response => response.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          complete: results => {
            results.data.forEach(station => {
              if (station.latitude && station.longitude) {
                const marker = L.circleMarker([station.latitude, station.longitude], {
                  stationId: station.station_id,
                  weight: 3,
                  color: "#7E89FE",
                  fillColor: '#fff',
                  fillOpacity: 1,
                  radius: 10
                }).addTo(this.map);

                // station_id的后两位
                const stationIdLastTwo = station.station_id.slice(-2);

                marker.bindTooltip(stationIdLastTwo, {
                  permanent: true,  // 永久显示
                  direction: 'center', // 在marker的中心显示
                  className: 'station-id-tooltip'
                });

                this.markersInMap.push(marker)
                marker.stationId = station.station_id;
                // console.log("station_id", station.station_id); 
              }
            });
          }
        });
      });

      console.log("startTime:", this.startTime);
      // 异步加载空气质量数据
      this.loadAllData().then(() => {
        console.log(this.airQualityData);
        console.log(this.predictData);
        this.markersInMap.forEach(marker => {
          marker.on('click', () => {
            this.onMarkerClick(marker); // 点击->选修改点
          });
        });
      });
    },

    onMarkerClick(marker) {
      this.map.setView(marker.getLatLng(), 11);

      if (this.selectedMarker && this.selectedMarker !== marker) {
        //如果之前有选中的marker则改回图标
        this.selectedMarker.setStyle({
          fillColor: "#fff",
          color: "#7E89FE"
        })
      }

      this.selectedMarker = marker;
      this.selectedMarker.stationId = marker.stationId;
      console.log("qqq:" + this.selectedMarker.stationId);

      //当前选中的更新图标
      marker.setStyle({
        fillColor: "#FCE57D", // 黄色
        color: "#F29A76" // 桃色
      })

      //计算范围 (10 -> 20km)
      this.calculateNearbyStations(marker, 0.1); // 经纬度差0.09对应约10公里

      // 如果找到的点少于2个，扩大到20km
      if (this.markersNearby.length <= 2) {
        this.calculateNearbyStations(marker, 0.2);
      }

      // console.log("markersNearby: " + this.markersNearby.length);

      const recentData = this.findData(marker.stationId, this.startTime, this.endTime, 1);
      console.log("ppp11", recentData);

      const hasMissingData = recentData.some(data => !this.isValidPM25(data.PM25_Concentration));
      console.log("ppp22", hasMissingData);

      if (hasMissingData) {
        this.state = 1;
      } else {
        this.state = 4; // 禁止下一步
      }

      nextTick(() => {
        if (recentData.length > 0) {
          this.drawSvgSelOR(recentData);
        }
      });
    },

    findData(stationId, startTime, endTime, opt) {
      const start = startTime.replace('T', ' ').substring(0, 19);
      const end = endTime.replace('T', ' ').substring(0, 19);

      const result = [];
      let dataToSearch = [];

      // 根据 opt 选择搜索原始数据或预测数据
      if (opt == 1) {
        dataToSearch = this.airQualityData;
      } else if (opt == 2) {
        dataToSearch = this.predictData;
      } else if (opt == 3) {
        dataToSearch = this.realData;
      } else if (opt == 4) {
        dataToSearch = this.MSData;
      }

      // 开始正序查找
      for (let index = 0; index < dataToSearch.length; index++) {
        const data = dataToSearch[index];
        if (data.time >= start && data.time <= end && data.station_id === stationId) {
          result.push(data);
        }
        // 一旦时间超过了 endTime，就可以停止搜索
        if (data.time > end) {
          break;
        }
      }

      return result;
    },

    findSavedData(stationId, startTime, endTime) {
      const start = startTime.replace('T', ' ').substring(0, 19);
      const end = endTime.replace('T', ' ').substring(0, 19);

      const result = [];

      // 直接遍历 this.savedData，这里假定 this.savedData 是乱序的
      for (let index = 0; index < this.savedData.length; index++) {
        const data = this.savedData[index];
        if (data.time >= start && data.time <= end && data.station_id === stationId) {
          result.push(data);
        }
      }

      return result;
    },

    // findIndexByTime(targetTime) {
    //   let low = 0;
    //   let high = this.dateTimes.length - 1;

    //   while (low <= high) {
    //     const mid = Math.floor((low + high) / 2);
    //     const midTime = this.dateTimes[mid];

    //     if (midTime < targetTime) {
    //       low = mid + 1;
    //     } else if (midTime > targetTime) {
    //       high = mid - 1;
    //     } else {
    //       return mid; // 找到匹配的时间
    //     }
    //   }

    //   return -1; // 没有找到精确匹配的时间
    // },
    
    drawSvgSelOR(data) {
      // 清除原来的
      d3.select('#chartSelected-container').selectAll('*').remove();

      // 计算SVG位置和尺寸
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const svgWidth = 300;
      const svgHeight = 120;

      // 创建SVG元素
      const svg = d3.select('#chartSelected-container').append('svg').classed('svgSelectedOne', true)
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('style', `position: absolute; left: ${screenWidth / 2 - svgWidth / 2}px; top: ${screenHeight * 0.2}px;`)
        .style('background-color', 'white')
        .style('border', '2px solid #FF8066')
        .style('border-radius', '4px')
        .style('z-index','2000')
        .style('opacity','0.9');
      
      const margin = { top: 10, right: 20, bottom: 20, left: 35 };
      const innerWidth = svgWidth - margin.left - margin.right;
      const innerHeight = svgHeight - margin.top - margin.bottom;

      // 画布
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      // 比例尺
      this.xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.time)))
        .range([0, innerWidth]);

      this.yScale = d3.scaleLinear()
        .domain([0, Math.ceil((d3.max(data, d => +d.PM25_Concentration) + 50) / 20) * 20]) // 让y轴最大值是20的倍数
        .range([innerHeight, 0]);

      // 坐标轴
      g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(this.xScale));

      g.append("g")
        .call(d3.axisLeft(this.yScale).ticks(d3.max(data, d => +d.PM25_Concentration) / 20));

      // 绘制曲线
      this.missingDataIntervals = [];
      this.missingY = [];
      const segments = this.splitDataIntoSegmentsSel(data);
      //console.log("missingDataIntervals: " + JSON.stringify(this.missingDataIntervals, null, 2));
      segments.forEach(segment => {
        if (segment.length === 1) {
          // 如果数据段只包含一个数据点，绘制一个点
          const singleDataPoint = segment[0];
          g.append("circle")
            .attr("cx", this.xScale(new Date(singleDataPoint.time)))
            .attr("cy", this.yScale(+singleDataPoint.PM25_Concentration))
            .attr("r", 1.5) // 点的半径，可以根据需要调整
            .attr("fill", "#009EFA");
        } else {
          // 如果数据段包含多个数据点，绘制线段
          g.append("path")
            .datum(segment)
            .attr("fill", "none")
            .attr("stroke", "#009EFA")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
              .x(d => this.xScale(new Date(d.time)))
              .y(d => this.yScale(+d.PM25_Concentration))
            );
        }
      });

      this.missingTime = [];
      // 绘制缺失数据的紫色虚线矩形框
      this.missingDataIntervals.forEach((interval, index) => {
        this.missingTime.push(new Date(interval.start), new Date(interval.end));

        // 获取对应的前一个有效数据点的时间
        const previousValidTime = this.previousOneData[index] ? this.previousOneData[index].time : interval.start;
        const startX = this.xScale(new Date(previousValidTime)); // 基于前一个有效数据点的时间计算startX
        const endX = this.xScale(new Date(interval.end));
        const rectWidth = endX - startX;
        
        // 调整稍窄
        const adjustedWidth = rectWidth > 6 ? rectWidth - 6 : rectWidth;
        const adjustedStartX = startX + (rectWidth - adjustedWidth) / 2;

        g.append("rect")
          .attr("x", adjustedStartX)
          .attr("y", 0)
          .attr("width", adjustedWidth)
          .attr("height", innerHeight)
          .style("stroke", "#7E89FE")
          .style("fill", "none")
          .style("stroke-dasharray", ("3, 3"));
      });
      console.log(this.missingTime);
    },

    drawSvgOn1(data) {
      // 清除原来的
      d3.select('#one-image-container').selectAll('*').remove();

      // 计算SVG位置和尺寸
      const screenWidth = 490;
      const screenHeight = 200;
      const svgWidth = 390;
      const svgHeight = 156;
      // const buttonleft = 452;

      // 创建SVG元素
      const svg = d3.select('#one-image-container').append('svg').classed('ImageOn1', true)
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('style', `position: absolute; left: ${(screenWidth - 76) / 2 - svgWidth / 2}px; top: ${screenHeight * 0.48}px;`)
        .style('background-color', 'white')
        .style('border-radius', '4px')
        .style('z-index','2000')
        .style('opacity','0.9');
      
      const margin = { top: 10, right: 20, bottom: 20, left: 35 };
      const innerWidth = svgWidth - margin.left - margin.right;
      const innerHeight = svgHeight - margin.top - margin.bottom;

      // 画布
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      // 比例尺
      this.xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.time)))
        .range([0, innerWidth]);

      this.yScale = d3.scaleLinear()
        .domain([0, Math.ceil((d3.max(data, d => +d.PM25_Concentration) + 50) / 20) * 20]) // 让y轴最大值是20的倍数
        .range([innerHeight, 0]);

      // 坐标轴
      g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(this.xScale));

      g.append("g")
        .call(d3.axisLeft(this.yScale).ticks(d3.max(data, d => +d.PM25_Concentration) / 20));

      // 绘制曲线
      this.missingDataIntervals = [];
      this.missingY = [];
      const segments = this.splitDataIntoSegmentsSel(data);
      //console.log("missingDataIntervals: " + JSON.stringify(this.missingDataIntervals, null, 2));
      segments.forEach(segment => {
        if (segment.length === 1) {
          // 如果数据段只包含一个数据点，绘制一个点
          const singleDataPoint = segment[0];
          g.append("circle")
            .attr("cx", this.xScale(new Date(singleDataPoint.time)))
            .attr("cy", this.yScale(+singleDataPoint.PM25_Concentration))
            .attr("r", 1.5) // 点的半径，可以根据需要调整
            .attr("fill", "#009EFA");
        } else {
          // 如果数据段包含多个数据点，绘制线段
          g.append("path")
            .datum(segment)
            .attr("fill", "none")
            .attr("stroke", "#009EFA")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
              .x(d => this.xScale(new Date(d.time)))
              .y(d => this.yScale(+d.PM25_Concentration))
            );
        }
      });

      this.missingTime = [];
      // 绘制缺失数据的紫色虚线矩形框
      this.missingDataIntervals.forEach((interval, index) => {
        this.missingTime.push(new Date(interval.start), new Date(interval.end));

        // 获取对应的前一个有效数据点的时间
        const previousValidTime = this.previousOneData[index] ? this.previousOneData[index].time : interval.start;
        const startX = this.xScale(new Date(previousValidTime)); // 基于前一个有效数据点的时间计算startX
        const endX = this.xScale(new Date(interval.end));
        const rectWidth = endX - startX;
        
        // 调整稍窄
        const adjustedWidth = rectWidth > 6 ? rectWidth - 6 : rectWidth;
        const adjustedStartX = startX + (rectWidth - adjustedWidth) / 2;

        g.append("rect")
          .attr("x", adjustedStartX)
          .attr("y", 0)
          .attr("width", adjustedWidth)
          .attr("height", innerHeight)
          .style("stroke", "#7E89FE")
          .style("fill", "none")
          .style("stroke-dasharray", ("3, 3"));
      });
      console.log(this.missingTime);
    },

    calculateNearbyStations(marker, radius) {
      const latLng = marker.getLatLng();
      const latRange = [latLng.lat - radius, latLng.lat + radius];
      const lngRange = [latLng.lng - radius, latLng.lng + radius];

      this.markersTemp = [];
      this.markersinfoSatisfied = [];
      this.markersNearby = [];

      this.map.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          const layerLatLng = layer.getLatLng();
          if (layerLatLng.lat >= latRange[0] && layerLatLng.lat <= latRange[1] &&
              layerLatLng.lng >= lngRange[0] && layerLatLng.lng <= lngRange[1]) {
            
            // 计算距离
            const distance = Math.sqrt(
              Math.pow(layerLatLng.lat - latLng.lat, 2) + 
              Math.pow(layerLatLng.lng - latLng.lng, 2)
            );

            // 计算方向
            const direction = Math.atan2(layerLatLng.lng - latLng.lng, layerLatLng.lat - latLng.lat) * (180 / Math.PI);
            const adjustedDirection = (direction + 360) % 360; // 转换为0~360°

            this.markersTemp.push({ circleMarker: layer, distance, direction: adjustedDirection });
          }
        }
      });

      // 按距离升序排序
      this.markersTemp.sort((a, b) => a.distance - b.distance);

      // 筛选满足条件的markers
      this.markersTemp.forEach(markerinfo => {
        const isSatisfied = this.markersinfoSatisfied.every(m => 
          Math.abs(m.direction - markerinfo.direction) > 20 // 20度
        );
        if (isSatisfied) {
          this.markersinfoSatisfied.push(markerinfo);
        }
      });

      // 将满足条件的markers push到markersNearby
      this.markersinfoSatisfied.forEach(m => {
        this.markersNearby.push(m.circleMarker);
      });
    },

    splitDataIntoSegmentsSel(data) {
      let segments = [];
      let currentSegment = [];
      let potentialMissingStart = data[0] ? data[0].time : null; // 初始化可能的缺失开始时间
      let lastValidData = null; // 用于存储最后一个有效数据点
      let lastValidPM25 = null; // 存储最后一个有效PM25值

      this.previousOneData = []; // 重置前一个有效数据点的数组
      this.missingY = []; // 重置missingY数组，用于存储每段缺失数据的PM25范围

      data.forEach((d, index) => {
        if (this.isValidPM25(d.PM25_Concentration)) {
          if (potentialMissingStart && currentSegment.length === 0 && index > 0) {
            // 记录每段缺失前一个有效数据
            this.previousOneData.push(lastValidData);

            // 记录缺失数据的起始和结束时间
            this.missingDataIntervals.push({
              start: potentialMissingStart,
              end: d.time
            });

            // 记录每段缺失数据前后有效数据的PM25值
            this.missingY.push({
              startY: lastValidPM25,
              endY: +d.PM25_Concentration
            });
          }
          currentSegment.push(d);
          lastValidData = d; // 更新最后一个有效数据点
          lastValidPM25 = +d.PM25_Concentration; // 更新最后一个有效PM25值
          potentialMissingStart = null; // 重置潜在的缺失开始时间
        } else {
          if (currentSegment.length > 0) {
            segments.push(currentSegment); // 结束当前段并开始新的段
            currentSegment = [];
          }
          if (index === 0 || this.isValidPM25(data[index - 1].PM25_Concentration)) {
            potentialMissingStart = d.time; // 更新潜在的缺失开始时间
          }
        }
      });

      if (currentSegment.length > 0) {
        segments.push(currentSegment); // 添加最后一个有效的数据段
      }

      // 如果数据以无效值结束，记录最后一段缺失的前一个有效数据和PM25值
      if (potentialMissingStart && lastValidData) {
        this.previousOneData.push(lastValidData);
        this.missingDataIntervals.push({
          start: potentialMissingStart,
          end: data[data.length - 1].time
        });
        this.missingY.push({
          startY: lastValidPM25,
          endY: null // 如果没有后续有效数据，结束PM25值设为null
        });
      }

      return segments;
    },

    splitDataIntoSegments(data) {
      let segments = [];
      let currentSegment = [];

      data.forEach(d => {
        if (this.isValidPM25(d.PM25_Concentration)) {
          // 如果当前数据有效，加到当前段
          currentSegment.push(d);
        } else if (currentSegment.length > 0) {
          segments.push(currentSegment); // 将当前段加到结果数组中
          currentSegment = [];
        }
      });

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      return segments;
    },

    isValidPM25(value) {
      return value !== null && value !== undefined && !isNaN(value);
    },

    loadAllData() {
      return Promise.all([this.loadMissingData(), this.loadPredictData(), this.loadRealData(), this.loadSavedData(), this.loadMSData()]);
    },

    loadRealData() {
      return d3.text('/Data/pm25_ground.txt').then(text => {
        const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
          const time = d.datetime.replace(/\//g, '-'); // 将日期格式从2014/05/01改为2014-05-01
          this.dateTimes.push(time); // 存储datetime值
          return columns.slice(1).map(stationId => ({
            station_id: stationId,
            time: time,
            PM25_Concentration: +d[stationId] || null
          }));
        });

        this.realData = parsedData.flat().filter(d => d);
        // console.log("this.realData: ", this.realData);
      });
    },

    loadMSData() {
      return d3.text('/Data/mydata/pm25_missing.txt').then(text => {
        const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
          const time = d.datetime.replace(/\//g, '-'); // 将日期格式从2014/05/01改为2014-05-01
          this.dateTimes.push(time); // 存储datetime值
          return columns.slice(1).map(stationId => ({
            station_id: stationId,
            time: time,
            PM25_Concentration: +d[stationId] || null
          }));
        });

        this.MSData = parsedData.flat().filter(d => d);
      });
    },

    loadSavedData() {
      return d3.text('/Data/pm25_saved.txt').then(text => {
        const data = d3.dsvFormat(',').parse(text, d => ({
          station_id: d.Station,
          time: d.Time.replace(/\//g, '-'),
          PM25_Concentration: parseFloat(d.Saved)
        }));

        const uniqueDataMap = {};
        // 创建一个键值对，用于存储每个独特的 station_id 和 time 组合的最后一条记录
        data.forEach(entry => {
          const key = `${entry.station_id}-${entry.time}`;
          uniqueDataMap[key] = entry;  // 相同的键将被新值覆盖，只保留最后一个
        });

        // 将对象转换回数组格式，并赋值给 savedData
        this.savedData = Object.values(uniqueDataMap);
        // console.log("this.savedData: ", this.savedData);
      });
    },

    loadMissingData() {
      return d3.text('/Data/pm25_missing.txt').then(text => {
        const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
          const time = d.datetime.replace(/\//g, '-'); // 将日期格式从2014/05/01改为2014-05-01
          this.dateTimes.push(time); // 存储datetime值
          return columns.slice(1).map(stationId => ({
            station_id: stationId,
            time: time,
            PM25_Concentration: +d[stationId] || null
          }));
        });

        this.airQualityData = parsedData.flat().filter(d => d);
      });
    },

    loadPredictData() {
      return d3.text('/Data/pm25_predict.txt').then(text => {
        const rows = text.split('\n').filter(d => d); // 分割每一行并过滤掉空行
        const parsedData = rows.map((row, rowIndex) => {
          const values = row.split(','); // 根据逗号分割每一列
          return values.map((value, columnIndex) => {
            return {
              station_id: `0010${String(columnIndex + 1).padStart(2, '0')}`, // 生成station_id
              time: this.dateTimes[rowIndex], // 使用对应的datetime值
              PM25_Concentration: +value || null
            };
          });
        });

        this.predictData = parsedData.flat().filter(d => d);
      });
    },

    resetMap() {
      this.state = 0;
      if (this.selectedMarker) {
        const latLng = this.selectedMarker.getLatLng();
        this.map.setView(latLng, 11); // 设置地图视图为当前标记的位置，缩放级别为11

        // 重置selectedMarker
        // this.selectedMarker.setIcon(this.pointIcon);
        this.selectedMarker.setStyle({
          fillColor: "#fff",
          color: "#7E89FE"
        })
        // this.selectedMarker = null;
      }
    },

    upInfo() {

    },

    upInfo2() {

    },

    downInfo() {

    },

    nextStep() {
      this.state = 2;

      // 删预览图
      d3.select('#chartSelected-container svg.svgSelectedOne')
        .remove();

      // this.map.setView(this.selectedMarker.getLatLng(), 13);

      // 改变参考点的图标
      this.markersInMap.forEach(marker => {
        if (this.markersNearby.includes(marker) && marker !== this.selectedMarker) {
          // marker.setIcon(this.point3Icon);
          marker.setStyle({
            fillColor: "#FCE57D",
            color: "#7E89FE"
          })
        }
      });

      // this.calWeight();
      // this.drawCalLine();

      // 点击->选参考点
      this.markersInMap.forEach(marker => {
        marker.off('click').on('click', () => {
          this.toggleMarker(marker);
        });
      });

      // 处理elseSvg的小图
      this.elseMarkers = this.markersNearby;
      this.elseMarkers.forEach(marker => {
        this.drawSvgRefOR(marker);
      });
      this.$nextTick(() => {
        const svgId = 'elseSvg' + this.selectedMarker.stationId;
        d3.select('#' + svgId).selectAll('rect')
          .style('stroke', '#FF8066');
      });

      // // 移动
      // nextTick(() => {
      //   this.show = !this.show;
      //   const timeSelectorContainer = document.getElementById('time-selector-container');
      //   if (timeSelectorContainer) {
      //     timeSelectorContainer.style.bottom = '200px';
      //   }
      // });
    },

    drawCalLine() {
      d3.select('#chartSelected-container svg.svgSelectedOne').selectAll('.calLine').remove();

      this.calValuesUsed();
      // console.log("this.valueUsed: " + JSON.stringify(this.valueUsed, null, 2));

      if (!this.yScale) {
        console.error("xScale 或 yScale 未设置");
        return;
      }

      const svg = d3.select('#chartSelected-container svg.svgSelectedOne');
      const g = svg.select("g");

      // 间断超过1h分段
      const cutData = (data) => {
        const segments = [];
        let segment = [];
        for (let i = 0; i < data.length - 1; i++) {
          segment.push(data[i]);
          const currentTime = new Date(data[i].time);
          const nextTime = new Date(data[i + 1].time);
          const timeDiff = (nextTime - currentTime) / 1000 / 60 / 60;
          if (timeDiff > 1) {
            segments.push(segment);
            segment = [];
          }
        }
        segment.push(data[data.length - 1]);
        segments.push(segment);
        return segments;
      };
      const segments = cutData(this.valueUsed);

      // 分段画
      segments.forEach(segment => {
        g.append("path")
          .datum(segment)
          .attr("class", "calLine")
          .attr("fill", "none")
          .attr("stroke", "#FF6F91")
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.9)
          .attr("d", d3.line()
            .x(d => this.xScale(new Date(d.time)))
            .y(d => this.yScale(+d.value.toFixed(2)))
          );
      });
    },

    calValuesUsed() {
      this.valueUsed = [];

      const weightMap = {};
      this.weights.forEach(weight => {
        weightMap[weight.marker.stationId] = weight.compWeight;
      });

      // 按time分组refDataUsed
      const groupedByTime = {};
      this.refDataUsed.forEach(data => {
        if (!groupedByTime[data.time]) {
          groupedByTime[data.time] = [];
        }
        groupedByTime[data.time].push(data);
      });

      // 计算每个time的加权y
      for (const time in groupedByTime) {
        let weightedSum = 0;
        groupedByTime[time].forEach(data => {
          const weight = weightMap[data.stationId];
          if (weight) {
            weightedSum += data.value * weight;
          }
        });
        this.valueUsed.push({ time, value: weightedSum });
      }
    },

    fillMissingValues(refData) {
      for (let i = 0; i < refData.length; i++) {
        if (refData[i].PM25_Concentration == null || refData[i].PM25_Concentration.length === 0) {
          let j = i;
          while (j < refData.length && (refData[j].PM25_Concentration == null || refData[j].PM25_Concentration.length === 0)) {
            j++;
          }

          const A = i > 0 ? parseFloat(refData[i - 1].PM25_Concentration) : 0;
          const B = j < refData.length ? parseFloat(refData[j].PM25_Concentration) : A;
          const n = j - i;

          for (let k = i; k < j; k++) {
            refData[k].PM25_Concentration = A + ((k - i + 1) / (n + 1)) * (B - A);
          }

          i = j - 1;
        }
      }
    },

    calculateCorrelation(selData, refData) {
      const selMean = selData.reduce((sum, data) => sum + parseFloat(data.PM25_Concentration), 0) / selData.length;
      const refMean = refData.reduce((sum, data) => sum + parseFloat(data.PM25_Concentration), 0) / refData.length;

      let covariance = 0;
      let selVariance = 0;
      let refVariance = 0;

      for (let i = 0; i < selData.length; i++) {
        const selDiff = parseFloat(selData[i].PM25_Concentration) - selMean;
        const refDiff = parseFloat(refData[i].PM25_Concentration) - refMean;

        covariance += selDiff * refDiff;
        selVariance += selDiff * selDiff;
        refVariance += refDiff * refDiff;
      }

      const selStdDev = Math.sqrt(selVariance / selData.length);
      const refStdDev = Math.sqrt(refVariance / refData.length);

      const correlation = covariance / (selStdDev * refStdDev * selData.length);
      return correlation;
    },

    calWeight() {
      this.weights = [];

      // selData的缺失
      let selData = [...this.findData(this.selectedMarker.stationId, this.startTime, this.endTime, 1)];
      console.log("selData0: " + JSON.stringify(selData, null, 2));
      let missT = [];

      missT = selData.reduce((data, item) => {
        if (item.PM25_Concentration === null) {
          data.push(item.time);
        }
        return data;
      }, []);

      selData = selData.filter(item => item.PM25_Concentration !== 'NULL');
      console.log("selData: " + JSON.stringify(selData, null, 2));
      console.log("missT: " + missT);

      // 缩放处理
      let keyT = [];
      let y1, y2;
      if (missT.length > 0) {
        let firstTime = missT[0];
        let lastTime = missT[missT.length - 1];

        let firstHour = parseInt(firstTime.substring(11, 13)) - 1;
        firstHour = firstHour < 10 ? '0' + firstHour : firstHour.toString();
        let adjustedFirstTime = firstTime.substring(0, 11) + firstHour + firstTime.substring(13);

        let lastHour = parseInt(lastTime.substring(11, 13)) + 1;
        lastHour = lastHour < 10 ? '0' + lastHour : lastHour.toString();
        let adjustedLastTime = lastTime.substring(0, 11) + lastHour + lastTime.substring(13);

        keyT.push(adjustedFirstTime, adjustedLastTime);
      }
      console.log("keyT: " + keyT);

      if (keyT.length >= 2) {
        y1 = parseFloat(selData.find(data => data.time === keyT[0]).PM25_Concentration);
        y2 = parseFloat(selData.find(data => data.time === keyT[1]).PM25_Concentration);
      }

      let weightTemp = [];
      this.refDataUsed = [];
      this.markersNearby.forEach(marker => {
        if (marker !== this.selectedMarker) {
          let refData = this.findData(marker.stationId, this.startTime, this.endTime, 1).map(item => ({ ...item }));
          
          // selData缺失的时间段对应的refData
          refData = refData.filter(data => !missT.includes(data.time));
          // console.log("refData: " + JSON.stringify(refData, null, 2));

          // refData的缺失线性插值
          this.fillMissingValues(refData);

          // 用keyT线性缩放
          if (keyT.length >= 2) {
            let x1 = refData.find(data => data.time === keyT[0])?.PM25_Concentration;
            let x2 = refData.find(data => data.time === keyT[1])?.PM25_Concentration;
            console.log("x1: " + x1 + "  x2: " + x2 + "y1: " + y1 + "  y2: " +y2);
            if (x1 && x2) {
              let k = (y2 - y1) / (x2 - x1);
              let b = y1 - k * x1;
              console.log("  k: " + k + "  b: " + b);

              refData.forEach(data => {
                // if (k * data.PM25_Concentration + b >=0) {
                  data.PM25_Concentration = k * data.PM25_Concentration + b;
                // } else {
                //   data.PM25_Concentration = 0;
                // }
              });
            }
          } 
          console.log("refData: " + JSON.stringify(refData, null, 2));
          refData.forEach(data => {
            this.refDataUsed.push({
              stationId: data.station_id,
              time: data.time,
              value: parseFloat(data.PM25_Concentration)
            });
          }); 

          // 曲线相关权重
          let relatedWeight = this.calculateCorrelation(selData, refData);

          // 距离权重
          const latDiff = marker.getLatLng().lat - this.selectedMarker.getLatLng().lat;
          const lngDiff = marker.getLatLng().lng - this.selectedMarker.getLatLng().lng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          let distanceWeight = 1 / distance;

          weightTemp.push({ marker: marker, relatedWeight: relatedWeight, distanceWeight: distanceWeight });
        }
      });

      let sumR = 0;
      let sumD = 0;

      // 标准化
      weightTemp.forEach(item => {
        sumR += item.relatedWeight;
        sumD += item.distanceWeight;
      });
      weightTemp.forEach(item => {
        item.relatedWeightS = item.relatedWeight / sumR;
        item.distanceWeightS = item.distanceWeight / sumD;
      });

      // 综合权重
      this.weights = weightTemp.map(item => {
        let compWeight = 0.5 * item.relatedWeightS + 0.5 * item.distanceWeightS; // 假设两种权重各占一半
        return {
          marker: item.marker,
          relatedWeight: item.relatedWeight,
          relatedWeightS: item.relatedWeightS,
          distanceWeight: item.distanceWeight,
          distanceWeightS: item.distanceWeightS,
          compWeight: compWeight
        };
      });

      console.log("compWeight", this.weights.compWeight);
    },

    refreshSvgRefOR() {
      this.elseMarkers.forEach(marker => {
        const pos = this.map.latLngToContainerPoint(marker.getLatLng());
        const svgId = 'elseSvg' + marker.stationId;
        // const containerId = 'inputContainer' + marker.stationId;
        
        const svg = d3.select('#' + svgId);

        svg.style('left', pos.x - 102 + 'px')
          .style('top', pos.y - 94 + 'px');

        // 输入框
        // const inputContainer = document.getElementById(containerId);
        // if (inputContainer) {
        //   inputContainer.style.left = pos.x - 100 + 'px';
        //   inputContainer.style.top = (pos.y - 80 + 85) + 'px'; // SVG高度 + 间隔
        // }
      });
    },

    drawSvgRefOR(marker) {
      const recentData = this.findData(marker.stationId, this.startTime, this.endTime, 1);
      // console.log("recentDataHere:", recentData);

      this.$nextTick(() => {
        const svgId = 'elseSvg' + marker.stationId;
        const svg = d3.select('#' + svgId)
          .attr('width', 200)
          .attr('height', 80);

        // 矩形背景
        svg.append('rect')
          .attr('x', 2)
          .attr('y', 2)
          .attr('width', 196)
          .attr('height', 86)
          .attr('rx', 3)
          .attr('ry', 3)
          .style('fill', 'white')
          .style('stroke', '#7E89FE')
          .style('stroke-width', 1.5);

        // 布局和内部
        const margin = { top: 10, right: 15, bottom: 14, left: 35 };
        const innerWidth = 200 - margin.left - margin.right;
        const innerHeight = 80 - margin.top - margin.bottom;

        // 画图
        const g = svg.append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

        // 设置比例尺
        const xScale = d3.scaleTime()
          .domain(d3.extent(recentData, d => new Date(d.time)))
          .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
          .domain([0, d3.max(recentData, d => d.PM25_Concentration) + 10])
          .range([innerHeight, 0]);

        // 坐标轴
        g.append('g')
          .attr('transform', `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).ticks(4));

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(d3.max(recentData, d => +d.PM25_Concentration) / 50));

        // 绘制曲线
        // g.append('path')
        //   .datum(recentData)
        //   .attr('fill', 'none')
        //   .attr('stroke', '#009EFA')
        //   .attr('stroke-width', 1.5)
        //   .attr('d', d3.line()
        //     .x(d => xScale(new Date(d.time)))
        //     .y(d => yScale(d.PM25_Concentration))
        //   );

        const segments = this.splitDataIntoSegments(recentData);

        segments.forEach(segment => {
          if (segment.length === 1) {
            // 如果数据段只包含一个数据点，绘制一个点
            const point = segment[0];
            g.append("circle")
              .attr("cx", xScale(new Date(point.time)))
              .attr("cy", yScale(point.PM25_Concentration))
              .attr("r", 1.5) // 设置点的半径
              .attr("fill", "#009EFA");
          } else {
            // 如果数据段包含多个数据点，绘制线段
            g.append("path")
              .datum(segment)
              .attr("fill", "none")
              .attr("stroke", "#009EFA")
              .attr("stroke-width", 1.5)
              .attr("d", d3.line()
                .x(d => xScale(new Date(d.time)))
                .y(d => yScale(d.PM25_Concentration)));
          }
        });
      });

      // this.$nextTick(() => {
      //   this.drawInputBox(marker);
      // });
    },

    // drawInputBox(marker) { // 跟updateWeights方法互相嵌套了，放出来的话要检查
    //   const containerId = 'inputContainer' + marker.stationId;
    //   const container = document.getElementById(containerId);
    //   if (!container) return;

    //   // 清空容器
    //   container.innerHTML = '';

    //   // 文本“参考权重”
    //   const textSpan = document.createElement('span');
    //   textSpan.textContent = '参考权重';
    //   textSpan.style.fontFamily = '微软雅黑';
    //   textSpan.style.fontSize = '14px';
    //   textSpan.style.textAlign = 'center';
    //   textSpan.style.padding = '10px'

    //   container.appendChild(textSpan);

    //   // 竖线
    //   const lineDiv = document.createElement('div');
    //   lineDiv.style.width = '2px';
    //   lineDiv.style.height = '100%';
    //   lineDiv.style.backgroundColor = '#3596B5';

    //   container.appendChild(lineDiv);

    //   // 输入框
    //   const inputElement = document.createElement('input');
    //   inputElement.type = 'number';
    //   inputElement.style.width = '90px';
    //   inputElement.style.height = '14px';
    //   inputElement.style.border = 'none';
    //   inputElement.style.margin = '0 2px';
    //   inputElement.style.padding = '5px';
    //   inputElement.style.textAlign = 'center';
    //   inputElement.min = '0';
    //   inputElement.max = '1';
    //   inputElement.step = '0.001';

    //   // 输入框默认值
    //   const weight = this.weights.find(w => w.marker.stationId === marker.stationId);
    //   inputElement.value = weight ? parseFloat(weight.compWeight).toFixed(3) : '0.000';

    //   // 添加键盘事件监听器
    //   inputElement.addEventListener('keyup', (event) => {
    //     if (event.key === 'Enter') {
    //       const inputValue = parseFloat(inputElement.value);
    //       if (inputValue >= 0 && inputValue <= 1) {
    //         this.updateWeights(marker.stationId, inputValue);
    //       } else {
    //         alert('输入值必须在0到1之间');
    //       }
    //     }
    //   });

    //   container.appendChild(textSpan);
    //   container.appendChild(lineDiv);
    //   container.appendChild(inputElement);
    // },

    // updateWeights(stationId, newWeight) {
    //   this.weights.forEach(weight => {
    //     console.log(`MarkerId: ${weight.marker.stationId},Composite Weight: ${weight.compWeight}`);
    //   });

    //   let originalWeight = 0;

    //   // 原始权重
    //   this.weights.forEach(weight => {
    //     if (weight.marker.stationId === stationId) {
    //       originalWeight = weight.compWeight;
    //       weight.compWeight = newWeight;
    //     }
    //   });

    //   // 如果有修改就调整其他权重
    //   if (originalWeight !== newWeight) {
    //     const scale = (1 - newWeight) / (1 - originalWeight);
    //     this.weights.forEach(weight => {
    //       if (weight.marker.stationId !== stationId) {
    //         weight.compWeight *= scale;
    //       }
    //     });
    //   }

    //   // 微调确保权重和为1
    //   let totalWeight = this.weights.reduce((sum, weight) => sum + weight.compWeight, 0);
    //   if (totalWeight !== 1) {
    //     const error = 1 - totalWeight;
    //     this.weights[0].compWeight += error;
    //   }

    //   this.weights.forEach(weight => {
    //     console.log(`MarkerId: ${weight.marker.stationId},Composite Weight: ${weight.compWeight}`);
    //   });

    //   this.$nextTick(() => {
    //     this.elseMarkers = this.markersNearby.filter(marker => marker !== this.selectedMarker);

    //     this.elseMarkers.forEach(marker => {
    //       this.drawInputBox(marker);
    //     });

    //     this.drawCalLine();
    //   });

    // },

    toggleMarker(marker) {
      if (marker !== this.selectedMarker) {
        if (this.markersNearby.includes(marker)) {
          const index = this.markersNearby.indexOf(marker);
          if (index > -1) {
            this.markersNearby.splice(index, 1);

            marker.setStyle({
              fillColor: "#fff",
              color: "#7E89FE"
            })
          }
        } else {
          this.markersNearby.push(marker);

          marker.setStyle({
            fillColor: "#FCE57D",
            color: "#7E89FE"
          })
        }

        this.elseMarkers = this.markersNearby;
        this.elseMarkers.forEach(marker => {
          // this.calWeight();
          // this.drawCalLine();
          this.drawSvgRefOR(marker);
        });
        this.$nextTick(() => {
          const svgId = 'elseSvg' + this.selectedMarker.stationId;
          d3.select('#' + svgId).selectAll('rect')
            .style('stroke', '#FF8066');
        });

        // this.weights.forEach(weight => {
        //   console.log(`MarkerId: ${weight.marker.stationId}, Related Weight: ${weight.relatedWeight}, Related WeightS: ${weight.relatedWeightS}, Distance Weight: ${weight.distanceWeight}, Distance WeightS: ${weight.distanceWeightS}, Composite Weight: ${weight.compWeight}`);
        // });
      }
    },

    previousStep() {
      this.state = 1;
      this.map.setView(this.selectedMarker.getLatLng(), 11);
      //改回参考点的图标
      this.markersInMap.forEach(marker => {
        if (this.markersNearby.includes(marker)) {
          // marker.setIcon(this.pointIcon);
          marker.setStyle({
            fillColor: "#fff",
            color: "#7E89FE"
          })
        }
      });

      // 点击->选修改点
      this.markersInMap.forEach(marker => {
        marker.off('click').on('click', () => {
          this.onMarkerClick(marker);
        });
      });
    },

    confirmSelection() {
      this.state = 3;

      this.markersInMap.forEach(marker => {
        marker.off('click').on('click', () => {
        });
      });

      // 移动
      this.show = !this.show;
      
      nextTick(() => {
        this.carryOverlayImages();
        const timeSelectorContainer = document.getElementById('time-selector-container');
        if (timeSelectorContainer) {
          timeSelectorContainer.style.bottom = '90vh';
        }
      });
    },

    carryOverlayImages() {
      this.linedImages.forEach(image => {
        const svgId = `svg${image.id}`;
        d3.select(`#${svgId}`).selectAll("*").remove();
      });

      const screenWidth = 400;
      const imageHeight = 135;
      const imageWidth = screenWidth * 0.95;
      const margin = 6; // 空隙宽度

      const sortedMarkers = this.markersNearby.sort((markerA, markerB) => {
        const latA = markerA.getLatLng().lat;
        const latB = markerB.getLatLng().lat;
        return latB - latA; // 按纬度降序排列
      });

      const sortedStationIds = sortedMarkers.map(marker => marker.stationId);

      this.linedImages = sortedStationIds.map((id, index) => {
        const imageTop = index * (imageHeight + margin); // 每个矩形的上边缘
        return {
          id,
          top: imageTop,
          left: 10,
          width: imageWidth,
          height: imageHeight
        };
      });

      // console.log("selectedMarker.stationId: " + this.selectedMarker.stationId);
      // console.log("this.selectedMarker: " + this.selectedMarker);
      this.linedImages.forEach((image, index) => {
        // 异步更新后再画
        this.$nextTick(() => {
          let color;
          if (image.id === this.selectedMarker.stationId) {
            color = '#F7EEAD';
          } else {
            // 从颜色序列中分配颜色
            color = index < this.colorSequence.length ? this.colorSequence[index] : this.selHsv();
          }

          // 修改标记点颜色
          const marker = this.markersNearby.find(m => m.stationId === image.id);
          if (marker) {
            if (marker === this.selectedMarker) {
              marker.setStyle({
                fillColor: color,
                color: "#F29A76"
              });
            } else {
              marker.setStyle({
              fillColor: color,
              color: "#7E89FE"
            });
            }
          }

          // 绘制圆圈
          this.drawCirOnSvg(image.id, color);

          const { xScale, yScale , innerHeight } = this.drawSvg('svg' + image.id); //

          // 对选中点
          if (this.selectedMarker && 'svg' + image.id === 'svg' + this.selectedMarker.stationId) {
            //console.log("Selected M is here!");
            this.drawSelectedSvg('svg' + image.id, xScale, yScale , innerHeight); //
          }

          this.chgColSvg(image.id);
          this.markersNearby.forEach(marker => {
            this.ChgColCir(marker);
          });
        });
      });
    },

    selHsv() {
      const hue = this.nextHue;
      this.nextHue = (this.nextHue + 320 / (this.markersNearby.length - this.colorSequence.length)) % 360 + 20;
      return `hsl(${hue}, 80%, 50%)`;
    },

    drawCirOnSvg(imageId, color) {
      const chartImage = document.getElementById('chartimg-' + imageId);
      if (chartImage) {
        const canvas = document.createElement('canvas');
        canvas.width = chartImage.clientWidth;
        canvas.height = chartImage.clientHeight;
        chartImage.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const radius = 6; // 圆的半径
        const x = canvas.width - radius - 6; // 圆心 x 坐标，右上角
        const y = radius + 5; // 圆心 y 坐标，右上角

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }
    },

    drawSvg(svgId) {
      // 获取missingdata
      const missingdata = this.findData(svgId.replace('svg', ''), this.startTime, this.endTime, 1);
      if (missingdata.length === 0) {
        return; // 如果没有数据，就不进行绘制
      }

      // 获取数据
      const predictdata = this.findData(svgId.replace('svg', ''), this.startTime, this.endTime, 2);
      const realdata = this.findData(svgId.replace('svg', ''), this.startTime, this.endTime, 3);
      const saveddata = this.findSavedData(svgId.replace('svg', ''), this.startTime, this.endTime);
      saveddata.sort((a, b) => new Date(a.time) - new Date(b.time));
      const MSdata = this.findData(svgId.replace('svg', ''), this.startTime, this.endTime, 4);

      // missingdata
      const missingDataSegments = this.splitDataIntoSegments(missingdata);

      // SVG设置
      const svg = d3.select('#' + svgId);
      const svgWidth = svg.node().clientWidth;
      const svgHeight = svg.node().clientHeight;
      const margin = { top: 10, right: 20, bottom: 18, left: 25 };
      const innerWidth = svgWidth - margin.left - margin.right;
      const innerHeight = svgHeight - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // 比例尺
      const xScale = d3.scaleTime().domain(d3.extent([...missingdata, ...predictdata], d => new Date(d.time))).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([0, Math.ceil((d3.max([...missingdata, ...predictdata], d => +d.PM25_Concentration) + 50) / 20) * 20]).range([innerHeight, 0]);

      // 绘制轴
      g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));
      g.append('g').call(d3.axisLeft(yScale).ticks(d3.max([...missingdata, ...predictdata], d => +d.PM25_Concentration) / 20));

      if (svgId == 'svg' + this.selectedMarker.stationId) {
        // 绘制predictdata的曲线
        // 开头（可能有）
        const endOfPredictSegment = missingDataSegments[0][0];
        console.log("End of Predict Segment:", new Date(endOfPredictSegment.time)); // 输出第一个实测数据点的时间

        const firstSegment = predictdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) >= new Date(this.startTime) && new Date(d.time) < new Date(endOfPredictSegment.time);
        });

        if (firstSegment.length > 0) {
          console.log("firstSegment.length > 0");
          // 将predictSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [...firstSegment, endOfPredictSegment];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "green")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            firstSegment.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "#377D22");
          });
        }

        // 中间段
        for (let i = 0; i < missingDataSegments.length - 1; i++) {
          const endOfCurrentSegment = missingDataSegments[i][missingDataSegments[i].length - 1];
          const startOfNextSegment = missingDataSegments[i + 1][0];

          const predictSegment = predictdata.filter(d => new Date(d.time) > new Date(endOfCurrentSegment.time) && new Date(d.time) < new Date(startOfNextSegment.time));

          if (predictSegment.length > 0) {
            // 将predictSegment与左侧missingdata的最后一个数据点相连
            const leftDataPoint = [endOfCurrentSegment, ...predictSegment];
            g.append("path")
              .datum(leftDataPoint)
              .attr("fill", "none")
              .attr("stroke", "green")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            // 将predictSegment与右侧missingdata的第一个数据点相连
            const rightDataPoint = [...predictSegment, startOfNextSegment];
            g.append("path")
              .datum(rightDataPoint)
              .attr("fill", "none")
              .attr("stroke", "green")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            predictSegment.forEach(dataPoint => {
              g.append("circle")
                .attr("cx", xScale(new Date(dataPoint.time)))
                .attr("cy", yScale(+dataPoint.PM25_Concentration))
                .attr("r", 1.5) // 圆点的半径
                .attr("fill-opacity", 0.8)
                .attr("fill", "#377D22");
            });
          }
        }

        // 结尾（可能有）
        const startOfPredictSegment = missingDataSegments[missingDataSegments.length - 1][missingDataSegments[missingDataSegments.length - 1].length - 1];

        const lastSegment = predictdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) <= new Date(this.endTime) && new Date(d.time) > new Date(startOfPredictSegment.time);
        });

        if (lastSegment.length > 0) {
          console.log("firstSegment.length > 0");
          // 将predictSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [startOfPredictSegment, ...lastSegment];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "green")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            lastSegment.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "#377D22");
          });
        }

        // 绘制MissSavedata的曲线
        // 开头（可能有）
        const endOfMSSegment = missingDataSegments[0][0];
        // console.log("End of Predict Segment:", new Date(endOfPredictSegment.time)); // 输出第一个实测数据点的时间

        const firstSegmentMS = MSdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) >= new Date(this.startTime) && new Date(d.time) < new Date(endOfMSSegment.time);
        });

        if (firstSegmentMS.length > 0) {
          // console.log("firstSegmentMS.length > 0");
          // 将predictSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [...firstSegmentMS, endOfMSSegment];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "grey")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            firstSegmentMS.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "grey");
          });
        }

        // 中间段
        for (let i = 0; i < missingDataSegments.length - 1; i++) {
          const endOfCurrentSegment = missingDataSegments[i][missingDataSegments[i].length - 1];
          const startOfNextSegment = missingDataSegments[i + 1][0];

          const MSSegment = MSdata.filter(d => new Date(d.time) > new Date(endOfCurrentSegment.time) && new Date(d.time) < new Date(startOfNextSegment.time));

          if (MSSegment.length > 0) {
            // 将realSegment与左侧missingdata的最后一个数据点相连
            const leftDataPoint = [endOfCurrentSegment, ...MSSegment];
            g.append("path")
              .datum(leftDataPoint)
              .attr("fill", "none")
              .attr("stroke", "grey")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            // 将realSegment与右侧missingdata的第一个数据点相连
            const rightDataPoint = [...MSSegment, startOfNextSegment];
            g.append("path")
              .datum(rightDataPoint)
              .attr("fill", "none")
              .attr("stroke", "grey")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            MSSegment.forEach(dataPoint => {
              g.append("circle")
                .attr("cx", xScale(new Date(dataPoint.time)))
                .attr("cy", yScale(+dataPoint.PM25_Concentration))
                .attr("r", 1.5) // 圆点的半径
                .attr("fill-opacity", 0.8)
                .attr("fill", "grey");
            });
          }
        }

        // 结尾（可能有）
        const startOfMSSegment = missingDataSegments[missingDataSegments.length - 1][missingDataSegments[missingDataSegments.length - 1].length - 1];

        const lastSegmentMS = MSdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) <= new Date(this.endTime) && new Date(d.time) > new Date(startOfMSSegment.time);
        });

        if (lastSegmentMS.length > 0) {
          // console.log("firstSegmentMS.length > 0");
          // 将realSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [startOfMSSegment, ...lastSegmentMS];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "grey")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            lastSegmentMS.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "grey");
          });
        }
      }

      if (this.isshowLines && svgId == 'svg' + this.selectedMarker.stationId) {
        // 绘制realdata的曲线
        // 开头（可能有）
        const endOfRealSegment = missingDataSegments[0][0];
        // console.log("End of Predict Segment:", new Date(endOfPredictSegment.time)); // 输出第一个实测数据点的时间

        const firstSegmentReal = realdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) >= new Date(this.startTime) && new Date(d.time) < new Date(endOfRealSegment.time);
        });

        if (firstSegmentReal.length > 0) {
          // console.log("firstSegment.length > 0");
          // 将predictSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [...firstSegmentReal, endOfRealSegment];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            firstSegmentReal.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "orange");
          });
        }

        // 中间段
        for (let i = 0; i < missingDataSegments.length - 1; i++) {
          const endOfCurrentSegment = missingDataSegments[i][missingDataSegments[i].length - 1];
          const startOfNextSegment = missingDataSegments[i + 1][0];

          const realSegment = realdata.filter(d => new Date(d.time) > new Date(endOfCurrentSegment.time) && new Date(d.time) < new Date(startOfNextSegment.time));

          if (realSegment.length > 0) {
            // 将realSegment与左侧missingdata的最后一个数据点相连
            const leftDataPoint = [endOfCurrentSegment, ...realSegment];
            g.append("path")
              .datum(leftDataPoint)
              .attr("fill", "none")
              .attr("stroke", "orange")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            // 将realSegment与右侧missingdata的第一个数据点相连
            const rightDataPoint = [...realSegment, startOfNextSegment];
            g.append("path")
              .datum(rightDataPoint)
              .attr("fill", "none")
              .attr("stroke", "orange")
              .attr("stroke-width", 1.5)
              .attr("stroke-opacity", 0.8)
              .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            realSegment.forEach(dataPoint => {
              g.append("circle")
                .attr("cx", xScale(new Date(dataPoint.time)))
                .attr("cy", yScale(+dataPoint.PM25_Concentration))
                .attr("r", 1.5) // 圆点的半径
                .attr("fill-opacity", 0.8)
                .attr("fill", "orange");
            });
          }
        }

        // 结尾（可能有）
        const startOfRealSegment = missingDataSegments[missingDataSegments.length - 1][missingDataSegments[missingDataSegments.length - 1].length - 1];

        const lastSegmentReal = realdata.filter(d => {
            // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
            return new Date(d.time) <= new Date(this.endTime) && new Date(d.time) > new Date(startOfRealSegment.time);
        });

        if (lastSegmentReal.length > 0) {
          console.log("firstSegment.length > 0");
          // 将realSegment与右侧missingdata的第一个数据点相连
          const rightDataPoint = [startOfRealSegment, ...lastSegmentReal];
          g.append("path")
            .datum(rightDataPoint)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

            lastSegmentReal.forEach(dataPoint => {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 1.5) // 圆点的半径
              .attr("fill-opacity", 0.8)
              .attr("fill", "orange");
          });
        }

        // 绘制saveddata的曲线
      //   // 开头（可能有）
      //   const endOfSavedSegment = missingDataSegments[0][0];
      //   // console.log("End of Predict Segment:", new Date(endOfPredictSegment.time));

      //   const firstSavedSegment = saveddata.filter(d => {
      //       // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
      //       return new Date(d.time) >= new Date(this.startTime) && new Date(d.time) < new Date(endOfSavedSegment.time);
      //   });

      //   if (firstSavedSegment.length > 0) {
      //     // console.log("firstSegment.length > 0");
      //     // 将predictSegment与右侧missingdata的第一个数据点相连
      //     const rightDataPoint = [...firstSavedSegment, endOfSavedSegment];
      //     g.append("path")
      //       .datum(rightDataPoint)
      //       .attr("fill", "none")
      //       .attr("stroke", "grey")
      //       .attr("stroke-width", 1.5)
      //       .attr("stroke-opacity", 0.8)
      //       .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

      //       firstSavedSegment.forEach(dataPoint => {
      //       g.append("circle")
      //         .attr("cx", xScale(new Date(dataPoint.time)))
      //         .attr("cy", yScale(+dataPoint.PM25_Concentration))
      //         .attr("r", 1.5) // 圆点的半径
      //         .attr("fill-opacity", 0.8)
      //         .attr("fill", "grey");
      //     });
      //   }

      //   // 中间段
      //   for (let i = 0; i < missingDataSegments.length - 1; i++) {
      //     const endOfCurrentSegment = missingDataSegments[i][missingDataSegments[i].length - 1];
      //     const startOfNextSegment = missingDataSegments[i + 1][0];

      //     const savedSegment = saveddata.filter(d => new Date(d.time) > new Date(endOfCurrentSegment.time) && new Date(d.time) < new Date(startOfNextSegment.time));

      //     if (savedSegment.length > 0) {
      //       // 将savedSegment与左侧missingdata的最后一个数据点相连
      //       const leftDataPoint = [endOfCurrentSegment, ...savedSegment];
      //       g.append("path")
      //         .datum(leftDataPoint)
      //         .attr("fill", "none")
      //         .attr("stroke", "grey")
      //         .attr("stroke-width", 1.5)
      //         .attr("stroke-opacity", 0.8)
      //         .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

      //       // 将savedSegment与右侧missingdata的第一个数据点相连
      //       const rightDataPoint = [...savedSegment, startOfNextSegment];
      //       g.append("path")
      //         .datum(rightDataPoint)
      //         .attr("fill", "none")
      //         .attr("stroke", "grey")
      //         .attr("stroke-width", 1.5)
      //         .attr("stroke-opacity", 0.8)
      //         .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

      //       savedSegment.forEach(dataPoint => {
      //         g.append("circle")
      //           .attr("cx", xScale(new Date(dataPoint.time)))
      //           .attr("cy", yScale(+dataPoint.PM25_Concentration))
      //           .attr("r", 1.5) // 圆点的半径
      //           .attr("fill-opacity", 0.8)
      //           .attr("fill", "grey");
      //       });
      //     }
      //   }

      //   // 结尾（可能有）
      //   const startOfSavedSegment = missingDataSegments[missingDataSegments.length - 1][missingDataSegments[missingDataSegments.length - 1].length - 1];

      //   const lastSavedSegment = saveddata.filter(d => {
      //       // console.log("Predict data time:", new Date(d.time), "Start time:", new Date(this.startTime), "End of predict segment time:", new Date(endOfPredictSegment.time)); // 输出比较的每个时间
      //       return new Date(d.time) <= new Date(this.endTime) && new Date(d.time) > new Date(startOfSavedSegment.time);
      //   });

      //   if (lastSavedSegment.length > 0) {
      //     console.log("firstSegment.length > 0");
      //     // 将predictSegment与右侧missingdata的第一个数据点相连
      //     const rightDataPoint = [startOfSavedSegment, ...lastSavedSegment];
      //     g.append("path")
      //       .datum(rightDataPoint)
      //       .attr("fill", "none")
      //       .attr("stroke", "grey")
      //       .attr("stroke-width", 1.5)
      //       .attr("stroke-opacity", 0.8)
      //       .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));

      //       lastSavedSegment.forEach(dataPoint => {
      //       g.append("circle")
      //         .attr("cx", xScale(new Date(dataPoint.time)))
      //         .attr("cy", yScale(+dataPoint.PM25_Concentration))
      //         .attr("r", 1.5) // 圆点的半径
      //         .attr("fill-opacity", 0.8)
      //         .attr("fill", "grey");
      //     });
      //   }
      }

      // 绘制missingdata的曲线
      missingDataSegments.forEach(segment => {
        if (segment.length === 1) {
          g.append("circle").attr("cx", xScale(new Date(segment[0].time))).attr("cy", yScale(+segment[0].PM25_Concentration)).attr("r", 1.5).attr("fill", "#009EFA");
        } else {
          g.append("path").datum(segment).attr("fill", "none").attr("stroke", "#009EFA").attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));
        }
      });

      // 返回scale和尺寸给其他方法用
      return { xScale, yScale, innerHeight };
    },

    drawSelectedSvg(svgId, xScale, yScale , innerHeight) { //
      const data = this.findData(svgId.replace('svg', ''), this.startTime, this.endTime, 1);
      if (data.length === 0) {
        return;
      }

      const missingDataSegments = [];

      let currentSegment = [];

      data.forEach((datum, index) => {
        if (this.isValidPM25(datum.PM25_Concentration)) {
          // 如果当前数据点有效，检查 currentSegment 是否有记录的无效数据点
          if (currentSegment.length > 0) {
            // 将当前有效数据点作为缺失段结束后的第一个有效数据点
            currentSegment.push(datum.time);
            // 将 currentSegment 添加到结果数组中
            missingDataSegments.push([...currentSegment]);
            // 清空 currentSegment 以便下次使用
            currentSegment = [];
          }
        } else {
          // 当前数据点无效
          if (currentSegment.length === 0) {
            // 如果是缺失段的开始，尝试添加前一个有效数据点的时间，如果当前是第一个数据点，则添加特殊标记
            const prevTime = index > 0 && this.isValidPM25(data[index - 1].PM25_Concentration) ? data[index - 1].time : 'start';
            currentSegment.push(prevTime);
          }
          // 将当前无效数据点的时间添加到 currentSegment 中
          currentSegment.push(datum.time);
        }
      });

      if (currentSegment.length > 0) {
        // 如果最后是无效数据点，添加特殊标记
        currentSegment.push('end');
        missingDataSegments.push([...currentSegment]);
      }

      const svg = d3.select('#' + svgId);
      const g = svg.select('g');

      let guideLineXCoords = []; 
      
      missingDataSegments.forEach(segment => {
        // 检查是否有开始的特殊标记，没有则画蓝色实心圆
        if (!segment.startMark) {
          const startTime = segment[0];
          const startData = data.find(d => d.time === startTime);
          if (startData) {
            g.append("circle")
              .attr("cx", xScale(new Date(startData.time)))
              .attr("cy", yScale(startData.PM25_Concentration))
              .attr("r", 2)
              .attr("fill", "blue");
          }
        }

        // 检查是否有结束的特殊标记，没有则画蓝色实心圆
        if (!segment.endMark) {
          const endTime = segment[segment.length - 1];
          const endData = data.find(d => d.time === endTime);
          if (endData) {
            g.append("circle")
              .attr("cx", xScale(new Date(endData.time)))
              .attr("cy", yScale(endData.PM25_Concentration))
              .attr("r", 2)
              .attr("fill", "blue");
          }
        }

        // 画引导线
        segment.forEach((time, index) => {
          if (index > 0 && index < segment.length - 1) {
            g.append('line')
              .attr('x1', xScale(new Date(time)))
              .attr('y1', 0)
              .attr('x2', xScale(new Date(time)))
              .attr('y2', innerHeight)
              .style('stroke', 'red')
              .style('stroke-dasharray', ('2, 2'));

            const xCoord = xScale(new Date(time));
            guideLineXCoords.push(xCoord);
          }
        });
      });
      
      let proximityRadius = 3;

      svg.on('mousemove', function(event) {
        const [mouseX, mouseY] = d3.pointer(event, g.node());

        g.selectAll('.guide-circle, .value-box, .value-text').remove();

        guideLineXCoords.forEach(guideLineX => {
          if (Math.abs(guideLineX - mouseX) <= proximityRadius && mouseY >= 0 && mouseY <= innerHeight) {
            // 如果靠近引导线，画红色空心圆
            g.append('circle')
              .classed('guide-circle', true)
              .attr('cx', guideLineX)
              .attr('cy', mouseY)
              .attr('r', 2) // 半径为2
              .style('fill', 'none')
              .style('stroke', 'red');

            const value = yScale.invert(mouseY).toFixed(2);

            g.append('rect')
              .classed('value-box', true)
              .attr('x', guideLineX - 15)
              .attr('y', mouseY - 26)
              .attr('width', 30)
              .attr('height', 15)
              .attr('rx', 5)
              .style('fill', 'white')
              .style('stroke', 'grey');

            // 绘制显示数值的文本
            g.append('text')
              .classed('value-text', true)
              .attr('x', guideLineX)
              .attr('y', mouseY - 15)
              .attr('text-anchor', 'middle')
              .style('fill', 'grey')
              .style('font-family', 'Microsoft YaHei') // 微软雅黑
              .style('font-weight', 'bold') // 加粗
              .style('font-size', '9px') // 字大小
              .text(value);
          }
        });
      });

      let selectedCircles = [];

      svg.on('click', function(event) {
        const [mouseX, mouseY] = d3.pointer(event, g.node());

        guideLineXCoords.forEach(guideLineX => {
          if (Math.abs(guideLineX - mouseX) <= proximityRadius && mouseY >= 0 && mouseY <= innerHeight) {

            const time = xScale.invert(guideLineX);
            const value = yScale.invert(mouseY);

            const existingIndex = selectedCircles.findIndex(circle => +circle.time === +time);
            if (existingIndex !== -1) {
              selectedCircles.splice(existingIndex, 1);
            }

            selectedCircles.push({ time, value });
            console.log("selectedCircles:", selectedCircles);
          }
        });

        // 清除之前画的selected-circle
        g.selectAll('.selected-circle').remove();

        // 重新画selected-circle
        selectedCircles.forEach(circle => {
          g.append('circle')
            .classed('selected-circle', true)
            .attr('cx', xScale(circle.time))
            .attr('cy', yScale(circle.value))
            .attr('r', 2)
            .style('fill', 'red');
        });

        // 清除连线
        g.selectAll('.connection-line').remove();

        // 重新画连线
        selectedCircles.forEach(circleA => {
          missingDataSegments.forEach(segment => {
            const index = segment.findIndex(time => +new Date(time) === +circleA.time);
            if (index >= 0) { // 如果时间点位于当前段内
              // 前后时间点
              let prevTime;
              
              // console.log("prevTime", prevTime, "nextTime", nextTime);

              if (index == 1 && segment[0] != 'start') {
                let valuepre = data.find(d => d.time === segment[0]);
                if (valuepre.PM25_Concentration !== undefined) {
                  g.append('line')
                    .classed('connection-line', true)
                    .attr('x1', xScale(circleA.time))
                    .attr('y1', yScale(circleA.value))
                    .attr('x2', xScale(new Date(segment[0])))
                    .attr('y2', yScale(valuepre.PM25_Concentration))
                    .style('stroke', 'red');
                }
                
              } else if (index > 1) {
                prevTime = segment[index - 1];
                selectedCircles.forEach(circleB => {
                  // console.log("AAA", circleB.time, "BBB", new Date (prevTime));
                  if (+new Date(prevTime) === +circleB.time) {
                    g.append('line')
                    .classed('connection-line', true)
                    .attr('x1', xScale(circleA.time))
                    .attr('y1', yScale(circleA.value))
                    .attr('x2', xScale(circleB.time))
                    .attr('y2', yScale(circleB.value))
                    .style('stroke', 'red');
                  }
                });
              }

              if (index + 2 == segment.length && segment[index + 1] != 'end') { // 是倒数第二个，最后一个是有效点
                let valuenext = data.find(d => d.time === segment[index + 1]);
                if (valuenext.PM25_Concentration !== undefined) {
                  g.append('line')
                    .classed('connection-line', true)
                    .attr('x1', xScale(circleA.time))
                    .attr('y1', yScale(circleA.value))
                    .attr('x2', xScale(new Date(segment[index + 1])))
                    .attr('y2', yScale(valuenext.PM25_Concentration))
                    .style('stroke', 'red');
                }
                
              }
            }
          });
        });

        selectedCircles.forEach(circle => {
          // 检查this.savedCircles中是否已存在具有相同time和marker的记录
          const existingIndex = this.savedCircles.findIndex(item => 
            +item.time === +circle.time && item.marker === this.selectedMarker.stationId
          );

          // 删除旧记录
          if (existingIndex !== -1) {
            this.savedCircles.splice(existingIndex, 1);
          }

          // 保存新记录
          this.savedCircles.push({
            time: circle.time,
            marker: this.selectedMarker.stationId,
            value: circle.value
          });
        });
        console.log("savedCircles:", this.savedCircles);
      }.bind(this));
    },

    chgColSvg(imageId) {
      const chartImg = document.getElementById('chartimg-' + imageId);
      const relatedMarker = this.markersNearby.find(marker => marker.stationId === imageId);

      // 为每个 chartImg 设置鼠标事件
      chartImg.addEventListener("mouseenter", () => {
        // 更改标记图标外圈->浅蓝
        if (relatedMarker) {
          // relatedMarker.setIcon(this.point4Icon);
          relatedMarker.setStyle({
            color: "#87E4FA"
          })
        }
        // 更改容器边框->浅蓝
        chartImg.style.boxShadow = '0 0 0 4px #9AD5FA';
      });

      chartImg.addEventListener("mouseleave", () => {
        // 恢复标记的图标
        if (relatedMarker) {
          if (relatedMarker === this.selectedMarker) {
            // relatedMarker.setIcon(this.point2Icon);
            relatedMarker.setStyle({
              color: "#EE781F"
            })
          } else {
            // relatedMarker.setIcon(this.point3Icon);
            relatedMarker.setStyle({
              color: "#7E89FE"
            })
          }
        }
        // 恢复容器的边框颜色
        chartImg.style.boxShadow = '0 0 0 0px';
      });
    },

    ChgColCir(marker) {
      // 鼠标悬停
      marker.on('mouseover', () => {
        marker.setStyle({
          color: "#87E4FA"
        });
        const relatedImage = document.getElementById('chartimg-' + marker.stationId);
        if (relatedImage) {
          relatedImage.style.boxShadow = '0 0 0 4px #9AD5FA';
        }

        // 鼠标离开
        const checkMouseLeave = setInterval(() => {
          // 不再悬停则恢复
          if (!marker.isMouseOver) {
            if (marker === this.selectedMarker) {
              // relatedMarker.setIcon(this.point2Icon);
              marker.setStyle({
                color: "#EE781F"
              })
            } else {
              // relatedMarker.setIcon(this.point3Icon);
              marker.setStyle({
                color: "#7E89FE"
              })
            }
            if (relatedImage) {
              relatedImage.style.boxShadow = '0 0 0 0px';
            }
            clearInterval(checkMouseLeave);
          }
        }, 10); // 每10ms检查一次
      });

      // 鼠标是否在标点上
      marker.isMouseOver = false;
      marker.on('mouseover', () => {
        marker.isMouseOver = true;
      });
      marker.on('mouseout', () => {
        marker.isMouseOver = false;
      });
    },

    saveChanges() {
      let circlesData = [];

      this.savedCircles.forEach(circle => {
        const time = circle.time;
        let timeStr = `${time.getFullYear()}/${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;

        circlesData.push({
          Time: timeStr,
          Station: circle.marker,
          Saved: circle.value.toFixed(2)
        });
      });

      fetch('http://127.0.0.1:5000/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(circlesData)
      })
      .then(response => response.text())
      .then(data => {
        console.log(data);
        alert('填充数据已保存!');
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('保存失败，请稍后重试。');
      });
    },

    showLines() {
      this.isshowLines = !this.isshowLines;
      this.carryOverlayImages();
    },

    backToStart() {
      // 移动
      this.show = !this.show;
      
      nextTick(() => {
        this.carryOverlayImages();
        const timeSelectorContainer = document.getElementById('time-selector-container');
        if (timeSelectorContainer) {
          timeSelectorContainer.style.bottom = 0;
        }
      });

      // 清空选中的标记点和相关数组
      if (this.selectedMarker) {
        const latLng = this.selectedMarker.getLatLng();
        this.map.setView(latLng, 11); // 设置地图视图为当前标记的位置，缩放级别为11
        // this.selectedMarker = null;
      }

      // 重置所有marker图标
      this.markersInMap.forEach(marker => {
        // marker.setIcon(this.pointIcon); // 将所有标记点重置为原始图标
        // 移除悬浮监听器
        marker.off('mouseover');
        marker.off('mouseout');
        marker.setStyle({
          fillColor: "#fff",
          color: "#7E89FE"
        })
      });

      this.markersNearby = [];
      this.markersTemp = [];
      this.markersinfoSatisfied = [];
      this.savePoints = [];

      // 点击->选修改点
      this.state = 0;
      this.markersInMap.forEach(marker => {
        marker.on('click', () => {
          this.onMarkerClick(marker);
        });
      });
    },

    imageStyle(image) {
      return {
        position: 'absolute',
        top: image.top + 'px',
        left: image.left + 'px',
        width: image.width + 'px',
        height: image.height + 'px',
        backgroundColor: 'white',
        margin: '5px',
        boxSizing: 'border-box',
        // border: '2px solid #007AFF',
        borderRadius: '2px',
        opacity: 0.9,
      };
    },

    boxStyle(marker) {
      const pos = this.map.latLngToContainerPoint(marker.getLatLng());
      return {
        position: 'absolute',
        left: pos.x - 100 + 'px',
        top: pos.y - 94 + 'px',
        width: '200px',
        height: '90px',
        zIndex: 500,
        opacity: 0.8,
      };
    },
  }
};
</script>

<style>
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
  z-index: 1000; /* 确保在地图之上 */
  display: flex;
  justify-content: center;
  align-items: center;
}

#time-selector-container {
  position: absolute;
  bottom: 0;
  left: 2vw;
  width: 470px;
  background-color: #97A5C0;
  border: none;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px;
  transition: bottom 0.5s ease-in-out;
  z-index: 900;
}

/* .one-image-container {
  position: absolute;
  left: 2vw;
  top: calc(100vh - 200px);
  width: 490px;
  height: 200px;
  background-color: #97A5C0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  z-index: 900;
} */

#overlay-container > * {
  pointer-events: auto;
}

.chart-container {
  position: absolute;
  top: 10vh;
  left: 2vw;
  width: 490px;
  height: 90vh;
  overflow-y: auto; /* 允许垂直滚动 */
  background-color: #97A5C0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  z-index: 900;
}

/* 滚动条整体 */
.chart-container::-webkit-scrollbar {
  width: 10px; /* 宽度 */
}

/* 滚动条轨道 */
.chart-container::-webkit-scrollbar-track {
  background: transparent; /* 轨道背景透明 */
}

/* 滚动条滑块 */
.chart-container::-webkit-scrollbar-thumb {
  background: #E8E8E8; /* 滑块颜色 */
  border-radius: 2px;
}

/* 鼠标悬停时滑块颜色 */
.chart-container::-webkit-scrollbar-thumb:hover {
  background: #E0E0E0; /* 鼠标悬停时滑块颜色 */
}

.map-button {
  pointer-events: auto;
  cursor: pointer; /*鼠标悬停为手形*/
  height: 36px;
  width: 36px;
  padding: 0;
  border: none;
  background-color: #97A5C0;
  display: flex; /* 使用flex布局使图标居中 */
  justify-content: center; /* 水平居中 */
  align-items: center;
  border-radius: 3px;
  opacity: 0.8; /*不透明度*/
}

.on-button {
  pointer-events: auto;
  cursor: pointer; /*鼠标悬停为手形*/
  height: 36px;
  width: 36px;
  padding: 0;
  border: none;
  background-color: #B0C3DA;
  display: flex; /* 使用flex布局使图标居中 */
  justify-content: center; /* 水平居中 */
  align-items: center;
  border-radius: 3px;
  opacity: 0.8; /*不透明度*/
}

.fas {
  color: #eff0fd;
  font-size: 16px;
}

.fa-regular {
  color: #eff0fd;
  font-size: 18px;
}

.fa-solid {
  color: #eff0fd;
  font-size: 18px;
}

.chartimg {
  position: relative;
  overflow: hidden;
}

.chartimg svg {
  width: 90%;
  height: 90%;
  position: absolute;
  left: 5%;
  top: 5%;
}

.station-id-tooltip {
  text-align: center;
  border: none;
  background-color: transparent;
  color: grey;
  font-size: 10px;
  font-family: 'Microsoft YaHei', sans-serif; /* 微软雅黑 */
  font-weight: bold; /* 加粗 */
  background: none;
  border: none;
}

.logo {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

.moveup-enter-active, .moveup-leave-active {
  transition: all 0.5s ease-in-out;
}

.moveup-enter-from,
.moveup-leave-to {
  transform: translateY(95vh);
}

</style>