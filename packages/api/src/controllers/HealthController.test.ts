import { HealthController } from './HealthController';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('getHealth', () => {
    it('should return healthy status', async () => {
      const result = await controller.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.version).toBeDefined();
    });

    it('should return valid timestamp', async () => {
      const result = await controller.getHealth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});