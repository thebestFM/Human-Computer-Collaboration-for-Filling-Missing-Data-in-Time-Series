// utils/dataLoader.js
import useDataStore from '../stores/data';
import * as d3 from 'd3';

export function useDataLoader() {
  const dataStore = useDataStore();

  function loadMissingData() {
    return d3.text('/Data/pm25_missing.txt').then(text => {
      let dateTimesTemp = []; // 初始化临时数组用于存储时间

      const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
        const time = d.datetime.replace(/\//g, '-'); // 将日期格式从 “/” 改为 “-”
        dateTimesTemp.push(time); // 添加时间到临时数组

        return columns.slice(1).map(stationId => ({
          station_id: stationId,
          time: time,
          PM25_Concentration: +d[stationId] || null
        }));
      });

      // 在所有数据处理完后，更新 dateTimes，利用 Set 来去除重复项
      dataStore.setDateTimes([...new Set(dateTimesTemp)]);
      dataStore.setMissingData(parsedData.flat().filter(d => d)); // 更新 missingData 状态
    });
  }

  function loadPredictData() {
    return d3.text('/Data/pm25_predict.txt').then(text => {
      const rows = text.split('\n').filter(d => d);
      const parsedData = rows.map((row, rowIndex) => {
        const values = row.split(',');
        return values.map((value, columnIndex) => ({
          station_id: `0010${String(columnIndex + 1).padStart(2, '0')}`,
          time: dataStore.dateTimes[rowIndex],
          PM25_Concentration: +value || null
        }));
      }).flat().filter(d => d);

      dataStore.setPredictData(parsedData);
    });
  }

  function loadRealData() {
    return d3.text('/Data/pm25_ground.txt').then(text => {
      // 使用 d3.dsvFormat 进行解析，注意这里没有涉及时间去重的逻辑
      const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
        const time = d.datetime.replace(/\//g, '-');
        return columns.slice(1).map(stationId => ({
          station_id: stationId,
          time: time,
          PM25_Concentration: +d[stationId] || null
        }));
      }).flat().filter(d => d); // 扁平化并过滤无效数据
  
      dataStore.setRealData(parsedData); // 更新 realData 状态
    });
  }  

  function loadmissingAndSavedData() {
    return d3.text('/Data/mydata/pm25_missing.txt').then(text => {
      // 使用 d3.dsvFormat 进行解析，与 loadRealData 类似，无需处理时间数据的去重
      const parsedData = d3.dsvFormat(',').parse(text, (d, index, columns) => {
        const time = d.datetime.replace(/\//g, '-');
        return columns.slice(1).map(stationId => ({
          station_id: stationId,
          time: time,
          PM25_Concentration: +d[stationId] || null
        }));
      }).flat().filter(d => d); // 扁平化并过滤无效数据
  
      dataStore.setMissingAndSavedData(parsedData); // 更新 missingAndSavedData 状态
    });
  }  

  function loadAllData() {
    return Promise.all([
      loadMissingData(),
      loadPredictData(),
      loadRealData(),
      loadmissingAndSavedData()
    ]);
  }

  return {
    loadAllData
  };
}

export function findData(stationId, startTime, endTime, opt) {
  // opt: 1-基础曲线missing, 2-predict, 3-ground_truth, 4-missing_and_save
  const dataStore = useDataStore();
  
  const start = startTime.replace('T', ' ').substring(0, 19);
  const end = endTime.replace('T', ' ').substring(0, 19);

  let dataToSearch = [];
  switch (opt) {
    case 1:
      dataToSearch = dataStore.missingData;
      break;
    case 2:
      dataToSearch = dataStore.predictData;
      break;
    case 3:
      dataToSearch = dataStore.realData;
      break;
    case 4:
      dataToSearch = dataStore.missingAndSavedData;
      break;
  }

  // 使用二分查找找到第一个时间等于start的记录
  let startIndex = binarySearchFirst(dataToSearch, start);
  if (startIndex === -1) {
    return []; // 如果没有找到，返回空数组
  }

  // 从startIndex开始查找满足条件的记录
  let results = [];
  for (let i = startIndex; i < dataToSearch.length && dataToSearch[i].time <= end; i++) {
    if (dataToSearch[i].station_id === stationId) {
      results.push(dataToSearch[i]);
    }
  }

  return results;
}

function binarySearchFirst(dataArray, start) {
  let low = 0;
  let high = dataArray.length - 1;
  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    if (dataArray[mid].time < start) {
      low = mid + 1;
    } else if (dataArray[mid].time > start) {
      high = mid - 1;
    } else {
      // 如果找到了time等于starttime的元素，向前查找第一个
      while (mid > 0 && dataArray[mid - 1].time === start) {
        mid--;
      }
      return mid;
    }
  }
  return -1; // 没找到
}