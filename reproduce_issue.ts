
import { parsePyATSData } from './netviz-pro/utils/parser';
import { findShortestPathCost } from './netviz-pro/utils/graphAlgorithms';
import { NetworkLink, NetworkNode } from './netviz-pro/types';

// Mock Data imitating what parsePyATSData receives
// We simulate two devices: RouterA and RouterB.
// RouterA sees RouterB on interface Eth1/1 with cost 10.
// RouterB sees RouterA on interface Eth1/1 with cost 20.

const mockRawData = {
  files: [
    {
      filename: 'RouterA.txt',
      content: `
hostname RouterA
interface Loopback0
 ip address 1.1.1.1 255.255.255.255
!
interface Ethernet1/1
 ip ospf cost 10
!
-------------------------
Device ID: RouterB
Interface: Ethernet1/1,  Port ID (outgoing port): Ethernet1/1
      `
    },
    {
      filename: 'RouterB.txt',
      content: `
hostname RouterB
interface Loopback0
 ip address 2.2.2.2 255.255.255.255
!
interface Ethernet1/1
 ip ospf cost 20
!
-------------------------
Device ID: RouterA
Interface: Ethernet1/1,  Port ID (outgoing port): Ethernet1/1
      `
    }
  ]
};

console.log("--- Starting Reproduction ---");

const networkData = parsePyATSData(mockRawData);
const routerA = networkData.nodes.find(n => n.id === 'routera');
const routerB = networkData.nodes.find(n => n.id === 'routerb');

if (!routerA || !routerB) {
    console.error("Failed to parse nodes");
    process.exit(1);
}

console.log("Parsed Links:");
networkData.links.forEach(l => {
    console.log(`Source: ${l.source}, Target: ${l.target}, Cost: ${l.cost}`);
});

// We expect two links or one link with asymmetric costs.
// Current implementation likely produces one link with the cost of the first parsed file.

const costAtoB = findShortestPathCost(networkData.nodes, networkData.links, 'routera', 'routerb');
const costBtoA = findShortestPathCost(networkData.nodes, networkData.links, 'routerb', 'routera');

console.log(`\nPath Cost A -> B: ${costAtoB}`);
console.log(`Path Cost B -> A: ${costBtoA}`);

if (costAtoB === costBtoA && costAtoB !== 0) {
    console.log("\n[CRITICAL FINDING] Costs are symmetric!");
    if (costAtoB === 10) {
         console.log("The system ignored RouterB's cost (20). Traffic engineering is broken.");
    } else if (costAtoB === 20) {
         console.log("The system ignored RouterA's cost (10). Traffic engineering is broken.");
    }
} else {
    console.log("\nCosts are asymmetric. System is working correctly.");
}
