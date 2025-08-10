const mockExecAsync = jest.fn();

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecAsync
}));

import { ClaudeService } from './ClaudeService';

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClaudeService();
  });

  describe('checkConnection', () => {
    it('should return connected status when Claude CLI is available', async () => {
      mockExecAsync.mockResolvedValue({ 
        stdout: 'claude version 1.0.0\n', 
        stderr: '' 
      });

      const result = await service.checkConnection();

      expect(result.connected).toBe(true);
      expect(result.version).toBe('claude version 1.0.0');
      expect(result.message).toBe('Claude CLI is available and ready');
      expect(mockExecAsync).toHaveBeenCalledWith('claude --version', { timeout: 5000 });
    });

    it('should return disconnected status when Claude CLI is not available', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      const result = await service.checkConnection();

      expect(result.connected).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.message).toContain('Claude CLI is not available');
      expect(mockExecAsync).toHaveBeenCalledWith('claude --version', { timeout: 5000 });
    });
  });
});