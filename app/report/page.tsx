'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import rawdataa from '../../public/data.json'

const EMGChart = () => {
  // Sample data - replace with your actual data source
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulating data loading - replace with your actual data fetching logic
    const generateMockData = () => {
      const channels = [
        'FP1-REF', 'FP2-REF', 'F3-REF', 'F4-REF', 'C3-REF', 'C4-REF',
        'P3-REF', 'P4-REF', 'O1-REF', 'O2-REF', 'F7-REF', 'F8-REF',
        'T3-REF', 'T4-REF', 'T5-REF', 'T6-REF', 'FZ-REF', 'CZ-REF', 
        'PZ-REF', 'ECG-REF', 'EMG-REF'
      ];
      
      const timePoints = Array.from({ length: 500 }, (_, i) => i / 50); // 10 seconds of data at 50Hz
      const data = [];
      
      timePoints.forEach(time => {
        const dataPoint = { time };
        const channelData = {};
        
        channels.forEach(channel => {
          // Create different wave patterns for different channel types
          let value;
          if (channel.includes('ECG')) {
            // ECG-like pattern with sharp peaks
            value = Math.sin(time * 8) * 30 + Math.random() * 5;
            if (Math.sin(time * 8) > 0.8) value += 40;
          } else if (channel.includes('EMG')) {
            // EMG-like pattern with high frequency
            value = (Math.random() - 0.5) * 50;
          } else {
            // EEG-like pattern with different frequencies per channel group
            const baseFreq = channel.startsWith('F') ? 2 : 
                             channel.startsWith('T') ? 3 : 
                             channel.startsWith('P') ? 1.5 : 
                             channel.startsWith('O') ? 4 : 2.5;
            
            // Add color variation based on position (odd/even)
            const colorVariation = channels.indexOf(channel) % 2 === 0 ? 1 : -1;
            
            value = Math.sin(time * baseFreq) * 15 + 
                   Math.sin(time * (baseFreq * 2 + 0.5)) * 5 +
                   Math.random() * 3 * colorVariation;
          }
          
          channelData[channel] = value;
        });
        
        data.push({
          time: time.toFixed(2),
          data: channelData
        });
      });
      
      return data;
    };
    
    // Set the mock data
    setRawData(generateMockData());
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return <div>Loading data...</div>;
  }
  
  // Process the data for ECharts
  const signalKeys = Object.keys(rawData[0]?.data || {});
  const timePoints = rawData.map(item => item.time);
  
  // Calculate appropriate vertical spacing
  const totalHeight = 800; // Total chart height
  const spacing = totalHeight / (signalKeys.length + 2); // Space between lines
  
  // Colors for different channel types
  const getLineColor = (key:any) => {
    if (key.startsWith('F') || key.startsWith('C') || key.startsWith('P') || key.startsWith('O') || key.startsWith('T')) {
      // Alternate red and blue for standard EEG channels
      return signalKeys.indexOf(key) % 2 === 0 ? '#FF5252' : '#4285F4';
    } else if (key.includes('ECG')) {
      return '#4CAF50'; // Green for ECG
    } else if (key.includes('EMG')) {
      return '#9E9E9E'; // Gray for EMG
    } else {
      return '#212121'; // Black for other channels
    }
  };
  
  // Create a separate series for each channel with appropriate offset
  const series = signalKeys.map((key, idx) => {
    const offset = (signalKeys.length - idx) * 70;
    
    return {
      name: key,
      type: 'line',
      data: rawData.map(item => item.data[key] + offset),
      showSymbol: false,
      lineStyle: {
        width: 1.2,
        color: getLineColor(key)
      },
      emphasis: {
        focus: 'series'
      },
      animation: false, // Disable animation for better performance
      sampling: 'lttb' // For large datasets, use downsampling
    };
  });
  
  // Create gridlines to separate channels
  const markLines = signalKeys.map((key, idx) => {
    const offset = (signalKeys.length - idx) * spacing;
    return {
      silent: true,
      lineStyle: {
        color: '#ECECEC',
        type: 'dashed',
        width: 1
      },
      data: [
        [{ y: offset, x: 0 }, { y: offset, xAxis: 'max' }]
      ]
    };
  });
  
  // Configure the chart options
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params:any) {
        const time = params[0].axisValue;
        let result = `Time: ${time}s<br/>`;
        
        params.forEach((param:any) => {
          const channelName = param.seriesName;
          // Subtract the offset to get the actual value
          const actualValue = param.value - (signalKeys.length - signalKeys.indexOf(channelName)) * spacing;
          result += `${channelName}: ${actualValue.toFixed(2)}<br/>`;
        });
        
        return result;
      }
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },
    grid: {
      left: 80,
      right: 20,
      bottom: 60,
      top: 40,
      containLabel: true
    },
    // dataZoom: [
    //   {
    //     type: 'slider',
    //     show: true,
    //     xAxisIndex: [0],
    //     start: 0,
    //     end: 100
    //   },
    //   {
    //     type: 'inside',
    //     xAxisIndex: [0],
    //     start: 0,
    //     end: 100
    //   }
    // ],
    xAxis: {
      type: 'category',
      data: timePoints,
      boundaryGap: false,
      axisLabel: {
        formatter: '{value} s'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#ECECEC',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      show: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: function(value:number) {
          // Find which channel this y-value corresponds to
          for (let i = 0; i < signalKeys.length; i++) {
            const offset = (signalKeys.length - i) * spacing;
            if (Math.abs(value - offset) < spacing / 2) {
              return signalKeys[i];
            }
          }
          return '';
        }
      },
      splitLine: { show: false }
    },
    series: [
      ...series,
      ...markLines.map(line => ({
        type: 'line',
        coordinateSystem: 'cartesian2d',
        symbol: 'none',
        silent: true,
        lineStyle: line.lineStyle,
        data: line.data,
        markLine: line
      }))
    ]
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold mb-4">EEG Multi-Channel Viewer</h2>
      <div className="w-full">
        <ReactECharts 
          option={option} 
          style={{ height: 900, width: '100%' }} 
          opts={{ renderer: 'svg' }}
        />
      </div>
    
    </div>
  );
};

export default EMGChart;