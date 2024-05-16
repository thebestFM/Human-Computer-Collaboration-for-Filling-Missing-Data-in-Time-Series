<template>
  <div id="map-container">
    <div id="map" style="height: 100vh;"></div>
    
    <div id="whole-container">
      <div id="time-selector-container">
        <div style="display: flex; align-items: center; margin-right: 8px;">
          <button v-if="mapStore.MapState === 0 || mapStore.MapState === 1 || mapStore.MapState === 4" @click="upInfo" class="map-button" style="margin-right: 5px;">
            <i class="fa-solid fa-angle-up"></i>
          </button>
          <button v-if="mapStore.MapState === 2" @click="upInfo" class="map-button" style="margin-right: 5px;">
            <i class="fa-solid fa-angle-up"></i>
          </button>
          <button v-if="mapStore.MapState === 3" @click="nextTime" class="map-button" style="margin-right: 4px;">
            <i class="fa-solid fa-angles-right"></i>
          </button>
          <label style="font-family: 'Microsoft YaHei', sans-serif; font-weight: bold; font-size: 14px; color: #eff0fd;">数据时段:</label>
        </div>
        <input type="datetime-local" id="start-time" v-model="startTimeForPicker" :min="state.first" :max="state.end" style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #97A5C0; border: 2px solid #97A5C0;">
        <label style="font-family: 'Microsoft YaHei', sans-serif; font-weight: bold; font-size: 14px; color: #eff0fd; margin: 0 4px;">--</label>
        <input type="datetime-local" id="end-time" v-model="endTimeForPicker" :min="state.first" :max="state.end" style="font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; color: #97A5C0; border: 2px solid #97A5C0;">
      </div>

      <button v-if="mapStore.MapState === 1 || mapStore.MapState === 4" @click="resetMap" class="map-button" :style="buttonStyle">
        <i class="fas fa-rotate-left"></i>
      </button>
      <button v-if="mapStore.MapState === 1" @click="nextStep" class="map-button" :style="nextButtonStyle">
        <i class="fas fa-play"></i>
      </button>

      <button v-if="mapStore.MapState === 2" @click="previousStep" class="map-button" :style="previousButtonStyle">
        <i class="fa-solid fa-angle-left"></i>
      </button>
      <button v-if="mapStore.MapState === 2" @click="confirmSelection" class="map-button" :style="confirmButtonStyle">
        <i class="fas fa-play"></i>
      </button>

      <div id="chartSelected-container" v-if="mapStore.MapState === 1">
        <div id="svgSelectedOne"></div>
      </div>

      <div id="chartReference-container" v-if="mapStore.MapState === 2">
        <div v-for="marker in state.elseMarkers" :key="marker.stationId" class="svg-container">
          <svg :id="'elseSvg' + marker.stationId" class="elseSvgClass" :style="boxStyle(marker)"></svg>
        </div>
      </div>

      <div class="chart-container" v-if="state.show">
        <div v-for="image in state.linedImages" :key="image.id" class="chartimg" :style="imageStyle(image)" :id="'chartimg-' + image.id">
          <svg :id="'svg' + image.id"></svg>
        </div>
      </div>

      <div class="workspace-container" v-if="state.showWorkspace">
        <svg :id="'svgWorkspace'"></svg>
      </div>

      <div class="panel-container" v-if="state.show">
        <button @click="setMouseStatePen" class="on-button" :style="drawButtonStyle">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button @click="setMouseStateSelect" class="on-button" :style="selectButtonStyle">
          <i class="fa-solid fa-arrow-pointer"></i>
        </button>

        <button @click="magnifier" class="on-button" :style="magnifierButtonStyle">
          <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
        </button>
        <button @click="saveChanges" class="on-button" :style="saveButtonStyle">
          <i class="fa-regular fa-floppy-disk"></i>
        </button>
        <button @click="backToStart" class="on-button" :style="backButtonStyle">
          <i class="fas fa-rotate-left"></i>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import Papa from 'papaparse';
import * as d3 from 'd3';
import useMapStore from '../stores/map'
import useDataStore from '../stores/data'
import { useDataLoader, findData } from '../utils/dataLoader';

const mapStore = useMapStore()
const dataStore = useDataStore()

const state = reactive({
  map: null,
  isshowLines: false,
  show: false,
  showWorkspace: false,
  selectedMarker: null,
  markersInMap: [],
  markersNearby: [],
  markersTemp: [],
  markersinfoSatisfied: [],
  first: '2014-05-01T01:00',
  end: '2015-04-30T22:00',
  startTime: '2014-05-01 01:00:00',
  endTime: '2014-05-03 01:00:00',
  linedImages: [],
  missingDataIntervals: [],
  previousOneData: [],
  missingY: [],
  elseMarkers: [],
  savedCircles: [],
  colorSequence: ['#F29A76', '#AED4DD', '#29AFD4', '#1E3B7A', '#A4ABD6', '#F9B800'],
  nextHue: 20,
  xScale: null, 
  yScale: null, 
  xScaleSmall: null, 
  yScaleSmall: null, 
  innerHeight: 0, 
  missingDataSegments: null,
  guideLineXs: [],
  extnededMissingDataSegments: [],
  missingData: [],
  proximityRadius: 3, // 感应鼠标操作吸附距离
});

const startTimeForPicker = computed({
  get: () => state.startTime.replace(' ', 'T').substring(0, state.startTime.length - 3),
  set: (value) => {
    state.startTime = value.replace('T', ' ') + ':00'
  }
});

const endTimeForPicker = computed({
  get: () => state.endTime.replace(' ', 'T').substring(0, state.endTime.length - 3),
  set: (value) => {
    state.endTime = value.replace('T', ' ') + ':00'
  }
});

function upInfo(){}

function nextTime(){
  const oldStartTime = new Date(state.startTime);
  const oldEndTime = new Date(state.endTime);

  // 时间间隔
  const interval = oldEndTime - oldStartTime;

  // 新endTime
  const newEndTime = new Date(oldEndTime.getTime() + interval);

  // 更新
  state.endTime = newEndTime.toISOString().replace('T', ' ').substring(0, 19);
  state.startTime = oldEndTime.toISOString().replace('T', ' ').substring(0, 19);
}

