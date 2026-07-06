import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Calendar, Clock, ShieldAlert, Award, User, Tag,
  Search, Eye, EyeOff, Sliders, Layers, FolderMinus, FolderPlus,
  ArrowRight, CheckCircle2, AlertTriangle, Play, Grid
} from 'lucide-react';
import dagre from 'dagre';
import { toPng } from 'html-to-image';

// 1. Custom Node Components

// START Node
const StartNode = ({ data }) => {
  const targetPos = data.targetPosition || Position.Right;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50 shadow-md min-w-[120px] justify-center">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-outfit">START</span>
      <Handle type="source" position={targetPos} style={{ background: '#10b981', width: 6, height: 6 }} />
    </div>
  );
};

// END Node
const EndNode = ({ data }) => {
  const targetPos = data.targetPosition || Position.Left;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50 shadow-md min-w-[120px] justify-center">
      <span className="text-[10px]">✅</span>
      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider font-outfit">END</span>
      <Handle type="target" position={targetPos} style={{ background: '#10b981', width: 6, height: 6 }} />
    </div>
  );
};

// Activity Node (Enterprise card styling)
const ActivityNode = ({ data, selected }) => {
  const isCritical = data.isCriticalPath;
  const isDelayed = data.currentDelayDays > 0;
  const status = data.currentStatus || 'NotStarted';
  
  // Dynamic border & bg styles based on status & delay
  let cardStyle = "border-slate-200 bg-white text-slate-800 shadow-sm hover:shadow-md";
  let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
  let statusLabel = "Not Started";
  
  if (isCritical) {
    cardStyle = "border-red-500 bg-red-50/5 text-red-950 shadow-md shadow-red-50 hover:shadow-lg hover:shadow-red-100 ring-2 ring-red-500/10";
  } else if (isDelayed) {
    cardStyle = "border-orange-500 bg-orange-50/5 text-orange-950 shadow-sm";
  } else if (status === 'Completed') {
    cardStyle = "border-emerald-500 bg-emerald-50/5 text-emerald-950 shadow-sm";
  } else if (status === 'InProgress') {
    cardStyle = "border-blue-500 bg-blue-50/5 text-blue-950 shadow-sm";
  }

  if (status === 'Completed') {
    statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    statusLabel = "Completed";
  } else if (status === 'InProgress') {
    statusColor = "bg-blue-100 text-blue-800 border-blue-200 animate-pulse";
    statusLabel = "In Progress";
  }

  const targetPos = data.targetPosition || Position.Left;
  const sourcePos = data.sourcePosition || Position.Right;

  return (
    <div 
      className={`relative rounded-xl p-3.5 w-[240px] text-left transition-all duration-200 border-2 select-none ${cardStyle} ${
        selected ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.03] z-50 shadow-xl' : ''
      }`}
    >
      <Handle type="target" position={targetPos} style={{ background: isCritical ? '#ef4444' : '#3b82f6', width: 6, height: 6 }} />
      <Handle type="source" position={sourcePos} style={{ background: isCritical ? '#ef4444' : '#3b82f6', width: 6, height: 6 }} />

      {/* Header bar */}
      <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-400 mb-2 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black font-mono">
            SEQ {data.sequenceNumber}
          </span>
          <span className="text-slate-450 font-mono">ID: {data.id ? data.id.slice(-5) : data.sequenceNumber}</span>
        </div>
        {data.onCollapse && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              data.onCollapse(data.category);
            }}
            className="hover:bg-slate-100 p-0.5 rounded text-slate-450 hover:text-slate-650 transition-colors"
            title={`Collapse category: ${data.category}`}
          >
            <FolderMinus size={11} />
          </button>
        )}
      </div>

      {/* Activity Name */}
      <h5 className="text-[11.5px] font-extrabold leading-snug text-[#12355B] mb-2 line-clamp-2" title={data.label}>
        {data.label}
      </h5>

      {/* Progress slider */}
      <div className="space-y-1 mb-2.5">
        <div className="flex justify-between text-[8px] font-black text-slate-450 uppercase tracking-wider">
          <span>Progress</span>
          <span>{data.completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'Completed' ? 'bg-emerald-500' : (isCritical ? 'bg-red-500' : 'bg-blue-500')
            }`}
            style={{ width: `${data.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[9px] font-bold border-t border-slate-100 pt-2.5 mt-1.5">
        <span className="flex items-center gap-1 truncate max-w-[100px] text-slate-500 font-medium" title={data.responsibleDepartment}>
          <User size={10} className="text-slate-450" />
          {data.responsibleDepartment}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isDelayed && (
            <span className="px-1 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[7px] font-black rounded uppercase flex items-center gap-0.5">
              ⚠️ {data.currentDelayDays}d
            </span>
          )}
          <span className={`px-1.5 py-0.5 border text-[7.5px] uppercase tracking-widest font-black rounded ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Critical Path Pulsing Dot */}
      {isCritical && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white text-[8px] font-black text-white flex items-center justify-center">!</span>
        </span>
      )}
    </div>
  );
};

// Collapsed Sub-Workflow Group Node
const CollapsedGroupNode = ({ data, selected }) => {
  const targetPos = data.targetPosition || Position.Left;
  const sourcePos = data.sourcePosition || Position.Right;
  const isCritical = data.isCriticalPath;

  return (
    <div 
      className={`relative bg-slate-50 border-2 border-dashed border-blue-400 rounded-xl p-4 w-[210px] text-left transition-all duration-200 ${
        selected ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.03] z-50 shadow-xl' : 'shadow-sm hover:shadow-md'
      } ${isCritical ? 'border-red-400 bg-red-50/20' : ''}`}
    >
      <Handle type="target" position={targetPos} style={{ background: isCritical ? '#ef4444' : '#3b82f6', width: 6, height: 6 }} />
      <Handle type="source" position={sourcePos} style={{ background: isCritical ? '#ef4444' : '#3b82f6', width: 6, height: 6 }} />

      {/* Stacked Pages decoration to represent group */}
      <div className="absolute inset-0 bg-slate-100 border border-slate-350 rounded-xl -translate-x-1.5 translate-y-1.5 -z-10 opacity-75"></div>
      <div className="absolute inset-0 bg-slate-200 border border-slate-300 rounded-xl -translate-x-3 translate-y-3 -z-20 opacity-40"></div>

      <div className="flex items-center gap-1 text-[7.5px] font-black tracking-widest uppercase text-blue-500 mb-1.5">
        <span>📂 SUB-WORKFLOW GROUP</span>
      </div>

      <h5 className="text-[12px] font-black text-[#12355B] uppercase leading-tight line-clamp-2">
        {data.label}
      </h5>

      <div className="flex justify-between items-center text-[9px] font-black text-slate-500 mt-3.5 border-t border-slate-200 pt-2">
        <span>{data.count} Activities</span>
        <span className="bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded border border-blue-200/50 text-[8px]">
          {data.averageProgress}% Avg
        </span>
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (data.onExpand) data.onExpand(data.category);
        }}
        className="w-full mt-3 py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[8.5px] uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
      >
        <FolderPlus size={10} /> Expand stages
      </button>

      {isCritical && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white text-[8px] font-black text-white flex items-center justify-center">!</span>
        </span>
      )}
    </div>
  );
};

// Swimlane Track Background Node
const SwimlaneNode = ({ data }) => {
  return (
    <div className="w-full h-full relative p-4 flex items-start select-none rounded-2xl border border-slate-200/40 bg-slate-50/20">
      <div className="sticky left-4 bg-white/85 backdrop-blur-sm border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm text-[9.5px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5 z-10">
        <Layers size={10} className="text-slate-400" />
        {data.label} Track
      </div>
    </div>
  );
};

const nodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  activityNode: ActivityNode,
  collapsedGroupNode: CollapsedGroupNode,
  swimlaneNode: SwimlaneNode
};

// 2. Dagre Layout Engine Config
const getLayoutedElements = (nodes, edges, direction = 'LR', layoutMode = 'standard') => {
  const isHorizontal = direction === 'LR';
  const nodeWidth = 240;
  const nodeHeight = 110;

  // Filter edges to only include those whose source and target exist in the nodes array
  const nodeIds = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  if (layoutMode === 'standard') {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 160 });

    nodes.forEach((node) => {
      let w = nodeWidth;
      let h = nodeHeight;
      if (node.type === 'startNode' || node.type === 'endNode') {
        w = 120;
        h = 50;
      } else if (node.type === 'collapsedGroupNode') {
        w = 210;
        h = 100;
      } else if (node.type === 'decisionNode') {
        w = 130;
        h = 100;
      }
      dagreGraph.setNode(node.id, { width: w, height: h });
    });

    validEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id) || { x: 0, y: 0 };
      const posX = typeof nodeWithPosition.x === 'number' && !isNaN(nodeWithPosition.x) ? nodeWithPosition.x : 0;
      const posY = typeof nodeWithPosition.y === 'number' && !isNaN(nodeWithPosition.y) ? nodeWithPosition.y : 0;

      let w = nodeWidth;
      let h = nodeHeight;
      if (node.type === 'startNode' || node.type === 'endNode') {
        w = 120;
        h = 50;
      } else if (node.type === 'collapsedGroupNode') {
        w = 210;
        h = 100;
      } else if (node.type === 'decisionNode') {
        w = 130;
        h = 100;
      }
      
      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {
          x: posX - w / 2,
          y: posY - h / 2
        }
      };
    });

    return { nodes: newNodes, edges: validEdges };
  } else {
    // Grouped Swimlanes Layout Mode (force Horizontal flow)
    const activityNodes = nodes.filter(n => n.type === 'activityNode');
    const collapsedNodes = nodes.filter(n => n.type === 'collapsedGroupNode');
    
    // Group categories
    const categories = Array.from(new Set([
      ...activityNodes.map(n => n.data?.category).filter(Boolean),
      ...collapsedNodes.map(n => n.data?.category).filter(Boolean)
    ]));

    // Chronological sort based on average sequence number
    const categoryOrder = categories.map(cat => {
      const catNodes = nodes.filter(n => (n.type === 'activityNode' || n.type === 'collapsedGroupNode') && n.data?.category === cat);
      const avgSeq = catNodes.length > 0 
        ? catNodes.reduce((sum, n) => sum + (n.data?.sequenceNumber || 0), 0) / catNodes.length
        : 0;
      return { cat, avgSeq };
    }).sort((a, b) => a.avgSeq - b.avgSeq).map(item => item.cat);

    const laneSpacing = 200;
    const laneMap = {};
    categoryOrder.forEach((cat, index) => {
      laneMap[cat] = index;
    });

    // Run DAGRE as flat graph to calculate X positions
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 160 });

    nodes.forEach((node) => {
      let w = nodeWidth;
      let h = nodeHeight;
      if (node.type === 'startNode' || node.type === 'endNode') {
        w = 120;
        h = 50;
      } else if (node.type === 'collapsedGroupNode') {
        w = 210;
        h = 100;
      } else if (node.type === 'decisionNode') {
        w = 130;
        h = 100;
      }
      dagreGraph.setNode(node.id, { width: w, height: h });
    });

    validEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Position nodes using Dagre X coordinate and Lane Y offset
    const newNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id) || { x: 0, y: 0 };
      const posX = typeof nodeWithPosition.x === 'number' && !isNaN(nodeWithPosition.x) ? nodeWithPosition.x : 0;

      let w = nodeWidth;
      let h = nodeHeight;
      if (node.type === 'startNode' || node.type === 'endNode') {
        w = 120;
        h = 50;
      } else if (node.type === 'collapsedGroupNode') {
        w = 210;
        h = 100;
      } else if (node.type === 'decisionNode') {
        w = 130;
        h = 100;
      }

      let yPos = (typeof nodeWithPosition.y === 'number' && !isNaN(nodeWithPosition.y) ? nodeWithPosition.y : 0) - h / 2;

      if (node.type === 'activityNode' || node.type === 'collapsedGroupNode') {
        const laneIdx = node.data?.category && laneMap[node.data.category] !== undefined ? laneMap[node.data.category] : 0;
        yPos = laneIdx * laneSpacing + 80;
      } else if (node.type === 'startNode') {
        yPos = 0 * laneSpacing + 80 + (nodeHeight - h) / 2;
      } else if (node.type === 'endNode') {
        const lastLaneIdx = Math.max(0, categoryOrder.length - 1);
        yPos = lastLaneIdx * laneSpacing + 80 + (nodeHeight - h) / 2;
      }

      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        position: {
          x: posX - w / 2,
          y: yPos
        }
      };
    });

    return { nodes: newNodes, edges: validEdges, categories: categoryOrder, laneSpacing };
  }
};

// 3. Graph Collapsing Processor
const processGraphForCollapsing = (rawNodes, rawEdges, collapsedList, onExpand, onCollapse) => {
  if (collapsedList.length === 0) {
    const processedNodes = rawNodes.map(node => {
      if (node.type === 'activityNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onCollapse
          }
        };
      }
      return node;
    });
    return { processedNodes, processedEdges: rawEdges };
  }

  const processedNodes = [];
  const processedEdges = [];
  
  const isNodeCollapsed = (node) => {
    if (node.type !== 'activityNode') return false;
    return collapsedList.includes(node.data?.category);
  };

  const collapsedGroupsData = {};
  
  rawNodes.forEach(node => {
    if (isNodeCollapsed(node)) {
      const cat = node.data?.category;
      if (!collapsedGroupsData[cat]) {
        collapsedGroupsData[cat] = {
          nodes: [],
          sumProgress: 0,
          count: 0,
          isCritical: false,
          departments: new Set(),
          minSeq: 9999
        };
      }
      collapsedGroupsData[cat].nodes.push(node);
      collapsedGroupsData[cat].sumProgress += (node.data?.completionPercentage || 0);
      collapsedGroupsData[cat].count += 1;
      if (node.data?.isCriticalPath) {
        collapsedGroupsData[cat].isCritical = true;
      }
      if (node.data?.responsibleDepartment) {
        collapsedGroupsData[cat].departments.add(node.data.responsibleDepartment);
      }
      if (node.data?.sequenceNumber < collapsedGroupsData[cat].minSeq) {
        collapsedGroupsData[cat].minSeq = node.data.sequenceNumber;
      }
    } else {
      processedNodes.push({
        ...node,
        data: {
          ...node.data,
          onCollapse
        }
      });
    }
  });

  Object.entries(collapsedGroupsData).forEach(([category, info]) => {
    processedNodes.push({
      id: `collapsed_${category}`,
      type: 'collapsedGroupNode',
      data: {
        label: category,
        count: info.count,
        averageProgress: Math.round(info.sumProgress / info.count),
        isCriticalPath: info.isCritical,
        departments: Array.from(info.departments),
        category: category,
        sequenceNumber: info.minSeq,
        onExpand
      }
    });
  });

  const nodeMap = {};
  rawNodes.forEach(n => { nodeMap[n.id] = n; });

  const addedEdges = new Set();
  
  rawEdges.forEach(edge => {
    const srcNode = nodeMap[edge.source];
    const tgtNode = nodeMap[edge.target];
    
    if (!srcNode || !tgtNode) return;
    
    const srcCollapsed = isNodeCollapsed(srcNode);
    const tgtCollapsed = isNodeCollapsed(tgtNode);
    
    let finalSource = edge.source;
    let finalTarget = edge.target;
    
    if (srcCollapsed) {
      finalSource = `collapsed_${srcNode.data.category}`;
    }
    if (tgtCollapsed) {
      finalTarget = `collapsed_${tgtNode.data.category}`;
    }
    
    if (srcCollapsed && tgtCollapsed && srcNode.data.category === tgtNode.data.category) {
      return;
    }
    
    const edgeKey = `${finalSource}->${finalTarget}`;
    if (!addedEdges.has(edgeKey)) {
      addedEdges.add(edgeKey);
      
      const isLoop = edge.data?.dependencyType === 'Loop' || edge.id.includes('loop');
      
      processedEdges.push({
        ...edge,
        id: `e_${finalSource}_${finalTarget}`,
        source: finalSource,
        target: finalTarget,
        data: {
          ...edge.data,
          dependencyType: isLoop ? 'Loop' : edge.data?.dependencyType
        }
      });
    }
  });

  return { processedNodes, processedEdges };
};

// 4. Inner React Flow Canvas Component
function WorkflowCanvasInner({ nodes: initialNodes, edges: initialEdges, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [direction, setDirection] = useState('LR');
  const [layoutMode, setLayoutMode] = useState('standard');
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [layoutTrigger, setLayoutTrigger] = useState(0);
  
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLoop, setHoveredLoop] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  const categoriesList = useMemo(() => {
    const list = initialNodes
      .filter(n => n.type === 'activityNode')
      .map(n => n.data?.category)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [initialNodes]);

  const handleCollapseCategory = useCallback((category) => {
    setCollapsedGroups(prev => {
      if (prev.includes(category)) return prev;
      return [...prev, category];
    });
  }, []);

  const handleExpandCategory = useCallback((category) => {
    setCollapsedGroups(prev => prev.filter(c => c !== category));
  }, []);

  const toggleCategoryCollapsed = useCallback((category) => {
    setCollapsedGroups(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  }, []);

  const highlightChain = useMemo(() => {
    if (!selectedNodeId) {
      return { nodes: new Set(), edges: new Set() };
    }

    const upstreamNodes = new Set();
    const downstreamNodes = new Set();
    const highlightedEdges = new Set();

    upstreamNodes.add(selectedNodeId);
    downstreamNodes.add(selectedNodeId);

    const predecessors = {};
    const successors = {};
    const edgeMap = {};

    edges.forEach(edge => {
      const s = edge.source;
      const t = edge.target;
      if (!predecessors[t]) predecessors[t] = [];
      predecessors[t].push(s);

      if (!successors[s]) successors[s] = [];
      successors[s].push(t);

      edgeMap[`${s}->${t}`] = edge.id;
    });

    const queueUp = [selectedNodeId];
    const visitedUp = new Set([selectedNodeId]);

    while (queueUp.length > 0) {
      const curr = queueUp.shift();
      const preds = predecessors[curr] || [];
      preds.forEach(p => {
        if (!visitedUp.has(p)) {
          visitedUp.add(p);
          upstreamNodes.add(p);
          queueUp.push(p);
        }
        if (edgeMap[`${p}->${curr}`]) {
          highlightedEdges.add(edgeMap[`${p}->${curr}`]);
        }
      });
    }

    const queueDown = [selectedNodeId];
    const visitedDown = new Set([selectedNodeId]);

    while (queueDown.length > 0) {
      const curr = queueDown.shift();
      const succs = successors[curr] || [];
      succs.forEach(s => {
        if (!visitedDown.has(s)) {
          visitedDown.add(s);
          downstreamNodes.add(s);
          queueDown.push(s);
        }
        if (edgeMap[`${curr}->${s}`]) {
          highlightedEdges.add(edgeMap[`${curr}->${s}`]);
        }
      });
    }

    return {
      nodes: new Set([...upstreamNodes, ...downstreamNodes]),
      edges: highlightedEdges
    };
  }, [selectedNodeId, edges]);

  useEffect(() => {
    const { processedNodes, processedEdges } = processGraphForCollapsing(
      initialNodes, 
      initialEdges, 
      collapsedGroups,
      handleExpandCategory,
      handleCollapseCategory
    );

    const layoutResult = getLayoutedElements(processedNodes, processedEdges, direction, layoutMode);
    
    const nodeMap = {};
    layoutResult.nodes.forEach(n => { nodeMap[n.id] = n; });

    const enrichedEdges = layoutResult.edges.map(edge => {
      const srcNode = nodeMap[edge.source];
      const tgtNode = nodeMap[edge.target];
      
      let depType = 'FS';
      if (edge.data?.dependencyType === 'Loop' || edge.id.includes('loop')) {
        depType = 'Loop';
      } else if (srcNode && tgtNode) {
        const srcStart = srcNode.data?.plannedStartDate;
        const tgtStart = tgtNode.data?.plannedStartDate;
        const srcEnd = srcNode.data?.plannedEndDate;
        const tgtEnd = tgtNode.data?.plannedEndDate;

        if (srcStart && tgtStart && new Date(srcStart).getTime() === new Date(tgtStart).getTime()) {
          depType = 'SS';
        } else if (srcEnd && tgtEnd && new Date(srcEnd).getTime() === new Date(tgtEnd).getTime()) {
          depType = 'FF';
        } else {
          const srcSeq = srcNode.data?.sequenceNumber || 0;
          const tgtSeq = tgtNode.data?.sequenceNumber || 0;
          const sum = srcSeq + tgtSeq;
          if (sum % 5 === 2) depType = 'SS';
          else if (sum % 5 === 4) depType = 'FF';
          else depType = 'FS';
        }
      }

      const isCriticalLink = srcNode?.data?.isCriticalPath && tgtNode?.data?.isCriticalPath && depType !== 'Loop';
      
      let stroke = '#64748b';
      let strokeWidth = 2;
      let strokeDasharray = undefined;
      let label = '';
      
      if (isCriticalLink) {
        stroke = '#ef4444';
        strokeWidth = 3;
      } else {
        switch (depType) {
          case 'SS':
            stroke = '#6366f1';
            strokeDasharray = '5 5';
            label = 'SS';
            break;
          case 'FF':
            stroke = '#0d9488';
            strokeDasharray = '2 3';
            label = 'FF';
            break;
          case 'Loop':
            stroke = '#f43f5e';
            strokeDasharray = '5 5';
            label = 'Loop';
            break;
          case 'FS':
          default:
            stroke = '#3b82f6';
            label = 'FS';
            break;
        }
      }

      return {
        ...edge,
        type: 'smoothstep',
        label: label,
        labelStyle: { fill: stroke, fontWeight: 'black', fontSize: 8 },
        labelBgPadding: 3,
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: stroke, strokeWidth: 0.5 },
        style: { 
          stroke, 
          strokeWidth, 
          strokeDasharray,
          opacity: 0.75,
          transition: 'all 0.15s ease'
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        animated: depType === 'Loop',
        data: {
          ...edge.data,
          dependencyType: depType
        }
      };
    });

    let renderedNodes = layoutResult.nodes;
    if (layoutMode === 'swimlane' && layoutResult.categories) {
      let minX = 0;
      let maxX = 1200;
      layoutResult.nodes.forEach(n => {
        if (n.position.x < minX) minX = n.position.x;
        if (n.position.x > maxX) maxX = n.position.x;
      });
      const laneWidth = maxX - minX + 500;
      
      const swimlanes = layoutResult.categories.map((cat, idx) => ({
        id: `lane_${cat}`,
        type: 'swimlaneNode',
        selectable: false,
        draggable: false,
        position: { x: minX - 150, y: idx * layoutResult.laneSpacing + 30 },
        style: {
          width: laneWidth,
          height: layoutResult.laneSpacing - 20,
          zIndex: -10,
          pointerEvents: 'none'
        },
        data: { label: cat }
      }));
      renderedNodes = [...swimlanes, ...layoutResult.nodes];
    }

    setNodes(renderedNodes);
    setEdges(enrichedEdges);
    setTimeout(() => fitView({ duration: 300 }), 80);
  }, [initialNodes, initialEdges, direction, layoutMode, collapsedGroups, layoutTrigger]);

  const displayedNodes = useMemo(() => {
    const hasActiveHighlight = selectedNodeId !== null;
    return nodes.map(node => {
      const isPartOfChain = highlightChain.nodes.has(node.id);
      const opacity = hasActiveHighlight ? (isPartOfChain ? 1.0 : 0.18) : 1.0;
      return {
        ...node,
        style: {
          ...node.style,
          opacity,
          transition: 'opacity 0.15s ease, transform 0.15s ease'
        }
      };
    });
  }, [nodes, selectedNodeId, highlightChain]);

  const displayedEdges = useMemo(() => {
    const hasActiveHighlight = selectedNodeId !== null;
    return edges.map(edge => {
      const isPartOfChain = highlightChain.edges.has(edge.id);
      const opacity = hasActiveHighlight ? (isPartOfChain ? 1.0 : 0.15) : 0.75;
      const strokeWidth = edge.style?.strokeWidth || 2;
      const finalStrokeWidth = hasActiveHighlight && isPartOfChain ? strokeWidth + 1 : strokeWidth;

      return {
        ...edge,
        style: {
          ...edge.style,
          opacity,
          strokeWidth: finalStrokeWidth,
          transition: 'all 0.15s ease'
        },
        animated: edge.data?.dependencyType === 'Loop' || (hasActiveHighlight && isPartOfChain)
      };
    });
  }, [edges, selectedNodeId, highlightChain]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const matches = nodes.filter(n => {
      if (n.type !== 'activityNode' && n.type !== 'collapsedGroupNode') return false;
      const name = n.data?.label || '';
      const dept = n.data?.responsibleDepartment || '';
      const cat = n.data?.category || '';
      return name.toLowerCase().includes(query) || 
             dept.toLowerCase().includes(query) ||
             cat.toLowerCase().includes(query) ||
             n.id.includes(query);
    });
    setSearchResults(matches.slice(0, 5));
  }, [searchQuery, nodes]);

  const handleSearchResultClick = (node) => {
    setSelectedNodeId(node.id);
    setSelectedNodeDetails(node.data);
    
    const widthOffset = node.type === 'collapsedGroupNode' ? 105 : 120;
    const heightOffset = node.type === 'collapsedGroupNode' ? 50 : 55;
    setCenter(node.position.x + widthOffset, node.position.y + heightOffset, { zoom: 1.15, duration: 600 });
    
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeDetails(null);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'activityNode' || node.type === 'collapsedGroupNode') {
      setSelectedNodeId(node.id);
      setSelectedNodeDetails(node.data);
    }
  }, []);

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const toggleDirection = () => {
    const nextDir = direction === 'LR' ? 'TB' : 'LR';
    setDirection(nextDir);
  };

  const onNodeMouseEnter = useCallback((event, node) => {
    if (node.type === 'activityNode') {
      setHoveredNode(node.data);
      setHoverPos({ x: event.clientX + 15, y: event.clientY + 15 });
    }
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

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

  const exportAsPng = () => {
    const element = document.querySelector('.react-flow');
    if (!element) return alert('Workflow viewport canvas not found.');

    toPng(element, {
      backgroundColor: '#ffffff',
      filter: (node) => {
        if (
          node.classList?.contains('react-flow__controls') ||
          node.classList?.contains('react-flow__panel') ||
          node.classList?.contains('react-flow__minimap')
        ) {
          return false;
        }
        return true;
      }
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'PMIS_Redesigned_Workflow.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Failed to export workflow diagram as PNG:', error);
      });
  };

  const exportAsPdf = () => {
    const element = document.querySelector('.react-flow');
    if (!element) return alert('Workflow viewport canvas not found.');

    toPng(element, {
      backgroundColor: '#ffffff',
      filter: (node) => {
        if (
          node.classList?.contains('react-flow__controls') ||
          node.classList?.contains('react-flow__panel') ||
          node.classList?.contains('react-flow__minimap')
        ) {
          return false;
        }
        return true;
      }
    })
      .then((dataUrl) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Pop-up blocked. Please enable pop-ups to print PDF.');
        printWindow.document.write(`
          <html>
            <head>
              <title>Project Workflow Blueprint</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #ffffff; }
                img { max-width: 100%; max-height: 100%; object-fit: contain; }
                @page { size: landscape; margin: 0; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 500);" />
            </body>
          </html>
        `);
        printWindow.document.close();
      })
      .catch((error) => {
        console.error('Failed to export workflow diagram as PDF:', error);
      });
  };

  return (
    <div className={`flex bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xl relative font-sans ${
      isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-[720px] w-full'
    }`}>
      
      {/* 1. Left Control & Configuration Sidebar */}
      {sidebarOpen && (
        <div className="w-[280px] bg-white border-r border-[#E2E8F0] flex flex-col h-full z-10 flex-shrink-0 animate-in slide-in-from-left duration-200">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[#12355B]" />
              <h5 className="font-black text-[#12355B] text-xs font-outfit uppercase tracking-wider">Canvas Dashboard</h5>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650"
              title="Close sidebar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Search Input Box */}
            <div className="space-y-2">
              <label className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest block">Find Stage Node</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search name, category, dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                
                {/* Search Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                    {searchResults.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleSearchResultClick(n)}
                        className="w-full text-left p-2 hover:bg-slate-50 rounded-lg flex items-center justify-between gap-1.5 transition-colors"
                      >
                        <div className="truncate min-w-0">
                          <span className="text-[7.5px] bg-slate-100 text-slate-600 px-1 rounded font-black font-mono mr-1">
                            SEQ {n.data.sequenceNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">{n.data.label}</span>
                        </div>
                        <span className="text-[8px] uppercase font-black text-slate-400 shrink-0">{n.data.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="space-y-2">
              <label className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest block">Structural Layout</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setLayoutMode('standard'); clearSelection(); }}
                  className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    layoutMode === 'standard' 
                      ? 'bg-[#12355B] border-[#12355B] text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <List size={12} /> Standard
                </button>
                <button
                  onClick={() => { setLayoutMode('swimlane'); clearSelection(); }}
                  className={`py-2 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    layoutMode === 'swimlane' 
                      ? 'bg-[#12355B] border-[#12355B] text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <Grid size={12} /> Swimlanes
                </button>
              </div>

              {layoutMode === 'standard' && (
                <button
                  onClick={toggleDirection}
                  className="w-full mt-2 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 bg-white rounded-xl text-[9px] font-extrabold text-slate-650 flex items-center justify-center gap-1.5"
                >
                  {direction === 'LR' ? <Columns size={12} /> : <List size={12} />}
                  Flow: {direction === 'LR' ? 'Horizontal (Left → Right)' : 'Vertical (Top → Bottom)'}
                </button>
              )}
            </div>

            {/* Collapse/Expand Sub-workflows Section */}
            <div className="space-y-2.5">
              <label className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest block">Sub-Workflow Groups</label>
              <div className="space-y-1.5 border border-slate-100 p-2.5 rounded-xl bg-slate-50/50">
                {categoriesList.map(cat => {
                  const isCollapsed = collapsedGroups.includes(cat);
                  const count = initialNodes.filter(n => n.type === 'activityNode' && n.data?.category === cat).length;
                  return (
                    <div key={cat} className="flex items-center justify-between text-xs py-1 px-1.5 hover:bg-white rounded-md transition-colors">
                      <span className="font-bold text-slate-700 truncate max-w-[170px]" title={cat}>{cat} ({count})</span>
                      <button
                        onClick={() => toggleCategoryCollapsed(cat)}
                        className={`p-1 rounded transition-colors ${
                          isCollapsed 
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                            : 'hover:bg-slate-200 text-slate-400 hover:text-slate-650'
                        }`}
                        title={isCollapsed ? "Expand group" : "Collapse group"}
                      >
                        {isCollapsed ? <FolderPlus size={13} /> : <FolderMinus size={13} />}
                      </button>
                    </div>
                  );
                })}
                {categoriesList.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center font-medium py-2">No category groups available.</p>
                )}
              </div>
            </div>

            {/* Selected Node Mini Details Quick View */}
            {selectedNodeDetails && (
              <div className="border border-[#E2E8F0] rounded-xl p-3.5 bg-blue-50/10 space-y-2.5 animate-in fade-in duration-200 font-sans">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] bg-blue-100 text-blue-750 px-1.5 py-0.5 rounded font-black font-mono">
                    STAGE #{selectedNodeDetails.sequenceNumber}
                  </span>
                  <button 
                    onClick={clearSelection}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
                <h6 className="text-[11px] font-black text-[#12355B] uppercase leading-tight line-clamp-2">
                  {selectedNodeDetails.label}
                </h6>
                <div className="text-[9.5px] space-y-1 text-slate-650 font-medium">
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="font-bold text-slate-800">{selectedNodeDetails.responsibleDepartment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-bold text-slate-800">{selectedNodeDetails.durationMonths}m</span>
                  </div>
                  {selectedNodeDetails.currentDelayDays > 0 && (
                    <div className="flex justify-between text-red-650">
                      <span>Current Delay:</span>
                      <span className="font-black animate-pulse">⚠️ {selectedNodeDetails.currentDelayDays} days</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Graph Visualization Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Toolbar Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[#12355B]"
                title="Open controls dashboard"
              >
                <Sliders size={14} />
              </button>
            )}
            <div>
              <h4 className="text-xs font-black text-[#12355B] uppercase tracking-wider font-outfit">Project Workflow Blueprint</h4>
              <p className="text-[10px] text-slate-550 font-semibold mt-0.5">
                {layoutMode === 'swimlane' 
                  ? 'Organized Swimlane tracks representing department sequences.' 
                  : 'Automated DAG flow map featuring sequential paths, delays, and loops.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedNodeId && (
              <button
                onClick={clearSelection}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#B45309] rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
              >
                <EyeOff size={11} /> Clear Highlighting
              </button>
            )}
            <button
              onClick={exportAsPng}
              className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg text-slate-650 flex items-center gap-1.5 text-[10px] font-extrabold shadow-sm"
              title="Export visual graph as PNG image file"
            >
              <FileImage size={12} className="text-blue-500" /> PNG
            </button>
            <button
              onClick={exportAsPdf}
              className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg text-slate-650 flex items-center gap-1.5 text-[10px] font-extrabold shadow-sm"
              title="Print canvas graph to PDF document"
            >
              <Download size={12} className="text-emerald-500" /> PDF / Print
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg text-slate-650 flex items-center gap-1.5 text-[10px] font-extrabold shadow-sm"
            >
              <Maximize size={12} /> {isFullscreen ? 'Exit' : 'Full Screen'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg shadow-sm border border-red-200"
              >
                <X size={13} className="stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 relative min-h-0">
          <ReactFlow
            nodes={displayedNodes}
            edges={displayedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeClick={onNodeClick}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            {/* Legend Overlay Panel */}
            <Panel position="bottom-left" className="bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-4 rounded-xl shadow-lg text-[9.5px] font-bold text-slate-650 space-y-2.5 max-w-[220px]">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-1.5">Blueprint Legend</p>
              
              <div className="space-y-2">
                <div className="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest mb-1 select-none">Nodes</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-slate-300 bg-white"></span><span>Not Started</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-blue-500 bg-blue-50/15"></span><span>In Progress</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-emerald-500 bg-emerald-50/15"></span><span>Completed</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-orange-500 bg-orange-50/15"></span><span>Delayed</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border border-red-500 bg-red-50/15"></span><span className="text-red-650 font-black">Critical</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md border-2 border-dashed border-blue-400 bg-slate-50"></span><span>Merged Group</span></div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="font-extrabold text-[8px] text-slate-400 uppercase tracking-widest mb-1 select-none">Dependency Links</div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-blue-500 inline-block"></span>
                  <span>Finish-to-Start (FS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t border-dashed border-indigo-500 inline-block"></span>
                  <span>Start-to-Start (SS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t border-dotted border-teal-600 inline-block"></span>
                  <span>Finish-to-Finish (FF)</span>
                </div>
                <div className="flex items-center gap-2 text-rose-500 font-extrabold">
                  <span className="w-4 h-0.5 border-t border-dashed border-rose-500 inline-block animate-pulse"></span>
                  <span>Feedback Loop</span>
                </div>
              </div>
            </Panel>

            <Controls showInteractive={false} style={{ bottom: 170, left: 16 }} />
            
            {/* Floating Navigation Controls */}
            <Panel position="top-right" className="bg-white/90 border border-slate-200 p-1.5 rounded-xl shadow-md flex items-center gap-1 z-10 mt-2 mr-2">
              <button onClick={() => zoomIn()} className="p-2 hover:bg-slate-100 text-slate-650 rounded-lg transition-colors" title="Zoom In"><ZoomIn size={13} /></button>
              <button onClick={() => zoomOut()} className="p-2 hover:bg-slate-100 text-slate-650 rounded-lg transition-colors" title="Zoom Out"><ZoomOut size={13} /></button>
              <button onClick={() => fitView({ duration: 300 })} className="p-2 hover:bg-slate-100 text-slate-650 rounded-lg transition-colors" title="Fit graph to Screen"><Maximize size={13} /></button>
              <button 
                onClick={() => {
                  setCollapsedGroups([]);
                  clearSelection();
                  setLayoutMode('standard');
                  setDirection('LR');
                  setTimeout(() => fitView({ duration: 400 }), 100);
                }} 
                className="p-2 hover:bg-slate-100 text-slate-650 rounded-lg border-l border-slate-200 pl-2 transition-colors" 
                title="Reset layout & expand all"
              >
                <RotateCcw size={13} />
              </button>
              <button onClick={() => setLayoutTrigger(prev => prev + 1)} className="p-2 hover:bg-slate-100 text-slate-650 rounded-lg transition-colors" title="Auto Align Layout"><RefreshCw size={13} /></button>
            </Panel>

            <Background color="#CBD5E1" gap={18} size={1} />
            
            <MiniMap 
              nodeColor={(node) => {
                if (node.type === 'swimlaneNode') return 'transparent';
                if (node.type === 'collapsedGroupNode') return '#3b82f6';
                if (node.data?.isCriticalPath) return '#ef4444';
                if (node.data?.currentStatus === 'Completed') return '#10b981';
                if (node.data?.currentStatus === 'InProgress') return '#3b82f6';
                if (node.data?.currentDelayDays > 0) return '#f97316';
                return '#cbd5e1';
              }} 
              maskColor="rgba(248, 250, 252, 0.65)"
              style={{ 
                borderRadius: '12px', 
                border: '1px solid #E2E8F0', 
                width: 180, 
                height: 110,
                bottom: 16,
                right: 16
              }}
              zoomable
              pannable
            />
          </ReactFlow>
        </div>

        {/* Hover Tooltip for Activities */}
        {hoveredNode && (
          <div
            className="fixed z-50 bg-[#1E293B] text-white border border-slate-700/80 p-4 rounded-xl shadow-xl text-[10px] space-y-3 pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-100 font-sans"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
              <span className="font-extrabold uppercase text-[#3b82f6] tracking-wider truncate max-w-[160px]">
                {hoveredNode.label}
              </span>
              <span className="text-slate-400 text-[8px] font-mono font-bold bg-slate-800 px-1 rounded">
                SEQ #{hoveredNode.sequenceNumber}
              </span>
            </div>
            
            <div className="space-y-1.5 text-slate-350">
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Planned Dates:</span>
                <span className="font-extrabold text-white">
                  {hoveredNode.plannedStartDate ? new Date(hoveredNode.plannedStartDate).toLocaleDateString() : '-'} to {hoveredNode.plannedEndDate ? new Date(hoveredNode.plannedEndDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Actual Dates:</span>
                <span className="font-extrabold text-white">
                  {hoveredNode.actualStartDate ? new Date(hoveredNode.actualStartDate).toLocaleDateString() : '-'} to {hoveredNode.actualEndDate ? new Date(hoveredNode.actualEndDate).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5">
                <span className="text-slate-450 font-bold">Department:</span>
                <span className="font-extrabold text-white">{hoveredNode.responsibleDepartment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Delay Duration:</span>
                <span className={`font-extrabold ${hoveredNode.currentDelayDays > 0 ? 'text-[#EF4444]' : 'text-white'}`}>
                  {hoveredNode.currentDelayDays} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-bold">Historical Risk:</span>
                <span className="font-extrabold text-white">{hoveredNode.historicalRiskWeight}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Hover Tooltip for Feedback Loops */}
        {hoveredLoop && (
          <div
            className="fixed z-50 bg-[#1E293B] text-white border border-[#334155] p-3.5 rounded-xl shadow-xl text-[10px] space-y-2 pointer-events-none w-56 animate-in fade-in zoom-in-95 duration-100 font-sans"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="flex justify-between items-center border-b border-slate-700 pb-1">
              <span className="font-extrabold uppercase text-[#ef4444] tracking-wider flex items-center gap-1.5">
                ↺ feedback cycle
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-350 font-bold">
              <span>Max Iterations:</span>
              <span className="text-right text-white">{hoveredLoop.maxIterations}</span>

              <span>Avg Iterations:</span>
              <span className="text-right text-white">{hoveredLoop.expectedAvgIterations}</span>

              <span>Exit Condition:</span>
              <span className="text-right text-white truncate max-w-[100px]">{hoveredLoop.exitCondition}</span>

              <span>Mandatory:</span>
              <span className="text-right text-white">{hoveredLoop.isMandatory}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 5. Outer wrapper providing clean ReactFlowProvider Context Isolation
function WorkflowCanvas(props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowCanvas;
