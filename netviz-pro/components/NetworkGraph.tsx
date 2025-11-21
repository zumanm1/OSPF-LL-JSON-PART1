import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkData, NetworkNode, NetworkLink, PathResult } from '../types';
import { COUNTRY_COLORS, NODE_RADIUS, ACTIVE_STROKE_COLOR, INACTIVE_STROKE_COLOR, LINK_COLOR_UP, LINK_COLOR_DOWN } from '../constants';
import { Minus, Plus, RefreshCw, Tag, Network } from 'lucide-react';

interface NetworkGraphProps {
  data: NetworkData;
  onNodeSelect: (node: NetworkNode | null) => void;
  onLinkSelect?: (link: NetworkLink | null) => void;
  selectedNode: NetworkNode | null;
  highlightedPath: PathResult | null;
  activeCountries: string[];
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, onNodeSelect, onLinkSelect, selectedNode, highlightedPath, activeCountries }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true); 
  const [showInterfaces, setShowInterfaces] = useState(false); // New state for interface labels
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);

  // Handle resizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize Graph
  useEffect(() => {
    if (!data || !svgRef.current || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const { width, height } = dimensions;

    // 1. Filter Nodes based on active countries
    const filteredNodes: NetworkNode[] = data.nodes
        .filter(n => activeCountries.includes(n.country))
        .map(d => ({ ...d })); 

    // Create a Set of active Node IDs for fast lookup
    const activeNodeIds = new Set(filteredNodes.map(n => n.id));

    // 2. Filter Links
    const filteredLinks: NetworkLink[] = data.links
        .filter(l => {
            const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
            return activeNodeIds.has(sourceId) && activeNodeIds.has(targetId);
        })
        .map((d) => {
             const sourceId = typeof d.source === 'object' ? (d.source as any).id : d.source;
             const targetId = typeof d.target === 'object' ? (d.target as any).id : d.target;
             return { ...d, source: sourceId, target: targetId }; 
        });

    const g = svg.append("g");

    // Defs for Arrowheads
    const defs = svg.append("defs");
    
    // Highlight Marker
    defs.append("marker")
        .attr("id", "arrow-highlight")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", NODE_RADIUS + 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#3b82f6");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    const simulation = d3.forceSimulation<NetworkNode, NetworkLink>(filteredNodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(filteredLinks).id(d => d.id).distance(160)) 
      .force("charge", d3.forceManyBody().strength(-400))
      .force("collide", d3.forceCollide(NODE_RADIUS * 1.5))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulationRef.current = simulation;

    const isDimmed = (d: any) => {
        if (!highlightedPath) return false;
        if (d.id) return !highlightedPath.nodes.includes(d.id);
        if (d.source && d.target) {
            const sId = typeof d.source === 'object' ? d.source.id : d.source;
            const tId = typeof d.target === 'object' ? d.target.id : d.target;
            const sIdx = highlightedPath.nodes.indexOf(sId);
            const tIdx = highlightedPath.nodes.indexOf(tId);
            if (sIdx !== -1 && tIdx !== -1 && Math.abs(sIdx - tIdx) === 1) {
                 return false;
            }
            return true;
        }
        return false;
    };

    // Markers logic
    const getMarkerStart = (d: NetworkLink) => {
        if (!highlightedPath || isDimmed(d)) return null;
        const sId = typeof d.source === 'object' ? (d.source as NetworkNode).id : d.source as string;
        const tId = typeof d.target === 'object' ? (d.target as NetworkNode).id : d.target as string;
        const sIdx = highlightedPath.nodes.indexOf(sId);
        const tIdx = highlightedPath.nodes.indexOf(tId);
        if (sIdx !== -1 && tIdx !== -1 && tIdx === sIdx - 1) return "url(#arrow-highlight)";
        return null;
    };

    const getMarkerEnd = (d: NetworkLink) => {
        if (!highlightedPath || isDimmed(d)) return null;
        const sId = typeof d.source === 'object' ? (d.source as NetworkNode).id : d.source as string;
        const tId = typeof d.target === 'object' ? (d.target as NetworkNode).id : d.target as string;
        const sIdx = highlightedPath.nodes.indexOf(sId);
        const tIdx = highlightedPath.nodes.indexOf(tId);
        if (sIdx !== -1 && tIdx !== -1 && tIdx === sIdx + 1) return "url(#arrow-highlight)";
        return null;
    };

    // Link Group
    const linkGroup = g.append("g").selectAll("g").data(filteredLinks).join("g");

    // Link Line
    const linkLine = linkGroup.append("line")
      .attr("stroke-width", d => {
          const cost = d.cost || 1;
          const baseWidth = Math.max(1.5, Math.log10(cost) * 1.5);
          return isDimmed(d) ? baseWidth : Math.max(3, baseWidth + 1); 
      }) 
      .attr("stroke", d => {
          if (highlightedPath && !isDimmed(d)) return "#3b82f6"; 
          if (d.status !== 'up') return LINK_COLOR_DOWN;
          if (d.is_modified) return "#d946ef"; 
          return LINK_COLOR_UP;
      })
      .attr("stroke-dasharray", d => d.status !== 'up' ? "5,5" : "none")
      .attr("stroke-opacity", d => isDimmed(d) ? 0.1 : d.status !== 'up' ? 0.5 : 1)
      .attr("marker-start", d => getMarkerStart(d))
      .attr("marker-end", d => getMarkerEnd(d));

    // Hit Area
    linkGroup.append("line")
      .attr("stroke", "transparent")
      .attr("stroke-width", 15)
      .attr("class", "cursor-pointer")
      .on("click", (event, d) => {
          event.stopPropagation();
          if (onLinkSelect) onLinkSelect(d);
      })
      .append("title")
      .text(d => `Source: ${(d.source as NetworkNode).id}\nTarget: ${(d.target as NetworkNode).id}\nCost: ${d.cost}`);

    // Cost Label
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(filteredLinks)
      .join("text")
      .text(d => d.cost)
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", d => d.is_modified ? "#fae8ff" : "#d1d5db") 
      .attr("stroke", "#111827") 
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .attr("opacity", d => isDimmed(d) || d.status !== 'up' ? 0 : 1) 
      .style("pointer-events", "none");

    // Interface Labels Group
    const interfaceLabels = g.append("g")
        .attr("class", "interface-labels") // Hook for CSS toggle
        .style("pointer-events", "none");

    const interfaceLabelGroup = interfaceLabels.selectAll("g")
        .data(filteredLinks)
        .join("g")
        .attr("opacity", d => isDimmed(d) || d.status !== 'up' ? 0 : 1);

    // Source Interface Text
    interfaceLabelGroup.append("text")
        .text(d => d.source_interface)
        .attr("class", "source-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", "#9ca3af")
        .attr("stroke", "#111827")
        .attr("stroke-width", 2)
        .attr("paint-order", "stroke");

    // Target Interface Text
    interfaceLabelGroup.append("text")
        .text(d => d.target_interface)
        .attr("class", "target-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", "#9ca3af")
        .attr("stroke", "#111827")
        .attr("stroke-width", 2)
        .attr("paint-order", "stroke");

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .attr("cursor", "pointer")
      .attr("opacity", d => {
        if (selectedNode && d.id === selectedNode.id) return 1;
        return isDimmed(d) ? 0.2 : 1;
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeSelect(d);
        if (onLinkSelect) onLinkSelect(null);
      });
      
    node.append("circle")
      .attr("r", d => isDimmed(d) ? NODE_RADIUS : NODE_RADIUS * 1.2)
      .attr("fill", d => COUNTRY_COLORS[d.country] || COUNTRY_COLORS.DEFAULT)
      .attr("stroke", d => {
          if (selectedNode && d.id === selectedNode.id) return "#f59e0b"; 
          if (highlightedPath && !isDimmed(d)) return "#60a5fa"; 
          return d.is_active ? ACTIVE_STROKE_COLOR : INACTIVE_STROKE_COLOR;
      })
      .attr("stroke-width", d => {
          if (selectedNode && d.id === selectedNode.id) return 4;
          return highlightedPath && !isDimmed(d) ? 3 : 1.5;
      });

    node.append("text")
      .text(d => d.id.substring(0, 3))
      .attr("x", 0)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("stroke", "none")
      .style("pointer-events", "none");

    node.append("text")
      .text(d => d.hostname)
      .attr("x", 0)
      .attr("y", NODE_RADIUS + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#9ca3af")
      .attr("stroke", "none")
      .style("pointer-events", "none");

    const drag = d3.drag<SVGGElement, NetworkNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    node.append("title").text(d => `ID: ${d.id}\nHost: ${d.hostname}\nIP: ${d.loopback_ip}`);

    simulation.on("tick", () => {
      linkLine
        .attr("x1", d => (d.source as NetworkNode).x!)
        .attr("y1", d => (d.source as NetworkNode).y!)
        .attr("x2", d => (d.target as NetworkNode).x!)
        .attr("y2", d => (d.target as NetworkNode).y!);

      linkGroup.selectAll("line[stroke='transparent']")
        .attr("x1", (d: any) => (d.source as NetworkNode).x!)
        .attr("y1", (d: any) => (d.source as NetworkNode).y!)
        .attr("x2", (d: any) => (d.target as NetworkNode).x!)
        .attr("y2", (d: any) => (d.target as NetworkNode).y!);
        
      linkLabel
        .attr("x", d => ((d.source as NetworkNode).x! + (d.target as NetworkNode).x!) / 2)
        .attr("y", d => ((d.source as NetworkNode).y! + (d.target as NetworkNode).y!) / 2);

      // Update Interface Labels (Position at 20% from ends)
      interfaceLabelGroup.select(".source-label")
         .attr("x", d => (d.source as NetworkNode).x! + ((d.target as NetworkNode).x! - (d.source as NetworkNode).x!) * 0.25)
         .attr("y", d => (d.source as NetworkNode).y! + ((d.target as NetworkNode).y! - (d.source as NetworkNode).y!) * 0.25);

      interfaceLabelGroup.select(".target-label")
         .attr("x", d => (d.target as NetworkNode).x! + ((d.source as NetworkNode).x! - (d.target as NetworkNode).x!) * 0.25)
         .attr("y", d => (d.target as NetworkNode).y! + ((d.source as NetworkNode).y! - (d.target as NetworkNode).y!) * 0.25);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    if (svgRef.current) {
        const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6).translate(-width/2, -height/2); 
        svg.call(zoom.transform, initialTransform);
    }

    return () => { simulation.stop(); };
  }, [data, dimensions, highlightedPath, activeCountries, onNodeSelect, selectedNode, onLinkSelect]);

  const handleZoomIn = () => {
    if(svgRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(
            // @ts-ignore
            d3.zoom().on("zoom", (e) => d3.select(svgRef.current).select('g').attr('transform', e.transform)).scaleBy, 
            1.2
        );
    }
  }

  const handleZoomOut = () => {
     if(svgRef.current) {
         d3.select(svgRef.current).transition().duration(300).call(
             // @ts-ignore
             d3.zoom().on("zoom", (e) => d3.select(svgRef.current).select('g').attr('transform', e.transform)).scaleBy, 
             0.8
         );
     }
  }

  const handleReset = () => {
     if(simulationRef.current) simulationRef.current.alpha(1).restart();
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-inner ${!showLabels ? 'labels-hidden' : ''} ${!showInterfaces ? 'interfaces-hidden' : ''}`}
    >
        <style>{`
            .labels-hidden .link-label { opacity: 0 !important; }
            .interfaces-hidden .interface-labels { opacity: 0 !important; }
        `}</style>

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg border border-gray-700 shadow-lg transition-all" title="Zoom In"><Plus className="w-4 h-4" /></button>
            <button onClick={handleZoomOut} className="p-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg border border-gray-700 shadow-lg transition-all" title="Zoom Out"><Minus className="w-4 h-4" /></button>
             <button onClick={handleReset} className="p-2 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg border border-gray-700 shadow-lg transition-all" title="Reset Layout"><RefreshCw className="w-4 h-4" /></button>
             <button 
                onClick={() => setShowLabels(!showLabels)} 
                className={`p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 shadow-lg transition-all ${showLabels ? 'text-blue-400 border-blue-500/30' : 'text-gray-400'}`}
                title={showLabels ? "Hide Cost Labels" : "Show Cost Labels"}
             >
                <Tag className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setShowInterfaces(!showInterfaces)} 
                className={`p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 shadow-lg transition-all ${showInterfaces ? 'text-purple-400 border-purple-500/30' : 'text-gray-400'}`}
                title={showInterfaces ? "Hide Interface Labels" : "Show Interface Labels"}
             >
                <Network className="w-4 h-4" />
             </button>
        </div>
        
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full block" onClick={() => { onNodeSelect(null); if(onLinkSelect) onLinkSelect(null); }} />
        
        {highlightedPath && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-900/90 backdrop-blur px-4 py-2 rounded-full border border-blue-500/50 text-blue-100 text-xs font-medium shadow-lg pointer-events-none animate-in slide-in-from-top-2 flex items-center gap-3 z-20">
                <span className="text-blue-300">Path Visualization</span>
                <span className="w-px h-4 bg-blue-700"></span>
                <span className="flex items-center gap-1">Cost: <span className="font-bold text-white">{highlightedPath.totalCost}</span></span>
                <span className="flex items-center gap-1">Hops: <span className="font-bold text-white">{highlightedPath.hopCount}</span></span>
            </div>
        )}

        <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-gray-900/80 p-2 rounded pointer-events-none z-20">
             {activeCountries.length < 4 ? 'Filtered View' : 'Full View'} • {data.nodes.length} Nodes • {data.links.length} Links
        </div>
    </div>
  );
};

export default NetworkGraph;