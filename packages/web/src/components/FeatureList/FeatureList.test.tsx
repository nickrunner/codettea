import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureList } from './FeatureList';
import { Feature } from '@/types/api';
import '@testing-library/jest-dom';

describe('FeatureList', () => {
  const mockFeatures: Feature[] = [
    {
      name: 'feature-1',
      description: 'First feature',
      status: 'planning',
      branch: 'feature/feature-1',
      worktreePath: '/path/to/worktree',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
    },
    {
      name: 'feature-2',
      description: 'Second feature',
      status: 'in_progress',
      branch: 'feature/feature-2',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-03T10:00:00Z',
    },
    {
      name: 'feature-3',
      description: 'Third feature',
      status: 'completed',
      branch: 'feature/feature-3',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-04T10:00:00Z',
    },
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<FeatureList features={[]} loading={true} />);
    expect(screen.getByText('Loading features...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = 'Failed to load features';
    render(<FeatureList features={[]} error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  it('renders empty state', () => {
    render(<FeatureList features={[]} />);
    expect(screen.getByText('No features yet')).toBeInTheDocument();
  });

  it('renders empty state with create button', () => {
    const mockOnCreateFeature = jest.fn();
    render(<FeatureList features={[]} onCreateFeature={mockOnCreateFeature} />);
    
    const createButton = screen.getByText('Create your first feature');
    fireEvent.click(createButton);
    
    expect(mockOnCreateFeature).toHaveBeenCalledTimes(1);
  });

  it('renders feature list', () => {
    render(<FeatureList features={mockFeatures} />);
    
    expect(screen.getByText('feature-1')).toBeInTheDocument();
    expect(screen.getByText('First feature')).toBeInTheDocument();
    expect(screen.getByText('planning')).toBeInTheDocument();
    
    expect(screen.getByText('feature-2')).toBeInTheDocument();
    expect(screen.getByText('Second feature')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
    
    expect(screen.getByText('feature-3')).toBeInTheDocument();
    expect(screen.getByText('Third feature')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('highlights selected feature', () => {
    const { container } = render(
      <FeatureList features={mockFeatures} selectedFeature="feature-1" />
    );
    
    const selectedItems = container.querySelectorAll('.selected');
    expect(selectedItems).toHaveLength(1);
    expect(selectedItems[0]).toHaveTextContent('feature-1');
  });

  it('calls onSelectFeature when feature is clicked', () => {
    const mockOnSelectFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onSelectFeature={mockOnSelectFeature} />
    );
    
    fireEvent.click(screen.getByText('feature-1'));
    expect(mockOnSelectFeature).toHaveBeenCalledWith('feature-1');
  });

  it('supports keyboard navigation', () => {
    const mockOnSelectFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onSelectFeature={mockOnSelectFeature} />
    );
    
    const featureItem = screen.getByText('feature-1').closest('[role="button"]');
    
    if (featureItem) {
      fireEvent.keyDown(featureItem, { key: 'Enter' });
      expect(mockOnSelectFeature).toHaveBeenCalledWith('feature-1');
      
      mockOnSelectFeature.mockClear();
      
      fireEvent.keyDown(featureItem, { key: ' ' });
      expect(mockOnSelectFeature).toHaveBeenCalledWith('feature-1');
    }
  });

  it('renders create button in header', () => {
    const mockOnCreateFeature = jest.fn();
    render(
      <FeatureList features={mockFeatures} onCreateFeature={mockOnCreateFeature} />
    );
    
    const createButton = screen.getByLabelText('Create new feature');
    fireEvent.click(createButton);
    
    expect(mockOnCreateFeature).toHaveBeenCalledTimes(1);
  });

  it('displays correct status badges', () => {
    render(<FeatureList features={mockFeatures} />);
    
    const planningBadge = screen.getByText('planning');
    const inProgressBadge = screen.getByText('in progress');
    const completedBadge = screen.getByText('completed');
    
    expect(planningBadge).toBeInTheDocument();
    expect(inProgressBadge).toBeInTheDocument();
    expect(completedBadge).toBeInTheDocument();
  });

  it('shows architecture icon for planning features', () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Architecture icon should be shown for planning status
    const archButton = screen.getByLabelText('Run architecture mode');
    expect(archButton).toBeInTheDocument();
  });

  it('shows play icon for in-progress features', () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Play icon should be shown for in_progress status
    const playButton = screen.getByLabelText('Work on issues');
    expect(playButton).toBeInTheDocument();
  });

  it('opens confirmation dialog when Run Feature button is clicked', async () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click architecture button for planning feature
    const archButton = screen.getByLabelText('Run architecture mode');
    fireEvent.click(archButton);
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Run Architecture Mode')).toBeInTheDocument();
      expect(screen.getByText(/This will run the architecture agent/)).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog for working on issues', async () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click work button for in-progress feature
    const workButton = screen.getByLabelText('Work on issues');
    fireEvent.click(workButton);
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Work on Issues')).toBeInTheDocument();
      expect(screen.getByText(/This will start working on the next available issue/)).toBeInTheDocument();
    });
  });

  it('calls onRunFeature when confirming architecture mode', async () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click architecture button
    const archButton = screen.getByLabelText('Run architecture mode');
    fireEvent.click(archButton);
    
    // Click confirm button in dialog
    await waitFor(() => {
      const confirmButton = screen.getByText('Run Architecture');
      fireEvent.click(confirmButton);
    });
    
    expect(mockOnRunFeature).toHaveBeenCalledWith('feature-1', true);
  });

  it('calls onRunFeature when confirming work on issues', async () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click work button
    const workButton = screen.getByLabelText('Work on issues');
    fireEvent.click(workButton);
    
    // Click confirm button in dialog
    await waitFor(() => {
      const confirmButton = screen.getByText('Start Work');
      fireEvent.click(confirmButton);
    });
    
    expect(mockOnRunFeature).toHaveBeenCalledWith('feature-2', false);
  });

  it('cancels dialog without calling onRunFeature', async () => {
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click architecture button
    const archButton = screen.getByLabelText('Run architecture mode');
    fireEvent.click(archButton);
    
    // Click cancel button in dialog
    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
    });
    
    expect(mockOnRunFeature).not.toHaveBeenCalled();
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Run Architecture Mode')).not.toBeInTheDocument();
    });
  });

  it('disables Run Feature buttons when feature is running', () => {
    const mockOnRunFeature = jest.fn();
    const runningFeatures = new Set(['feature-1', 'feature-2']);
    
    render(
      <FeatureList 
        features={mockFeatures} 
        onRunFeature={mockOnRunFeature}
        runningFeatures={runningFeatures}
      />
    );
    
    const archButton = screen.getByLabelText('Run architecture mode');
    const workButton = screen.getByLabelText('Work on issues');
    
    expect(archButton).toBeDisabled();
    expect(workButton).toBeDisabled();
  });

  it('stops event propagation when clicking Run Feature buttons', () => {
    const mockOnSelectFeature = jest.fn();
    const mockOnRunFeature = jest.fn();
    render(
      <FeatureList 
        features={mockFeatures} 
        onSelectFeature={mockOnSelectFeature}
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // Click architecture button
    const archButton = screen.getByLabelText('Run architecture mode');
    fireEvent.click(archButton);
    
    // onSelectFeature should not be called
    expect(mockOnSelectFeature).not.toHaveBeenCalled();
  });

  it('does not show Run Feature buttons for completed features', () => {
    const mockOnRunFeature = jest.fn();
    const completedFeature: Feature[] = [
      {
        ...mockFeatures[0],
        status: 'completed',
      },
    ];
    
    render(
      <FeatureList 
        features={completedFeature} 
        onRunFeature={mockOnRunFeature}
      />
    );
    
    // No run buttons should be shown for completed features
    expect(screen.queryByLabelText('Run architecture mode')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Work on issues')).not.toBeInTheDocument();
  });

  it('does not show Run Feature buttons when onRunFeature is not provided', () => {
    render(<FeatureList features={mockFeatures} />);
    
    // No run buttons should be shown
    expect(screen.queryByLabelText('Run architecture mode')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Work on issues')).not.toBeInTheDocument();
  });
});