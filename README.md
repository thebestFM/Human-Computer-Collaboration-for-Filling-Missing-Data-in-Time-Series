# AirPainter

### 快速开始
```
git clone https://gitee.com/fm_xym/air-painter.git
npm install
npm run serve
```

### 依赖版本
```
- Vue.js 3.2.13
- Leaflet 1.9.4
- D3.js 7.8.5
- Papaparse 5.4.1
- Core-js 3.8.3
- VueUse Core 10.9.0
- IndexedDB (IDB) 8.0.0
```

### 一些说明
```
几个文件的内容：
ground: ground truth, 原始数据集
missing: 通过一定的规则（主要是参考下个月为空）去掉ground的部分数据得到，包含训练集
 - 训练集: missing里的1,2,4,5,7,8,10,11月的有效的数据点
 - 测试集: missing里的3,6,9,12月的、为空的、且ground里有效的数据点
predict: 使用模型将missing的所有空数据点填满得到，包含测试集
MS: missing and saved, 在missing的基础上加上保存的数据点（3,6,9,12月的扩充训练集）
```