const buttonStyle = {
  position: 'absolute',
  left: `50%`,
  top: `75%`,
  transform: 'translate(-50%, -50%)',
  zIndex: 1000
};

function resetMap() {
  mapStore.setMapState(0);

  if (state.selectedMarker) {
    const latLng = state.selectedMarker.getLatLng();
    state.map.setView(latLng, 11);

    // 重置selectedMarker图标
    state.selectedMarker.setStyle({
      fillColor: "#fff",
      color: "#7E89FE"
    })
  }
}

const nextButtonStyle = {
  position: 'absolute',
  left: `50%`,
  top: 'calc(75% + 40px)',
  transform: 'translate(-50%, -50%)',
  zIndex: 1000
}

function nextStep() {  // MapState1进入MapState2按钮调用
  mapStore.setMapState(2);

  // 删MapState 1固定在屏幕中上方的预览图
  d3.select('#chartSelected-container svg.svgSelectedOne')
    .remove();

  // 改变参考点的图标
  state.markersInMap.forEach(marker => {
    if (state.markersNearby.includes(marker) && marker !== state.selectedMarker) {
      marker.setStyle({
        fillColor: "#FCE57D",
        color: "#7E89FE"
      })
    }
  });

  // 点击->选参考点
  state.markersInMap.forEach(marker => {
    marker.off('click').on('click', () => {
      onMarkerClickReference(marker);
    });
  });

  // 处理elseSvg的小图
  state.elseMarkers = state.markersNearby;
  state.elseMarkers.forEach(marker => {
    drawSvgRefOR(marker);
  });
  nextTick(() => {
    const svgId = 'elseSvg' + state.selectedMarker.stationId;
    d3.select('#' + svgId).selectAll('rect')
      .style('stroke', '#FF8066');
  });
}

const previousButtonStyle = {
  position: 'absolute',
  left: `50%`,
  top: `75%`,
  transform: 'translate(-50%, -50%)',
  zIndex: 1000
};

function previousStep() { // MapState2回退MapState1按钮调用
  mapStore.setMapState(1)
  state.map.setView(state.selectedMarker.getLatLng(), 11);
  //改回参考点的图标
  state.markersInMap.forEach(marker => {
    if (state.markersNearby.includes(marker)) {
      marker.setStyle({
        fillColor: "#fff",
        color: "#7E89FE"
      })
    }
  })

  // 点击事件改回选修改点
  state.markersInMap.forEach(marker => {
    marker.off('click').on('click', () => {
      onMarkerClickModification(marker);
    });
  });
}

const confirmButtonStyle = {
  position: 'absolute',
  left: `50%`,
  top: 'calc(75% + 40px)',
  transform: 'translate(-50%, -50%)',
  zIndex: 1000
}

function confirmSelection() {
  mapStore.setMapState(3);

  state.markersInMap.forEach(marker => {
    marker.off('click').on('click', () => {
      // 点击circlemarker不再有反应
    });
  });

  state.show = !state.show;
  
  carryOverlayImages();

  nextTick(() => {
    const timeSelectorContainer = document.getElementById('time-selector-container');
    const chartContainer = document.querySelector('.chart-container');
    const panelContainer = document.querySelector('.panel-container');

    if (timeSelectorContainer) {
      timeSelectorContainer.style.bottom = '90vh';
    }
    if (chartContainer) {
      chartContainer.style.top = '10vh';
    }
    if (panelContainer) {
      panelContainer.style.top = '10vh';
    }
  });
}

//2-svg
function boxStyle(marker) {
  const pos = state.map.latLngToContainerPoint(marker.getLatLng());
  return {
    position: 'absolute',
    left: `${pos.x - 100}px`,
    top: `${pos.y - 94}px`,
    width: '200px',
    height: '90px',
    zIndex: 500,
    opacity: 0.8
  };
}

// 3-left-svg
function imageStyle(image) {
  return {
    position: 'absolute',
    top: `${image.top}px`,
    left: `${image.left}px`,
    width: `${image.width}px`,
    height: `${image.height}px`,
    backgroundColor: 'white',
    margin: '5px',
    boxSizing: 'border-box',
    borderRadius: '2px',
    opacity: 0.9
  };
}

// 3-button
const drawButtonStyle = reactive({
  position: 'absolute',
  top: '10px',
  left: '50%',
  transform: 'translateX(-52%)',
  zIndex: 1000,
  get border() {
    return mapStore.mouseState === 1 ? '3px solid #7E89FE' : 'none';
  },
  get boxShadow() {
    return mapStore.mouseState === 1 ? 'inset 0 0 0 2px #F1F7FD' : 'none';
  }
});

function setMouseStatePen() {
  mapStore.setMouseState(1)
}

const selectButtonStyle = reactive({
  position: 'absolute',
  top: '55px',
  left: '50%',
  transform: 'translateX(-52%)',
  zIndex: 1000,
  get border() {
    return mapStore.mouseState === 2 ? '3px solid #7E89FE' : 'none';
  },
  get boxShadow() {
    return mapStore.mouseState === 2 ? 'inset 0 0 0 2px #F1F7FD' : 'none';
  }
});

function setMouseStateSelect() {
  mapStore.setMouseState(2)
}

const saveButtonStyle = {
  position: 'absolute',
  bottom: '10px',
  left: '50%',
  transform: 'translateX(-52%)',
  zIndex: 1000
}

