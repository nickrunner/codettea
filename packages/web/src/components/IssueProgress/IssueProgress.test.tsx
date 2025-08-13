import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IssueProgress } from './IssueProgress';
import { Issue } from '@/types/api';
import '@testing-library/jest-dom';

describe('IssueProgress', () => {
  const mockIssues: Issue[] = [
    {
      number: 1,
      title: 'First issue',
      status: 'open',
      assignee: 'developer1',
      labels: ['enhancement', 'frontend'],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
    },
    {
      number: 2,
      title: 'Second issue',
      status: 'in_progress',
      assignee: 'developer2',
      labels: ['bug', 'backend'],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
    },
    {
      number: 3,
      title: 'Third issue',
      status: 'closed',
      labels: ['documentation'],
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-04T10:00:00Z',
    },
  ];

  const mockOnIssueClick = jest.fn();
  const mockOnWorkOnIssue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<IssueProgress issues={[]} loading={true} />);
    expect(screen.getByText('Loading issues...')).toBeInTheDocument();
  });

  it('renders loading state with feature name', () => {
    render(<IssueProgress issues={[]} featureName="test-feature" loading={true} />);
    expect(screen.getByText('Issues - test-feature')).toBeInTheDocument();
    expect(screen.getByText('Loading issues...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = 'Failed to load issues';
    render(<IssueProgress issues={[]} error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  it('renders empty state', () => {
    render(<IssueProgress issues={[]} />);
    expect(screen.getByText('No issues found for this feature')).toBeInTheDocument();
  });

  it('renders issue list with progress statistics', () => {
    render(<IssueProgress issues={mockIssues} />);
    
    // Check progress statistics
    expect(screen.getByText('Progress: 1 of 3 completed')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    
    // Check status counts
    expect(screen.getByText('1 Completed')).toBeInTheDocument();
    expect(screen.getByText('1 In Progress')).toBeInTheDocument();
    expect(screen.getByText('1 Open')).toBeInTheDocument();
    
    // Check issues are rendered
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('First issue')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Second issue')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Third issue')).toBeInTheDocument();
  });

  it('renders progress bar with correct width', () => {
    render(<IssueProgress issues={mockIssues} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveStyle({ width: '33%' });
  });

  it('displays feature name in header', () => {
    render(<IssueProgress issues={mockIssues} featureName="awesome-feature" />);
    expect(screen.getByText('Issues - awesome-feature')).toBeInTheDocument();
  });

  it('renders issue labels', () => {
    render(<IssueProgress issues={mockIssues} />);
    
    expect(screen.getByText('enhancement')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('backend')).toBeInTheDocument();
    expect(screen.getByText('documentation')).toBeInTheDocument();
  });

  it('renders assignee information', () => {
    render(<IssueProgress issues={mockIssues} />);
    
    expect(screen.getByText('👤 developer1')).toBeInTheDocument();
    expect(screen.getByText('👤 developer2')).toBeInTheDocument();
  });

  it('calls onIssueClick when issue is clicked', () => {
    render(
      <IssueProgress 
        issues={mockIssues} 
        onIssueClick={mockOnIssueClick}
      />
    );
    
    fireEvent.click(screen.getByText('First issue'));
    expect(mockOnIssueClick).toHaveBeenCalledWith(1);
    
    fireEvent.click(screen.getByText('Second issue'));
    expect(mockOnIssueClick).toHaveBeenCalledWith(2);
  });

  it('shows Work button on hover for open issues', async () => {
    render(
      <IssueProgress 
        issues={mockIssues} 
        onWorkOnIssue={mockOnWorkOnIssue}
      />
    );
    
    const firstIssue = screen.getByText('First issue').closest('[role="button"]');
    
    if (firstIssue) {
      // Initially button should not be visible
      expect(screen.queryByText('▶️ Work')).not.toBeInTheDocument();
      
      // Hover over the issue
      fireEvent.mouseEnter(firstIssue);
      
      // Button should now be visible
      await waitFor(() => {
        expect(screen.getByText('▶️ Work')).toBeInTheDocument();
      });
      
      // Click the work button
      const workButton = screen.getByTitle('Work on this issue');
      fireEvent.click(workButton);
      
      expect(mockOnWorkOnIssue).toHaveBeenCalledWith(1);
    }
  });

  it('does not show Work button for closed issues', () => {
    render(
      <IssueProgress 
        issues={mockIssues} 
        onWorkOnIssue={mockOnWorkOnIssue}
      />
    );
    
    const closedIssue = screen.getByText('Third issue').closest('[role="button"]');
    
    if (closedIssue) {
      fireEvent.mouseEnter(closedIssue);
      
      // Work button should not appear for closed issues
      expect(screen.queryByTitle('Work on this issue')).not.toBeInTheDocument();
    }
  });

  it('shows loading indicator for issues being worked on', async () => {
    const workingOnIssues = new Set([1]);
    
    render(
      <IssueProgress 
        issues={mockIssues} 
        onWorkOnIssue={mockOnWorkOnIssue}
        workingOnIssues={workingOnIssues}
      />
    );
    
    const firstIssue = screen.getByText('First issue').closest('[role="button"]');
    
    if (firstIssue) {
      fireEvent.mouseEnter(firstIssue);
      
      await waitFor(() => {
        const workButton = screen.getByTitle('Work on this issue');
        expect(workButton).toBeDisabled();
        expect(workButton).toHaveTextContent('⏳ Work');
      });
    }
  });

  it('applies working class to issues being worked on', () => {
    const workingOnIssues = new Set([2]);
    
    const { container } = render(
      <IssueProgress 
        issues={mockIssues} 
        workingOnIssues={workingOnIssues}
      />
    );
    
    const workingItems = container.querySelectorAll('.working');
    expect(workingItems).toHaveLength(1);
    expect(workingItems[0]).toHaveTextContent('Second issue');
  });

  it('supports keyboard navigation', () => {
    render(
      <IssueProgress 
        issues={mockIssues} 
        onIssueClick={mockOnIssueClick}
      />
    );
    
    const firstIssue = screen.getByText('First issue').closest('[role="button"]');
    
    if (firstIssue) {
      fireEvent.keyDown(firstIssue, { key: 'Enter' });
      expect(mockOnIssueClick).toHaveBeenCalledWith(1);
      
      mockOnIssueClick.mockClear();
      
      fireEvent.keyDown(firstIssue, { key: ' ' });
      expect(mockOnIssueClick).toHaveBeenCalledWith(1);
    }
  });

  it('prevents event propagation when Work button is clicked', async () => {
    render(
      <IssueProgress 
        issues={mockIssues} 
        onIssueClick={mockOnIssueClick}
        onWorkOnIssue={mockOnWorkOnIssue}
      />
    );
    
    const firstIssue = screen.getByText('First issue').closest('[role="button"]');
    
    if (firstIssue) {
      fireEvent.mouseEnter(firstIssue);
      
      await waitFor(() => {
        const workButton = screen.getByTitle('Work on this issue');
        fireEvent.click(workButton);
        
        // Work button click should not trigger issue click
        expect(mockOnWorkOnIssue).toHaveBeenCalledWith(1);
        expect(mockOnIssueClick).not.toHaveBeenCalled();
      });
    }
  });

  it('displays correct status icons', () => {
    render(<IssueProgress issues={mockIssues} />);
    
    // Check for status icons in the issue list
    const issueItems = screen.getAllByRole('button');
    
    // First issue (open) should have ⭕
    expect(issueItems[0]).toHaveTextContent('⭕');
    
    // Second issue (in_progress) should have 🔄
    expect(issueItems[1]).toHaveTextContent('🔄');
    
    // Third issue (closed) should have ✅
    expect(issueItems[2]).toHaveTextContent('✅');
  });

  it('calculates progress correctly with no issues', () => {
    render(<IssueProgress issues={[]} />);
    
    // Should show empty state instead of progress
    expect(screen.queryByText(/Progress:/)).not.toBeInTheDocument();
    expect(screen.getByText('No issues found for this feature')).toBeInTheDocument();
  });

  it('calculates progress correctly with all completed issues', () => {
    const allCompleted: Issue[] = [
      { ...mockIssues[0], status: 'closed' },
      { ...mockIssues[1], status: 'closed' },
      { ...mockIssues[2], status: 'closed' },
    ];
    
    render(<IssueProgress issues={allCompleted} />);
    
    expect(screen.getByText('Progress: 3 of 3 completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });
});