import React from 'react';
import { useStore } from '@/store/useStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProjectSelector() {
  const { config, selectProject } = useStore();

  if (!config?.projects || config.projects.length === 0) {
    return null;
  }

  return (
    <Select
      value={config.currentProject || ''}
      onValueChange={selectProject}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent>
        {config.projects.map((project) => (
          <SelectItem key={project.name} value={project.name}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}