function saveChanges() {
  let circlesData = state.savedCircles.map(circle => {
    const time = circle.time;
    let timeStr = `${time.getFullYear()}/${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;

    return {
      Time: timeStr,
      Station: circle.marker,
      Saved: circle.value.toFixed(2)
    };
  });

  fetch('http://127.0.0.1:5000/save-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(circlesData)
  })
  .then(response => response.text())
  .then(() => {
    alert('填充数据已保存!');
  })
  .catch((error) => {
    console.error('Error:', error);
    alert('保存失败，请稍后重试。');
  });
}

const backButtonStyle = {
  position: 'absolute',
  bottom: '55px',
  left: '50%',
  transform: 'translateX(-52%)',
  zIndex: 1000
}

function backToStart() {
  const timeSelectorContainer = document.getElementById('time-selector-container');
  if (timeSelectorContainer) {
    timeSelectorContainer.style.bottom = '0';
  }
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.style.top = '100vh';
  }
  const panelContainer = document.querySelector('.panel-container');
  if (panelContainer) {
    panelContainer.style.top = '100vh';
  }
  state.showWorkspace = false;

  setTimeout(() => {
    state.show = !state.show;
  }, 500);

  // 清空选中的标记点和相关数组
  if (state.selectedMarker) {
    const latLng = state.selectedMarker.getLatLng();
    state.map.setView(latLng, 11); // 地图恢复中心为当前位置，缩放级别11
  }

  // 重置所有marker图标
  state.markersInMap.forEach(marker => {
    marker.off('mouseover').off('mouseout').setStyle({
      fillColor: "#fff",
      color: "#7E89FE"
    });
  });

  state.markersNearby = [];

  mapStore.setMapState(0);
  state.markersInMap.forEach(marker => {
    marker.on('click', () => {
      onMarkerClickModification(marker);
    });
  });
}

const magnifierButtonStyle = {
  position: 'absolute',
  bottom: '100px',
  left: '50%',
  transform: 'translateX(-52%)',
  zIndex: 1000
}

function magnifier() {
  if (!state.showWorkspace) {
    state.showWorkspace = true;
    state.map.setView([39.8, 116.08], 11);
    nextTick(() => {
      const anotherSvg = d3.select('#svg' + state.selectedMarker.stationId);
      const anotherG = anotherSvg.select('g')
      anotherG.selectAll('.guide-circle, .value-box, .value-text').remove()
      anotherSvg.on('mousemove', null);
      anotherSvg.on('click', null);

      const svg = d3.select('#svgWorkspace');
      const { xScale, yScale } = drawSvg(state.selectedMarker.stationId, svg);

      state.xScaleSmall = state.xScale
      state.yScaleSmall = state.yScale
      state.xScale = xScale
      state.yScale = yScale

      const g = svg.select('g')
      guideCir(g); // 画起点终点，准备数据

      nextTick(() => {
        drawSelectedSvgLines(xScale, yScale, state.selectedMarker.stationId, g);

        guideLoss(g, 1); // 引导线

        drawLongSaved(g, state.xScale, state.yScale)
        
        if (mapStore.mouseState == 1) {
          handlePenMode(svg, g, 2)
        }
        if (mapStore.mouseState == 2) {
          handleSelectMode(svg, g)
        }
      });
    });
  }
}

function handleTimeChange() {
  switch(mapStore.MapState) {
    case 1: {
      const recentData = findData(state.selectedMarker.stationId, state.startTime, state.endTime, 1)
      if (recentData.length > 0) {
        drawSvgSelOR(recentData)
      }
      break
    }
    case 2: {
      state.elseMarkers = state.markersNearby
      state.elseMarkers.forEach(marker => {
        drawSvgRefOR(marker)
      })
      nextTick(() => {
        const svgId = 'elseSvg' + state.selectedMarker.stationId
        d3.select('#' + svgId).selectAll('rect')
          .style('stroke', '#FF8066')
      })
      break
    }
    case 3: {
      state.linedImages.forEach((image) => {
        const svgId = `svg${image.id}`;
        d3.select(`#${svgId}`).selectAll("*").remove();
        fixAllSmallSvg(image.id)
        const svg = d3.select('#svg' + image.id);
        const g = svg.select('g')
        if (mapStore.mouseState == 1) {
          handlePenMode(svg, g, 1)
        }
        if (mapStore.mouseState == 2) {
          handleSelectMode(svg, g)
        }
      });

      // 如果已经展开了大图
      if (state.showWorkspace) {
        d3.select(`#svgWorkspace`).selectAll("*").remove();
        state.showWorkspace = false
        magnifier()
      }
      break
    }
    case 4: {
      const recentData = findData(state.selectedMarker.stationId, state.startTime, state.endTime, 1)
      if (recentData.length > 0) {
        drawSvgSelOR(recentData)
      }
      break
    }
    default:
      break
  }
}

function loadStations() {
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
              }).addTo(state.map);

              const stationIdLastTwo = station.station_id.slice(-2);
              marker.bindTooltip(stationIdLastTwo, {
                permanent: true,
                direction: 'center',
                className: 'station-id-tooltip',
                // offset: [0, 1] // 竖直方向偏下1像素
              });

              state.markersInMap.push(marker);
              marker.stationId = station.station_id;
            }
          });
        }
      });
    })

    const { loadAllData } = useDataLoader();
    loadAllData().then(() => {
      state.markersInMap.forEach(marker => {
        marker.on('click', () => {
          onMarkerClickModification(marker);
        });
      });
    });
}

function onMarkerClickModification(marker) {
  state.map.setView(marker.getLatLng(), 11);
  if (state.selectedMarker && state.selectedMarker !== marker) {
    state.selectedMarker.setStyle({
      fillColor: "#fff",
      color: "#7E89FE"
    });
  }

  state.selectedMarker = marker;
  marker.setStyle({
    fillColor: "#FCE57D",
    color: "#F29A76"
  });

  calculateNearbyStations(marker, 0.1);
  if (state.markersNearby.length <= 2) {
    calculateNearbyStations(marker, 0.2);
  }

  const recentData = findData(marker.stationId, state.startTime, state.endTime, 1);

  mapStore.setMapState(1);

  nextTick(() => {
    drawSvgSelOR(recentData);
  });
}

function calculateNearbyStations(marker, radius) {
  const latLng = marker.getLatLng();
  const latRange = [latLng.lat - radius, latLng.lat + radius];
  const lngRange = [latLng.lng - radius, latLng.lng + radius];

  state.markersTemp = [];
  state.markersinfoSatisfied = [];
  state.markersNearby = [];

  state.map.eachLayer((layer) => {
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

        state.markersTemp.push({ circleMarker: layer, distance, direction: adjustedDirection });
      }
    }
  });

  // 按距离升序排序
  state.markersTemp.sort((a, b) => a.distance - b.distance);

  // 筛选满足条件的markers
  state.markersTemp.forEach(markerinfo => {
    const isSatisfied = state.markersinfoSatisfied.every(m => 
      Math.abs(m.direction - markerinfo.direction) > 20 // 20度
    );
    if (isSatisfied) {
      state.markersinfoSatisfied.push(markerinfo);
    }
  });

  // 将满足条件的markers push到markersNearby
  state.markersinfoSatisfied.forEach(m => {
    state.markersNearby.push(m.circleMarker);
  });
}

