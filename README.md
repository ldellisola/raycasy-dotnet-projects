# C# Projects

Search and open C# solution files (.sln and .slnx) in your preferred IDE.

## Features

- **Smart Search**: Automatically finds all .sln and .slnx files in your projects directory
- **Quick Open**: Open solutions directly in Rider, Visual Studio Code, or any application
- **Intelligent Filtering**: Skips build folders (bin, obj), packages, and hidden directories
- **Stop on Find**: Stops searching subdirectories once a solution is found in a parent folder
- **Docker Compose**: Detect docker-compose files and start/stop/rebuild containers directly
- **Pull & Rebuild**: Git pull latest code and rebuild Docker containers in one action
- **Git Repository**: Open the project's Bitbucket/GitHub/GitLab repository in your browser

## Setup

1. Open the extension in Raycast
2. When prompted, select the folder path where your C# projects are located
3. The extension will recursively search for all solution files

## Usage

### Opening Solutions

| Shortcut | Action |
|----------|--------|
| **Enter** | Open in Rider (default) |
| **Cmd+V** | Open in Visual Studio Code |
| **Cmd+Shift+O** | Open with... (choose application) |

### Docker Compose

Available when a `docker-compose.yml` is found in the project root, `docker/`, `Docker/`, or `.docker/` folders.

| Shortcut | Action |
|----------|--------|
| **Cmd+D** | Pull latest code (git pull) and rebuild containers |
| **Cmd+Shift+R** | Pull & rebuild in Terminal (see full output) |
| **Cmd+Shift+U** | Start Docker Compose (up -d) |
| **Cmd+Shift+D** | Stop Docker Compose (down) |
| **Cmd+L** | View Docker logs in Terminal |

### Links & Navigation

| Shortcut | Action |
|----------|--------|
| **Cmd+B** | Open repository in browser (Bitbucket/GitHub/GitLab) |
| **Cmd+T** | Open project in Terminal |
| **Cmd+F** | Show in Finder |
| **Cmd+C** | Copy file path |

## Visual Indicators

Each solution in the list shows icons:
- 📦 **Box icon** — Docker Compose file detected
- 🔗 **Link icon** — Git remote configured

## Configuration

Set your projects search path in the extension preferences (shown on first run).
