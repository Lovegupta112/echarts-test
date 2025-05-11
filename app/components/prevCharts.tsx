import propietary_charts from "propietary_charts/propietery";
import { formatTimeStamp } from "@/utils/formatTimeStamp";
import { getColor } from "./chartHelpers"; 
import { toast } from "react-toastify";
import { logger } from "@/hooks/logger";


export interface SeriesData {
  type: string;
  name: string;
  data: [number, number][];
  originalData: [number, number][];
}
// Keep track of selection state outside the function
// Reset this value when the component unmounts or when chart re-renders
let startTime: number | null = null;
let isInitialized = false;
const generateTickPositions = (
 min: number,
 max: number,
 interval: number
): number[] => {
 const positions = [];


 // Calculate where the tick sequence should start
 // This ensures consistency when scrolling/playing through the chart
 const baseTickStart = Math.floor(min / interval) * interval;
 let current = baseTickStart;


 // Generate all tick marks at exact intervals
 while (current <= max + 0.0001) {
   // Small buffer to handle floating point issues
   if (current >= min - 0.0001) {
     // Only include ticks within range (with buffer)
     positions.push(Number(current.toFixed(6)));
   }
   current += interval;
 }


 return positions;
};


// Add this function that we'll use to initialize the chart
const initChartWithClickHandling = (
 chart: propietary_charts.Chart,
 zoomEnabled: boolean,
 setAnnotaMinMax: any,
 setShowModal: any
) => {
 if (!zoomEnabled) return;


 // Only initialize once
 if (isInitialized) return;
 isInitialized = true;


 // Reset startTime to ensure clean state
 startTime = null;


 // Make the entire plot area clickable
 const container = chart.container;
 if (!container) return;


 // Remove existing event listener if any
 if ((chart as any)._clickHandlerRef) {
   container.removeEventListener("click", (chart as any)._clickHandlerRef);
 }


 // Add debounce to prevent multiple registrations
 let isProcessingClick = false;


 // Add explicit click handler to chart container
 const clickHandler = function (e: MouseEvent) {
   // Prevent event propagation to stop multiple handlers
   e.stopPropagation();


   // Prevent multiple clicks from being processed at once
   if (isProcessingClick) return;
   isProcessingClick = true;


   // Set a timeout to reset the flag
   setTimeout(() => {
     isProcessingClick = false;
   }, 300); // 300ms debounce


   // Convert browser event coordinates to chart coordinates
   const chartOffset = propietary_charts.offset(chart.container);
   const chartX = e.pageX - chartOffset.left;
   const chartY = e.pageY - chartOffset.top;


   // Check if click is within plot area
   const plotLeft = chart.plotLeft;
   const plotTop = chart.plotTop;
   const plotWidth = chart.plotWidth;
   const plotHeight = chart.plotHeight;


   if (
     chartX >= plotLeft &&
     chartX <= plotLeft + plotWidth &&
     chartY >= plotTop &&
     chartY <= plotTop + plotHeight
   ) {
     // Get the x value from browser event coordinates
     const xValue = chart.xAxis[0].toValue(chartX);
     console.log("Click registered at x-coordinate:", xValue);


     if (startTime === null) {
       // First click
       startTime = xValue;
       console.log("First click recorded:", startTime);


       // Add visual marker for first click
       if (chart.xAxis && chart.xAxis[0]) {
         chart.xAxis[0].addPlotLine({
           id: "start-annotation",
           color: "#FF0000",
           width: 2,
           value: startTime,
           zIndex: 5,
           label: {
             text: "Start",
             align: "right",
             style: {
               color: "#FF0000",
             },
           },
         });
       }


       logger.log({
         type: "ANNOTATION",
         content: {
           action: "long annotation start",
           startTime: startTime,
         },
       });


       toast.info("Annotation started successfully", {
         position: "top-right",
         autoClose: 1000,
       });
     } else {
       // Second click
       const minX = Math.min(startTime, xValue);
       const maxX = Math.max(startTime, xValue);


       // Remove the start marker
       if (chart.xAxis && chart.xAxis[0]) {
         chart.xAxis[0].removePlotLine("start-annotation");
       }


       setAnnotaMinMax({ min: minX, max: maxX });


       logger.log({
         type: "ANNOTATION",
         content: {
           action: "long annotation end",
           startTime: minX,
           endTime: maxX,
         },
       });


       // After showing the modal, reset everything and temporarily remove the event listener
       // to prevent further clicks until the modal is closed
       const existingHandler = (chart as any)._clickHandlerRef;
       if (existingHandler && container) {
         container.removeEventListener("click", existingHandler, {
           capture: true,
         });
       }


       setShowModal(true);
       startTime = null;


       // Re-add the event listener after a delay (after modal interaction is likely done)
       setTimeout(() => {
         isInitialized = false;
         initChartWithClickHandling(
           chart,
           zoomEnabled,
           setAnnotaMinMax,
           setShowModal
         );
       }, 1000);
     }
   }
 };


 // Attach event listener with the 'once' option to prevent multiple triggers
 container.addEventListener("click", clickHandler, { capture: true });


 // Store the handler reference on the chart for cleanup
 (chart as any)._clickHandlerRef = clickHandler;
};