function drawSvgSelOR(data) {
  d3.select('#chartSelected-container').selectAll('*').remove();

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const svgWidth = 300;
  const svgHeight = 120;

  const svg = d3.select('#chartSelected-container').append('svg')
    .classed('svgSelectedOne', true)
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('style', `position: absolute; left: ${screenWidth / 2 - svgWidth / 2}px; top: ${screenHeight * 0.2}px;`)
    .style('background-color', 'white')
    .style('border', '2px solid #FF8066')
    .style('border-radius', '4px')
    .style('z-index', '2000')
    .style('opacity', '0.9');

  const margin = { top: 10, right: 20, bottom: 20, left: 35 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // 比例尺和坐标轴
  const xScale = d3.scaleTime().domain(d3.extent(data, d => new Date(d.time))).range([0, innerWidth]);
  const dataMax = d3.max(data, d => +d.PM25_Concentration) * 1.2;
  const yMax = dataMax > 200 ? dataMax : 200;
  const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

  g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).ticks(7));
  g.append('g').call(d3.axisLeft(yScale).ticks(7));

  // splitDataIntoSegmentsSel是另外定义的 -> 有空要整理逻辑
  const segments = splitDataIntoSegmentsSel(data);

  segments.forEach(segment => {
    if (segment.length === 1) { // 画点
      g.append("circle").attr("cx", xScale(new Date(segment[0].time)))
        .attr("cy", yScale(+segment[0].PM25_Concentration)).attr("r", 2).attr("fill", "#009EFA");
    } else { // 画线
      g.append("path").datum(segment).attr("fill", "none").attr("stroke", "#009EFA").attr("stroke-width", 1.5)
        .attr("d", d3.line().x(d => xScale(new Date(d.time))).y(d => yScale(+d.PM25_Concentration)));
    }
  });

  const missingTime = [];
  // 绘制缺失数据的紫色虚线矩形框
  dataStore.missingDataIntervals.forEach((interval, index) => {
    missingTime.push(new Date(interval.start), new Date(interval.end));

    // 获取对应的前一个有效数据点的时间
    const previousValidTime = state.previousOneData[index] ? state.previousOneData[index].time : interval.start;
    const startX = xScale(new Date(previousValidTime)); // 基于前一个有效数据点的时间计算startX
    const endX = xScale(new Date(interval.end));
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
}

function splitDataIntoSegmentsSel(data) {
  let segments = [];
  let currentSegment = [];
  let potentialMissingStart = data[0] ? data[0].time : null; // 初始化可能的缺失开始时间
  let lastValidData = null; // 用于存储最后一个有效数据点
  let lastValidPM25 = null; // 存储最后一个有效PM25值

  state.previousOneData = []; // 重置前一个有效数据点的数组
  dataStore.missingY = []; // 重置missingY数组，用于存储每段缺失数据的PM25范围
  dataStore.missingDataIntervals = []; // 重置缺失数据间隔数组

  data.forEach((d, index) => {
    if (isValidPM25(d.PM25_Concentration)) {
      if (potentialMissingStart && currentSegment.length === 0 && index > 0) {
        // 记录每段缺失前一个有效数据
        state.previousOneData.push(lastValidData);

        // 记录缺失数据的起始和结束时间
        dataStore.missingDataIntervals.push({
          start: potentialMissingStart,
          end: d.time
        });

        // 记录每段缺失数据前后有效数据的PM25值
        dataStore.missingY.push({
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
      if (index === 0 || isValidPM25(data[index - 1].PM25_Concentration)) {
        potentialMissingStart = d.time; // 更新潜在的缺失开始时间
      }
    }
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment); // 添加最后一个有效的数据段
  }

  // 如果数据以无效值结束，记录最后一段缺失的前一个有效数据和PM25值
  if (potentialMissingStart && lastValidData) {
    state.previousOneData.push(lastValidData);
    dataStore.missingDataIntervals.push({
      start: potentialMissingStart,
      end: data[data.length - 1].time
    });
    dataStore.missingY.push({
      startY: lastValidPM25,
      endY: null // 如果没有后续有效数据，结束PM25值设为null
    });
  }

  return segments;
}

function isValidPM25(value) {
  return value !== null && value !== undefined && !isNaN(value);
}

function drawSvgRefOR(marker) {
  const recentData = findData(marker.stationId, state.startTime, state.endTime, 1);

  nextTick(() => {
    const svgId = 'elseSvg' + marker.stationId;
    const svg = d3.select('#' + svgId)
      .attr('width', 200)
      .attr('height', 80);

    // 矩形背景
    svg.append('rect')
      .attr('x', 2)
      .attr('y', 2)
      .attr('width', 196)
      .attr('height', 76)
      .attr('rx', 3)
      .attr('ry', 3)
      .style('fill', 'white')
      .style('stroke', '#7E89FE')
      .style('stroke-width', 1.5);

    const margin = { top: 10, right: 15, bottom: 14, left: 35 };
    const innerWidth = 200 - margin.left - margin.right;
    const innerHeight = 80 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(recentData, d => new Date(d.time)))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(recentData, d => d.PM25_Concentration) + 10])
      .range([innerHeight, 0]);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(4));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(d3.max(recentData, d => +d.PM25_Concentration) / 50));

    const segments = splitDataIntoSegments(recentData);

    segments.forEach(segment => {
      if (segment.length === 1) {
        const point = segment[0];
        g.append("circle")
          .attr("cx", xScale(new Date(point.time)))
          .attr("cy", yScale(point.PM25_Concentration))
          .attr("r", 2)
          .attr("fill", "#009EFA");
      } else {
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
}

function onMarkerClickReference(marker) {
  if (marker !== state.selectedMarker) {
    if (state.markersNearby.includes(marker)) {
      const index = state.markersNearby.indexOf(marker);
      if (index > -1) {
        state.markersNearby.splice(index, 1);

        marker.setStyle({
          fillColor: "#fff",
          color: "#7E89FE"
        });
      }
    } else {
      state.markersNearby.push(marker);

      marker.setStyle({
        fillColor: "#FCE57D",
        color: "#7E89FE"
      });
    }

    state.elseMarkers = [...state.markersNearby];
    state.elseMarkers.forEach(marker => {
      drawSvgRefOR(marker);
    });

    nextTick(() => {
      const svgId = 'elseSvg' + state.selectedMarker.stationId;
      d3.select('#' + svgId).selectAll('rect')
        .style('stroke', '#FF8066');
    });
  }
}

function splitDataIntoSegments(data) {
  let segments = [];
  let currentSegment = [];

  data.forEach(d => {
    if (isValidPM25(d.PM25_Concentration)) {
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
}

function carryOverlayImages() {
  state.linedImages.forEach(image => {
    const svgId = `svg${image.id}`;
    d3.select(`#${svgId}`).selectAll("*").remove();
  });

  const screenWidth = 460;
  const imageHeight = 135;
  const imageWidth = screenWidth * 0.96;
  const margin = 8; // 空隙宽度

  const sortedMarkers = state.markersNearby.sort((markerA, markerB) => {
    const latA = markerA.getLatLng().lat;
    const latB = markerB.getLatLng().lat;
    return latB - latA; // 按纬度降序排列
  });

  const sortedStationIds = sortedMarkers.map(marker => marker.stationId);

  state.linedImages = sortedStationIds.map((id, index) => {
    const imageTop = index * (imageHeight + margin); // 每个矩形的上边缘
    return {
      id,
      top: imageTop,
      left: (screenWidth - imageWidth)/2 + 10 - margin,
      width: imageWidth,
      height: imageHeight
    };
  });

  state.linedImages.forEach((image, index) => {
    nextTick(() => {
      let color;
      if (image.id === state.selectedMarker.stationId) {
        color = '#F7EEAD';
      } else {
        // 从颜色序列中分配颜色
        color = state.colorSequence[index % state.colorSequence.length];
      }

      // 修改标记点颜色
      const marker = state.markersNearby.find(m => m.stationId === image.id);
      if (marker) {
        marker.setStyle({
          fillColor: color,
          color: marker === state.selectedMarker ? "#F29A76" : "#7E89FE"
        });
      }

      // 绘制标识圆圈
      drawCirOnSvg(image.id, color);

      fixAllSmallSvg(image.id)

      chgColSvg(image.id);
    });
  });

  state.markersNearby.forEach(marker => {
    ChgColCir(marker);
  });
}

function fixAllSmallSvg (svgId) {
  if (svgId === state.selectedMarker.stationId) {
    const svg = d3.select('#svg' + svgId);
    
    const { xScale, yScale } = drawSvg(svgId, svg);
    state.xScale = xScale
    state.yScale = yScale

    const g = svg.select('g')
    guideCir(g); // 画起点终点，准备数据

    nextTick(() => {
      drawSelectedSvgLines(xScale, yScale, svgId, g);
      guideLoss(g, 1); // 引导线
      drawLongSaved(g, xScale, yScale)
      if (mapStore.mouseState == 1) {
        handlePenMode(svg, g, 1)
      }
      if (mapStore.mouseState == 2) {
        handleSelectMode(svg, g)
      }
    });
  } else {
    const svg = d3.select('#svg' + svgId);
    drawSvg(svgId, svg);
    nextTick(() => {
      const g = svg.select('g')
      guideLoss(g, 2);
    });
  }
}

function drawSvg(svgId, svg) {
  // 对svg，设置边距
  const svgWidth = svg.node().clientWidth;
  const svgHeight = svg.node().clientHeight;
  console.log("svgWidth: ", svgWidth, "\nsvgHeight: ", svgHeight);
  const margin = { top: 12, bottom: 20, right: 20, left: 30 };
  const innerWidth = svgWidth - margin.left - margin.right;
  state.innerHeight = svgHeight - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // 基础曲线的初始数据
  const missingData = findData(svgId, state.startTime, state.endTime, 1);
  
  // 画基础曲线
  // 比例尺和坐标轴
  const xScale = d3.scaleTime().domain(d3.extent(missingData, d => new Date(d.time))).range([0, innerWidth]);
  
  const dataMax = d3.max(missingData, d => +d.PM25_Concentration) * 1.2;
  const yMax = dataMax > 200 ? dataMax : 200;
  const yScale = d3.scaleLinear().domain([0, yMax]).range([state.innerHeight, 0]);

  g.append('g').attr('transform', `translate(0,${state.innerHeight})`).call(d3.axisBottom(xScale).ticks(7));
  g.append('g').call(d3.axisLeft(yScale).ticks(7));

  let hasValidData = false;
  missingData.forEach((datum) => {
    if (isValidPM25(datum.PM25_Concentration)) {
      hasValidData = true;
    }
  });

  if (hasValidData) {
    // 处理基础曲线
    const missingDataSegments = splitDataIntoSegments(missingData);

    if (svgId == state.selectedMarker.stationId) {
      state.missingDataSegments = missingDataSegments
    }

    const lineGenerator = d3.line()
      .defined(d => isValidPM25(d.PM25_Concentration)) // 只画有效点
      .x(d => xScale(new Date(d.time)))
      .y(d => yScale(+d.PM25_Concentration));

    missingDataSegments.forEach(segment => {
      if (segment.length === 1) { // 画点
        g.append("circle").attr("cx", xScale(new Date(segment[0].time)))
          .attr("cy", yScale(+segment[0].PM25_Concentration)).attr("r", 2).attr("fill", "#009EFA");
      } else { // 画线
        g.append("path").datum(segment).attr("fill", "none").attr("stroke", "#009EFA").attr("stroke-width", 1.5)
          .attr("d", lineGenerator);
      }
    });
  }

  return { xScale, yScale }
}

function drawLine(xScale, yScale, missingDataSegments, svgId, opt, g) {
  // opt: 1-missing, 2-predict, 3-ground_truth, 4-missing_and_save
  let data = [];
  let lineColor, pointColor;
  switch (opt) {
    case 1:
      data = findData(svgId, state.startTime, state.endTime, 1);
      lineColor = '#009EFA';
      pointColor = '#009EFA';
      break;
    case 2:
      data = findData(svgId, state.startTime, state.endTime, 2);
      lineColor = 'green';
      pointColor = '#377D22';
      break;
    case 3:
      data = findData(svgId, state.startTime, state.endTime, 3);
      lineColor = 'orange';
      pointColor = 'orange';
      break;
    case 4:
      data = findData(svgId, state.startTime, state.endTime, 4);
      lineColor = 'grey';
      pointColor = 'grey';
      break;
  }

  const lineGenerator = d3.line()
    .defined(d => isValidPM25(d.PM25_Concentration)) // 只画有效点
    .x(d => xScale(new Date(d.time)))
    .y(d => yScale(+d.PM25_Concentration));

  if (missingDataSegments == null) { // 如果基础曲线全空
    const onlySegment = data.filter(d => {
      return new Date(d.time) >= new Date(state.startTime) && new Date(d.time) <= new Date(state.endTime);
    });

    g.append("path")
      .datum(onlySegment)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8)
      .attr("d", lineGenerator);

    onlySegment.forEach(dataPoint => {
      if (dataPoint.PM25_Concentration > 0) {
        g.append("circle")
          .attr("cx", xScale(new Date(dataPoint.time)))
          .attr("cy", yScale(+dataPoint.PM25_Concentration))
          .attr("r", 2) // 半径
          .attr("fill-opacity", 0.8)
          .attr("fill", pointColor);
      }
    });
  } else { // 有基础曲线，附加曲线插空
    // 开头段（如果有）
    const endOfPredictSegment = missingDataSegments[0][0]; // 缺失段的结尾，即第一个非填充段的开头

    const firstSegment = data.filter(d => {
      return new Date(d.time) >= new Date(state.startTime) && new Date(d.time) < new Date(endOfPredictSegment.time);
    });

    if (firstSegment.length > 0) {
      // 与右侧missingdata的第一个数据点相连
      const rightDataPoint = [...firstSegment, endOfPredictSegment];
      
      g.append("path")
        .datum(rightDataPoint)
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8)
        .attr("d", lineGenerator);

      firstSegment.forEach(dataPoint => {
        if (isValidPM25(dataPoint.PM25_Concentration)) {
          g.append("circle")
            .attr("cx", xScale(new Date(dataPoint.time)))
            .attr("cy", yScale(+dataPoint.PM25_Concentration))
            .attr("r", 2) // 半径
            .attr("fill-opacity", 0.8)
            .attr("fill", pointColor);
        }
      });
    }

    // 中间段
    for (let i = 0; i < missingDataSegments.length - 1; i++) {
      const endOfCurrentSegment = missingDataSegments[i][missingDataSegments[i].length - 1];
      const startOfNextSegment = missingDataSegments[i + 1][0];

      const predictSegment = data.filter(d => new Date(d.time) > new Date(endOfCurrentSegment.time) && new Date(d.time) < new Date(startOfNextSegment.time));

      if (predictSegment.length > 0) {
        // 与左右侧missingdata的数据点相连
        const completeDataPoints = [endOfCurrentSegment, ...predictSegment, startOfNextSegment];
        g.append("path")
          .datum(completeDataPoints)
          .attr("fill", "none")
          .attr("stroke", lineColor)
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.8)
          .attr("d", lineGenerator);

        predictSegment.forEach(dataPoint => {
          if (isValidPM25(dataPoint.PM25_Concentration)) {
            g.append("circle")
              .attr("cx", xScale(new Date(dataPoint.time)))
              .attr("cy", yScale(+dataPoint.PM25_Concentration))
              .attr("r", 2) // 半径
              .attr("fill-opacity", 0.8)
              .attr("fill", pointColor);
          }
        });
      }
    }

    // 结尾（如果有）
    const startOfPredictSegment = missingDataSegments[missingDataSegments.length - 1][missingDataSegments[missingDataSegments.length - 1].length - 1];

    const lastSegment = data.filter(d => {
        return new Date(d.time) <= new Date(state.endTime) && new Date(d.time) > new Date(startOfPredictSegment.time);
    });

    if (lastSegment.length > 0) {
      // 与右侧missingdata的第一个数据点相连
      const rightDataPoint = [startOfPredictSegment, ...lastSegment];
      g.append("path")
        .datum(rightDataPoint)
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8)
        .attr("d", lineGenerator);

      lastSegment.forEach(dataPoint => {
        if (isValidPM25(dataPoint.PM25_Concentration)) {
          g.append("circle")
            .attr("cx", xScale(new Date(dataPoint.time)))
            .attr("cy", yScale(+dataPoint.PM25_Concentration))
            .attr("r", 2) // 半径
            .attr("fill-opacity", 0.8)
            .attr("fill", pointColor);
        }
      });
    }
  }
}

function drawSelectedSvgLines(xScale, yScale, svgId, g) {
  // 绘制predict的曲线
  drawLine(xScale, yScale, state.missingDataSegments, svgId, 2, g)

  // 绘制miss_and_save的曲线
  drawLine(xScale, yScale, state.missingDataSegments, svgId, 4, g)
  
  // 测试用：绘制ground_truth的曲线
  if (state.isshowLines) {
    drawLine(xScale, yScale, state.missingDataSegments, svgId, 3, g)
  }
}

function handlePenMode(svg, g, optSvg) { // optSvg:2-大图模式，需要同步修改小图
  // 检查未落库存储，如果有就绘制
  g.selectAll('.guide-circle, .value-box, .value-text').remove()

  svg.on('mousemove', function(event) {
    const [mouseX, mouseY] = d3.pointer(event, g.node());

    g.selectAll('.guide-circle, .value-box, .value-text').remove();

    state.guideLineXs.forEach(guideLineX => {
      if (Math.abs(guideLineX - mouseX) <= state.proximityRadius && mouseY >= 0 && mouseY <= state.innerHeight) {
        // 如果靠近引导线，画红色空心圆
        g.append('circle')
          .classed('guide-circle', true)
          .attr('cx', guideLineX)
          .attr('cy', mouseY)
          .attr('r', 2) // 半径为2
          .style('fill', 'none')
          .style('stroke', 'red');

        const value = state.yScale.invert(mouseY).toFixed(1); // 一位小数

        g.append('rect')
          .classed('value-box', true)
          .attr('x', guideLineX - 16)
          .attr('y', mouseY - 26)
          .attr('width', 32)
          .attr('height', 15)
          .attr('rx', 3)
          .style('fill', 'white')
          .style('stroke', 'grey');

        // 显示数值文本
        g.append('text')
          .classed('value-text', true)
          .attr('x', guideLineX)
          .attr('y', mouseY - 15)
          .attr('text-anchor', 'middle')
          .style('fill', 'grey')
          .style('font-family', 'Microsoft YaHei') // 微软雅黑
          .style('font-weight', 'bold')
          .style('font-size', '9px')
          .text(value);
      }
    });
  });

  svg.on('click', function(event) {
    const [mouseX, mouseY] = d3.pointer(event, g.node());

    state.guideLineXs.forEach(guideLineX => {
      if (Math.abs(guideLineX - mouseX) <= state.proximityRadius && mouseY >= 0 && mouseY <= state.innerHeight) {
        console.log("guideLineX: ", guideLineX);
        const time = state.xScale.invert(guideLineX);
        console.log("time: ", time);

        const value = state.yScale.invert(mouseY);

        // 存到未落库临时存储（后续记得永久化）
        // 检查state.savedCircles中是否已有time和marker都相同的记录
        const longExistingIndex = state.savedCircles.findIndex(item => 
          +item.time === +time && item.marker === state.selectedMarker.stationId
        );

        // 删除旧记录
        if (longExistingIndex !== -1) {
          state.savedCircles.splice(longExistingIndex, 1);
        }

        // 保存新记录
        state.savedCircles.push({
          time: time,
          marker: state.selectedMarker.stationId,
          value: value
        });
      }
    });

    drawLongSaved(g, state.xScale, state.yScale)

    if (optSvg == 2) {
      const anotherSvg = d3.select('#svg' + state.selectedMarker.stationId);
      const anotherG = anotherSvg.select('g')
      drawLongSaved(anotherG, state.xScaleSmall, state.yScaleSmall)
    }
  });
}

function drawLongSaved(g, xScale, yScale) {
  // 清除之前画的连线
  g.selectAll('.connection-line').remove();

  // 重新画连线
  state.savedCircles.forEach(circleA => {
    if (circleA.marker == state.selectedMarker.stationId && circleA.time >= new Date(state.startTime) && circleA.time <= new Date(state.endTime)) {
      state.extnededMissingDataSegments.forEach(segment => {
        const index = segment.findIndex(time => +new Date(time) === +circleA.time);
        if (index >= 0) {
          let prevTime;

          if (index == 1 && segment[0] != 'start') {
            let valuepre = state.missingData.find(d => d.time === segment[0]);
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
            state.savedCircles.forEach(circleB => {
              if (circleB.marker == state.selectedMarker.stationId && +new Date(prevTime) === +circleB.time) {
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

          if (index + 2 == segment.length && segment[index + 1] != 'end') {
            let valuenext = state.missingData.find(d => d.time === segment[index + 1]);
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
    }
  });

  // 清除selected-circle
  g.selectAll('.selected-circle').remove();

  // 重新画selected-circle
  state.savedCircles.forEach(circle => {
    if (circle.marker == state.selectedMarker.stationId && circle.time >= new Date(state.startTime) && circle.time <= new Date(state.endTime)) {
      g.append('circle')
        .classed('selected-circle', true)
        .attr('cx', xScale(circle.time))
        .attr('cy', yScale(circle.value))
        .attr('r', 2)
        .style('fill', 'red');
    }
  });
}

function handleSelectMode(svg, g) {
  // 检查未落库存储，如果有就绘制
  g.selectAll('.guide-circle, .value-box, .value-text').remove()

  svg.on('mousemove', function (event) {
    const [mouseX, mouseY] = d3.pointer(event, g.node());
    const radius = 2;
    
    g.selectAll('.selected-circle').each(function() {
      const circle = d3.select(this);
      const cx = +circle.attr('cx');
      const cy = +circle.attr('cy');
      const distance = Math.sqrt(Math.pow(cx - mouseX, 2) + Math.pow(cy - mouseY, 2));

      if (distance <= radius + state.proximityRadius) {
        circle.attr('r', radius + 1).style('stroke', '#9AD5FA').style('stroke-width', 2);
      } else {
        circle.attr('r', radius).style('stroke', 'none').style('stroke-width', 0);
      }
    });
  });
  svg.on('click', null);
}

function guideLoss(g, optGuide) { // optGuide: 1-red, 2-grey
  let color
  if (optGuide == 1) {
    color = 'red'
  }
  if (optGuide == 2) {
    color = 'grey'
  }
  // 根据extnededMissingDataSegments画前后点和引导线
  state.guideLineXs = []
  
  state.extnededMissingDataSegments.forEach(segment => {
    // 绘制引导线
    segment.forEach((time, index) => {
      if (index > 0 && index < segment.length - 1) {
        g.append('line')
          .classed('guide-line', true)
          .attr('x1', state.xScale(new Date(time)))
          .attr('y1', 0)
          .attr('x2', state.xScale(new Date(time)))
          .attr('y2', state.innerHeight)
          .style('stroke', color)
          .style('stroke-dasharray', ('2, 2'));

        const X = state.xScale(new Date(time));
        state.guideLineXs.push(X);
      }
    });
  });
}

function guideCir(g) {
  // 基础曲线数据
  const data = findData(state.selectedMarker.stationId, state.startTime, state.endTime, 1);
  if (data.length === 0) {
    return;
  }

  // 准备时间点数组extnededMissingDataSegments，每个segment里是一段缺失（n个）和缺失前后的有效点，共n+2个元素
  // 如果前没有有效点，存标记'start'，后没有有效点则存的是'end'.
  state.extnededMissingDataSegments = [];

  let currentSegment = [];
  data.forEach((datum, index) => {
    if (isValidPM25(datum.PM25_Concentration)) {
      if (currentSegment.length > 0) {
        currentSegment.push(datum.time);
        state.extnededMissingDataSegments.push([...currentSegment]);
        currentSegment = [];
      }
    } else {
      if (currentSegment.length === 0) {
        const prevTime = index > 0 && isValidPM25(data[index - 1].PM25_Concentration) ? data[index - 1].time : 'start';
        currentSegment.push(prevTime);
      }
      currentSegment.push(datum.time);
    }
  });

  if (currentSegment.length > 0) {
    currentSegment.push('end');
    state.extnededMissingDataSegments.push([...currentSegment]);
  }

  state.extnededMissingDataSegments.forEach(segment => {
    // 检查是否有'start'标记，没有则画起始蓝色实心圆
    if (segment[0] != 'start') {
      const startTime = segment[0];
      const startData = data.find(d => d.time === startTime);
      if (startData) {
        g.append("circle")
          .attr("cx", state.xScale(new Date(startData.time)))
          .attr("cy", state.yScale(startData.PM25_Concentration))
          .attr("r", 2)
          .attr("fill", "blue");
      }
    }

    // 检查是否有'end'标记，没有则画结尾蓝色实心圆
    if (segment[segment.length - 1] != 'end') {
      const endTime = segment[segment.length - 1];
      const endData = data.find(d => d.time === endTime);
      if (endData) {
        g.append("circle")
          .attr("cx", state.xScale(new Date(endData.time)))
          .attr("cy", state.yScale(endData.PM25_Concentration))
          .attr("r", 2)
          .attr("fill", "blue");
      }
    }
  });

  state.missingData = data
}

function drawCirOnSvg(imageId, color) {
  nextTick(() => {
    const chartImage = document.getElementById('chartimg-' + imageId);
    if (chartImage) {
      const canvas = document.createElement('canvas');
      canvas.width = chartImage.clientWidth;
      canvas.height = chartImage.clientHeight;
      chartImage.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const radius = 6;
      const x = canvas.width - radius - 6;
      const y = radius + 5;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });
}

function chgColSvg(imageId) {
  const chartImg = document.getElementById('chartimg-' + imageId);
  const relatedMarker = state.markersNearby.find(marker => marker.stationId === imageId);

  chartImg.addEventListener("mouseenter", () => {
    if (relatedMarker) {
      relatedMarker.setStyle({
        color: "#87E4FA"
      });
    }
    chartImg.style.boxShadow = '0 0 0 4px #9AD5FA';
  });

  chartImg.addEventListener("mouseleave", () => {
    if (relatedMarker) {
      relatedMarker.setStyle({
        color: relatedMarker === state.selectedMarker.value ? "#EE781F" : "#7E89FE"
      });
    }
    chartImg.style.boxShadow = '0 0 0 0px';
  });
}

function ChgColCir(marker) {
  marker.on('mouseover', () => {
    marker.setStyle({
      color: "#87E4FA"
    });
    const relatedImage = document.getElementById('chartimg-' + marker.stationId);
    if (relatedImage) {
      relatedImage.style.boxShadow = '0 0 0 4px #9AD5FA';
    }
    marker.isMouseOver = true;
  });

  marker.on('mouseout', () => {
    marker.setStyle({
      color: marker === state.selectedMarker.value ? "#EE781F" : "#7E89FE"
    });
    const relatedImage = document.getElementById('chartimg-' + marker.stationId);
    if (relatedImage) {
      relatedImage.style.boxShadow = '0 0 0 0px';
    }
    marker.isMouseOver = false;
  });
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const lat = urlParams.get('lat');
  const lng = urlParams.get('lng');
  const zoom = urlParams.get('zoom') || 11;

  state.map = L.map('map', {zoomControl: false}).setView([lat || 40, lng || 116.18], zoom);
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(state.map);

  loadStations();
  
  state.map.on('moveend', () => {
    // 地图移动
    refreshSvgRefOR();
  })

  state.map.on('zoomend', () => {
    // 地图缩放
    refreshSvgRefOR();
  })
})

watch([() => state.startTime, () => state.endTime], () => {
  handleTimeChange();
}, { deep: true })

function refreshSvgRefOR() {
  state.elseMarkers.forEach(marker => {
    const pos = state.map.latLngToContainerPoint(marker.getLatLng());
    const svgId = 'elseSvg' + marker.stationId;
    
    const svg = d3.select('#' + svgId);

    svg.style('left', pos.x - 102 + 'px')
      .style('top', pos.y - 94 + 'px');
  });
}

watch(() => mapStore.mouseState, (newState) => {
  let svg, optSvg
  if (state.showWorkspace) {
    svg = d3.select('#svgWorkspace')
    optSvg = 2
  } else {
    svg = d3.select('#svg' + state.selectedMarker.stationId)
    optSvg = 1
  }

  const g = svg.select('g')
  switch (newState) {
    case 1:
      handlePenMode(svg, g, optSvg);
      break;
    case 2:
      handleSelectMode(svg, g);
      break;
  }
})



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

#whole-container {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

#time-selector-container {
  position: absolute;
  bottom: 0;
  left: 2vw;
  width: 460px;
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

#whole-container > * {
  pointer-events: auto;
}

.chart-container {
  position: absolute;
  top: 100vh;
  left: 2vw;
  width: 480px;
  height: 90vh;
  overflow-y: auto; /* 允许垂直滚动 */
  background-color: #97A5C0;
  border: none;
  display: flex;
  align-items: center; /* 水平居中 */
  justify-content: flex-start;
  transition: top 0.5s ease-in-out;
  z-index: 900;
}

.panel-container {
  position: absolute;
  top: 100vh;
  left: calc(2vw + 480px);
  width: 50px;
  height: 35vh;
  background-color: #E4EAF0;
  border: 3px solid #D2DFF0;
  border-width: 3px 3px 3px 0;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: top 0.5s ease-in-out;
  z-index: 900;
}

/* 滚动条整体 */
.chart-container::-webkit-scrollbar {
  width: 10px;
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
  display: flex; /* 图标居中 */
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
  display: flex; /* 图标居中 */
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
  width: 100%;
  height: 100%;
  position: absolute;
}

.station-id-tooltip {
  text-align: center;
  color: grey;
  font-size: 10px;
  font-family: 'Microsoft YaHei', sans-serif; /* 微软雅黑 */
  font-weight: bold;
  background: transparent;
  border: none;
  box-shadow: none;
}

.moveup-enter-active, .moveup-leave-active {
  transition: all 0.5s ease-in-out;
}

.moveup-enter-from,
.moveup-leave-to {
  transform: translateY(95vh);
}

.workspace-container {
  position: absolute;
  top: 50vh;
  left: calc(6vw + 480px);
  width: calc(90vw - 480px);
  height: 45vh;
  background-color: white;
  border: 3px solid #D2DFF0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: top 0.5s ease-in-out;
  z-index: 900;
}

.workspace-container svg {
  width: 100%;
  height: 100%;
}

</style>