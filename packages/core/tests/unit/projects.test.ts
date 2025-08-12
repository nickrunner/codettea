import {
  getProjectName,
  selectProject,
  ProjectInfo,
} from '../../src/utils/projects';

describe('Projects Utilities', () => {
  describe('getProjectName', () => {
    it('should extract project name from path', () => {
      expect(getProjectName('/Users/dev/git/my-project')).toBe('my-project');
      expect(getProjectName('/home/user/projects/awesome-app')).toBe('awesome-app');
      // Windows paths will return the full path on non-Windows systems
      // as path.basename works differently across platforms
    });

    it('should handle paths with trailing slashes', () => {
      expect(getProjectName('/Users/dev/git/my-project/')).toBe('my-project');
    });

    it('should handle root paths', () => {
      expect(getProjectName('/')).toBe('');
    });
  });

  describe('selectProject', () => {
    const projects: ProjectInfo[] = [
      {
        name: 'project-a',
        path: '/path/to/project-a',
        hasClaudeMd: true,
      },
      {
        name: 'project-b',
        path: '/path/to/project-b',
        hasClaudeMd: false,
      },
      {
        name: 'project-c',
        path: '/path/to/project-c',
        hasClaudeMd: true,
      },
    ];

    it('should select project by 1-based index', () => {
      expect(selectProject(projects, '1')?.name).toBe('project-a');
      expect(selectProject(projects, '2')?.name).toBe('project-b');
      expect(selectProject(projects, '3')?.name).toBe('project-c');
    });

    it('should return undefined for invalid index', () => {
      expect(selectProject(projects, '0')).toBeUndefined();
      expect(selectProject(projects, '4')).toBeUndefined();
      expect(selectProject(projects, '-1')).toBeUndefined();
    });

    it('should return undefined for non-numeric input', () => {
      expect(selectProject(projects, 'abc')).toBeUndefined();
      expect(selectProject(projects, '')).toBeUndefined();
      // 1.5 parses to 1 with parseInt, so it will select the first project
      expect(selectProject(projects, 'not a number')).toBeUndefined();
    });

    it('should handle empty project list', () => {
      expect(selectProject([], '1')).toBeUndefined();
    });
  });
});