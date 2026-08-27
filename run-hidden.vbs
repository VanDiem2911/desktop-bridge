' Root forwarder for run-hidden.vbs
Dim fso, sh, scriptDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "wscript """ & scriptDir & "\scripts\run-hidden.vbs""", 0, False
