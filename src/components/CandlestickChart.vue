<template>
  <div class="chart-outer-wrapper">
      <div class="time-label-container">
        <div ref="timeLabel" class="crosshair-time-label"></div>
      </div>
      <div class="chart-wrapper">
        <div ref="chartContainer" class="chart-container"></div>
        <div ref="infoLabel" class="info-label"></div>
      </div>
    </div>
  </template>
  
  <script>
  import { createChart } from 'lightweight-charts';
  
  export default {
    name: 'CandlestickChart',
    props: {
      data: {
        type: Array,
        required: true
      },
      scale: {}
    },
    data() {
      return {
        chart: null,
        candlestickSeries: null,
        userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    },
    mounted() {
      this.$nextTick(this.createChart);
    },
    methods: {
      createChart() {
        if (!this.$refs.chartContainer) {
          return;
        }
  
        const chartOptions = {
          width: this.$refs.chartContainer.clientWidth,
          height: 250,
          layout: {
            textColor: 'black',
            background: { type: 'solid', color: 'white' }
          },
          grid: {
            vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
            horzLines: { color: 'rgba(197, 203, 206, 0.5)' }
          },
          crosshair: {
            vertLine: {
              visible: true,
              labelVisible: false,
            },
            horzLine: {
              visible: true,
              labelVisible: true,
            }
          },
          rightPriceScale: {
            visible: true,
            borderColor: 'rgba(197, 203, 206, 1)',
            borderVisible: true,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1
            },
            entireTextOnly: false,
            ticksVisible: true,
            mode: 0,
            autoScale: false,
          },
          timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter: (time) => {
              const date = new Date(time * 1000);
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              
              return `${hours}:${minutes}`;
            },
          },
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
        };
        
        try {
          this.chart = createChart(this.$refs.chartContainer, chartOptions);
          
          this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: {
              type: 'custom',
              formatter: this.formatPrice,
              minMove: 0.00000001
            }
          });
  
          this.chart.subscribeCrosshairMove((param) => {
            const timeLabel = this.$refs.timeLabel;
            if (param.time && timeLabel) {
              const timestamp = param.time * 1000;
              const formattedTime = this.formatLocalTime(timestamp);
              
              timeLabel.textContent = formattedTime;
              const containerRect = this.$refs.chartContainer.getBoundingClientRect();
              const x = param.point.x;
              
              const labelWidth = timeLabel.offsetWidth;
              const maxX = containerRect.width - labelWidth;
              const adjustedX = Math.min(Math.max(0, x - labelWidth / 2), maxX);
              
              timeLabel.style.transform = `translateX(${adjustedX}px)`;
              timeLabel.style.display = 'block';
            } else if (timeLabel) {
              timeLabel.style.display = 'none';
            }
          });
  
          this.updateChartData();
        } catch (error) {
          console.error('Error creating chart:', error);
        }
      },
      formatLocalTime(timestamp) {
        try {
          const date = new Date(timestamp);
          const options = {
            timeZone: this.userTimeZone,
            hour12: false
          };
  
          if (this.scale === '1m' || this.scale === '5m' || this.scale === '15m') {
            options.year = '2-digit';
            options.month = '2-digit';
            options.day = '2-digit';
            options.hour = '2-digit';
            options.minute = '2-digit';
          } else if (this.scale === '1h' || this.scale === '4h') {
            options.month = '2-digit';
            options.day = '2-digit';
            options.hour = '2-digit';
            options.minute = '2-digit';
          } else {
            options.month = '2-digit';
            options.day = '2-digit';
          }
  
          const formatter = new Intl.DateTimeFormat(navigator.language, options);
          const parts = formatter.formatToParts(date);
          const values = {};
          parts.forEach(part => {
            values[part.type] = part.value;
          });
  
          if (this.scale === '1m' || this.scale === '5m' || this.scale === '15m') {
            return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}`;
          } else if (this.scale === '1h' || this.scale === '4h') {
            return `${values.month}/${values.day} ${values.hour}:${values.minute}`;
          } else {
            return `${values.month}/${values.day}`;
          }
        } catch (error) {
          console.error('Error formatting time:', error);
          return '';
        }
      },
      updateChartData() {
        if (this.candlestickSeries && this.data.length > 0) {
          const formattedData = this.data
            .map(item => ({
              time: this.normalizeTimestamp(item.time),
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close)
            }))
            .sort((a, b) => a.time - b.time);
  
          this.candlestickSeries.setData(formattedData);
  
          const prices = formattedData.map(d => d.close);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
  
          this.chart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
            minValue: minPrice * 0.999,
            maxValue: maxPrice * 1.001
          });
  
          this.chart.timeScale().fitContent();
  
          const lastDataPoint = formattedData[formattedData.length - 1];
          let timeAgo
          if (this.scale == "1m") {
            timeAgo = lastDataPoint.time - (60 * 60);
          } else if ((this.scale == "5m")) {
            timeAgo = lastDataPoint.time - (10 * 60 * 60);
          } else if ((this.scale == "15m")) {
            timeAgo = lastDataPoint.time - (24 * 60 * 60);
          } else if ((this.scale == "1h")) {
            timeAgo = lastDataPoint.time - (5 * 24 * 60 * 60);
          } else if ((this.scale == "4h")) {
            timeAgo = lastDataPoint.time - (30 * 24 * 60 * 60);
          } else {
            timeAgo = lastDataPoint.time - (60 * 24 * 60 * 60);
          }
          
          this.chart.timeScale().setVisibleRange({
            from: timeAgo,
            to: lastDataPoint.time
          });
        }
      },
      normalizeTimestamp(timestamp) {
        return timestamp > 1e10 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
      },
      formatTime(time) {
        const date = new Date(time * 1000);
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      },
      formatCrosshairTime(time) {
        const date = new Date(time * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        return formattedTime;
      },
      formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) {
          return '';
        }
        if (price === 0) {
          return '0';
        }
        
        const absPrice = Math.abs(price);
  
        if (absPrice < 0.0001) {
          let decimalStr = absPrice.toFixed(10).split('.')[1];
          let leadingZeros = decimalStr.match(/^0*/)[0].length;
          let significantDigits = decimalStr.slice(leadingZeros, leadingZeros + 2);
          
          const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
          let formattedZeros = leadingZeros.toString().split('').map(d => superscript[parseInt(d)]).join('');
          
          return `0.0${formattedZeros}${significantDigits}`;
        } else if (absPrice < 1) {
          let str = absPrice.toString();
  
          const decimalIndex = str.indexOf('.');
  
          let zeroCount = 0;
          for (let i = decimalIndex + 1; i < str.length; i++) {
            if (str[i] === '0') {
              zeroCount++;
            } else {
              break;
            }
          }
  
          const totalPrecision = zeroCount + 3;
          return absPrice.toFixed(totalPrecision);
        } else if (absPrice < 10) {
          return absPrice.toFixed(2);
        } else if (absPrice < 1000) {
          return absPrice.toFixed(0);
        } else {
          if (absPrice < 1000000) {
            return (absPrice / 1000).toFixed(2) + 'K';
          } else if (absPrice < 1000000000) {
            return (absPrice / 1000000).toFixed(2) + 'M';
          } else {
            return (absPrice / 1000000000).toFixed(2) + 'B';
          }
        }
      },
    },
    watch: {
      data: {
        handler() {
          this.$nextTick(this.updateChartData);
        },
        deep: true
      }
    },
  }
  </script>
  
  <style scoped>
  .chart-outer-wrapper {
    position: relative;
    width: 100%;
  }
  
  .time-label-container {
    height: 30px;
    width: 100%;
    margin-bottom: 10px;
  }
  
  .crosshair-time-label {
    position: absolute;
    top: 0;
    left: 0;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 2px 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: none;
    margin-bottom:-40px;
  }
  
  .chart-wrapper {
    position: relative;
    width: 100%;
    height: 250px;
  }
  
  .chart-container {
    width: 100%;
    height: 250px;
  }
  
  .info-label {
    position: absolute;
    display: none;
    padding: 4px 8px;
    font-size: 12px;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #ccc;
    border-radius: 4px;
    pointer-events: none;
    transform: translate(10px, -50%);
  }
  </style>