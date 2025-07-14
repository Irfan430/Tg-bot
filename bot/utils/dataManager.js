/**
 * Data Manager - Handles JSON file operations for users and logs
 */

const fs = require('fs').promises;
const path = require('path');

class DataManager {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
        this.usersFile = path.join(this.dataPath, 'users.json');
        this.logsFile = path.join(this.dataPath, 'logs.json');
    }

    async initializeData() {
        try {
            // Ensure data directory exists
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // Initialize users.json
            await this.initializeUsersFile();
            
            // Initialize logs.json
            await this.initializeLogsFile();
            
            console.log('✓ Data files initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize data files:', error);
            throw error;
        }
    }

    async initializeUsersFile() {
        try {
            await fs.access(this.usersFile);
        } catch (error) {
            // File doesn't exist, create it
            const initialData = {
                users: {},
                stats: {
                    totalUsers: 0,
                    premiumUsers: 0,
                    lastUpdated: new Date().toISOString()
                }
            };
            await fs.writeFile(this.usersFile, JSON.stringify(initialData, null, 2));
        }
    }

    async initializeLogsFile() {
        try {
            await fs.access(this.logsFile);
        } catch (error) {
            // File doesn't exist, create it
            const initialData = {
                logs: [],
                stats: {
                    totalCommands: 0,
                    commandStats: {},
                    lastUpdated: new Date().toISOString()
                }
            };
            await fs.writeFile(this.logsFile, JSON.stringify(initialData, null, 2));
        }
    }

    async readJSON(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Failed to read ${filePath}:`, error);
            return null;
        }
    }

    async writeJSON(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Failed to write ${filePath}:`, error);
            return false;
        }
    }

    // User Management
    async getUser(userId) {
        const data = await this.readJSON(this.usersFile);
        if (!data || !data.users) return null;
        
        return data.users[userId] || null;
    }

    async saveUser(userId, userData) {
        const data = await this.readJSON(this.usersFile);
        if (!data) return false;

        if (!data.users[userId]) {
            data.stats.totalUsers++;
            if (userData.isPremium) {
                data.stats.premiumUsers++;
            }
        } else {
            // Update premium count if status changed
            const oldUser = data.users[userId];
            if (oldUser.isPremium !== userData.isPremium) {
                if (userData.isPremium) {
                    data.stats.premiumUsers++;
                } else {
                    data.stats.premiumUsers--;
                }
            }
        }

        data.users[userId] = {
            ...userData,
            lastSeen: new Date().toISOString()
        };
        data.stats.lastUpdated = new Date().toISOString();

        return await this.writeJSON(this.usersFile, data);
    }

    async getAllUsers() {
        const data = await this.readJSON(this.usersFile);
        return data ? data.users : {};
    }

    async getUserStats() {
        const data = await this.readJSON(this.usersFile);
        return data ? data.stats : null;
    }

    // Premium Management
    async setPremiumStatus(userId, isPremium) {
        const user = await this.getUser(userId);
        if (!user) return false;

        user.isPremium = isPremium;
        user.premiumUpdated = new Date().toISOString();
        
        return await this.saveUser(userId, user);
    }

    async isPremiumUser(userId) {
        const user = await this.getUser(userId);
        return user ? user.isPremium === true : false;
    }

    // Logging
    async logCommand(userId, command, metadata = {}) {
        const data = await this.readJSON(this.logsFile);
        if (!data) return false;

        const logEntry = {
            userId,
            command,
            timestamp: new Date().toISOString(),
            metadata
        };

        data.logs.push(logEntry);
        data.stats.totalCommands++;
        
        // Update command stats
        const commandName = command.split(' ')[0];
        if (!data.stats.commandStats[commandName]) {
            data.stats.commandStats[commandName] = 0;
        }
        data.stats.commandStats[commandName]++;
        
        data.stats.lastUpdated = new Date().toISOString();

        // Keep only last 10000 logs to prevent file from growing too large
        if (data.logs.length > 10000) {
            data.logs = data.logs.slice(-10000);
        }

        return await this.writeJSON(this.logsFile, data);
    }

    async getCommandStats() {
        const data = await this.readJSON(this.logsFile);
        return data ? data.stats : null;
    }

    async getUserLogs(userId, limit = 100) {
        const data = await this.readJSON(this.logsFile);
        if (!data) return [];

        return data.logs
            .filter(log => log.userId === userId)
            .slice(-limit)
            .reverse();
    }

    // Download tracking
    async incrementDownloadCount(userId) {
        const user = await this.getUser(userId);
        if (!user) return false;

        if (!user.downloadCount) {
            user.downloadCount = 0;
        }
        user.downloadCount++;
        user.lastDownload = new Date().toISOString();

        return await this.saveUser(userId, user);
    }

    async getDownloadCount(userId) {
        const user = await this.getUser(userId);
        return user ? (user.downloadCount || 0) : 0;
    }

    async canDownload(userId) {
        const user = await this.getUser(userId);
        if (!user) return false;

        const downloadCount = user.downloadCount || 0;
        const limit = user.isPremium ? 
            parseInt(process.env.PREMIUM_DOWNLOAD_LIMIT) || 50 : 
            parseInt(process.env.FREE_DOWNLOAD_LIMIT) || 5;

        return downloadCount < limit;
    }
}

const dataManager = new DataManager();

module.exports = {
    initializeData: () => dataManager.initializeData(),
    getUser: (userId) => dataManager.getUser(userId),
    saveUser: (userId, userData) => dataManager.saveUser(userId, userData),
    getAllUsers: () => dataManager.getAllUsers(),
    getUserStats: () => dataManager.getUserStats(),
    setPremiumStatus: (userId, isPremium) => dataManager.setPremiumStatus(userId, isPremium),
    isPremiumUser: (userId) => dataManager.isPremiumUser(userId),
    logCommand: (userId, command, metadata) => dataManager.logCommand(userId, command, metadata),
    getCommandStats: () => dataManager.getCommandStats(),
    getUserLogs: (userId, limit) => dataManager.getUserLogs(userId, limit),
    incrementDownloadCount: (userId) => dataManager.incrementDownloadCount(userId),
    getDownloadCount: (userId) => dataManager.getDownloadCount(userId),
    canDownload: (userId) => dataManager.canDownload(userId)
};