// Function to reset the state when component unmounts or chart is destroyed
export const resetAnnotationState = () => {
 startTime = null;
 isInitialized = false;
};


// Function to generate plot lines with different widths based on whole seconds
const generateGridLines = (
 min: number,
 max: number,
 interval: number,
 gridLineColor: string
): propietary_charts.XAxisPlotLinesOptions[] => {
 const plotLines: propietary_charts.XAxisPlotLinesOptions[] = [];


 // Calculate where the grid line sequence should start
 const baseStart = Math.floor(min / interval) * interval;
 let current = baseStart;


 // Check if we need special handling for fractional intervals
 const needsWholeSecondEmphasis = Math.abs(interval - 0.2) < 0.001;


 if (needsWholeSecondEmphasis) {
   // Special case for 0.2 interval - emphasize whole seconds


   // First pass: add all regular interval grid lines
   while (current <= max + 0.0001) {
     if (current >= min - 0.0001) {
       // Only include grid lines within range (with buffer)
       // Use a more reliable way to check for whole seconds
       const isWholeSecond = Math.abs(Math.round(current) - current) < 0.0001;


       plotLines.push({
         value: current,
         width: isWholeSecond ? 1.2 : 0.7, // Thicker for whole seconds
         color: gridLineColor,
         dashStyle: "LongDash",
         zIndex: 1, // Ensure it's behind the plot lines
       });
     }
     current += interval;
   }


   // Second pass: ensure all whole seconds have a line
   const wholeMins = Math.ceil(min);
   const wholeMaxs = Math.floor(max);


   for (let second = wholeMins; second <= wholeMaxs; second++) {
     // Check if we already have a plotLine at this exact position
     const exists = plotLines.some(
       (line) => Math.abs((line.value as number) - second) < 0.0001
     );


     // If it doesn't exist, add it
     if (!exists) {
       plotLines.push({
         value: second,
         width: 1.5, // Thicker for whole seconds
         color: gridLineColor,
         dashStyle: "LongDash",
         zIndex: 1,
       });
     }
   }
 } else {
   // Standard behavior for other intervals - use constant line width
   while (current <= max + 0.0001) {
     if (current >= min - 0.0001) {
       plotLines.push({
         value: current,
         width: 1, // Standard width
         color: gridLineColor,
         dashStyle: "LongDash",
         zIndex: 1,
       });
     }
     current += interval;
   }
 }


 return plotLines;
};


