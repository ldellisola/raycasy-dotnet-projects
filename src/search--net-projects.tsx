import { ActionPanel, Action, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { promises as fs } from "fs";
import path from "path";
import { useState } from "react";

interface Preferences {
  searchPath: string;
}

interface Solution {
  name: string;
  path: string;
  directory: string;
  extension: ".sln" | ".slnx";
}

async function findSolutionFiles(rootPath: string): Promise<Solution[]> {
  const solutions: Solution[] = [];

  // Folders to exclude from search
  const excludedFolders = new Set([
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
          solutions.push({
            name,
            path: fullPath,
            directory: currentPath,
            extension,
          });
          foundSolution = true;
        }
      }

      // If we found a solution in this folder, don't search subdirectories
      if (foundSolution) {
        return true;
      }

      // Second pass: search subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderName = entry.name.toLowerCase();

          // Skip excluded folders and hidden folders
          if (entry.name.startsWith(".") || excludedFolders.has(entry.name) || excludedFolders.has(folderName)) {
            continue;
          }

          const fullPath = path.join(currentPath, entry.name);
          await search(fullPath);
        }
      }

      return false;
    } catch (error) {
      // Skip directories we can't access
      console.error(`Cannot access ${currentPath}:`, error);
      return false;
    }
  }

  await search(rootPath);
  return solutions.sort((a, b) => a.name.localeCompare(b.name));
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

  const filteredSolutions = solutions?.filter((solution) =>
    solution.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search .NET solutions...">
      {filteredSolutions?.map((solution) => (
        <List.Item
          key={solution.path}
          icon={Icon.Code}
          title={solution.name}
          subtitle={solution.directory}
          accessories={[{ icon: Icon.Document, text: solution.extension }]}
          actions={
            <ActionPanel>
              <Action.Open title="Open in Rider" target={solution.path} application="Rider" />
              <Action.Open
                title="Open in Visual Studio Code"
                target={solution.path}
                application="Visual Studio Code"
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
              <Action.OpenWith path={solution.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action.ShowInFinder path={solution.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={solution.path}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
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
