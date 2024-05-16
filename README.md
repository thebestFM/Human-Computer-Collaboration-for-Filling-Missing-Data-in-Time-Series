# AirPainter

## Demonstration Video
[Click here to watch the video about how to use the platform](https://github.com/thebestFM/Human-Computer-Collaboration-for-Filling-Missing-Data-in-Time-Series/releases/download/v1.0/demo.mp4)  

## Quick Start
```
git clone https://gitee.com/fm_xym/air-painter.git
npm install
npm run serve
```

## Dependencies
```
- Vue.js 3.2.13
- Leaflet 1.9.4
- D3.js 7.8.5
- Papaparse 5.4.1
- Core-js 3.8.3
- VueUse Core 10.9.0
- IndexedDB (IDB) 8.0.0
```

## Notes
```
Content of several files:
ground: ground truth, original dataset
missing: derived by removing some data from ground according to certain rules (mainly referring to the next month being empty), includes training set
 - Training set: valid data points from January, February, April, May, July, August, October, and November in missing
 - Test set: empty data points from March, June, September, and December in missing that are valid in ground
predict: filled in all empty data points in missing using the model, includes test set
MS: missing and saved, based on missing with added saved data points (expanded training set for March, June, September, and December)
```
