import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ZoomIn, ZoomOut, Maximize, FileImage, Download, X, 
  RefreshCw, RotateCcw, Columns, List, HelpCircle, 
  Calendar, Clock, ShieldAlert, Award, User, Tag 
} from 'lucide-react';
import dagre from 'dagre';

// 1. Custom Node Components

// START Node
const StartNode = () => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#16a34a] bg-[#E2F0D9] shadow-sm min-w-[110px] justify-center">
    <span className="text-[10px]">🟢</span>
    <span className="text-[10px] font-black text-[#16a34a] uppercase tracking-wider font-outfit">START</span>
    <Handle type="source" position={Position.Right} style={{ background: '#16a34a', width: 6, height: 6 }} />
  </div>
);

// END Node
const EndNode = () => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#16a34a] bg-[#E2F0D9] shadow-sm min-w-[110px] justify-center">
    <span className="text-[10px]">✅</span>
    <span className="text-[10px] font-black text-[#16a34a] uppercase tracking-wider font-outfit">END</span>
    <Handle type="target" position={Position.Left} style={{ background: '#16a34a', width: 6, height: 6 }} />
  </div>
);

// Activity Node (Enterprise card styling)
const ActivityNode = ({ data }) => {
  // Determine color matching enterprise spec
  let borderColor = '#3b82f6'; // normal activity (blue)
  let statusBg = 'bg-slate-100 border-slate-200 text-slate-600';
  
  if (data.isCriticalPath) {
    borderColor = '#ef4444'; // critical path (red)
  } else if (data.currentStatus === 'Completed') {
    borderColor = '#16a34a'; // completed (green)
  } else if (data.currentStatus === 'InProgress') {
    borderColor = '#f59e0b'; // in progress (amber)
  } else if (data.category === 'Administrative') {
    borderColor = '#8b5cf6'; // admin (purple)
  }

  return (
    <div 
      className={`relative bg-white border-2 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-150 w-[220px] text-left hover:-translate-y-0.5 ${
        data.isCriticalPath ? 'shadow-red-100 hover:shadow-red-200' : ''
      }`}
      style={{ borderColor: borderColor }}
    >
      {/* Sequence Badge */}
      <div 
        className="absolute -top-3 -left-3 w-6 h-6 rounded-full border text-[10px] font-black flex items-center justify-center shadow-sm"
        style={{
          background: data.isCriticalPath ? '#FEE2E2' : '#F1F5F9',
          color: data.isCriticalPath ? '#EF4444' : '#475569',
          borderColor: data.isCriticalPath ? '#FCA5A5' : '#CBD5E1'
        }}
      >
        {data.sequenceNumber}
      </div>

      {/* Critical Path Pulsing Glow */}
      {data.isCriticalPath && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}

      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 6, height: 6 }} />

      <div className="space-y-2 pt-0.5">
        <h5 className="text-[11px] font-extrabold text-[#12355B] uppercase tracking-wide leading-tight line-clamp-2">
          {data.label}
        </h5>
        
        {/* Progress bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[8px] font-bold text-slate-400">
            <span>Progress</span>
            <span>{data.completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1">
            <div 
              className="h-1 rounded-full transition-all duration-300" 
              style={{ 
                width: `${data.completionPercentage}%`,
                backgroundColor: data.completionPercentage === 100 ? '#16a34a' : (data.isCriticalPath ? '#ef4444' : '#3b82f6')
              }}
            />
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-400 border-t border-slate-100 pt-2 mt-1">
          <span>DUR: {data.durationMonths}m</span>
          <span 
            className="px-1.5 py-0.5 rounded-[4px] text-[7.5px] uppercase tracking-wider font-black border"
            style={{
              background: data.currentStatus === 'Completed' ? '#E2F0D9' : (data.currentStatus === 'InProgress' ? '#FEF3C7' : '#F1F5F9'),
              color: data.currentStatus === 'Completed' ? '#16a34a' : (data.currentStatus === 'InProgress' ? '#B45309' : '#64748B'),
              borderColor: data.currentStatus === 'Completed' ? '#A7F3D0' : (data.currentStatus === 'InProgress' ? '#FDE68A' : '#E2E8F0')
            }}
          >
            {data.currentStatus === 'Completed' ? 'Completed' : (data.currentStatus === 'InProgress' ? 'In Progress' : 'Not Started')}
          </span>
        </div>
      </div>
    </div>
  );
};

// Decision Node (Diamond style using clip-path)
const DecisionNode = ({ data }) => (
  <div className="relative w-[130px] h-[100px] flex items-center justify-center">
    <Handle type="target" position={Position.Left} style={{ background: '#8b5cf6', width: 6, height: 6, top: '50%' }} />
    <Handle type="source" position={Position.Right} id="yes" style={{ background: '#8b5cf6', width: 6, height: 6, top: '50%' }} />
    <Handle type="source" position={Position.Bottom} id="no" style={{ background: '#ef4444', width: 6, height: 6, left: '50%' }} />
    
    <div 
      className="absolute inset-0 bg-white border-2 border-[#8b5cf6] shadow-sm"
      style={{
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      }}
    />
    
    <div className="z-10 text-center p-2 max-w-[85px]">
      <p className="text-[9px] font-black text-[#8b5cf6] uppercase tracking-wide leading-tight">{data.label}</p>
      <span className="text-[7px] text-slate-450 font-black uppercase tracking-wider block mt-0.5 leading-none">{data.subtitle}</span>
    </div>
  </div>
);

const nodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  activityNode: ActivityNode,
  decisionNode: DecisionNode
};

// 2. Dagre Layout Engine Config
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 100 });

  nodes.forEach((node) => {
    let w = 220;
    let h = 100;
    if (node.type === 'startNode' || node.type === 'endNode') {
      w = 120;
      h = 50;
    } else if (node.type === 'decisionNode') {
      w = 130;
      h = 100;
    }
    dagreGraph.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    let xOffset = 110;
    let yOffset = 50;
    if (node.type === 'startNode' || node.type === 'endNode') {
      xOffset = 60;
      yOffset = 25;
    } else if (node.type === 'decisionNode') {
      xOffset = 65;
      yOffset = 50;
    }
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - xOffset,
        y: nodeWithPosition.y - yOffset
      }
    };
  });

  return { nodes: newNodes, edges };
};

// 3. Inner React Flow Canvas Component
function WorkflowCanvasInner({ nodes: initialNodes, edges: initialEdges, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [direction, setDirection] = useState('LR');
  
  // Interaction states
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLoop, setHoveredLoop] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);

  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  // Apply layout automatically
  const applyLayout = useCallback((dir) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      dir
    );
    setNodes(layoutedNodes);
    
    // Highlight Critical Path Edges dynamically!
    // Connect standard step paths with critical theme if source/target are both critical
    const styledEdges = layoutedEdges.map(edge => {
      const srcNode = layoutedNodes.find(n => n.id === edge.source);
      const tgtNode = layoutedNodes.find(n => n.id === edge.target);
      
      const isCriticalLink = srcNode?.data?.isCriticalPath && tgtNode?.data?.isCriticalPath && edge.data?.dependencyType !== 'Loop';
      
      if (isCriticalLink) {
        return {
          ...edge,
          style: { stroke: '#ef4444', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
        };
      }
      return edge;
    });

    setEdges(styledEdges);
    setTimeout(() => fitView({ duration: 300 }), 50);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  useEffect(() => {
    applyLayout(direction);
  }, [initialNodes, initialEdges, direction, applyLayout]);

  const toggleDirection = () => {
    const nextDir = direction === 'LR' ? 'TB' : 'LR';
    setDirection(nextDir);
  };

  // Node Hover Handlers
  const onNodeMouseEnter = useCallback((event, node) => {
    if (node.type === 'activityNode') {
      setHoveredNode(node.data);
      setHoverPos({ x: event.clientX + 15, y: event.clientY + 15 });
    }
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'activityNode') {
      setSelectedNodeDetails(node.data);
    }
  }, []);

  // Edge Hover Handlers (for Loops)
  const onEdgeMouseEnter = useCallback((event, edge) => {
    if (edge.data && edge.data.dependencyType === 'Loop') {
      const config = edge.data.loopConfig || {};
      setHoveredLoop({
        source: edge.source,
        target: edge.target,
        maxIterations: config.maxIterations || 5,
        expectedAvgIterations: config.expectedAvgIterations || 2,
        loopProbability: config.loopProbability || 0.3,
        exitCondition: config.exitCondition || 'QA Approved',
        isMandatory: config.isMandatory ? 'Yes' : 'No'
      });
      setHoverPos({ x: event.clientX + 15, y: event.clientY + 15 });
    }
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredLoop(null);
  }, []);

  // Center Graph
  const centerGraph = () => {
    fitView({ duration: 400 });
  };

  // Reset Layout
  const resetLayout = () => {
    setDirection('LR');
    applyLayout('LR');
  };

  // Export as PNG
  const exportAsPng = () => {
    const svgElement = document.querySelector('.react-flow__renderer svg');
    if (!svgElement) return alert('SVG element not found.');

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.clientWidth || 1400;
      canvas.height = svgElement.clientHeight || 900;
      const context = canvas.getContext('2d');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      
      const pngURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngURL;
      downloadLink.download = 'PMIS_Workflow_Flowchart.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
  };

  const exportAsPdf = () => {
    window.print();
  };

  return (
    <div className={`flex bg-[#F8FAFC] border border-[#D6DEE8] rounded-2xl overflow-hidden shadow-xl ${
      isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-[680px] w-full'
    }`}>
      
      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Canvas Header */}
        <div className="px-6 py-4 border-b border-[#D6DEE8] bg-white flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <div>
            <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider font-outfit">Project Workflow Architecture</h4>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Left-to-right sequential path, critical paths, and rework cycles.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDirection}
              className="p-1.5 bg-white border border-[#D6DEE8] hover:bg-slate-100 rounded text-slate-650 flex items-center gap-1 text-[10px] font-bold shadow-sm"
              title="Toggle Layout Direction (Horizontal / Vertical)"
            >
              {direction === 'LR' ? <List size={12} /> : <Columns size={12} />}
              {direction === 'LR' ? 'Vertical Layout' : 'Horizontal Layout'}
            </button>
            <button
              onClick={exportAsPng}
              className="p-1.5 bg-white border border-[#D6DEE8] hover:bg-slate-100 rounded text-slate-650 flex items-center gap-1 text-[10px] font-bold shadow-sm"
            >
              <FileImage size={12} className="text-[#3b82f6]" />
              PNG
            </button>
            <button
              onClick={exportAsPdf}
              className="p-1.5 bg-white border border-[#D6DEE8] hover:bg-slate-100 rounded text-slate-650 flex items-center gap-1 text-[10px] font-bold shadow-sm"
            >
              <Download size={12} className="text-[#16a34a]" />
              PDF / Print
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-white border border-[#D6DEE8] hover:bg-slate-100 rounded text-slate-650 flex items-center gap-1 text-[10px] font-bold shadow-sm"
            >
              <Maximize size={12} />
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-[#C62828]/10 hover:bg-[#C62828]/20 text-[#C62828] rounded shadow-sm"
              >
                <X size={13} className="stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 relative min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeClick={onNodeClick}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            {/* minimap - large enterprise standard */}
            <MiniMap 
              nodeColor={(node) => {
                if (node.data?.isCriticalPath) return '#ef4444';
                if (node.data?.currentStatus === 'Completed') return '#16a34a';
                if (node.data?.currentStatus === 'InProgress') return '#f59e0b';
                return '#cbd5e1';
              }} 
              maskColor="rgba(248, 250, 252, 0.7)"
              style={{ 
                borderRadius: '12px', 
                border: '1px solid #D6DEE8', 
                width: 200, 
                height: 120,
                bottom: 16,
                right: 16
              }}
              zoomable
              pannable
            />
            
            {/* floating legend */}
            <Panel position="bottom-left" className="bg-white/95 backdrop-blur-sm border border-[#D6DEE8] p-4 rounded-xl shadow-lg text-[9.5px] font-bold text-slate-650 space-y-2 max-w-[200px]">
              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Workflow Legend</p>
              <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[4px] border-2 border-[#3b82f6] bg-white inline-block"></span>
                  <span>Normal Stage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-[4px] border-2 border-[#ef4444] bg-white inline-block"></span>
                  <span className="text-[#ef4444]">Critical Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#ef4444] inline-block"></span>
                  <span className="text-[#ef4444]">Feedback Loop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#E2F0D9] border border-[#16a34a] inline-block"></span>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#FEF3C7] border border-[#f59e0b] inline-block"></span>
                  <span>In Progress</span>
                </div>
              </div>
            </Panel>

            <Controls showInteractive={false} style={{ bottom: 160, left: 16 }} />
            
            {/* custom floating controls toolbar (right top) */}
            <Panel position="top-right" className="bg-white/90 border border-[#D6DEE8] p-1.5 rounded-lg shadow-md flex items-center gap-1.5 z-10 mt-2 mr-2">
              <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-100 text-slate-650 rounded" title="Zoom In"><ZoomIn size={13} /></button>
              <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-100 text-slate-650 rounded" title="Zoom Out"><ZoomOut size={13} /></button>
              <button onClick={centerGraph} className="p-1.5 hover:bg-slate-100 text-slate-650 rounded" title="Fit to Screen"><Maximize size={13} /></button>
              <button onClick={resetLayout} className="p-1.5 hover:bg-slate-100 text-slate-650 rounded border-l border-slate-200 pl-2" title="Reset Layout"><RotateCcw size={13} /></button>
              <button onClick={() => applyLayout(direction)} className="p-1.5 hover:bg-slate-100 text-slate-650 rounded" title="Auto Arrange"><RefreshCw size={13} /></button>
            </Panel>

            <Background color="#CBD5E1" gap={16} />
          </ReactFlow>
        </div>

        {/* Hover Tooltip for Activities */}
        {hoveredNode && (
          <div
            className="fixed z-50 bg-[#1E293B] text-white border border-slate-700 p-4 rounded-xl shadow-xl text-[10px] space-y-3 pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
              <span className="font-extrabold uppercase text-[#3b82f6] tracking-wider truncate max-w-[150px]">
                {hoveredNode.label}
              </span>
              <span className="text-slate-400 text-[8px] font-mono font-bold">
                STAGE #{hoveredNode.sequenceNumber}
              </span>
            </div>
            
            <div className="space-y-1.5 text-slate-300 font-sans">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-450">Planned Dates:</span>
                <span className="font-bold text-white">
                  {hoveredNode.plannedStartDate ? new Date(hoveredNode.plannedStartDate).toLocaleDateString() : '-'} to {hoveredNode.plannedEndDate ? new Date(hoveredNode.plannedEndDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-450">Actual Dates:</span>
                <span className="font-bold text-white">
                  {hoveredNode.actualStartDate ? new Date(hoveredNode.actualStartDate).toLocaleDateString() : '-'} to {hoveredNode.actualEndDate ? new Date(hoveredNode.actualEndDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5">
                <span className="font-semibold text-slate-450">Department:</span>
                <span className="font-bold text-white">{hoveredNode.responsibleDepartment}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-450">Delay Days:</span>
                <span className={`font-bold ${hoveredNode.currentDelayDays > 0 ? 'text-[#EF4444]' : 'text-white'}`}>
                  {hoveredNode.currentDelayDays} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-450">Historical Risk Weight:</span>
                <span className="font-bold text-white">{hoveredNode.historicalRiskWeight}%</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5">
                <span className="font-semibold text-slate-450">ML Delay Probability:</span>
                <span className="font-bold text-[#F59E0B]">{((hoveredNode.historicalRiskWeight * 0.4 + hoveredNode.currentDelayDays * 0.6) / 2 + 10).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Hover Tooltip for Loops */}
        {hoveredLoop && (
          <div
            className="fixed z-50 bg-[#1E293B] text-white border border-[#334155] p-3.5 rounded-xl shadow-xl text-[10px] space-y-2 pointer-events-none w-56 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="flex justify-between items-center border-b border-slate-700 pb-1">
              <span className="font-extrabold uppercase text-[#ef4444] tracking-wider flex items-center gap-1">
                ↺ feedback cycle
              </span>
              <span className="text-slate-400 text-[8px] font-mono">
                {hoveredLoop.source} → {hoveredLoop.target}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
              <span className="font-semibold text-slate-450">Max Iterations:</span>
              <span className="font-bold text-right text-white">{hoveredLoop.maxIterations}</span>

              <span className="font-semibold text-slate-450">Avg Iterations:</span>
              <span className="font-bold text-right text-white">{hoveredLoop.expectedAvgIterations}</span>

              <span className="font-semibold text-slate-450">Mandatory:</span>
              <span className="font-bold text-right text-white">{hoveredLoop.isMandatory}</span>
            </div>
          </div>
        )}
      </div>

      {/* Side Details Panel on Click */}
      {selectedNodeDetails && (
        <div className="w-80 bg-white border-l border-[#D6DEE8] flex flex-col h-full animate-in slide-in-from-right duration-200 z-10 flex-shrink-0">
          <div className="px-5 py-4 border-b border-[#D6DEE8] flex justify-between items-center bg-[#F8FAFC]">
            <h5 className="font-black text-[#12355B] text-xs font-outfit uppercase tracking-wider">Activity Details</h5>
            <button 
              onClick={() => setSelectedNodeDetails(null)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header Title */}
            <div>
              <span className="text-[9px] font-black font-outfit text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                STAGE #{selectedNodeDetails.sequenceNumber}
              </span>
              <h4 className="text-sm font-black text-[#12355B] mt-2 font-outfit uppercase">{selectedNodeDetails.label}</h4>
              <p className="text-[10px] text-[#2F6690] font-bold mt-1 uppercase tracking-wider">{selectedNodeDetails.category}</p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#F8FAFC] border border-[#D6DEE8] p-3 rounded-xl">
                <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={10} /> Duration</p>
                <p className="text-sm font-extrabold text-[#12355B] mt-1">{selectedNodeDetails.durationMonths} Months</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#D6DEE8] p-3 rounded-xl">
                <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1"><ShieldAlert size={10} /> Risk Weight</p>
                <p className="text-sm font-extrabold text-[#C62828] mt-1">{selectedNodeDetails.historicalRiskWeight}%</p>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-3.5 border-t border-slate-100 pt-4 font-sans text-xs">
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Status:</span>
                <span 
                  className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-black border"
                  style={{
                    background: selectedNodeDetails.currentStatus === 'Completed' ? '#E2F0D9' : (selectedNodeDetails.currentStatus === 'InProgress' ? '#FEF3C7' : '#F1F5F9'),
                    color: selectedNodeDetails.currentStatus === 'Completed' ? '#16a34a' : (selectedNodeDetails.currentStatus === 'InProgress' ? '#B45309' : '#64748B'),
                    borderColor: selectedNodeDetails.currentStatus === 'Completed' ? '#A7F3D0' : (selectedNodeDetails.currentStatus === 'InProgress' ? '#FDE68A' : '#E2E8F0')
                  }}
                >
                  {selectedNodeDetails.currentStatus === 'Completed' ? 'Completed' : (selectedNodeDetails.currentStatus === 'InProgress' ? 'In Progress' : 'Not Started')}
                </span>
              </div>
              
              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1"><User size={12} /> Responsibility:</span>
                <span className="font-bold text-slate-800">{selectedNodeDetails.responsibleDepartment}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1"><Calendar size={12} /> Planned Start:</span>
                <span className="font-bold text-slate-800">
                  {selectedNodeDetails.plannedStartDate ? new Date(selectedNodeDetails.plannedStartDate).toLocaleDateString() : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1"><Calendar size={12} /> Planned End:</span>
                <span className="font-bold text-slate-800">
                  {selectedNodeDetails.plannedEndDate ? new Date(selectedNodeDetails.plannedEndDate).toLocaleDateString() : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1"><Calendar size={12} /> Actual Start:</span>
                <span className="font-bold text-slate-800">
                  {selectedNodeDetails.actualStartDate ? new Date(selectedNodeDetails.actualStartDate).toLocaleDateString() : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1"><Calendar size={12} /> Actual End:</span>
                <span className="font-bold text-slate-800">
                  {selectedNodeDetails.actualEndDate ? new Date(selectedNodeDetails.actualEndDate).toLocaleDateString() : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Execution Delay:</span>
                <span className={`font-black ${selectedNodeDetails.currentDelayDays > 0 ? 'text-[#C62828]' : 'text-slate-800'}`}>
                  {selectedNodeDetails.currentDelayDays} Days
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Is Critical Path:</span>
                <span className={`font-black uppercase text-[9px] ${selectedNodeDetails.isCriticalPath ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                  {selectedNodeDetails.isCriticalPath ? 'Yes (Critical)' : 'No'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="font-semibold text-slate-500">Is milestone:</span>
                <span className={`font-black uppercase text-[9px] ${selectedNodeDetails.isMilestone ? 'text-[#2F6690]' : 'text-slate-400'}`}>
                  {selectedNodeDetails.isMilestone ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* ML Analytics Prediction */}
            <div className="bg-[#FFF2CC]/30 border border-[#D97706]/20 p-4 rounded-xl space-y-2 mt-4">
              <h6 className="text-[10px] font-black text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
                <Award size={12} /> ML Risk Forecast
              </h6>
              <div className="space-y-1 text-[11px] leading-relaxed text-slate-700">
                <div className="flex justify-between font-bold">
                  <span>Delay Likelihood:</span>
                  <span className="text-[#B45309]">
                    {((selectedNodeDetails.historicalRiskWeight * 0.4 + selectedNodeDetails.currentDelayDays * 0.6) / 2 + 10).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-550 mt-1">
                  Based on historical trends of {selectedNodeDetails.responsibleDepartment} and complexity weights, this activity is estimated to have a {selectedNodeDetails.currentDelayDays > 0 ? 'High' : 'Low-to-Medium'} probability of impacting the project schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. Outer wrapper offering clean ReactFlowProvider Context Isolation
function WorkflowCanvas(props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowCanvas;
