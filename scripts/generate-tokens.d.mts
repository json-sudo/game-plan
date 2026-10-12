export interface GeneratedTokenFiles {
  tokens: string;
  breakpoints: string;
}

export function buildTokenFiles(source: unknown): GeneratedTokenFiles;
export function generateTokens(): void;
