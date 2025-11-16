import { exec } from 'child_process';
import { shell } from 'electron';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function setupActionsHandlers(ipcMain) {
  // Launch application
  ipcMain.handle('actions:launch-app', async (event, appPath, args = []) => {
    try {
      // Validate input
      if (!appPath || typeof appPath !== 'string') {
        throw new Error('Invalid application path');
      }

      // Build command with arguments
      const argsString = args.length > 0 ? ' ' + args.join(' ') : '';
      const command = `"${appPath}"${argsString}`;

      // Execute
      await execAsync(command, { windowsHide: true });

      return { success: true };
    } catch (error) {
      console.error('Error launching app:', error);
      return { success: false, error: error.message };
    }
  });

  // Run shell command
  ipcMain.handle('actions:run-command', async (event, command) => {
    try {
      // Validate input
      if (!command || typeof command !== 'string') {
        throw new Error('Invalid command');
      }

      // Execute command using PowerShell on Windows
      const { stdout, stderr } = await execAsync(command, {
        shell: 'powershell.exe',
        windowsHide: true,
      });

      return {
        success: true,
        stdout: stdout,
        stderr: stderr,
      };
    } catch (error) {
      console.error('Error running command:', error);
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      };
    }
  });

  // Open URL in default browser or application
  ipcMain.handle('actions:open-url', async (event, url) => {
    try {
      // Validate input
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
      }

      // Use Electron's shell to open URL safely
      await shell.openExternal(url);

      return { success: true };
    } catch (error) {
      console.error('Error opening URL:', error);
      return { success: false, error: error.message };
    }
  });

  // System controls (lock, sleep, restart, shutdown, volume)
  ipcMain.handle('actions:system-control', async (event, action) => {
    try {
      let command;

      switch (action) {
        case 'lock':
          command = 'rundll32.exe user32.dll,LockWorkStation';
          break;
        case 'sleep':
          command = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
          break;
        case 'restart':
          command = 'shutdown /r /t 0';
          break;
        case 'shutdown':
          command = 'shutdown /s /t 0';
          break;
        case 'volume-up':
          command = '(New-Object -ComObject WScript.Shell).SendKeys([char]175)';
          break;
        case 'volume-down':
          command = '(New-Object -ComObject WScript.Shell).SendKeys([char]174)';
          break;
        case 'volume-mute':
          command = '(New-Object -ComObject WScript.Shell).SendKeys([char]173)';
          break;
        default:
          throw new Error(`Unknown system action: ${action}`);
      }

      await execAsync(command, {
        shell: 'powershell.exe',
        windowsHide: true,
      });

      return { success: true };
    } catch (error) {
      console.error('Error executing system control:', error);
      return { success: false, error: error.message };
    }
  });
}
