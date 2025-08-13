import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface Task {
  id: string;
  type: 'feature' | 'issue';
  featureName: string;
  issueNumbers?: number[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

class TaskQueueService extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = [];
  private running: Set<string> = new Set();
  private maxConcurrent = 2;

  /**
   * Add a task to the queue
   */
  addTask(type: Task['type'], featureName: string, issueNumbers?: number[]): string {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      type,
      featureName,
      issueNumbers,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.queue.push(taskId);
    
    this.emit('task:added', task);
    this.processQueue();

    return taskId;
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const taskId = this.queue.shift();
      if (!taskId) continue;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      this.running.add(taskId);
      task.status = 'running';
      task.startedAt = new Date();
      
      this.emit('task:started', task);

      // Process task asynchronously
      this.executeTask(task).catch((error) => {
        console.error(`Task ${taskId} failed:`, error);
      });
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: Task): Promise<void> {
    try {
      // This would integrate with the actual orchestrator
      // For now, just simulate task execution
      await this.simulateTaskExecution(task);

      task.status = 'completed';
      task.completedAt = new Date();
      this.emit('task:completed', task);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('task:failed', task);
    } finally {
      this.running.delete(task.id);
      this.processQueue();
    }
  }

  /**
   * Simulate task execution (placeholder for actual implementation)
   */
  private async simulateTaskExecution(task: Task): Promise<void> {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Emit progress events
    this.emit('task:progress', {
      taskId: task.id,
      message: `Processing ${task.type} for ${task.featureName}`,
    });

    // Simulate more processing
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a feature
   */
  getFeatureTasks(featureName: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      task => task.featureName === featureName
    );
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      // Remove from queue
      const index = this.queue.indexOf(taskId);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      
      task.status = 'failed';
      task.error = 'Task cancelled';
      task.completedAt = new Date();
      
      this.emit('task:cancelled', task);
      return true;
    }

    if (task.status === 'running') {
      // Mark as cancelled (actual cancellation would need orchestrator integration)
      task.status = 'failed';
      task.error = 'Task cancelled';
      task.completedAt = new Date();
      
      this.running.delete(taskId);
      this.emit('task:cancelled', task);
      this.processQueue();
      return true;
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  getStats(): Record<string, number> {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    this.tasks.forEach((task) => {
      stats[task.status]++;
    });

    return stats;
  }

  /**
   * Clear completed and failed tasks older than specified hours
   */
  cleanupOldTasks(hoursOld = 24): number {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let cleaned = 0;

    this.tasks.forEach((task, id) => {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt &&
        task.completedAt < cutoff
      ) {
        this.tasks.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }
}

// Export singleton instance
export const taskQueue = new TaskQueueService();
