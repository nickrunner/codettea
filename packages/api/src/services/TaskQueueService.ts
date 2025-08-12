import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface QueuedTask {
  id: string;
  featureName: string;
  type: 'execute' | 'work-issue';
  payload: Record<string, unknown>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retries: number;
}

export interface TaskExecutor {
  (task: QueuedTask): Promise<void>;
}

export class TaskQueueService extends EventEmitter {
  private queue: QueuedTask[] = [];
  private running: Map<string, QueuedTask> = new Map();
  private completed: Map<string, QueuedTask> = new Map();
  private maxConcurrent: number;
  private maxRetries: number = 3;
  private taskExecutor?: TaskExecutor;

  constructor(maxConcurrent: number = 2) {
    super();
    this.maxConcurrent = maxConcurrent;
    logger.info(`TaskQueueService initialized with max concurrent tasks: ${maxConcurrent}`);
  }

  /**
   * Set the task executor function
   */
  public setExecutor(executor: TaskExecutor): void {
    this.taskExecutor = executor;
  }

  /**
   * Add a task to the queue
   */
  public async addTask(
    featureName: string,
    type: 'execute' | 'work-issue',
    payload: Record<string, unknown>
  ): Promise<string> {
    const task: QueuedTask = {
      id: uuidv4(),
      featureName,
      type,
      payload,
      status: 'queued',
      createdAt: new Date(),
      retries: 0,
    };

    this.queue.push(task);
    logger.info(`Task ${task.id} added to queue for feature ${featureName}`);
    
    // Emit event for real-time updates
    this.emit('task:queued', task);

    // Process queue
    this.processQueue();

    return task.id;
  }

  /**
   * Get task status by ID
   */
  public getTask(taskId: string): QueuedTask | undefined {
    // Check running tasks
    const runningTask = this.running.get(taskId);
    if (runningTask) return runningTask;

    // Check completed tasks
    const completedTask = this.completed.get(taskId);
    if (completedTask) return completedTask;

    // Check queue
    return this.queue.find(task => task.id === taskId);
  }

  /**
   * Get all tasks for a feature
   */
  public getFeatureTasks(featureName: string): QueuedTask[] {
    const tasks: QueuedTask[] = [];

    // Add queued tasks
    tasks.push(...this.queue.filter(task => task.featureName === featureName));

    // Add running tasks
    this.running.forEach(task => {
      if (task.featureName === featureName) {
        tasks.push(task);
      }
    });

    // Add completed tasks
    this.completed.forEach(task => {
      if (task.featureName === featureName) {
        tasks.push(task);
      }
    });

    return tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Cancel a task
   */
  public cancelTask(taskId: string): boolean {
    // Remove from queue if present
    const queueIndex = this.queue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      task.status = 'failed';
      task.error = 'Task cancelled by user';
      task.completedAt = new Date();
      this.completed.set(task.id, task);
      
      this.emit('task:cancelled', task);
      logger.info(`Task ${taskId} cancelled`);
      return true;
    }

    // Cannot cancel running or completed tasks
    return false;
  }

  /**
   * Clear completed tasks older than specified duration
   */
  public clearOldTasks(maxAgeMs: number = 3600000): void { // Default: 1 hour
    const now = Date.now();
    const oldTaskIds: string[] = [];

    this.completed.forEach((task, id) => {
      if (task.completedAt && (now - task.completedAt.getTime()) > maxAgeMs) {
        oldTaskIds.push(id);
      }
    });

    oldTaskIds.forEach(id => this.completed.delete(id));
    
    if (oldTaskIds.length > 0) {
      logger.info(`Cleared ${oldTaskIds.length} old completed tasks`);
    }
  }

  /**
   * Process the queue and run tasks if possible
   */
  private async processQueue(): Promise<void> {
    // Check if we can run more tasks
    if (this.running.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Get next task from queue
    const task = this.queue.shift();
    if (!task) return;

    // Mark as running
    task.status = 'running';
    task.startedAt = new Date();
    this.running.set(task.id, task);
    
    logger.info(`Starting task ${task.id} for feature ${task.featureName}`);
    this.emit('task:started', task);

    // Execute task
    try {
      if (!this.taskExecutor) {
        throw new Error('Task executor not configured');
      }

      await this.taskExecutor(task);

      // Mark as completed
      task.status = 'completed';
      task.completedAt = new Date();
      this.running.delete(task.id);
      this.completed.set(task.id, task);
      
      logger.info(`Task ${task.id} completed successfully`);
      this.emit('task:completed', task);
    } catch (error) {
      // Handle failure
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.retries++;

      if (task.retries < this.maxRetries) {
        // Retry the task
        task.status = 'queued';
        delete task.startedAt;
        this.running.delete(task.id);
        this.queue.push(task);
        
        logger.warn(`Task ${task.id} failed, retrying (attempt ${task.retries}/${this.maxRetries})`);
        this.emit('task:retry', task);
      } else {
        // Mark as failed
        task.status = 'failed';
        task.completedAt = new Date();
        this.running.delete(task.id);
        this.completed.set(task.id, task);
        
        logger.error(`Task ${task.id} failed after ${this.maxRetries} attempts: ${task.error}`);
        this.emit('task:failed', task);
      }
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const stats = {
      queued: this.queue.length,
      running: this.running.size,
      completed: 0,
      failed: 0,
    };

    this.completed.forEach(task => {
      if (task.status === 'completed') {
        stats.completed++;
      } else if (task.status === 'failed') {
        stats.failed++;
      }
    });

    return stats;
  }
}

// Singleton instance
export const taskQueue = new TaskQueueService(
  parseInt(process.env.MAX_CONCURRENT_TASKS || '2')
);