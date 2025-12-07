import express from 'express';
import { createDevice, getDevicesByUser, deleteDevice, getDeviceById } from './database.js';
import { authSecurityMiddleware } from './securityMiddleware.js';

const router = express.Router();

// Get all devices for the current user
router.get('/', authSecurityMiddleware, (req, res) => {
    try {
        const devices = getDevicesByUser(req.user.userId);
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new device
router.post('/', authSecurityMiddleware, (req, res) => {
    const { name, type, ip_address, protocol, port, username, password } = req.body;
    if (!name || !ip_address) {
        return res.status(400).json({ error: 'Name and IP Address are required' });
    }

    // Basic validation
    if (name.length < 2) return res.status(400).json({ error: 'Name too short' });

    const result = createDevice({
        name,
        type: type || 'router',
        ip_address,
        protocol: protocol || 'ssh',
        port: port || 22,
        username,
        password,
        created_by: req.user.userId
    });

    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, deviceId: result.deviceId });
});

// Delete a device
router.delete('/:id', authSecurityMiddleware, (req, res) => {
    try {
        const device = getDeviceById(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        // Check ownership (only owner or admin can delete)
        if (device.created_by !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        deleteDevice(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PyATS Connect (Mock)
router.post('/:id/connect', authSecurityMiddleware, async (req, res) => {
    try {
        const device = getDeviceById(req.params.id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        console.log(`[PyATS] Connecting to device: ${device.name} (${device.ip_address})`);

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Mock response based on device type
        const mockData = {
            success: true,
            message: `Connected to ${device.name} via ${device.protocol.toUpperCase()}`,
            details: {
                hostname: device.name,
                ip: device.ip_address,
                platform: 'Cisco IOS',
                version: '15.4(3)M2',
                serial: 'FTX12345678',
                uptime: '15 weeks, 2 days, 14 hours, 32 minutes',
                interfaces: [
                    { name: 'GigabitEthernet0/0', status: 'up', ip: device.ip_address },
                    { name: 'GigabitEthernet0/1', status: 'down', ip: 'unassigned' },
                    { name: 'Loopback0', status: 'up', ip: '192.168.255.1' }
                ]
            }
        };

        res.json(mockData);
    } catch (err) {
        console.error('[PyATS] Connect error:', err);
        res.status(500).json({ error: 'Failed to establish connection' });
    }
});

export default router;
