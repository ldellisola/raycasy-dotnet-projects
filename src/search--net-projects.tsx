import { ActionPanel, Action, Icon, Keyboard, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { exec } from "child_process";
import path from "path";
import { useState } from "react";
import { promisify } from "util";

import { findGitRoot, findSolutionFiles, runDockerCompose } from "./helpers";

const execAsync = promisify(exec);

interface Preferences {
  searchPath: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: solutions } = usePromise(
    async () => {
      return await findSolutionFiles(preferences.searchPath);
    },
    [],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to search for solutions",
          message: error.message,
        });
      },
    },
  );

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredSolutions = solutions?.filter((solution) => solution.name.toLowerCase().includes(normalizedSearchText));

  async function runDockerCommand(composePath: string, command: string, commandName: string) {
    const composeDir = path.dirname(composePath);
    showToast({ style: Toast.Style.Animated, title: `Running ${commandName}...` });

    try {
      const result = await runDockerCompose(command, composeDir);
      console.log(`Docker output:`, result.stdout);
      showToast({ style: Toast.Style.Success, title: `${commandName} completed` });
    } catch (error) {
      const msg = formatError(error);
      console.error(`${commandName} error:`, msg);
      showToast({ style: Toast.Style.Failure, title: `${commandName} failed`, message: msg });
    }
  }

  async function pullAndStartDocker(composePath: string, projectDirectory: string) {
    showToast({ style: Toast.Style.Animated, title: "Docker: Pulling latest code..." });

    try {
      const gitRoot = await findGitRoot(projectDirectory);
      if (!gitRoot) throw new Error("Git repository not found");

      const pullResult = await execAsync("git pull", { cwd: gitRoot });
      console.log("Git pull output:", pullResult.stdout);

      showToast({ style: Toast.Style.Animated, title: "Docker: Starting containers..." });

      const composeDir = path.dirname(composePath);
      const dockerResult = await runDockerCompose("up -d --build", composeDir);
      console.log("Docker compose output:", dockerResult.stdout);

      showToast({
        style: Toast.Style.Success,
        title: "Docker Compose Up Completed",
        message: pullResult.stdout.includes("Already up to date") ? "Already up to date" : "Updated & started",
      });
    } catch (error) {
      const msg = formatError(error);
      console.error("Docker pull & up error:", msg);
      showToast({ style: Toast.Style.Failure, title: "Docker Compose Pull & Up Failed", message: msg });
    }
  }

  async function openTerminalAndRun(directory: string, composePath: string) {
    const gitRoot = await findGitRoot(directory);
    const composeDir = path.dirname(composePath);

    const escape = (s: string) => s.replace(/'/g, "'\\''");

    const script = gitRoot
      ? `cd '${escape(gitRoot)}' && echo '>>> Pulling latest code...' && git pull && echo '' && echo '>>> Starting Docker containers...' && cd '${escape(composeDir)}' && (docker compose up -d --build || docker-compose up -d --build)`
      : `cd '${escape(composeDir)}' && echo '>>> Starting Docker containers...' && (docker compose up -d --build || docker-compose up -d --build)`;

    try {
      await execAsync(`osascript -e 'tell application "Terminal" to do script "${script}"'`);
      await execAsync(`osascript -e 'tell application "Terminal" to activate'`);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to Open Terminal", message: formatError(error) });
    }
  }

  function formatError(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stderr = (error as { stderr?: string }).stderr || "";
    const full = stderr ? `${errorMessage}\n${stderr}` : errorMessage;
    return full.length > 200 ? full.substring(0, 200) + "..." : full;
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search .NET solutions...">
      {filteredSolutions?.map((solution) => {
        const accessories: List.Item.Accessory[] = [{ icon: Icon.Document, text: solution.extension }];
        if (solution.dockerComposePath) {
          accessories.push({ icon: { source: Icon.Box }, tooltip: "Docker Compose available" });
        }
        if (solution.gitRemoteUrl) {
          accessories.push({ icon: { source: Icon.Link }, tooltip: "Git remote configured" });
        }

        return (
          <List.Item
            key={solution.path}
            icon={Icon.Code}
            title={solution.name}
            subtitle={solution.directory}
            accessories={accessories}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Open">
                  <Action.Open title="Open in Rider" target={solution.path} application="Rider" />
                  <Action.Open
                    title="Open in Visual Studio Code"
                    target={solution.path}
                    application="Visual Studio Code"
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                  />
                  <Action.OpenWith path={solution.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
                </ActionPanel.Section>

                {solution.dockerComposePath && (
                  <ActionPanel.Section title="Docker Compose">
                    <Action
                      title="Git Pull & Docker Compose up"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => pullAndStartDocker(solution.dockerComposePath!, solution.directory)}
                    />
                    <Action
                      title="Git Pull & Docker Compose up in Terminal"
                      icon={Icon.Terminal}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => openTerminalAndRun(solution.directory, solution.dockerComposePath!)}
                    />
                    <Action
                      title="Docker Compose Start"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={() => runDockerCommand(solution.dockerComposePath!, "up -d", "Docker Compose Start")}
                    />
                    <Action
                      title="Docker Compose Stop"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => runDockerCommand(solution.dockerComposePath!, "down", "Docker Compose Stop")}
                    />
                    <Action
                      title="Docker Compose Logs"
                      icon={Icon.Text}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      onAction={async () => {
                        const composeDir = path.dirname(solution.dockerComposePath!);
                        const escaped = composeDir.replace(/'/g, "'\\''");
                        const script = `cd '${escaped}' && (docker compose logs -f || docker-compose logs -f)`;
                        try {
                          await execAsync(`osascript -e 'tell application "Terminal" to do script "${script}"'`);
                          await execAsync(`osascript -e 'tell application "Terminal" to activate'`);
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to Open Terminal",
                            message: formatError(error),
                          });
                        }
                      }}
                    />
                  </ActionPanel.Section>
                )}

                <ActionPanel.Section title="Links">
                  {solution.gitRemoteUrl && (
                    <Action.OpenInBrowser
                      title="Open Repository in Browser"
                      icon={Icon.Globe}
                      url={solution.gitRemoteUrl}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                  )}
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={async () => {
                      const escaped = solution.directory.replace(/'/g, "'\\''");
                      try {
                        await execAsync(
                          `osascript -e 'tell application "Terminal" to do script "cd '\\''${escaped}'\\''"'`,
                        );
                        await execAsync(`osascript -e 'tell application "Terminal" to activate'`);
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to Open Terminal",
                          message: formatError(error),
                        });
                      }
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Actions">
                  <Action.ShowInFinder path={solution.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={solution.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && filteredSolutions?.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No .NET Solutions Found"
          description={`No .sln or .slnx files found in ${preferences.searchPath}`}
        />
      )}
    </List>
  );
}
