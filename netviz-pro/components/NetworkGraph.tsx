import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NetworkData, NetworkNode, NetworkLink, PathResult } from '../types';
import { COUNTRY_COLORS, NODE_RADIUS, ACTIVE_STROKE_COLOR, INACTIVE_STROKE_COLOR, LINK_COLOR_UP, LINK_COLOR_DOWN, LINK_COLOR_ASYMMETRIC } from '../constants';
import { Minus, Plus, RefreshCw, Tag, Network } from 'lucide-react';
import { getRoleColor } from '../utils/hostnameMapper';

interface NetworkGraphProps {
  data: NetworkData;
  onNodeSelect: (node: NetworkNode | null) => void;
  onLinkSelect?: (link: NetworkLink | null) => void;
  selectedNode: NetworkNode | null;
  highlightedPath: PathResult | null;
  activeCountries: string[];
  theme: 'light' | 'dark';
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ data, onNodeSelect, onLinkSelect, selectedNode, highlightedPath, activeCountries, theme }) => {
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

    // Calculate cluster centers based on country hierarchy
    const countryGroups = new Map<string, NetworkNode[]>();
    const cityGroups = new Map<string, NetworkNode[]>();
    const siteGroups = new Map<string, NetworkNode[]>();
    
    filteredNodes.forEach(node => {
      // Group by country
      const country = node.country || 'DEFAULT';
      if (!countryGroups.has(country)) countryGroups.set(country, []);
      countryGroups.get(country)!.push(node);
      
      // Group by country-city
      const cityKey = `${country}-${node.city || 'default'}`;
      if (!cityGroups.has(cityKey)) cityGroups.set(cityKey, []);
      cityGroups.get(cityKey)!.push(node);
      
      // Group by country-city-site
      const siteKey = `${country}-${node.city || 'default'}-${node.site || 'default'}`;
      if (!siteGroups.has(siteKey)) siteGroups.set(siteKey, []);
      siteGroups.get(siteKey)!.push(node);
    });

    // Calculate cluster center positions (arrange countries in a circle)
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

    // Calculate city centers within each country cluster
    const cityCenters = new Map<string, { x: number; y: number }>();
    countryList.forEach(country => {
      const countryCenter = countryCenters.get(country)!;
      const citiesInCountry = Array.from(cityGroups.keys())
        .filter(k => k.startsWith(`${country}-`))
        .sort();
      
      const cityRadius = 60; // Distance between cities within a country
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

    // Custom clustering force
    const clusterForce = (alpha: number) => {
      filteredNodes.forEach(node => {
        const country = node.country || 'DEFAULT';
        const cityKey = `${country}-${node.city || 'default'}`;
        
        // Get target center (prefer city center if available, else country center)
        const target = cityCenters.get(cityKey) || countryCenters.get(country);
        if (target && node.x !== undefined && node.y !== undefined) {
          // Strength varies: stronger for same city/site, weaker for just country
          const hasCity = node.city && node.city !== 'default';
          const strength = hasCity ? 0.15 : 0.08;
          
          node.vx = (node.vx || 0) + (target.x - node.x) * alpha * strength;
          node.vy = (node.vy || 0) + (target.y - node.y) * alpha * strength;
        }
      });
    };

    const simulation = d3.forceSimulation<NetworkNode, NetworkLink>(filteredNodes)
      .force("link", d3.forceLink<NetworkNode, NetworkLink>(filteredLinks).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("collide", d3.forceCollide(NODE_RADIUS * 2))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("cluster", clusterForce);

    simulationRef.current = simulation;

    // Create cluster hulls (background shapes showing country groupings)
    const hullGroup = g.append("g").attr("class", "cluster-hulls");
    
    // Helper function to compute convex hull with padding
    const computeHull = (nodes: NetworkNode[], padding: number = 30): [number, number][] | null => {
      if (nodes.length < 3) {
        // For less than 3 nodes, create a circle around them
        if (nodes.length === 0) return null;
        const centerX = nodes.reduce((sum, n) => sum + (n.x || 0), 0) / nodes.length;
        const centerY = nodes.reduce((sum, n) => sum + (n.y || 0), 0) / nodes.length;
        const points: [number, number][] = [];
        for (let i = 0; i < 8; i++) {
          const angle = (2 * Math.PI * i) / 8;
          points.push([centerX + padding * Math.cos(angle), centerY + padding * Math.sin(angle)]);
        }
        return points;
      }
      
      const points: [number, number][] = nodes.map(n => [n.x || 0, n.y || 0]);
      const hull = d3.polygonHull(points);
      if (!hull) return null;
      
      // Expand hull with padding
      const centroid = d3.polygonCentroid(hull);
      return hull.map(point => {
        const dx = point[0] - centroid[0];
        const dy = point[1] - centroid[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = (dist + padding) / dist;
        return [centroid[0] + dx * scale, centroid[1] + dy * scale] as [number, number];
      });
    };

    // Create hull paths for each country
    const countryHulls = hullGroup.selectAll("path.country-hull")
      .data(Array.from(countryGroups.entries()))
      .join("path")
      .attr("class", "country-hull")
      .attr("fill", ([country]) => {
        const color = COUNTRY_COLORS[country] || COUNTRY_COLORS.DEFAULT;
        return color;
      })
      .attr("fill-opacity", 0.08)
      .attr("stroke", ([country]) => {
        const color = COUNTRY_COLORS[country] || COUNTRY_COLORS.DEFAULT;
        return color;
      })
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .style("pointer-events", "none");

    // Create hull labels for each country
    const countryLabels = hullGroup.selectAll("text.country-label")
      .data(Array.from(countryGroups.entries()))
      .join("text")
      .attr("class", "country-label")
      .text(([country]) => country)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", ([country]) => {
        const color = COUNTRY_COLORS[country] || COUNTRY_COLORS.DEFAULT;
        return color;
      })
      .attr("fill-opacity", 0.6)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none");

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
        // Show asymmetric links in orange
        const fwd = d.forward_cost !== undefined ? d.forward_cost : d.cost;
        const rev = d.reverse_cost !== undefined ? d.reverse_cost : fwd;
        if (d.is_asymmetric || (fwd !== rev)) return LINK_COLOR_ASYMMETRIC;
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
      .text(d => {
        const fwd = d.forward_cost !== undefined ? d.forward_cost : d.cost;
        const rev = d.reverse_cost !== undefined ? d.reverse_cost : fwd;
        return fwd !== rev ? `${fwd} → / ← ${rev}` : fwd;
      })
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-weight", "bold")
      .attr("fill", d => {
        if (d.is_modified) return theme === 'dark' ? "#fae8ff" : "#701a75";
        return theme === 'dark' ? "#d1d5db" : "#4b5563";
      })
      .attr("stroke", theme === 'dark' ? "#111827" : "#ffffff")
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
      .attr("fill", theme === 'dark' ? "#9ca3af" : "#6b7280")
      .attr("stroke", theme === 'dark' ? "#111827" : "#ffffff")
      .attr("stroke-width", 2)
      .attr("paint-order", "stroke");

    // Target Interface Text
    interfaceLabelGroup.append("text")
      .text(d => d.target_interface)
      .attr("class", "target-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", theme === 'dark' ? "#9ca3af" : "#6b7280")
      .attr("stroke", theme === 'dark' ? "#111827" : "#ffffff")
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

    // Role indicator (small badge above node)
    node.filter(d => d.role && d.role !== 'unknown')
      .append("rect")
      .attr("x", -12)
      .attr("y", -NODE_RADIUS - 16)
      .attr("width", 24)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("fill", d => getRoleColor(d.role))
      .attr("stroke", theme === 'dark' ? "#1f2937" : "#ffffff")
      .attr("stroke-width", 1)
      .style("pointer-events", "none");

    node.filter(d => d.role && d.role !== 'unknown')
      .append("text")
      .text(d => d.role || '')
      .attr("x", 0)
      .attr("y", -NODE_RADIUS - 7)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .style("pointer-events", "none");

    node.append("text")
      .text(d => d.role && d.role !== 'unknown' ? d.role.substring(0, 2) : d.id.substring(0, 3))
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
      .attr("fill", theme === 'dark' ? "#9ca3af" : "#4b5563")
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

    node.append("title").text(d => {
      let title = `ID: ${d.id}\nHost: ${d.hostname}\nIP: ${d.loopback_ip}`;
      if (d.role && d.role !== 'unknown') title += `\nRole: ${d.role}`;
      if (d.city) title += `\nCity: ${d.city.toUpperCase()}`;
      if (d.site) title += `\nSite: ${d.site.toUpperCase()}`;
      if (d.original_hostname && d.original_hostname !== d.hostname) {
        title += `\nOriginal: ${d.original_hostname}`;
      }
      return title;
    });

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

      // Update cluster hulls
      countryHulls.attr("d", ([country, nodes]) => {
        const hull = computeHull(nodes, 40);
        if (!hull) return "";
        return `M${hull.map(p => p.join(",")).join("L")}Z`;
      });

      // Update country labels (position at centroid of hull)
      countryLabels
        .attr("x", ([country, nodes]) => {
          const xs = nodes.map(n => n.x || 0);
          return xs.reduce((a, b) => a + b, 0) / xs.length;
        })
        .attr("y", ([country, nodes]) => {
          const ys = nodes.map(n => n.y || 0);
          return Math.min(...ys) - 50; // Position above the cluster
        });
    });

    if (svgRef.current) {
      const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6).translate(-width / 2, -height / 2);
      svg.call(zoom.transform, initialTransform);
    }

    return () => { simulation.stop(); };
  }, [data, dimensions, highlightedPath, activeCountries, onNodeSelect, selectedNode, onLinkSelect]);

  const handleZoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        // @ts-ignore
        d3.zoom().on("zoom", (e) => d3.select(svgRef.current).select('g').attr('transform', e.transform)).scaleBy,
        1.2
      );
    }
  }

  const handleZoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(
        // @ts-ignore
        d3.zoom().on("zoom", (e) => d3.select(svgRef.current).select('g').attr('transform', e.transform)).scaleBy,
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
        {activeCountries.length < 4 ? 'Filtered View' : 'Full View'} • {data.nodes.length} Nodes • {data.links.length} Links
      </div>
    </div>
  );
};

export default NetworkGraph;