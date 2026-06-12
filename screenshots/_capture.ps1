# MAGI interactive-desktop screen capture helper.
# Designed to run via an /IT scheduled task (Windows PowerShell 5.1) so it lives
# on WinSta0\Default and can actually see the user's screen + the MAGI window.
$ErrorActionPreference = 'Continue'
$out = 'C:\Users\MC\Desktop\MAGI\screenshots'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$log = Join-Path $out '_capture.log'
"start $(Get-Date -Format o)" | Set-Content $log
function Log($m){ Add-Content $log $m }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$cs = @"
using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public class W{
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 public delegate bool EP(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EP cb,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;}
 public static List<string> List(){var o=new List<string>();EnumWindows((h,l)=>{if(!IsWindowVisible(h))return true;int len=GetWindowTextLength(h);if(len==0)return true;var sb=new StringBuilder(len+1);GetWindowText(h,sb,sb.Capacity);uint p;GetWindowThreadProcessId(h,out p);o.Add(h.ToInt64()+"|"+p+"|"+sb.ToString());return true;},IntPtr.Zero);return o;}
}
"@
Add-Type -TypeDefinition $cs
[void][W]::SetProcessDPIAware()

$cx = [W]::GetSystemMetrics(0); $cy = [W]::GetSystemMetrics(1)
Log "screen $cx x $cy"

# Full-screen grab (reliable artifact regardless of window focus)
try {
  $b = New-Object System.Drawing.Bitmap($cx, $cy)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size($cx, $cy)))
  $b.Save((Join-Path $out '_fullscreen.png'), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $b.Dispose(); Log 'saved _fullscreen.png'
} catch { Log "fs err $_" }

# Enumerate visible windows
$wins = [W]::List()
foreach ($w in $wins) { Log "WIN $w" }

# Find the MAGI window (title contains 'magi'); fall back to foreground window
$target = [IntPtr]::Zero; $ttl = ''
foreach ($w in $wins) { $p = $w.Split('|', 3); if ($p[2] -match '(?i)magi') { $target = [IntPtr][int64]$p[0]; $ttl = $p[2]; break } }
if ($target -eq [IntPtr]::Zero) { Log 'no MAGI title -> foreground'; $target = [W]::GetForegroundWindow() }

if ($target -ne [IntPtr]::Zero) {
  [void][W]::ShowWindow($target, 9)         # SW_RESTORE
  [void][W]::SetForegroundWindow($target)
  Start-Sleep -Milliseconds 900
  $r = New-Object 'W+RECT'
  [void][W]::GetWindowRect($target, [ref]$r)
  $w0 = $r.Right - $r.Left; $h0 = $r.Bottom - $r.Top
  Log "target '$ttl' rect $($r.Left),$($r.Top) ${w0} x ${h0}"
  if ($w0 -gt 0 -and $h0 -gt 0) {
    $b = New-Object System.Drawing.Bitmap($w0, $h0)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size($w0, $h0)))
    $b.Save((Join-Path $out 'capture_current.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $b.Dispose(); Log 'saved capture_current.png'
  }
} else { Log 'no window to capture' }

'done' | Set-Content (Join-Path $out '_done.txt')
Log "end $(Get-Date -Format o)"
