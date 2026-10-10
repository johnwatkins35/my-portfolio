# LinLab

Throwaway Linux sandbox. The container is deleted when you exit. The only folder on this PC it can change is `work`.

## Start

Double-click `start_linlab.cmd` in this folder, or run:

```powershell
.\start_linlab.cmd
```

Docker Desktop must be installed. The launcher starts it if the engine is down. The first open builds the LinLab image, which can take a few minutes.

Inside the shell, your practice files are in `/work`. Leave with `exit`.

Packages installed with `apt` disappear when you exit. Files in `/work` stay.

## Reset practice files

```powershell
.\reset_work.cmd
```

That saves a copy of `work`, then restores the sample files.

## Limits

- Ubuntu Linux: files, permissions, text tools, scripts, and packages.
- Commands that manage this Windows PC do not run here.
- Caps: 2 CPUs, 1 GB RAM. No admin rights on this PC. No access to the rest of the disk.
