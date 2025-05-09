'use client';
import React from 'react';
import ReactECharts from 'echarts-for-react';
import rawData from '@/public/data.json';

const EMGChart = () => {
  const signalKeys = Object.keys(rawData[0].data);
  const timePoints = rawData.map(item => item.time);

  const offsetAmount = 150; 
  const series = signalKeys.map((key, idx) => ({
    name: key,
    type: 'line',
    data: rawData.map(item => item.data[key] + idx * offsetAmount),
    showSymbol: false,
    lineStyle: {
      width: 1.2
    },
    emphasis: {
      focus: 'series'
    }
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    xAxis: {
      type: 'category',
      data: timePoints,
      name: 'Time (s)',
      nameLocation: 'center',
      nameGap: 30
    },
    yAxis: {
      type: 'category',
      data: signalKeys,
      name:'Channels',
      axisLabel: {
        show: true
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    series
  };

  return (
    <div>
      <h2>EEG Multi-Channel Viewer</h2>
      <ReactECharts option={option} style={{ height: 1000, width: '100%' }} />
    </div>
  );
};

export default EMGChart;
