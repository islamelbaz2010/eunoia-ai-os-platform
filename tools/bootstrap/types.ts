export type VercelEnvironment = "production" | "preview" | "development";

export interface RawEnvRecord {
  key: string;
  value: string;
  source: string;
}

export interface EnvVar {
  key: string;
  value: string;
  environments: VercelEnvironment[];
  forbidden: boolean;
  generated: boolean;
}

export interface ExcelParseResult {
  records: RawEnvRecord[];
  warnings: string[];
  source: string;
  readAt: Date;
}

export interface LockFile {
  version: number;
  updatedAt: string;
  hashes: Record<VercelEnvironment, Record<string, string>>;
}

export type SyncAction = "added" | "updated" | "skipped" | "forbidden" | "error";

export interface VarSyncResult {
  key: string;
  environment: VercelEnvironment;
  action: SyncAction;
  reason?: string;
}

export interface VercelCurrentVar {
  key: string;
  environments: VercelEnvironment[];
}

export interface ScriptResult {
  script: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface BootstrapResult {
  startedAt: Date;
  completedAt: Date;
  excelSource: string;
  envFilePath: string;
  totalVars: number;
  syncResults: VarSyncResult[];
  scriptResults: {
    verifyVercelEnv?: ScriptResult;
    validateWebhook?: ScriptResult;
    smokeTest?: ScriptResult;
  };
  errors: string[];
}
