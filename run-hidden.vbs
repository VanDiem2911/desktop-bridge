' Chay cac server hoan toan an trong background
Dim sh, dir
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

' Server 0: Next.js Control Center Dashboard (port 3000)
sh.Run "cmd /c cd /d """ & dir & "\dashboard"" && node server.mjs >> """ & dir & "\dashboard\dashboard.log"" 2>&1", 0, False

' Server 1: ChatGPT & Fanpage (port 3001)
sh.Run "cmd /c node """ & dir & "\server.mjs"" >> """ & dir & "\server.log"" 2>&1", 0, False

' Server 2: Facebook Groups (port 3002)
sh.Run "cmd /c node """ & dir & "\group-server.mjs"" >> """ & dir & "\group-server.log"" 2>&1", 0, False

' Server 3: Facebook Trang Ca Nhan & ChatGPT Rieng (port 3003)
sh.Run "cmd /c node """ & dir & "\personal-server.mjs"" >> """ & dir & "\personal-server.log"" 2>&1", 0, False
