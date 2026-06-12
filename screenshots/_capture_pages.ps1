# MAGI multi-page screenshot navigator.
# Runs via an /IT scheduled task so it can see the screen + drive the UI.
# Brings the MAGI window forward, then uses the Ctrl+K command palette to visit
# each top-level page and full-screen-captures it. Settings is intentionally
# skipped to avoid capturing API keys.
$ErrorActionPreference = 'Continue'
$out = 'C:\Users\MC\Desktop\MAGI\screenshots'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$log = Join-Path $out '_pages.log'
"start $(Get-Date -Format o)" | Set-Content $log
function Log($m){ Add-Content $log ("[{0}] {1}" -f (Get-Date -Format HH:mm:ss), $m) }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$cs = @"
using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public class WP{
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
 [DllImport("user32.dll")] public static extern void keybd_event(byte vk,byte scan,uint flags,UIntPtr extra);
 public delegate bool EP(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EP cb,IntPtr l);
 public static IntPtr Find(){
   IntPtr res=IntPtr.Zero;
   EnumWindows((h,l)=>{ if(!IsWindowVisible(h))return true; int len=GetWindowTextLength(h); if(len==0)return true;
     var sb=new StringBuilder(len+1); GetWindowText(h,sb,sb.Capacity);
     if(System.Text.RegularExpressions.Regex.IsMatch(sb.ToString(),"magi",System.Text.RegularExpressions.RegexOptions.IgnoreCase)){ res=h; return false; }
     return true; }, IntPtr.Zero);
   return res;
 }
 // Robust foreground: jiggle ALT to bypass SetForegroundWindow lock, restore + raise.
 public static void Focus(IntPtr h){
   const byte VK_MENU=0x12; const uint KEYUP=0x2;
   keybd_event(VK_MENU,0,0,UIntPtr.Zero);
   ShowWindow(h,9); BringWindowToTop(h); SetForegroundWindow(h);
   keybd_event(VK_MENU,0,KEYUP,UIntPtr.Zero);
 }
}
"@
Add-Type -TypeDefinition $cs
[void][WP]::SetProcessDPIAware()

$cx = [WP]::GetSystemMetrics(0); $cy = [WP]::GetSystemMetrics(1)
Log "screen $cx x $cy"

$h = [WP]::Find()
if ($h -eq [IntPtr]::Zero) { Log 'MAGI window not found'; 'done' | Set-Content (Join-Path $out '_pages_done.txt'); return }
Log "found MAGI hwnd=$($h.ToInt64())"

function Grab($name){
  $b = New-Object System.Drawing.Bitmap($cx, $cy)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size($cx, $cy)))
  $path = Join-Path $out ($name + '.png')
  $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $b.Dispose()
  Log "captured $name.png"
}

function Go($page, $name){
  [WP]::Focus($h); Start-Sleep -Milliseconds 500
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait('^k'); Start-Sleep -Milliseconds 700
  [System.Windows.Forms.SendKeys]::SendWait($page); Start-Sleep -Milliseconds 700
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}'); Start-Sleep -Milliseconds 1600
  Grab $name
}

# top-level pages reachable via the command palette (Settings skipped on purpose)
Go 'Dashboard'  'dashboard'
Go 'Trends'     'trends'
Go 'Characters' 'characters'
Go 'Sessions'   'sessions'
Go 'Library'    'library'
Go 'Oracle'     'oracle'
Go 'Practice'   'practice'

# return to dashboard, leave the app in a tidy state
[WP]::Focus($h); Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{ESC}')

'done' | Set-Content (Join-Path $out '_pages_done.txt')
Log "end $(Get-Date -Format o)"
