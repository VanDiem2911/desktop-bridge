' Chay cac server hoan toan an trong background
Dim fso, sh, scriptDir, bridgeDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

If fso.FolderExists(scriptDir & "\dashboard") Then
    bridgeDir = scriptDir
Else
    bridgeDir = fso.GetAbsolutePathName(scriptDir & "\..")
End If

sh.CurrentDirectory = bridgeDir

' Server 0: Next.js Control Center Dashboard (port 3000)
sh.Run "cmd /c cd /d """ & bridgeDir & "\dashboard"" && node server.mjs >> """ & bridgeDir & "\dashboard\dashboard.log"" 2>&1", 0, False

' Server 1: ChatGPT & Fanpage (port 3001)
sh.Run "cmd /c cd /d """ & bridgeDir & """ && node """ & bridgeDir & "\server.mjs"" >> """ & bridgeDir & "\server.log"" 2>&1", 0, False

' Server 2: Facebook Groups (port 3002)
sh.Run "cmd /c cd /d """ & bridgeDir & """ && node """ & bridgeDir & "\group-server.mjs"" >> """ & bridgeDir & "\group-server.log"" 2>&1", 0, False

' Server 3: Facebook Trang Ca Nhan & ChatGPT Rieng (port 3003)
sh.Run "cmd /c cd /d """ & bridgeDir & """ && node """ & bridgeDir & "\personal-server.mjs"" >> """ & bridgeDir & "\personal-server.log"" 2>&1", 0, False
