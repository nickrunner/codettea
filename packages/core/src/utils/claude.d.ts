export declare class ClaudeAgent {
    static checkAvailability(): Promise<boolean>;
    static testConnection(workingDir: string): Promise<boolean>;
    static executeFromFile(promptFilePath: string, agentType: string, workingDir: string): Promise<string | undefined>;
    static execute(prompt: string, agentType: string, workingDir: string): Promise<string | undefined>;
    private static cleanupPromptFile;
    private static runClaudeProcess;
    static customizePromptTemplate(template: string, variables: Record<string, string>): string;
}
//# sourceMappingURL=claude.d.ts.map