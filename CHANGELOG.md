# C# Projects Changelog

## [Docker & Git Integration] - {PR_MERGE_DATE}

- Docker Compose support: detect docker-compose files in project root, docker/, Docker/, .docker/ folders
- Pull Latest & Rebuild: git pull from repo root then docker compose up --build in one action
- Pull & Rebuild in Terminal: same workflow but visible in Terminal for debugging
- Start/Stop Docker Compose directly from the action panel
- View Docker Compose logs in Terminal
- Open project repository in browser (Bitbucket, GitHub, GitLab) — auto-detects SSH and HTTPS remotes
- Open project directory in Terminal
- Visual indicators: box icon for Docker Compose, link icon for git remote
- Organized action panel with grouped sections (Open, Docker, Links, Actions)
- Fixed Docker credential helper PATH issue when running from Raycast
- Compatible with both modern `docker compose` and legacy `docker-compose`

## [Initial Release] - {PR_MERGE_DATE}

- Search for .sln and .slnx solution files recursively
- Open solutions in Rider (default), Visual Studio Code, or any application
- Smart search that stops when solution found in parent folder
- Automatic exclusion of build folders (bin, obj, node_modules, packages, etc.)
- Quick actions: copy path, show in Finder/Explorer
- Configurable search path preference
