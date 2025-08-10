import { ClaudeService } from './ClaudeService';
import { exec } from 'child_process';

jest.mock('child_process');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn((fn) => fn)
}));

describe('ClaudeService', () => {
  let service: ClaudeService;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    service = new ClaudeService();
    mockExec = exec as jest.MockedFunction<typeof exec>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkConnection', () => {
    it('should return connected status when Claude CLI is available', async () => {
      mockExec.mockImplementation((_cmd, options, callback: any) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(null, { stdout: 'claude version 1.0.0\n', stderr: '' });
        return {} as any;
      });

      const result = await service.checkConnection();

      expect(result.connected).toBe(true);
      expect(result.version).toBe('claude version 1.0.0');
      expect(result.message).toBe('Claude CLI is available and ready');
    });

    it('should return disconnected status when Claude CLI is not available', async () => {
      mockExec.mockImplementation((_cmd, options, callback: any) => {
        if (typeof options === 'function') {
          callback = options;
        }
        callback(new Error('Command not found'));
        return {} as any;
      });

      const result = await service.checkConnection();

      expect(result.connected).toBe(false);
      expect(result.version).toBeUndefined();
      expect(result.message).toContain('Claude CLI is not available');
    });
  });
});