import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Solution {
  name: string;
  path: string;
  directory: string;
  extension: ".sln" | ".slnx";
  dockerComposePath?: string;
  gitRemoteUrl?: string;
}

/** Folders to skip during solution search */
const EXCLUDED_FOLDERS = new Set([
  "bin",
  "obj",
  "node_modules",
  "packages",
  ".vs",
  ".vscode",
  ".idea",
  ".git",
  "Debug",
  "Release",
  "TestResults",
  "dist",
  "build",
]);

/** Common locations for docker-compose files relative to a solution directory */
const DOCKER_COMPOSE_LOCATIONS = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "docker/docker-compose.yml",
  "docker/docker-compose.yaml",
  "Docker/docker-compose.yml",
  "Docker/docker-compose.yaml",
  ".docker/docker-compose.yml",
  ".docker/docker-compose.yaml",
];

/**
 * Environment with extended PATH so Docker and git credential helpers work
 * when running from Raycast's limited environment.
 */
export function getExtendedEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
  };
}

// ─── Docker helpers ──────────────────────────────────────────────

export async function findDockerCompose(directory: string): Promise<string | undefined> {
  for (const location of DOCKER_COMPOSE_LOCATIONS) {
    const composePath = path.join(directory, location);
    try {
      await fs.access(composePath);
      return composePath;
    } catch {
      // File doesn't exist, continue
    }
  }
  return undefined;
}

/**
 * Run a docker compose command, trying the modern `docker compose` plugin
 * syntax first and falling back to the legacy `docker-compose` binary.
 */
export async function runDockerCompose(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  const env = getExtendedEnv();
  try {
    return await execAsync(`docker compose ${command}`, { cwd, env });
  } catch {
    return await execAsync(`docker-compose ${command}`, { cwd, env });
  }
}

// ─── Git helpers ─────────────────────────────────────────────────

export async function getGitRemoteUrl(directory: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("git config --get remote.origin.url", { cwd: directory });
    const remoteUrl = stdout.trim();
    if (!remoteUrl) return undefined;
    return convertGitUrlToWeb(remoteUrl);
  } catch {
    return undefined;
  }
}

export async function findGitRoot(directory: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("git rev-parse --show-toplevel", { cwd: directory });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

function convertGitUrlToWeb(gitUrl: string): string | undefined {
  // SSH format: git@bitbucket.org:user/repo.git
  const sshMatch = gitUrl.match(/git@([^:]+):(.+?)(\.git)?$/);
  if (sshMatch) {
    const [, host, repoPath] = sshMatch;
    return `https://${host}/${repoPath}`;
  }

  // HTTPS format: https://bitbucket.org/user/repo.git
  const httpsMatch = gitUrl.match(/https?:\/\/([^/]+)\/(.+?)(\.git)?$/);
  if (httpsMatch) {
    const [, host, repoPath] = httpsMatch;
    return `https://${host}/${repoPath}`;
  }

  return undefined;
}

// ─── Solution search ─────────────────────────────────────────────

export async function findSolutionFiles(rootPath: string): Promise<Solution[]> {
  const solutions: Solution[] = [];

  async function search(currentPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      let foundSolution = false;

      // First pass: look for solution files
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith(".sln") || entry.name.endsWith(".slnx"))) {
          const fullPath = path.join(currentPath, entry.name);
          const extension = entry.name.endsWith(".slnx") ? ".slnx" : ".sln";
          const name = entry.name.replace(/\.(sln|slnx)$/, "");

          const dockerComposePath = await findDockerCompose(currentPath);
          const gitRemoteUrl = await getGitRemoteUrl(currentPath);

          solutions.push({ name, path: fullPath, directory: currentPath, extension, dockerComposePath, gitRemoteUrl });
          foundSolution = true;
        }
      }

      // If we found a solution in this folder, don't search subdirectories
      if (foundSolution) return true;

      // Second pass: search subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderName = entry.name.toLowerCase();
          if (entry.name.startsWith(".") || EXCLUDED_FOLDERS.has(entry.name) || EXCLUDED_FOLDERS.has(folderName)) {
            continue;
          }
          await search(path.join(currentPath, entry.name));
        }
      }

      return false;
    } catch (error) {
      console.error(`Cannot access ${currentPath}:`, error);
      return false;
    }
  }

  await search(rootPath);
  return solutions.sort((a, b) => a.name.localeCompare(b.name));
}