export const createpropietary_chartsOptions = ({
 zoomEnabled,
 isPlaying,
 chartMin,
 chartMax,
 tickInterval,
 plotBands,
 offsetLabels,
 seriesData,
 hoverEnabled,
 setAnnotaMinMax,
 setShowModal,
}: {
 zoomEnabled: boolean;
 isPlaying: boolean;
 chartMin: number;
 chartMax: number;
 tickInterval: number; // Now represents seconds between ticks
 plotBands: any[];
 offsetLabels: { [key: number]: string };
 seriesData: SeriesData[];
 hoverEnabled: boolean;
 setAnnotaMinMax: (minMax: { min: number; max: number }) => void;
 setShowModal: (show: boolean) => void;
}) => {
 // sharpEdges makes the square edges sharper
 const sharpEdges = true; // Set this to true to enable sharp edges


 // Generate grid lines with varying widths based on whole seconds
 const gridLineColor = isPlaying ? "#b0b0b0" : "#818181";
 const gridLines = generateGridLines(
   chartMin,
   chartMax,
   tickInterval,
   gridLineColor
 );


 const baseConfig = {
   chart: {
     type: "line",
     plotBackgroundColor: "#f5f5f5",
     animation: false,
     marginRight: 5,
     spacing: [0, 0, 0, 0],
     zoomType: undefined,
     panning: {
       enabled: false,
     },
     events: {
       selection: function (event: propietary_charts.SelectEventObject) {
         // Prevent the default selection zoom behavior
         return false;
       },
       // Add a render event to initialize our custom click handler ONCE
       render: function (this: propietary_charts.Chart) {
         // We need to delay this slightly to ensure the chart is fully rendered
         // Use a longer delay to ensure the chart is fully initialized
         clearTimeout((this as any)._initTimeout);
         (this as any)._initTimeout = setTimeout(() => {
           initChartWithClickHandling(
             this,
             zoomEnabled,
             setAnnotaMinMax,
             setShowModal
           );
         }, 300);
       },
     },
     renderTo: !sharpEdges ? "container" : undefined,
     plotBorderWidth: !sharpEdges ? 1 : 0,
     plotBorderColor: !sharpEdges ? "#ccc" : undefined,
   },
   title: {
     text: undefined,
   },
   xAxis: {
     title: {
       text: undefined,
     },
     gridLineDashStyle: "LongDash",
     gridLineColor: gridLineColor,
     // Disable default grid lines since we're using plotLines for custom widths
     gridLineWidth: 0,
     tickPositions: generateTickPositions(chartMin, chartMax, tickInterval),
     min: chartMin,
     max: chartMax,
     // Add our custom grid lines with varying widths
     plotLines: gridLines,
     // Add the plot bands after our grid lines
     plotBands: plotBands,
     opposite: false,
     labels: {
       step: 1, // Show every label
       overflow: "allow",
       formatter: function (
         this: propietary_charts.AxisLabelsFormatterContextObject
       ) {
         if (typeof this.value === "number" && Number.isInteger(this.value)) {
           return formatTimeStamp(this.value);
         }
         return "";
       },
     },
     tickLength: 8,
     tickWidth: 2,
     tickColor: "#000000",
     tickPosition: "outside",
     crosshair: zoomEnabled
       ? {
           color: "#666666",
           dashStyle: "solid",
           width: 1,
           label: {
             enabled: false,
           },
         }
       : undefined,
   },
   plotOptions: {
     series: {
       allowPointSelect: false,
       enableMouseTracking: true,
       stickyTracking: false, // Disable sticky tracking to allow our own click handler
       dragDrop: {
         enabled: false, // Disable drag-drop behavior
       },
       events: {
         // Prevent series click events from interfering
         click: function () {
           return false;
         },
       },
       point: {
         events: {
           // Prevent point click events from interfering
           click: function () {
             return false;
           },
         },
       },
     },
   },
   yAxis: {
     title: {
       text: undefined,
     },
     gridLineWidth: 1,
     tickPositions: Object.keys(offsetLabels).map((key) => parseFloat(key)),
     labels: {
       formatter: function (
         this: propietary_charts.AxisLabelsFormatterContextObject
       ) {
         const value =
           typeof this.value === "number"
             ? this.value
             : parseFloat(this.value as string);


         return `<span class="y-axis-label" style="cursor: pointer;">${
           offsetLabels[value] || ""
         }</span>`;
       },
       useHTML: true,
     },
     min: -100,
     max: 100,
     softThreshold: false,
   },
   tooltip: {
     enabled: zoomEnabled,
     shared: true,
     formatter: function (
       this: propietary_charts.TooltipFormatterContextObject
     ): string {
       if (typeof this.x !== "number") return "";
       return `Time: ${formatTimeStamp(this.x)}`;
     },
     useHTML: true,
     backgroundColor: "rgba(255, 255, 255, 0.9)",
     borderWidth: 1,
     borderColor: "#666666",
     shadow: true,
     style: {
       padding: "8px",
     },
   },
   series: seriesData.map((series) => ({
     type: "line",
     name: series.name,
     showInLegend: false,
     data: series.data,
     color: getColor(series.name),
     lineWidth: !sharpEdges ? 0.5 : 0.5,
     states: {
       hover: {
         enabled: hoverEnabled,
         lineWidthPlus: 0,
         lineWidth: !sharpEdges ? 1.2 : 3,
         color: propietary_charts.color(getColor(series.name)).brighten(-0.3).get(),
       },
       inactive: {
         opacity: hoverEnabled ? 0.3 : 1,
       },
     },
     crisp: !sharpEdges,
     animation: false,
     stickyTracking: false, // Disable sticky tracking at the series level too
     shadow: false,
     marker: {
       enabled: false,
       states: {
         hover: {
           enabled: true,
           radius: 3,
         },
       },
     },
     step: !sharpEdges ? "left" : undefined,
     connectNulls: sharpEdges,
     turboTshreshold: !sharpEdges ? 0 : undefined,
     lastPoint: !sharpEdges
       ? {s
           marker: {
             enabled: true,
             radius: 1,
             symbol: "diamond",
           },
         }
       : undefined,
   })) as propietary_charts.SeriesOptionsType[],
 };


 return baseConfig;
};



