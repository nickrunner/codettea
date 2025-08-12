import { TaskQueueService } from './TaskQueueService';

describe('TaskQueueService', () => {
  let taskQueue: TaskQueueService;
  let mockExecutor: jest.Mock;

  beforeEach(() => {
    taskQueue = new TaskQueueService(2);
    mockExecutor = jest.fn();
    taskQueue.setExecutor(mockExecutor);
  });

  describe('addTask', () => {
    it('should add a task to the queue and return an ID', async () => {
      const taskId = await taskQueue.addTask('test-feature', 'execute', {
        architectureMode: true,
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    });

    it('should process tasks immediately if under max concurrent', async () => {
      mockExecutor.mockResolvedValue(undefined);

      await taskQueue.addTask('test-feature', 'execute', {});

      // Give it time to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should queue tasks when at max concurrent', async () => {
      // Make the executor wait
      mockExecutor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      // Add tasks up to max concurrent
      await taskQueue.addTask('feature-1', 'execute', {});
      await taskQueue.addTask('feature-2', 'execute', {});
      await taskQueue.addTask('feature-3', 'execute', {}); // This should be queued

      await new Promise(resolve => setTimeout(resolve, 50));

      // Only 2 should be running
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTask', () => {
    it('should retrieve a queued task', async () => {
      const taskId = await taskQueue.addTask('test-feature', 'execute', {});
      const task = taskQueue.getTask(taskId);

      expect(task).toBeDefined();
      expect(task?.featureName).toBe('test-feature');
      expect(task?.type).toBe('execute');
    });

    it('should return undefined for non-existent task', () => {
      const task = taskQueue.getTask('non-existent-id');
      expect(task).toBeUndefined();
    });
  });

  describe('getFeatureTasks', () => {
    it('should return all tasks for a feature', async () => {
      await taskQueue.addTask('feature-1', 'execute', {});
      await taskQueue.addTask('feature-1', 'work-issue', { issueNumber: 1 });
      await taskQueue.addTask('feature-2', 'execute', {});

      const feature1Tasks = taskQueue.getFeatureTasks('feature-1');
      const feature2Tasks = taskQueue.getFeatureTasks('feature-2');

      expect(feature1Tasks).toHaveLength(2);
      expect(feature2Tasks).toHaveLength(1);
    });

    it('should return empty array for feature with no tasks', () => {
      const tasks = taskQueue.getFeatureTasks('no-tasks');
      expect(tasks).toEqual([]);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a queued task', async () => {
      // Add multiple tasks so one stays in queue
      mockExecutor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      
      await taskQueue.addTask('feature-1', 'execute', {});
      await taskQueue.addTask('feature-2', 'execute', {});
      const taskId = await taskQueue.addTask('feature-3', 'execute', {});

      // Cancel the queued task
      const cancelled = taskQueue.cancelTask(taskId);
      
      expect(cancelled).toBe(true);
      
      const task = taskQueue.getTask(taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error).toContain('cancelled');
    });

    it('should not cancel a running task', async () => {
      mockExecutor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      
      const taskId = await taskQueue.addTask('feature-1', 'execute', {});
      
      // Wait for it to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const cancelled = taskQueue.cancelTask(taskId);
      expect(cancelled).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockExecutor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      await taskQueue.addTask('feature-1', 'execute', {});
      await taskQueue.addTask('feature-2', 'execute', {});
      await taskQueue.addTask('feature-3', 'execute', {});
      
      // Wait for tasks to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const stats = taskQueue.getStats();
      
      expect(stats.queued).toBe(1); // One should be queued
      expect(stats.running).toBe(2); // Two should be running
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('task retry', () => {
    it('should retry failed tasks up to max retries', async () => {
      let attempts = 0;
      mockExecutor.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Task failed');
        }
      });

      await taskQueue.addTask('test-feature', 'execute', {});

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(mockExecutor).toHaveBeenCalledTimes(3);
    });

    it('should mark task as failed after max retries', async () => {
      mockExecutor.mockRejectedValue(new Error('Always fails'));

      const taskId = await taskQueue.addTask('test-feature', 'execute', {});

      // Wait for all retries
      await new Promise(resolve => setTimeout(resolve, 400));

      const task = taskQueue.getTask(taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error).toContain('Always fails');
    });
  });

  describe('clearOldTasks', () => {
    it('should clear completed tasks older than specified duration', async () => {
      mockExecutor.mockResolvedValue(undefined);

      const taskId = await taskQueue.addTask('test-feature', 'execute', {});

      // Wait for task to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Task should be completed
      expect(taskQueue.getTask(taskId)?.status).toBe('completed');

      // Clear old tasks with 0ms age (clear all)
      taskQueue.clearOldTasks(0);

      // Task should be gone
      expect(taskQueue.getTask(taskId)).toBeUndefined();
    });
  });
});