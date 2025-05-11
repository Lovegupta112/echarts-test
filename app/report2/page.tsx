'use client';

import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

// Helper function to format timestamp
const formatTimeStamp = (time) => {
  const seconds = Math.floor(time);
  const milliseconds = Math.floor((time - seconds) * 100);
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
};

// Generate mock data
const generateMockData = () => {
  const channels = [
    'FP1-REF', 'FP2-REF', 'F3-REF', 'F4-REF', 'C3-REF', 'C4-REF',
    'P3-REF', 'P4-REF', 'O1-REF', 'O2-REF', 'F7-REF', 'F8-REF',
    'T3-REF', 'T4-REF', 'T5-REF', 'T6-REF', 'FZ-REF', 'CZ-REF',
    'PZ-REF', 'ECG-REF', 'EMG-REF'
  ];

  const timePoints = Array.from({ length: 1000 }, (_, i) => i / 10);
  const data = [];

  timePoints.forEach(time => {
    const dataPoint = { time };
    const channelData = {};

    channels.forEach(channel => {
      let value;
      if (channel.includes('ECG')) {
        value = Math.sin(time * 8) * 30 + Math.random() * 5;
        if (Math.sin(time * 8) > 0.8) value += 40;
      } else if (channel.includes('EMG')) {
        value = (Math.random() - 0.5) * 50;
      } else {
        const baseFreq = channel.startsWith('F') ? 2 :
          channel.startsWith('T') ? 3 :
            channel.startsWith('P') ? 1.5 :
              channel.startsWith('O') ? 4 : 2.5;

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

const EMGChart = () => {
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRawData(generateMockData());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div>Loading data...</div>;
  }

  // Process the data for ECharts
  const signalKeys = Object.keys(rawData[0]?.data || {});
  const timePoints = rawData.map(item => parseFloat(item.time));

  // Calculate appropriate vertical spacing and amplitudes
  const channelHeight = 30;
  const channelGap = 2;
  const baselineOffset = channelHeight + channelGap;

  // Colors for different channel types
  const getLineColor = (key) => {
    if (key.startsWith('F') || key.startsWith('C') || key.startsWith('P') || key.startsWith('O') || key.startsWith('T')) {
      return signalKeys.indexOf(key) % 2 === 0 ? '#FF5252' : '#4285F4';
    } else if (key.includes('ECG')) {
      return '#4CAF50';
    } else if (key.includes('EMG')) {
      return '#9E9E9E';
    } else {
      return '#212121';
    }
  };

  // Find min and max values for each channel to normalize
  const channelMinMax = {};
  signalKeys.forEach(key => {
    const values = rawData.map(item => item.data[key]);
    channelMinMax[key] = {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  });

  // Create a separate series for each channel with proper offset and scaling
const series = signalKeys.map((key, idx) => {
    const basePosition = (signalKeys.length - idx) * baselineOffset;
    const amp = channelHeight / 1;

    // Calculate scale factor to normalize the signal to our amplitude
    const channelRange = Math.max(
      Math.abs(channelMinMax[key].max),
      Math.abs(channelMinMax[key].min)
    ) * 2 || 1; // Avoid division by zero

    const scaleFactor = amp / channelRange;

    // Create the data points with proper scaling
    const seriesData = rawData.map(item => [
      parseFloat(item.time),
      basePosition + (item.data[key] * scaleFactor)
    ]);

    return {
      name: key,
      type: 'line',
      data: seriesData,
      showSymbol: false,
      lineStyle: {
        width: 1,
        color: getLineColor(key)
      },
      animation: true,
      sampling: 'lttb'
    };
  });

  const baselineMarkers = signalKeys.map((key, idx) => {
    const basePosition = (signalKeys.length - idx) * baselineOffset;
  
    return [
      { xAxis: Math.min(...timePoints), yAxis: basePosition },
      { xAxis: Math.max(...timePoints), yAxis: basePosition }
    ];
  });

  // Configure the chart options
  const totalHeight = (signalKeys.length + 1) * baselineOffset;

  const option = {
    grid: {
      left: 150,
      right: 20,
      bottom: 60,
      top: 40,
      containLabel: true,
      backgroundColor: '#ffffff'
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: function(value) {
          return value.toFixed(1);
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: '#cccccc'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: totalHeight,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false }
    },
    series: [
      ...series,
      {
        type: 'line',
        name: 'baselines',
        coordinateSystem: 'cartesian2d',
        symbol: 'none',
        silent: true,
        data: [],
        markLine: {
          silent: true,
          symbol: 'none',
          data: baselineMarkers,
          lineStyle: {
            type: 'dashed',
            color: '#cccccc'
          }
        }
      },
      ...signalKeys.map((key, idx) => ({
        type: 'custom',
        renderItem: () => ({
          type: 'text',
          style: {
            text: key,
            x: 140,
            y: (signalKeys.length - idx) * baselineOffset + 20,
            textAlign: 'right',
            textVerticalAlign: 'middle',
            fontSize: 12,
            // fill: getLineColor(key)
          }
        }),
        data: [0]
      }))
    ],
  
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl font-bold mb-4">W EEG Multi-Channel Viewer</h2>
      <div className="w-full" style={{ height: '100vh' }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </div>
    </div>
  );
};

export default EMGChart;