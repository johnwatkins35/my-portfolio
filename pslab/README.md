# PSLab

Throwaway PowerShell 7 sandbox. The container is deleted when you exit. The only folder on this PC it can change is `work`.

## Start

Double-click `start_pslab.cmd` in this folder, or run:

```powershell
.\start_pslab.cmd
```

Docker Desktop must be installed. The launcher starts it if the engine is down.

Inside the shell, your practice files are in `/work`. Leave with `exit`.

Installed modules are saved in `modules` and are still there the next time you open PSLab. Close the window and open PSLab again after this update so that folder is connected.

Windows commands such as services, local users, Active Directory, registry, Task Scheduler, and Event Viewer do not run in this container. Practice those on a Windows VM.

## Reset practice files

```powershell
.\reset_work.cmd
```

That deletes and restores only the `work` folder next to the launcher.

The `work` folder, installed modules, and backup copies stay on this PC. They are not part of the project source.

## Limits

- PowerShell 7 on Linux: pipelines, files, CSV, REST, and modules.
- Windows-only automation (services, local users, Active Directory) belongs in a Windows VM you can snapshot.
- Caps: 2 CPUs, 1 GB RAM. No admin rights on this PC. No access to the rest of the disk.
