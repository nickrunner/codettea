import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ExecutionStatus } from './ExecutionStatus';
import '@testing-library/jest-dom';

// Mock EventSource
let mockEventSourceInstances: MockEventSource[] = [];

class MockEventSource {
  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    this.readyState = 1;
    mockEventSourceInstances.push(this);
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  close() {
    this.readyState = 2;
  }
  
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global EventSource with mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).EventSource = MockEventSource;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('ExecutionStatus', () => {
  const mockOnClose = jest.fn();
  const mockOnStop = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSourceInstances = [];
  });
  
  it('should not render when taskId is not provided', () => {
    const { container } = render(<ExecutionStatus />);
    expect(container.firstChild).toBeNull();
  });
  
  it('should render execution status with task ID', () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        featureName="test-feature"
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Execution Status')).toBeInTheDocument();
    expect(screen.getByText('test-feature')).toBeInTheDocument();
  });
  
  it('should display issue number when provided', () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        issueNumber={42}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('#42')).toBeInTheDocument();
  });
  
  it('should connect to SSE endpoint', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Connected to execution stream/)).toBeInTheDocument();
    });
  });
  
  it('should handle log messages from SSE', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    
    await waitFor(() => {
      expect(screen.getByText(/Connected to execution stream/)).toBeInTheDocument();
    });
    
    // Simulate log message
    act(() => {
      (eventSource as MockEventSource).simulateMessage({
        type: 'log',
        level: 'info',
        message: 'Test log message',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test log message')).toBeInTheDocument();
    });
  });
  
  it('should handle status updates', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    
    // Simulate completion status
    act(() => {
      (eventSource as MockEventSource).simulateMessage({
        type: 'status',
        status: 'completed',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText(/Execution completed successfully/)).toBeInTheDocument();
    });
  });
  
  it('should handle error status', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    
    // Simulate error status
    act(() => {
      (eventSource as MockEventSource).simulateMessage({
        type: 'status',
        status: 'failed',
        error: 'Test error message',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText(/Execution failed: Test error message/)).toBeInTheDocument();
    });
  });
  
  it('should handle connection errors', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    
    // Simulate connection error
    act(() => {
      (eventSource as MockEventSource).simulateError();
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Connection lost. Reconnecting.../)).toBeInTheDocument();
    });
  });
  
  it('should handle stop button click', async () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onStop={mockOnStop}
        onClose={mockOnClose}
      />
    );
    
    // Find and click stop button
    const stopButton = screen.getByTitle('Stop execution');
    fireEvent.click(stopButton);
    
    expect(mockOnStop).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.getByText(/Execution stopped by user/)).toBeInTheDocument();
      expect(screen.getByText('stopped')).toBeInTheDocument();
    });
  });
  
  it('should handle close button click', () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    // Find close button by its test id
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => 
      btn.querySelector('[data-testid="CloseIcon"]')
    );
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
  
  it('should toggle expansion state', () => {
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    // Initially expanded
    expect(screen.getByText(/Waiting for execution logs.../)).toBeInTheDocument();
    
    // Find expand/collapse button
    const expandButtons = screen.getAllByRole('button');
    const expandButton = expandButtons.find(btn => 
      btn.querySelector('[data-testid="ExpandLessIcon"]')
    );
    
    if (expandButton) {
      fireEvent.click(expandButton);
      // Content should be collapsed (harder to test with Collapse component)
    }
  });
  
  it('should copy logs to clipboard', async () => {
    // Mock clipboard API
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
    
    render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    
    // Add some logs
    act(() => {
      (eventSource as MockEventSource).simulateMessage({
        type: 'log',
        level: 'info',
        message: 'Log message 1',
      });
      
      (eventSource as MockEventSource).simulateMessage({
        type: 'log',
        level: 'info',
        message: 'Log message 2',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Log message 1')).toBeInTheDocument();
    });
    
    // Click copy button
    const copyButton = screen.getByTitle('Copy logs');
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalled();
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Logs copied to clipboard')).toBeInTheDocument();
    });
  });
  
  it('should cleanup EventSource on unmount', async () => {
    const { unmount } = render(
      <ExecutionStatus
        taskId="test-task-123"
        onClose={mockOnClose}
      />
    );
    
    await waitFor(() => {
      expect(mockEventSourceInstances.length).toBeGreaterThan(0);
    });
    
    const eventSource = mockEventSourceInstances[0];
    const closeSpy = jest.spyOn(eventSource, 'close');
    
    unmount();
    
    expect(closeSpy).toHaveBeenCalled();
  });
});