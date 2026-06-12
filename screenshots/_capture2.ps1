# MAGI screenshot pass v2 — targets the EXACT "MAGI" app window only.
# Confirms the app is foreground before each keystroke so navigation never
# leaks into other windows. Captures the window rect (clamped to screen).
$ErrorActionPreference = 'Continue'
$out = 'C:\Users\MC\Desktop\MAGI\screenshots'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$log = Join-Path $out '_v2.log'
"start $(Get-Date -Format o)" | Set-Content $log
function Log($m){ Add-Content $log ("[{0}] {1}" -f (Get-Date -Format HH:mm:ss), $m) }

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$cs = @"
using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public class V2{
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern int GetSystemMetrics(int i);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern void keybd_event(byte vk,byte scan,uint flags,UIntPtr extra);
 public delegate bool EP(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EP cb,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;}
 // Exact-title match for "MAGI" (the Electron app). Returns IntPtr.Zero if absent.
 public static IntPtr FindExact(){
   IntPtr res=IntPtr.Zero;
   EnumWindows((h,l)=>{ if(!IsWindowVisible(h))return true; int len=GetWindowTextLength(h); if(len==0)return true;
     var sb=new StringBuilder(len+1); GetWindowText(h,sb,sb.Capacity);
     if(string.Equals(sb.ToString().Trim(),"MAGI",StringComparison.Ordinal)){ res=h; return false; }
     return true; }, IntPtr.Zero);
   return res;
 }
 public static string AllWindows(){
   var sb2=new StringBuilder();
   EnumWindows((h,l)=>{ if(!IsWindowVisible(h))return true; int len=GetWindowTextLength(h); if(len==0)return true;
     var sb=new StringBuilder(len+1); GetWindowText(h,sb,sb.Capacity); uint p; GetWindowThreadProcessId(h,out p);
     sb2.AppendLine(h.ToInt64()+"|"+p+"|"+sb.ToString()); return true; }, IntPtr.Zero);
   return sb2.ToString();
 }
 public static void Focus(IntPtr h){
   const byte VK_MENU=0x12; const uint KEYUP=0x2;
   keybd_event(VK_MENU,0,0,UIntPtr.Zero);
   ShowWindow(h,3);            // SW_MAXIMIZE for a full-size shot
   BringWindowToTop(h); SetForegroundWindow(h);
   keybd_event(VK_MENU,0,KEYUP,UIntPtr.Zero);
 }
 public static bool IsFg(IntPtr h){ return GetForegroundWindow()==h; }
}
"@
Add-Type -TypeDefinition $cs
[void][V2]::SetProcessDPIAware()

$SW = [V2]::GetSystemMetrics(0); $SH = [V2]::GetSystemMetrics(1)
Log "screen $SW x $SH"
Log "--- windows ---`n$([V2]::AllWindows())"

$h = [V2]::FindExact()
if ($h -eq [IntPtr]::Zero) { Log 'EXACT MAGI window not found'; 'done' | Set-Content (Join-Path $out '_v2_done.txt'); return }
Log "MAGI hwnd=$($h.ToInt64())"

function EnsureFg(){
  for ($i=0; $i -lt 4; $i++) {
    [V2]::Focus($h); Start-Sleep -Milliseconds 600
    if ([V2]::IsFg($h)) { return $true }
  }
  return $false
}

function Grab($name){
  $r = New-Object 'V2+RECT'
  [void][V2]::GetWindowRect($h, [ref]$r)
  $l = [Math]::Max(0,$r.Left); $t = [Math]::Max(0,$r.Top)
  $rt = [Math]::Min($SW,$r.Right); $bt = [Math]::Min($SH,$r.Bottom)
  $w = $rt - $l; $ht = $bt - $t
  if ($w -le 0 -or $ht -le 0) { Log "bad rect for $name"; return }
  $b = New-Object System.Drawing.Bitmap($w, $ht)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen($l, $t, 0, 0, (New-Object System.Drawing.Size($w, $ht)))
  $b.Save((Join-Path $out ($name + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $b.Dispose()
  Log "captured $name.png  ($w x $ht)"
}

function Go($page, $name){
  if (-not (EnsureFg)) { Log "skip $name (could not focus MAGI)"; return }
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); Start-Sleep -Milliseconds 250
  [System.Windows.Forms.SendKeys]::SendWait('^k');  Start-Sleep -Milliseconds 800
  [System.Windows.Forms.SendKeys]::SendWait($page); Start-Sleep -Milliseconds 800
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}'); Start-Sleep -Milliseconds 1800
  if (-not [V2]::IsFg($h)) { Log "WARN $name: MAGI lost focus before grab" }
  Grab $name
}

# Capture whatever is currently showing first, then visit each page.
if (EnsureFg) { Start-Sleep -Milliseconds 500; Grab 'current' }
Go 'Dashboard'  'dashboard'
Go 'Trends'     'trends'
Go 'Characters' 'characters'
Go 'Sessions'   'sessions'
Go 'Library'    'library'
Go 'Oracle'     'oracle'
Go 'Practice'   'practice'

if (EnsureFg) { [System.Windows.Forms.SendKeys]::SendWait('{ESC}') }
'done' | Set-Content (Join-Path $out '_v2_done.txt')
Log "end $(Get-Date -Format o)"
