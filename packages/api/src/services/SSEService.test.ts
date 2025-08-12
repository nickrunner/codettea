import { SSEService } from './SSEService';
import { Response } from 'express';

describe('SSEService', () => {
  let sseService: SSEService;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    sseService = new SSEService();
    
    mockResponse = {
      writeHead: jest.fn(),
      write: jest.fn(),
      on: jest.fn(),
    };
  });

  describe('addClient', () => {
    it('should add a client and send connection message', () => {
      const clientId = 'test-client-id';
      
      sseService.addClient(clientId, mockResponse as Response, 'test-feature');

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }));

      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: connected'));
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('data: '));
      expect(sseService.getClientCount()).toBe(1);
    });

    it('should handle client disconnect', () => {
      const clientId = 'test-client-id';
      let closeCallback: (() => void) | undefined;
      
      (mockResponse.on as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'close') {
          closeCallback = callback;
        }
      });

      sseService.addClient(clientId, mockResponse as Response);
      expect(sseService.getClientCount()).toBe(1);

      // Simulate disconnect
      if (closeCallback) {
        closeCallback();
      }

      expect(sseService.getClientCount()).toBe(0);
    });
  });

  describe('removeClient', () => {
    it('should remove an existing client', () => {
      const clientId = 'test-client-id';
      
      sseService.addClient(clientId, mockResponse as Response);
      expect(sseService.getClientCount()).toBe(1);

      sseService.removeClient(clientId);
      expect(sseService.getClientCount()).toBe(0);
    });

    it('should handle removing non-existent client', () => {
      expect(() => {
        sseService.removeClient('non-existent');
      }).not.toThrow();
    });
  });

  describe('broadcast', () => {
    it('should send message to all clients', () => {
      const mockResponse1 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };
      const mockResponse2 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };

      sseService.addClient('client-1', mockResponse1 as any);
      sseService.addClient('client-2', mockResponse2 as any);

      // Clear previous writes from connection messages
      (mockResponse1.write as jest.Mock).mockClear();
      (mockResponse2.write as jest.Mock).mockClear();

      sseService.broadcast({
        event: 'test-event',
        data: { message: 'test broadcast' },
      });

      expect(mockResponse1.write).toHaveBeenCalledWith(expect.stringContaining('event: test-event'));
      expect(mockResponse2.write).toHaveBeenCalledWith(expect.stringContaining('event: test-event'));
    });
  });

  describe('sendToFeature', () => {
    it('should send message only to clients watching specific feature', () => {
      const mockResponse1 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };
      const mockResponse2 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };

      sseService.addClient('client-1', mockResponse1 as any, 'feature-1');
      sseService.addClient('client-2', mockResponse2 as any, 'feature-2');

      // Clear previous writes
      (mockResponse1.write as jest.Mock).mockClear();
      (mockResponse2.write as jest.Mock).mockClear();

      sseService.sendToFeature('feature-1', {
        event: 'feature-update',
        data: { message: 'update for feature-1' },
      });

      expect(mockResponse1.write).toHaveBeenCalled();
      expect(mockResponse2.write).not.toHaveBeenCalled();
    });
  });

  describe('sendHeartbeat', () => {
    it('should send heartbeat to all clients', () => {
      const mockResponse1 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };

      sseService.addClient('client-1', mockResponse1 as any);

      // Clear previous writes
      (mockResponse1.write as jest.Mock).mockClear();

      sseService.sendHeartbeat();

      expect(mockResponse1.write).toHaveBeenCalledWith(expect.stringContaining('event: heartbeat'));
    });
  });

  describe('getFeatureClients', () => {
    it('should count clients for a specific feature', () => {
      const mockResponse1 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };
      const mockResponse2 = {
        writeHead: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
      };

      sseService.addClient('client-1', mockResponse1 as any, 'feature-1');
      sseService.addClient('client-2', mockResponse2 as any, 'feature-1');

      expect(sseService.getFeatureClients('feature-1')).toBe(2);
      expect(sseService.getFeatureClients('feature-2')).toBe(0);
    });
  });

  describe('message formatting', () => {
    it('should format SSE message correctly', () => {
      const clientId = 'test-client';
      
      sseService.addClient(clientId, mockResponse as Response);
      (mockResponse.write as jest.Mock).mockClear();

      sseService.broadcast({
        event: 'custom-event',
        data: { key: 'value' },
        retry: 5000,
      });

      const writeCalls = (mockResponse.write as jest.Mock).mock.calls;
      const message = writeCalls[0][0];

      expect(message).toContain('event: custom-event');
      expect(message).toContain('id: ');
      expect(message).toContain('retry: 5000');
      expect(message).toContain('data: {"key":"value"}');
      expect(message).toMatch(/\n\n$/); // Should end with double newline
    });

    it('should handle multiline data correctly', () => {
      const clientId = 'test-client';
      
      sseService.addClient(clientId, mockResponse as Response);
      (mockResponse.write as jest.Mock).mockClear();

      sseService.broadcast({
        data: 'line1\nline2\nline3',
      });

      const message = (mockResponse.write as jest.Mock).mock.calls[0][0];
      
      expect(message).toContain('data: line1\ndata: line2\ndata: line3');
    });
  });
});