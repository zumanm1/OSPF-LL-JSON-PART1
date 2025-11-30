import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkData, NetworkNode, NetworkLink, PathResult } from '../types';
import { COUNTRY_COLORS, NODE_RADIUS, ACTIVE_STROKE_COLOR, INACTIVE_STROKE_COLOR, LINK_COLOR_UP, LINK_COLOR_DOWN, LINK_COLOR_ASYMMETRIC } from '../constants';
import { Minus, Plus, RefreshCw, Tag, Network, Pause, Play } from 'lucide-react';
import { getRoleColor } from '../utils/hostnameMapper';

interface NetworkGraphProps {
  data: NetworkData;
  onNodeSelect: (node: NetworkNode | null) => void;
  onLinkSelect?: (link: NetworkLink | null) => void;
  selectedNode: NetworkNode | null;
  highlightedPath: PathResult | null;
  activeCountries: string[];
  theme: 'light' | 'dark';
  viewMode: 'detailed' | 'high-level';
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, onNodeSelect, onLinkSelect, selectedNode, highlightedPath, activeCountries, theme, viewMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true);
  const [showInterfaces, setShowInterfaces] = useState(false);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

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
    const g = svg.append("g");

    // Defs for Arrowheads
    const defs = svg.append("defs");
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
    zoomRef.current = zoom;

    // --- DATA PREPARATION ---
    let nodes: NetworkNode[] = [];
    let links: NetworkLink[] = [];

    if (viewMode === 'high-level') {
      // Aggregate by Country
      const countryMap = new Map<string, NetworkNode>();
      const linkMap = new Map<string, NetworkLink>();

      // Create Country Nodes
      data.nodes.forEach(n => {
        const country = n.country || 'Unknown';
        if (!countryMap.has(country)) {
          countryMap.set(country, {
            id: country,
            name: country,
            hostname: country,
            country: country,
            is_active: true,
            node_type: 'country_aggregate',
            role: 'unknown', // Use a valid role
            nodeCount: 0
          });
        }
        const cNode = countryMap.get(country)!;
        cNode.nodeCount = (cNode.nodeCount || 0) + 1;
      });
      nodes = Array.from(countryMap.values());

      // Create Aggregated Links
      data.links.forEach(l => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;

        const sNode = data.nodes.find(n => n.id === sId);
        const tNode = data.nodes.find(n => n.id === tId);

        if (sNode && tNode && sNode.country !== tNode.country) {
          const key = [sNode.country, tNode.country].sort().join('-');
          if (!linkMap.has(key)) {
            linkMap.set(key, {
              source: sNode.country,
              target: tNode.country,
              cost: 0,
              forward_cost: 0,
              reverse_cost: 0,
              status: 'up',
              is_asymmetric: false,
              source_interface: 'Aggregated',
              target_interface: 'Aggregated',
              // @ts-ignore
              linkCount: 0
            });
          }
          const aggLink = linkMap.get(key)!;
          // @ts-ignore
          aggLink.linkCount++;
          // Average cost? Or min? Let's use min for connectivity cost
          const lCost = l.cost || 10;
          if (aggLink.cost === 0 || lCost < aggLink.cost) aggLink.cost = lCost;
        }
      });
      links = Array.from(linkMap.values());

    } else {
      // Detailed View
      nodes = data.nodes.map(d => ({ ...d }));
      links = data.links.map(d => {
        const sourceId = typeof d.source === 'object' ? (d.source as any).id : d.source;
        const targetId = typeof d.target === 'object' ? (d.target as any).id : d.target;
        return { ...d, source: sourceId, target: targetId };
      });
    }

    // --- SIMULATION ---
    const simulation = d3.forceSimulation<NetworkNode, NetworkLink>(nodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(links)
        .id(d => d.id)
        .distance(d => {
          if (viewMode === 'high-level') return 200;
          // Check if intra-country or inter-country
          const sourceId = typeof d.source === 'object' ? (d.source as NetworkNode).id : d.source as string;
          const targetId = typeof d.target === 'object' ? (d.target as NetworkNode).id : d.target as string;

          const sNode = nodes.find(n => n.id === sourceId);
          const tNode = nodes.find(n => n.id === targetId);

          if (sNode && tNode && sNode.country === tNode.country) {
            return 60; // Tighter intra-country links
          }
          return 400; // Longer inter-country links to separate clusters
        })
      )
      .force("charge", d3.forceManyBody().strength(viewMode === 'high-level' ? -1000 : -300))
      .force("collide", d3.forceCollide(d => viewMode === 'high-level' ? 60 : NODE_RADIUS * 2))
      .force("center", d3.forceCenter(width / 2, height / 2));

    if (viewMode === 'detailed') {
      // Add clustering force only for detailed view
      // ... (Cluster logic from before)
      const countryGroups = new Map<string, NetworkNode[]>();
      const cityGroups = new Map<string, NetworkNode[]>();

      nodes.forEach(node => {
        const country = node.country || 'DEFAULT';
        if (!countryGroups.has(country)) countryGroups.set(country, []);
        countryGroups.get(country)!.push(node);

        const cityKey = `${country}-${node.city || 'default'}`;
        if (!cityGroups.has(cityKey)) cityGroups.set(cityKey, []);
        cityGroups.get(cityKey)!.push(node);
      });

      const countryCenters = new Map<string, { x: number; y: number }>();
      const countryList = Array.from(countryGroups.keys()).sort();
      const countryRadius = Math.min(width, height) * 0.35;

      countryList.forEach((country, i) => {
        const angle = (2 * Math.PI * i) / countryList.length - Math.PI / 2;
        countryCenters.set(country, {
          x: width / 2 + countryRadius * Math.cos(angle),
          y: height / 2 + countryRadius * Math.sin(angle)
        });
      });

      const cityCenters = new Map<string, { x: number; y: number }>();
      countryList.forEach(country => {
        const countryCenter = countryCenters.get(country)!;
        const citiesInCountry = Array.from(cityGroups.keys())
          .filter(k => k.startsWith(`${country}-`))
          .sort();

        const cityRadius = 60;
        citiesInCountry.forEach((cityKey, i) => {
          if (citiesInCountry.length === 1) {
            cityCenters.set(cityKey, countryCenter);
          } else {
            const angle = (2 * Math.PI * i) / citiesInCountry.length;
            cityCenters.set(cityKey, {
              x: countryCenter.x + cityRadius * Math.cos(angle),
              y: countryCenter.y + cityRadius * Math.sin(angle)
            });
          }
        });
      });

      const clusterForce = (alpha: number) => {
        nodes.forEach(node => {
          const country = node.country || 'DEFAULT';
          const cityKey = `${country}-${node.city || 'default'}`;
          const target = cityCenters.get(cityKey) || countryCenters.get(country);

          if (target && node.x !== undefined && node.y !== undefined) {
            const hasCity = node.city && node.city !== 'default';
            const strength = hasCity ? 0.3 : 0.15; // Increased from 0.15/0.08
            node.vx = (node.vx || 0) + (target.x - node.x) * alpha * strength;
            node.vy = (node.vy || 0) + (target.y - node.y) * alpha * strength;
          }
        });
      };
      simulation.force("cluster", clusterForce);
    }

    simulationRef.current = simulation;

    // --- RENDERING ---

    // Helper to check if dimmed
    const isDimmed = (d: any) => {
      if (activeCountries.length > 0) {
        if (d.country && !activeCountries.includes(d.country)) return true;
        // For links in high-level, check source/target country
        if (d.source && d.target) {
          const sNode = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
          const tNode = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
          if (sNode && !activeCountries.includes(sNode.country)) return true;
          if (tNode && !activeCountries.includes(tNode.country)) return true;
        }
      }
      // ... (Highlight path logic - skip for high-level for now or adapt)
      return false;
    };

    const linkGroup = g.append("g").selectAll("g").data(links).join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        if (onLinkSelect) {
          onLinkSelect(d);
        }
      });

    // Helper to check if link is in highlighted path
    const isInPath = (link: any): boolean => {
      if (!highlightedPath || !highlightedPath.nodes || highlightedPath.nodes.length < 2) return false;

      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      // Check if this link connects consecutive nodes in the path
      for (let i = 0; i < highlightedPath.nodes.length - 1; i++) {
        const pathNode1 = highlightedPath.nodes[i];
        const pathNode2 = highlightedPath.nodes[i + 1];

        if ((sourceId === pathNode1 && targetId === pathNode2) ||
          (sourceId === pathNode2 && targetId === pathNode1)) {
          return true;
        }
      }
      return false;
    };

    const linkLine = linkGroup.append("line")
      .attr("stroke-width", d => {
        // @ts-ignore
        if (viewMode === 'high-level') return Math.max(2, Math.log2(d.linkCount || 1) * 2);

        // Highlighted path links are thicker
        if (isInPath(d)) return 5;

        const cost = d.cost || 1;
        const baseWidth = Math.max(1.5, Math.log10(cost) * 1.5);
        return isDimmed(d) ? baseWidth : Math.max(3, baseWidth + 1);
      })
      .attr("stroke", d => {
        if (isDimmed(d)) return theme === 'dark' ? "#374151" : "#e5e7eb";
        if (viewMode === 'high-level') return "#94a3b8"; // Neutral for aggregated

        // Highlighted path links are bright blue
        if (isInPath(d)) return "#3b82f6";

        if (d.status !== 'up') return LINK_COLOR_DOWN;
        if (d.is_modified) return "#d946ef";
        const fwd = d.forward_cost !== undefined ? d.forward_cost : d.cost;
        const rev = d.reverse_cost !== undefined ? d.reverse_cost : fwd;
        if (d.is_asymmetric || (fwd !== rev)) return LINK_COLOR_ASYMMETRIC;
        return LINK_COLOR_UP;
      })
      .attr("stroke-opacity", d => isDimmed(d) ? 0.2 : 1)
      .attr("stroke-dasharray", d => isInPath(d) ? "10 5" : "none")
      .attr("stroke-dashoffset", d => isInPath(d) ? 0 : 0);

    // Animate marching ants for highlighted path
    if (highlightedPath) {
      linkLine.filter((d: any) => isInPath(d))
        .append("animate")
        .attr("attributeName", "stroke-dashoffset")
        .attr("from", "0")
        .attr("to", "15")
        .attr("dur", "1s")
        .attr("repeatCount", "indefinite");
    }

    // Link Labels (Count for high-level)
    if (viewMode === 'high-level') {
      linkGroup.append("text")
        .text(d => (d as any).linkCount)
        .attr("text-anchor", "middle")
        .attr("fill", theme === 'dark' ? "#9ca3af" : "#4b5563")
        .attr("font-size", "10px");
    }

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .attr("opacity", d => isDimmed(d) ? 0.2 : 1)
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeSelect(d);
      });

    // Helper to check if node is in highlighted path
    const isNodeInPath = (node: any): boolean => {
      if (!highlightedPath || !highlightedPath.nodes) return false;
      return highlightedPath.nodes.includes(node.id);
    };

    node.append("circle")
      .attr("r", d => {
        if (viewMode === 'high-level') {
          // @ts-ignore
          return 20 + Math.sqrt(d.nodeCount || 1) * 5;
        }
        // Path nodes are larger
        if (isNodeInPath(d)) return NODE_RADIUS * 1.4;
        return isDimmed(d) ? NODE_RADIUS * 0.8 : NODE_RADIUS * 1.2;
      })
      .attr("fill", d => {
        if (isDimmed(d)) return theme === 'dark' ? '#374151' : '#d1d5db';
        // Path nodes have a special glow color
        if (isNodeInPath(d)) return "#3b82f6";
        return COUNTRY_COLORS[d.country] || COUNTRY_COLORS.DEFAULT;
      })
      .attr("stroke", d => {
        if (isDimmed(d)) return "none";
        if (selectedNode && d.id === selectedNode.id) return "#f59e0b";
        // Path nodes have bright white stroke
        if (isNodeInPath(d)) return "#ffffff";
        return "#ffffff";
      })
      .attr("stroke-width", d => isNodeInPath(d) ? 3 : 2);

    // Labels
    node.append("text")
      .text(d => viewMode === 'high-level' ? d.id : d.hostname)
      .attr("text-anchor", "middle")
      .attr("dy", d => viewMode === 'high-level' ? 5 : NODE_RADIUS + 12)
      .attr("font-size", viewMode === 'high-level' ? "14px" : "10px")
      .attr("font-weight", "bold")
      .attr("fill", d => viewMode === 'high-level' ? "#ffffff" : (theme === 'dark' ? "#9ca3af" : "#4b5563"))
      .style("pointer-events", "none");

    if (viewMode === 'high-level') {
      node.append("text")
        .text(d => `${(d as any).nodeCount} Nodes`)
        .attr("text-anchor", "middle")
        .attr("dy", 20)
        .attr("font-size", "10px")
        .attr("fill", "#ffffff")
        .style("pointer-events", "none");
    }

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

    simulation.on("tick", () => {
      linkLine
        .attr("x1", d => (d.source as NetworkNode).x!)
        .attr("y1", d => (d.source as NetworkNode).y!)
        .attr("x2", d => (d.target as NetworkNode).x!)
        .attr("y2", d => (d.target as NetworkNode).y!);

      if (viewMode === 'high-level') {
        linkGroup.selectAll("text")
          .attr("x", d => ((d as any).source.x + (d as any).target.x) / 2)
          .attr("y", d => ((d as any).source.y + (d as any).target.y) / 2);
      }

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    if (svgRef.current) {
      const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(viewMode === 'high-level' ? 0.8 : 0.6).translate(-width / 2, -height / 2);
      svg.call(zoom.transform, initialTransform);
    }

    return () => { simulation.stop(); };
  }, [data, dimensions, highlightedPath, activeCountries, onNodeSelect, selectedNode, onLinkSelect, viewMode]);

  const handleTogglePause = () => {
    if (simulationRef.current) {
      if (isPaused) {
        simulationRef.current.alpha(0.3).restart();
      } else {
        simulationRef.current.stop();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        zoomRef.current.scaleBy,
        1.2
      );
    }
  }

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        zoomRef.current.scaleBy,
        0.8
      );
    }
  }

  const handleReset = () => {
    if (simulationRef.current) simulationRef.current.alpha(1).restart();
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner ${!showLabels ? 'labels-hidden' : ''} ${!showInterfaces ? 'interfaces-hidden' : ''}`}
    >
      <style>{`
            .labels-hidden .link-label { opacity: 0 !important; }
            .interfaces-hidden .interface-labels { opacity: 0 !important; }
        `}</style>

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button onClick={handleZoomIn} className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all" title="Zoom In"><Plus className="w-4 h-4" /></button>
        <button onClick={handleZoomOut} className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all" title="Zoom Out"><Minus className="w-4 h-4" /></button>
        <button onClick={handleReset} className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all" title="Reset Layout"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={handleTogglePause} className={`p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all ${isPaused ? 'text-red-500 dark:text-red-400 border-red-200 dark:border-red-500/30' : 'text-gray-600 dark:text-gray-300'}`} title={isPaused ? "Resume Layout" : "Pause Layout"}>
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all ${showLabels ? 'text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' : 'text-gray-400'}`}
          title={showLabels ? "Hide Cost Labels" : "Show Cost Labels"}
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowInterfaces(!showInterfaces)}
          className={`p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg transition-all ${showInterfaces ? 'text-purple-500 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' : 'text-gray-400'}`}
          title={showInterfaces ? "Hide Interface Labels" : "Show Interface Labels"}
        >
          <Network className="w-4 h-4" />
        </button>
      </div>

      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full block" onClick={() => { onNodeSelect(null); if (onLinkSelect) onLinkSelect(null); }} />

      {/* Empty State - No topology loaded */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
          <Network className="w-20 h-20 mb-4 opacity-30" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No Topology Loaded</h2>
          <p className="text-sm text-gray-500 max-w-md text-center">
            Upload a topology JSON file to visualize your network.
            <br />
            Supports any number of nodes and links.
          </p>
        </div>
      )}

      {highlightedPath && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-900/90 backdrop-blur px-4 py-2 rounded-full border border-blue-500/50 text-blue-100 text-xs font-medium shadow-lg pointer-events-none animate-in slide-in-from-top-2 flex items-center gap-3 z-20">
          <span className="text-blue-300">Path Visualization</span>
          <span className="w-px h-4 bg-blue-700"></span>
          <span className="flex items-center gap-1">Cost: <span className="font-bold text-white">{highlightedPath.totalCost}</span></span>
          <span className="flex items-center gap-1">Hops: <span className="font-bold text-white">{highlightedPath.hopCount}</span></span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white/80 dark:bg-gray-900/80 p-2 rounded pointer-events-none z-20 border border-gray-200 dark:border-gray-800">
        {viewMode === 'high-level' ? 'High Level View' : (activeCountries.length < 4 ? 'Filtered View' : 'Full View')} • {data.nodes.length} Nodes • {data.links.length} Links
      </div>
    </div>
  );
};

export default NetworkGraph;