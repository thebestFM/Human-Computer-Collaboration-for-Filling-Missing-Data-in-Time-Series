<template>
  <div id="map-container">
    <div id="map" style="height: 100vh;"></div>
    <div id="overlay-container">
      <button v-if="state === 1 || state === 4" @click="resetMap" class="map-button" :style="buttonStyle">取消选择</button>
      <button v-if="state === 1" @click="nextStep" class="map-button" :style="nextButtonStyle">下一步</button>
      <button v-if="state === 2" id="previousButton" @click="previousStep" class="map-button" :style="previousButtonStyle">上一步</button>
      <button v-if="state === 2" id="confirmButton" @click="confirmSelection" class="map-button" :style="confirmButtonStyle">确定</button>
      <div id="chartSelected-container" v-if="state === 1 || state === 2 || state === 4">
        <div id="svgSelectedOne"></div>
      </div>
      <div id="chartReference-container" v-if="state === 2">
        <svg v-for="marker in elseMarkers" :key="marker.stationId" :id="'elseSvg' + marker.stationId" class="elseSvgClass" :style="boxStyle(marker)"></svg>
      </div>
      <div id="chart-container" v-if="state === 3">
        <div v-for="image in linedImages" :key="image.id" class="chartimg" :style="imageStyle(image)" :id="'chartimg-' + image.id">
          <svg :id="'svg' + image.id"></svg>
        </div>
      </div>
      <button v-if="state === 3" @click="saveChanges" class="map-button" :style="saveButtonStyle">保存修改</button>
      <button v-if="state === 3" @click="backToStart" class="map-button" :style="backButtonStyle">重新选点</button>
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
      pointIcon: L.icon({
        iconUrl: require('@/assets/point.png'), // 蓝色
        iconSize: [40, 40],
      }),
      point2Icon: L.icon({
        iconUrl: require('@/assets/point2.png'), // 紫色-用于修改点
        iconSize: [50, 50],
      }),
      point3Icon: L.icon({
        iconUrl: require('@/assets/point3.png'), // 绿色打钩-用于参考点
        iconSize: [50, 50],
      }),
      point4Icon: L.icon({
        iconUrl: require('@/assets/point4.png'), // 金色打钩-用于鼠标对应点
        iconSize: [50, 50],
      }),
      selectedMarker: null,
      tempArray: [],
      markersInMap:[],
      markersNearby:[],
      markersTemp:[],
      markersinfoSatisfied:[],
      airQualityData: [], // 存储全部空气质量数据
      state: 0,
      buttonStyle: {},
      nextButtonStyle: {},
      linedImages: [],
      missingDataIntervals:[],
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
      colorSequence: ['#F9B800', '#F7EEAD', '#1E3B7A', '#AED4DD', '#29AFD4', '#A4ABD6', '#F29A76'],
      nextHue: 0,
      previousButtonStyle: {
        position: 'absolute',
          left: `50%`,
          top: `75%`,
          transform: 'translate(-50%, -50%)'
      },
      confirmButtonStyle: {
        position: 'absolute',
          left: `50%`,
          top: `calc(75% + 40px)`,
          transform: 'translate(-50%, -50%)'
      },
      saveButtonStyle: {
        position: 'absolute',
        left: '445px',
        top: 'calc(50% - 20px)',
        transform: 'translate(-50%, -50%)',
      },
      backButtonStyle: {
        position: 'absolute',
        left: '445px',
        top: 'calc(50% + 20px)',
        transform: 'translate(-50%, -50%)',
      },
    };
  },
  mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom') || 11;

    this.markersInMap = []

    this.map = L.map('map').setView([lat || 40, lng || 116.18], zoom);
    // 'http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}'
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

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
                  // const marker = L.marker([station.latitude, station.longitude], {
                  //   icon: this.pointIcon, stationId: station.station_id,
                  //   })
                  //   .addTo(this.map)
                  const marker = L.circleMarker([station.latitude, station.longitude], {
                      stationId: station.station_id,
                      weight: 3,
                      color: "#7E89FE",
                      fillColor: '#fff',
                      fillOpacity: 1,
                      radius: 10
                    })
                    .addTo(this.map)
                    // .bindPopup(`<b>${station.name_chinese}</b><br>Station Id: ${station.station_id}`);
                  this.markersInMap.push(marker)
                  marker.stationId = station.station_id;
                  // console.log("station_id", station.station_id); 
              }
            });
          }
        });
      });

      // 异步加载空气质量数据
      this.loadAllAirQualityData().then(() => {
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

      //当前选中的更新图标
      marker.setStyle({
        fillColor: "#FCE57D",
        color: "#FF8066"
      })

      //计算范围 (10 -> 20km)
      this.calculateNearbyStations(marker, 0.1); // 经纬度差0.09对应约10公里

      // 如果找到的点少于2个，扩大到20km
      if (this.markersNearby.length <= 2) {
        this.calculateNearbyStations(marker, 0.2);
      }

      // console.log("markersNearby: " + this.markersNearby.length);

      const recentData = [...this.findDataForStation(marker.stationId)];
      
      const hasMissingData = recentData.some(data => !this.isValidPM25(data.PM25_Concentration));

      if (hasMissingData) {
        this.state = 1;
      } else {
        this.state = 4; // 禁止下一步
      }

      nextTick(() => { // 保证使用更新后的state
        if (recentData.length > 0) {
          this.drawSvgSelOR(recentData);
        }
        this.buttonStyle = {
          position: 'absolute',
          left: `50%`,
          top: `75%`,
          transform: 'translate(-50%, -50%)'
        };
        this.nextButtonStyle = {
          position: 'absolute',
          left: '50%',
          top: 'calc(75% + 40px)',
          transform: 'translate(-50%, -50%)',
        };
      });
    },

    findDataForStation(stationId) {
      // 筛选Id对应的空气质量数据（线性查找太久，本身有序故二分）
      const stationIdIndex = this.binarySearch(this.airQualityData, (data) => {
        return stationId.localeCompare(data.station_id);
      });

      if (stationIdIndex === -1) {
        // 没有找到
        return [];
      }

      // 找到某行id符合，向前找到id对应第一行
      let firstMatchIndex = stationIdIndex;
      while (firstMatchIndex > 0 && this.airQualityData[firstMatchIndex - 1].station_id === stationId) {
        firstMatchIndex--;
      }

      // 从第一条开始向后存所有本id的数据
      let matchedData = [];
      let currentIndex = firstMatchIndex;
      while (currentIndex < this.airQualityData.length && this.airQualityData[currentIndex].station_id === stationId) {
        matchedData.push(this.airQualityData[currentIndex]);
        currentIndex++;
      }

      const specificDate = '2015-01-01';
      const filteredData = matchedData.filter(data => data.time.startsWith(specificDate));

      // console.log("filteredData: " + JSON.stringify(this.filteredData, null, 2));
      return filteredData;
    },

    binarySearch(array, compareFn) {
      let low = 0, high = array.length - 1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const comparison = compareFn(array[mid]);
        
        if (comparison === 0) return mid;
        else if (comparison < 0) high = mid - 1;
        else low = mid + 1;
      }

      return -1; // 没有找到
    },

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
        .style('border', '2px solid #007bff')
        .style('border-radius', '10px')
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
      const segments = this.splitDataIntoSegments(data);
      //console.log("missingDataIntervals: " + JSON.stringify(this.missingDataIntervals, null, 2));
      segments.forEach(segment => {
        g.append("path")
          .datum(segment)
          .attr("fill", "none")
          .attr("stroke", "#009EFA")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(d => this.xScale(new Date(d.time)))
            .y(d => this.yScale(+d.PM25_Concentration))
          );
      });

      this.missingTime = [];
      // 绘制缺失数据的红色虚线矩形框
      this.missingDataIntervals.forEach(interval => {
        this.missingTime.push(new Date(interval.start), new Date(interval.end));

        const startX = this.xScale(new Date(interval.start));
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
          .style("stroke", "red")
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
          Math.abs(m.direction - markerinfo.direction) > 30
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

    splitDataIntoSegments(data) {
      let segments = [];
      let currentSegment = [];
      let lastValidData = null; // 用于记录上一个有效数据点

      data.forEach(d => {
        if (this.isValidPM25(d.PM25_Concentration)) {
          if (currentSegment.length === 0 && lastValidData) {
            // 如果当前段是新的，且存在上一个有效数据点，则记录缺失数据的起始和结束时间
            this.missingDataIntervals.push({
              start: lastValidData.time,
              end: d.time
            });
            this.missingY.push({
              startY: lastValidData.PM25_Concentration,
              endY: d.PM25_Concentration
            });
          }
          currentSegment.push(d);
          lastValidData = d; // 更新最后一个有效数据点
        } else if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      });

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      return segments;
    },

    isValidPM25(value) {
      return value != null && !isNaN(value) && value !== 0;
    },

    loadAllAirQualityData() {
      return new Promise((resolve) => {
        Papa.parse('/Data/airquality.csv', {
          download: true,
          header: true,
          complete: (results) => {
            this.airQualityData = results.data;
            resolve();
          }
        });
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

    nextStep() {
      this.state = 2;

      // 修改点的预览图移到左下角
      const svgTop = window.innerHeight - 135;
      d3.select('#chartSelected-container svg.svgSelectedOne')
        .style('left', `10px`)
        .style('top', `${svgTop}px`);

      // 按钮移到右下角
      this.previousButtonStyle.left = 'calc(100% - 80px)';
      this.previousButtonStyle.top = 'calc(100% - 100px)';
      this.confirmButtonStyle.left = 'calc(100% - 80px)';
      this.confirmButtonStyle.top = 'calc(100% - 60px)';

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

      this.calWeight();
      // console.log("refDataUsed: " + JSON.stringify(this.refDataUsed, null, 2));
      
      // this.weights.forEach(weight => {
      //   console.log(`MarkerId: ${weight.marker.stationId}, Related Weight: ${weight.relatedWeight}, Related WeightS: ${weight.relatedWeightS}, Distance Weight: ${weight.distanceWeight}, Distance WeightS: ${weight.distanceWeightS}, Composite Weight: ${weight.compWeight}`);
      // });

      this.drawCalLine();

      // 点击->选参考点
      this.markersInMap.forEach(marker => {
        marker.off('click').on('click', () => {
          this.toggleMarker(marker);
        });
      });

      // 处理elseSvg的小图
      this.elseMarkers = this.markersNearby.filter(marker => marker !== this.selectedMarker);

      this.elseMarkers.forEach(marker => {
        this.drawSvgRefOR(marker);
      });
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

      // const xScale = d3.scaleTime()
      //   .domain(d3.extent(this.valueUsed, d => new Date(d.time)))
      //   .range([0, 300 - 55]); // 假设 innerWidth 为 300 - (left + right margin)

      // const yScale = d3.scaleLinear()
      //   .domain([0, Math.ceil((d3.max(this.valueUsed, d => +d.value) + 30) / 20) * 20])
      //   .range([120 - 30, 0]); // 假设 innerHeight 为 120 - (top + bottom margin)

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
      let selData = [...this.findDataForStation(this.selectedMarker.stationId)];
      // console.log("selData: " + JSON.stringify(selData, null, 2));
      let missT = [];

      missT = selData.reduce((data, item) => {
        if (item.PM25_Concentration === 'NULL') {
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
          let refData = this.findDataForStation(marker.stationId).map(item => ({ ...item }));
          
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
          // console.log("refData: " + JSON.stringify(refData, null, 2));
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
    },

    refreshSvgRefOR() {
      this.elseMarkers.forEach(marker => {
        const pos = this.map.latLngToContainerPoint(marker.getLatLng());
        const svgId = 'elseSvg' + marker.stationId;
        const svg = d3.select('#' + svgId);

        svg.style('left', pos.x - 100 + 'px')
          .style('top', pos.y - 80 + 'px');
      });
    },

    drawSvgRefOR(marker) {
      const recentData = this.findDataForStation(marker.options.stationId);

      this.$nextTick(() => {
        const svgId = 'elseSvg' + marker.options.stationId;
        const svg = d3.select('#' + svgId)
          .attr('width', 200)
          .attr('height', 80);

        // 矩形背景
        svg.append('rect')
          .attr('x', 2)
          .attr('y', 2)
          .attr('width', 196)
          .attr('height', 76)
          .attr('rx', 10)
          .attr('ry', 10)
          .style('fill', 'white')
          .style('stroke', '#3596B5')
          .style('stroke-width', 2);

        // 布局和内部
        const margin = { top: 8, right: 15, bottom: 22, left: 35 };
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
          .domain([0, Math.ceil((d3.max(recentData, d => +d.PM25_Concentration) + 10) / 20) * 20])
          .range([innerHeight, 0]);

        // 坐标轴
        g.append('g')
          .attr('transform', `translate(0,${innerHeight})`)
          .call(d3.axisBottom(xScale).ticks(4));

        g.append('g')
          .call(d3.axisLeft(yScale).ticks(d3.max(recentData, d => +d.PM25_Concentration) / 50));

        // 绘制曲线
        g.append('path')
          .datum(recentData)
          .attr('fill', 'none')
          .attr('stroke', '#009EFA')
          .attr('stroke-width', 1.5)
          .attr('d', d3.line()
            .x(d => xScale(new Date(d.time)))
            .y(d => yScale(d.PM25_Concentration))
          );
      });
    },

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

        this.elseMarkers = this.markersNearby.filter(marker => marker !== this.selectedMarker);
        this.elseMarkers.forEach(marker => {
          this.drawSvgRefOR(marker);
          this.calWeight();
          this.drawCalLine();
        });

        this.weights.forEach(weight => {
          console.log(`MarkerId: ${weight.marker.stationId}, Related Weight: ${weight.relatedWeight}, Related WeightS: ${weight.relatedWeightS}, Distance Weight: ${weight.distanceWeight}, Distance WeightS: ${weight.distanceWeightS}, Composite Weight: ${weight.compWeight}`);
        });
      }
    },

    previousStep() {
      this.state = 1;
      this.map.setView(this.selectedMarker.getLatLng(), 11);
      //改回参考点的图标
      this.markersInMap.forEach(marker => {
        if (this.markersNearby.includes(marker) && marker !== this.selectedMarker) {
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
      this.carryOverlayImages();
    },

    carryOverlayImages() {
      const screenWidth = 400;
      const imageHeight = 135;
      const imageWidth = screenWidth * 0.95;
      const margin = 3; // 空隙宽度

      const sortedMarkers = this.markersNearby.sort((markerA, markerB) => {
        const latA = markerA.getLatLng().lat;
        const latB = markerB.getLatLng().lat;
        return latB - latA; // 按纬度降序排列
      });

      const sortedStationIds = sortedMarkers.map(marker => marker.options.stationId);

      this.linedImages = sortedStationIds.map((id, index) => {
        const imageTop = index * (imageHeight + margin); // 每个矩形的上边缘
        return {
          id,
          top: imageTop,
          left: 2,
          width: imageWidth,
          height: imageHeight
        };
      });

      console.log("selectedMarker.stationId: " + this.selectedMarker.stationId);
      console.log("this.selectedMarker: " + this.selectedMarker);
      this.linedImages.forEach((image, index) => {
        // 异步更新后再画
        this.$nextTick(() => {
          const color = index < this.colorSequence.length ? this.colorSequence[index] : this.selHsv();

          // 修改标记点颜色
          const marker = this.markersNearby.find(m => m.stationId === image.id);
          if (marker) {
            if (marker === this.selectedMarker) {
              marker.setStyle({
                fillColor: color,
                color: "#EE781F"
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

          const { xScale, yScale, innerHeight } = this.drawSvg('svg' + image.id);

          // 对选中点
          if (this.selectedMarker && 'svg' + image.id === 'svg' + this.selectedMarker.stationId) {
            //console.log("Selected M is here!");
            this.drawSelectedSvg('svg' + image.id, xScale, yScale, innerHeight);
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
      this.nextHue = (this.nextHue + 360 / (this.markersNearby.length - this.colorSequence.length)) % 360;
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
      const data = this.findDataForStation(svgId.replace('svg', ''));
      if (data.length === 0) {
        return; // 如果没有数据，就不进行绘制
      }

      // 分段
      const dataSegments = this.splitDataIntoSegments(data);

      const svg = d3.select('#' + svgId);
      const svgWidth = svg.node().clientWidth;
      const svgHeight = svg.node().clientHeight;

      const margin = { top: 10, right: 20, bottom: 18, left: 25 };
      const innerWidth = svgWidth - margin.left - margin.right;
      const innerHeight = svgHeight - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.time)))
        .range([0, innerWidth]);

      const yScale = d3.scaleLinear()
        .domain([0, Math.ceil((d3.max(data, d => +d.PM25_Concentration) + 10) / 20) * 20])
        .range([innerHeight, 0]);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

      g.append('g')
        .call(d3.axisLeft(yScale).ticks(d3.max(data, d => +d.PM25_Concentration) / 20));

      this.containerData[svgId] = [];
      
      // 对每个数据段
      dataSegments.forEach(segment => {
        g.append('path')
          .datum(segment)
          .attr('fill', 'none')
          .attr('stroke', '#009EFA')
          .attr('stroke-width', 1.5)
          .attr('d', d3.line()
            .x(d => xScale(new Date(d.time)))
            .y(d => yScale(+d.PM25_Concentration))
          );
        segment.forEach(d => {
          const point = {
            x: xScale(new Date(d.time)),
            y: yScale(+d.PM25_Concentration),
            data: d
          };
          this.containerData[svgId].push(point);
        });
      });

      // 返回scale和尺寸给其他方法用
      return { xScale, yScale, innerHeight };
    },

    drawSelectedSvg(svgId, xScale, yScale, innerHeight) {
      // console.log("drawSelectedSvg running!");
      const data = this.findDataForStation(svgId.replace('svg', ''));
      if (data.length === 0) {
        return; // 如果没有数据则不画曲线图
      }

      const svg = d3.select('#' + svgId);
      const g = svg.select('g');
      const proximityRadius = 5; // 鼠标靠近判定半径
      let guideLineXCoords = [];
      this.filledCircles = [];
      
      let startX, startY, endX, endY = null;

      // 对缺失数据段
      this.missingDataIntervals.forEach((interval, index) => {
        //前后有效点的坐标
        startX = xScale(new Date(interval.start));
        startY = yScale(this.missingY[index].startY);
        endX = xScale(new Date(interval.end));
        endY = yScale(this.missingY[index].endY);

        // 缺失段开始点
        g.append('circle')
          .attr('cx', startX)
          .attr('cy', startY)
          .attr('r', 3)
          .style('fill', 'none')
          .style('stroke', 'red');

        // 结束点
        g.append('circle')
          .attr('cx', endX)
          .attr('cy', endY)
          .attr('r', 3)
          .style('fill', 'none')
          .style('stroke', 'red');

        // 缺失数据竖直引导线
        const startTime = new Date(interval.start);
        const endTime = new Date(interval.end);
        for (let time = new Date(startTime); time <= endTime; time.setHours(time.getHours() + 1)) {
          const guideLineX = xScale(time);
          guideLineXCoords.push(guideLineX);
          
          g.append('line')
            .attr('x1', xScale(time))
            .attr('y1', 0)
            .attr('x2', xScale(time))
            .attr('y2', innerHeight)
            .style('stroke', 'grey')
            .style('stroke-dasharray', ('2, 2'));
        }
      });

      guideLineXCoords = guideLineXCoords.filter((value, index, self) => self.indexOf(value) === index);// 去重
      guideLineXCoords.sort((a, b) => a - b); // 排序
      if (guideLineXCoords.length > 2) {
        guideLineXCoords.shift(); // 删最小值
        guideLineXCoords.pop(); // 删最大值
      }
      //console.log("Guide line X coordinates without min and max: ", guideLineXCoords);

      // 鼠标移动事件
      svg.on("mousemove", (event) => {
        const [mouseX, mouseY] = d3.pointer(event, g.node());

        // 开始和结束点
        let nearStart = Math.hypot(startX - mouseX, startY - mouseY) <= proximityRadius;
        let nearEnd = Math.hypot(endX - mouseX, endY - mouseY) <= proximityRadius;

        g.selectAll('.start-circle').remove();
        g.selectAll('.end-circle').remove();
        if (nearStart) {
          g.append('circle').classed('start-circle', true)
            .attr('cx', startX).attr('cy', startY).attr('r', 3).style('fill', 'red');
        }
        if (nearEnd) {
          g.append('circle').classed('end-circle', true)
            .attr('cx', endX).attr('cy', endY).attr('r', 3).style('fill', 'red');
        }

        // 清除之前的空心圆形和文本框
        g.selectAll('.hollow-circle, .text-box, .text-label').remove();

        // 检查鼠标是否靠近引导线
        const nearGuideLineIndex = guideLineXCoords.findIndex(guideLineX => Math.abs(mouseX - guideLineX) <= proximityRadius / 3);
        const nearGuideLineX = guideLineXCoords[nearGuideLineIndex];

        if (nearGuideLineIndex >= 0 && mouseY >= 0 && mouseY <= innerHeight) {
          // 在靠近的引导线上绘制一个空心圆形
          g.append('circle').classed('hollow-circle', true)
            .attr('cx', nearGuideLineX).attr('cy', mouseY).attr('r', 3)
            .style('fill', 'none').style('stroke', 'red');
          
          // 文本内容
          const textContent = "Y: " + yScale.invert(mouseY).toFixed(2);

          // 绘制文本框背景
          g.append('rect').classed('text-box', true)
            .attr('x', nearGuideLineX + 5)
            .attr('y', mouseY - 10)
            .attr('width', 60)
            .attr('height', 18)
            .style('fill', 'white')
            .style('stroke', '#7E89FE')
            .style('opacity', 0.8);

          // 绘制文本
          g.append('text').classed('text-label', true)
            .attr('x', nearGuideLineX + 7)
            .attr('y', mouseY)
            .text(textContent)
            .style('font-size', '12px')
            .style('font-family', 'Arial, sans-serif');
        }
      });

      // 鼠标点击事件
      svg.on("click", (event) => {
        const [mouseX, mouseY] = d3.pointer(event, g.node());

        // 清除之前画的
        g.selectAll('.guide-line').remove();
        g.selectAll('.filled-circle').remove();

        // 检查鼠标是否靠近引导线
        const nearGuideLineIndex = guideLineXCoords.findIndex(guideLineX => Math.abs(mouseX - guideLineX) <= proximityRadius / 3);
        const nearGuideLineX = guideLineXCoords[nearGuideLineIndex];

        if (nearGuideLineIndex >= 0 && mouseY >= 0 && mouseY <= innerHeight) {
          const existingIndex = this.filledCircles.findIndex(circle => Math.abs(circle.x - nearGuideLineX) < proximityRadius / 3);
          if (existingIndex >= 0) {
            this.filledCircles.splice(existingIndex, 1); // 移除已有坐标
          }
          this.filledCircles.push({x: nearGuideLineX, y: mouseY}); // 添加新坐标

          // 绘制实心圆形
          this.filledCircles.forEach(circle => {
            g.append('circle').classed('filled-circle', true)
              .attr('cx', circle.x).attr('cy', circle.y).attr('r', 3)
              .style('fill', 'red');
          });
        }

        //画线
        guideLineXCoords.sort((a, b) => a - b);

        let previousPoint = null; // 用于存储前一个点

        guideLineXCoords.forEach((guideLineX, index) => {
          // 查找filledCircles中横坐标等于guideLineX的点
          const currentPoint = this.filledCircles.find(circle => circle.x === guideLineX);

          if (currentPoint) {
            // 最小的guideLineX与开始点相连
            if (index === 0) {
              g.append('line').classed('guide-line', true)
                .attr('x1', startX).attr('y1', startY)
                .attr('x2', currentPoint.x).attr('y2', currentPoint.y)
                .style('stroke', 'blue');
            }

            // 连接当前点与前一个点
            if (previousPoint) {
              g.append('line').classed('guide-line', true)
                .attr('x1', previousPoint.x).attr('y1', previousPoint.y)
                .attr('x2', currentPoint.x).attr('y2', currentPoint.y)
                .style('stroke', 'blue');
            }

            previousPoint = currentPoint; // 更新前一个点为当前点

            // 如果是最大的guideLineX，则与结束点相连
            if (index === guideLineXCoords.length - 1) {
              g.append('line').classed('guide-line', true)
                .attr('x1', currentPoint.x).attr('y1', currentPoint.y)
                .attr('x2', endX).attr('y2', endY)
                .style('stroke', 'blue');
            }
          }
        });
        this.savePoints = this.filledCircles.map(circle => ({
          x: xScale.invert(circle.x),
          y: yScale.invert(circle.y)
        }));
      });

      // 鼠标离开事件
      svg.on("mouseleave", () => {
        // 获取与 SVG 关联的标记
        const relatedMarker = this.markersInMap.find(marker => marker.options.stationId === svgId.replace('svg', ''));

        console.log(`SVG Mouseleave on: ${svgId.replace('svg', '')}, Marker found: ${!!relatedMarker}`);
        // 恢复标记的图标
        if (relatedMarker) {
          // relatedMarker.setIcon(this.pointIcon); // 恢复到原始图标
          relatedMarker.setStyle({
            color: "#7E89FE"
          })
        }

        // 恢复 SVG 的边框颜色
        svg.style('border-color', '#7E89FE'); // 原始颜色
      });
    },

    chgColSvg(imageId) {
      const chartImg = document.getElementById('chartimg-' + imageId);
      const relatedMarker = this.markersNearby.find(marker => marker.options.stationId === imageId);

      // 为每个 chartImg 设置鼠标事件
      chartImg.addEventListener("mouseenter", () => {
        // 更改标记图标外圈->绿色
        if (relatedMarker) {
          // relatedMarker.setIcon(this.point4Icon);
          relatedMarker.setStyle({
            color: "#00C9A7"
          })
        }
        // 更改容器边框->绿色
        chartImg.style.border = '2px solid #00C9A7';
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
        chartImg.style.border = '2px solid #7E89FE';
      });
    },

    ChgColCir(marker) {
      // 鼠标悬停
      marker.on('mouseover', () => {
        marker.setStyle({
          color: "#00C9A7"
        });
        const relatedImage = document.getElementById('chartimg-' + marker.options.stationId);
        if (relatedImage) {
          relatedImage.style.border = '4px solid #00C9A7';
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
              relatedImage.style.border = '2px solid #7E89FE';
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
      if (this.selectedMarker) {
        console.log('当前补充数据的监测站id: ', this.selectedMarker.stationId);
      } else {
        console.log('');
      }
      console.log('保存的坐标: ', this.savePoints);
    },

    backToStart() {
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
        border: '2px solid #7E89FE',
        borderRadius: '10px',
      };
    },

    boxStyle(marker) {
      const pos = this.map.latLngToContainerPoint(marker.getLatLng());
      return {
        position: 'absolute',
        left: pos.x - 100 + 'px',
        top: pos.y - 80 + 'px',
        width: '200px',
        height: '80px',
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

#overlay-container > * {
  pointer-events: auto;
}

#chart-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 100vh; /* 与视窗高度相同 */
  overflow-y: auto; /* 允许垂直滚动 */
}

.map-button {
  pointer-events: auto;
  cursor: pointer; /*鼠标悬停为手形*/
  height:35px;
  width: 80px;
  padding: 5px;
  border: none;
  background-color: white;
  color: #007bff;
  border: 2px solid #007bff;
  font-size: 15px;
  font-family: "微软雅黑", sans-serif;
  border-radius: 5px;
  opacity: 0.8; /*不透明度*/
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

</style>