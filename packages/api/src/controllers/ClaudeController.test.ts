import { ClaudeController } from './ClaudeController';
import { ClaudeService } from '../services/ClaudeService';

jest.mock('../services/ClaudeService');

describe('ClaudeController', () => {
  let controller: ClaudeController;
  let mockClaudeService: jest.Mocked<ClaudeService>;

  beforeEach(() => {
    controller = new ClaudeController();
    mockClaudeService = (controller as any).claudeService;
  });

  describe('getClaudeStatus', () => {
    it('should return connected status when Claude is available', async () => {
      mockClaudeService.checkConnection.mockResolvedValue({
        connected: true,
        version: '1.0.0',
        message: 'Claude CLI is available'
      });

      const result = await controller.getClaudeStatus();

      expect(result.connected).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.message).toBe('Claude CLI is available');
      expect(result.lastChecked).toBeDefined();
    });

    it('should return disconnected status when Claude is not available', async () => {
      mockClaudeService.checkConnection.mockResolvedValue({
        connected: false,
        message: 'Claude CLI not found'
      });

      const result = await controller.getClaudeStatus();

      expect(result.connected).toBe(false);
      expect(result.message).toBe('Claude CLI not found');
      expect(result.lastChecked).toBeDefined();
    });
  });
});